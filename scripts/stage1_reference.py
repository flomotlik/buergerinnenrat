"""
Stage 1 reference implementation (Python).

Mirrors the TypeScript implementation in `packages/core/src/stage1/stratify.ts`
bit-for-bit. Used to cross-validate the TS implementation:

  1. Same Mulberry32 PRNG (already exists in scripts/generate_pool.py)
  2. Same Largest-Remainder (Hamilton) allocation with same tie-breaks
  3. Same lexicographic stratum-key ordering
  4. Same single-shared-RNG, only-shuffle-on-nh-actual-positive policy
  5. Same Fisher-Yates loop direction (i = len-1 down to 1, swap with j in [0..i])

Determinism guarantees: for any fixed (rows, axes, targetN, seed), the TS and
Python implementations MUST produce identical `selected` index lists.

Usage:
    python3 scripts/stage1_reference.py --input pool.csv \\
        --axes district,age_band,gender --target-n 300 --seed 42

Output: JSON with { selected: [...], strata: [...], warnings: [...] }
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from typing import Any

# Reuse the canonical Python Mulberry32 (twin of the TS class).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_pool import Mulberry32  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def stratum_key_string(row: dict[str, str], axes: list[str]) -> str:
    """Mirror TS stratumKeyString: JSON.stringify of [axis, value] pairs.

    The TS code uses `JSON.stringify` which produces canonical JSON for the
    given input shape. We must match that byte-for-byte. The TS output for
    pairs `[["a","x"],["b","y"]]` is `[["a","x"],["b","y"]]` — no spaces,
    double-quoted strings, no trailing newline. Python's `json.dumps` with
    `separators=(",", ":")` produces the same.
    """
    pairs: list[list[str]] = [[a, row.get(a, "")] for a in axes]
    return json.dumps(pairs, separators=(",", ":"), ensure_ascii=False)


def decode_stratum_key(key: str) -> dict[str, str]:
    pairs = json.loads(key)
    return {a: v for a, v in pairs}


def bucketize(rows: list[dict[str, str]], axes: list[str]) -> dict[str, list[int]]:
    """Build stratum-key -> [row indices] map. Empty axes => single bucket."""
    buckets: dict[str, list[int]] = {}
    if len(axes) == 0:
        buckets[json.dumps([], separators=(",", ":"))] = list(range(len(rows)))
        return buckets
    for i, row in enumerate(rows):
        k = stratum_key_string(row, axes)
        buckets.setdefault(k, []).append(i)
    return buckets


def largest_remainder_allocation(
    stratum_keys: list[str],
    stratum_sizes: list[int],
    target_n: int,
) -> list[int]:
    """Hamilton allocation. Mirrors TS largestRemainderAllocation exactly.

    Tie-break order (when assigning the +1 bonus from largest remainders down):
      1. larger remainder first
      2. larger N_h first
      3. lexicographically SMALLER stratum key first (string comparison)
    """
    total = sum(stratum_sizes)
    if total == 0:
        return [0] * len(stratum_sizes)
    quotas = [(target_n * nh) / total for nh in stratum_sizes]
    floors = [math.floor(q) for q in quotas]
    remainders = [
        {"idx": i, "rem": q - floors[i]} for i, q in enumerate(quotas)
    ]
    assigned = sum(floors)
    delta = target_n - assigned
    if delta > 0:
        # Stable sort by composite key. Python's sort is stable, but we need
        # composite ordering, so we use `sorted` with a tuple key.
        # We sort DESCENDING by remainder, then DESCENDING by N_h, then
        # ASCENDING by stratum key. The TS code sorts and takes the first
        # `delta` entries, so we replicate: highest remainder first.
        def sort_key(r: dict[str, Any]) -> tuple[float, int, str]:
            i = r["idx"]
            return (-r["rem"], -stratum_sizes[i], stratum_keys[i])

        remainders.sort(key=sort_key)
        for i in range(delta):
            idx = remainders[i]["idx"]
            floors[idx] += 1
    return floors


def shuffle_in_place(arr: list[int], rng: Mulberry32) -> None:
    """Fisher-Yates with the SAME loop direction as the TS implementation."""
    for i in range(len(arr) - 1, 0, -1):
        j = math.floor(rng.next_float() * (i + 1))
        arr[i], arr[j] = arr[j], arr[i]


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def stratify(
    rows: list[dict[str, str]],
    axes: list[str],
    target_n: int,
    seed: int,
) -> dict[str, Any]:
    """Mirror of TS stratify(rows, { axes, targetN, seed })."""
    if target_n < 0:
        raise ValueError("Stichprobengröße (targetN) muss >= 0 sein.")
    if target_n > len(rows):
        raise ValueError(
            f"Eingangs-Pool hat nur {len(rows)} Personen, "
            f"mehr als das ist nicht ziehbar (angefragt: {target_n})."
        )

    buckets = bucketize(rows, axes)

    # Deterministic lex-sorted stratum order (Unicode codepoint order, matching
    # TS String.prototype.localeCompare default for our restricted ASCII keys
    # — see note in algorithm doc about this).
    stratum_keys = sorted(buckets.keys())
    stratum_index_lists = [list(buckets[k]) for k in stratum_keys]
    stratum_sizes = [len(l) for l in stratum_index_lists]

    allocation = largest_remainder_allocation(stratum_keys, stratum_sizes, target_n)

    # Single shared RNG. Iteration in lex order. RNG advances ONLY for
    # strata that get drawn (nh_actual > 0). Empty strata do NOT advance
    # the RNG state — this is a determinism contract.
    rng = Mulberry32(seed)

    strata_results: list[dict[str, Any]] = []
    warnings_out: list[str] = []
    selected_by_stratum: list[list[int]] = []

    for i, k in enumerate(stratum_keys):
        indices = stratum_index_lists[i]
        nh_pool = stratum_sizes[i]
        nh_target = allocation[i]
        nh_actual = min(nh_target, nh_pool)
        underfilled = nh_actual < nh_target

        if underfilled:
            warnings_out.append(
                f"Stratum {k} unter-vertreten: {nh_actual} von {nh_target} "
                f"angefragt (Pool: {nh_pool})."
            )

        if nh_actual > 0:
            shuffle_in_place(indices, rng)

        drawn = indices[:nh_actual]
        selected_by_stratum.append(drawn)

        strata_results.append({
            "key": decode_stratum_key(k),
            "n_h_pool": nh_pool,
            "n_h_target": nh_target,
            "n_h_actual": nh_actual,
            "underfilled": underfilled,
        })

    # Final selection: per-stratum lists sorted ASC by original row index,
    # concatenated in lex stratum order.
    selected: list[int] = []
    for drawn in selected_by_stratum:
        selected.extend(sorted(drawn))

    return {
        "selected": selected,
        "strata": strata_results,
        "warnings": warnings_out,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--input", required=True, type=Path)
    p.add_argument("--axes", required=True, help="Comma-separated CSV column names")
    p.add_argument("--target-n", required=True, type=int)
    p.add_argument("--seed", required=True, type=int)
    p.add_argument("--output-json", type=Path, default=None,
                   help="Write result JSON to this path (default: stdout)")
    args = p.parse_args(argv)

    rows = read_csv(args.input)
    axes = [a.strip() for a in args.axes.split(",") if a.strip()]
    result = stratify(rows, axes, args.target_n, args.seed)

    out = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output_json:
        args.output_json.write_text(out, encoding="utf-8")
    else:
        print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
