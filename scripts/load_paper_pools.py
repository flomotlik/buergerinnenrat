#!/usr/bin/env python3
"""Load and convert pgoelz/citizensassemblies-replication pools into our format.

Public availability:
- `example_small_20` and `example_large_200` ship raw respondents — direct copy.
- `sf_e_110` ships only `intersections.csv` (joint distribution of category pairs).
  We synthesize respondents that match those marginals; this is *not* the
  actual sf_e applicant pool — see docs/paper-pools.md.
- `sf_a..sf_d` raw respondents are NOT in the public repo; we cannot include them.
  The paper's reference probability distributions (`reference_output/sf_*.csv`)
  are usable as cached comparison data for Issue #17.

This script reads the upstream `data/<instance>/` directories and writes:
- tests/fixtures/paper-pools/<instance>.csv      (our standard schema)
- tests/fixtures/paper-pools/<instance>.quotas.json
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
UPSTREAM = REPO / "vendor" / "citizensassemblies-replication"
OUT = REPO / "tests" / "fixtures" / "paper-pools"


def _read_categories(path: Path) -> dict[str, list[dict[str, int | str]]]:
    by_category: dict[str, list[dict[str, int | str]]] = defaultdict(list)
    with path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            by_category[row["category"]].append(
                {"feature": row["feature"], "min": int(row["min"]), "max": int(row["max"])}
            )
    return dict(by_category)


def _read_respondents(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open() as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = list(reader.fieldnames or [])
    return fields, rows


def _write_pool(
    out_csv: Path,
    rows: list[dict[str, str]],
    feature_columns: list[str],
    instance_id: str,
) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    fields = ["person_id"] + feature_columns
    width = max(4, len(str(len(rows))))
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for i, r in enumerate(rows, start=1):
            out_row = {"person_id": f"{instance_id}-{str(i).zfill(width)}"}
            for col in feature_columns:
                out_row[col] = r[col]
            writer.writerow(out_row)


def _write_quotas(out_json: Path, instance_id: str, panel_size: int, categories: dict) -> None:
    payload: dict[str, Any] = {
        "id": instance_id,
        "panel_size": panel_size,
        "source": "pgoelz/citizensassemblies-replication, data/" + instance_id,
        "features": [
            {
                "name": name,
                "values": [
                    {"value": e["feature"], "min": e["min"], "max": e["max"]} for e in entries
                ],
            }
            for name, entries in categories.items()
        ],
    }
    out_json.write_text(json.dumps(payload, indent=2, sort_keys=False, ensure_ascii=False) + "\n")


# --- example_small_20 / example_large_200 -----------------------------------


def _convert_full_pool(instance: str, panel_size: int) -> None:
    src = UPSTREAM / "data" / instance
    if not src.exists():
        print(f"[skip] {instance}: not in upstream")
        return
    cats = _read_categories(src / "categories.csv")
    feature_cols, respondents = _read_respondents(src / "respondents.csv")
    _write_pool(OUT / f"{instance}.csv", respondents, feature_cols, instance)
    _write_quotas(OUT / f"{instance}.quotas.json", instance, panel_size, cats)
    print(f"[ok]   {instance}: {len(respondents)} respondents, panel={panel_size}")


# --- sf_e_110 synthetic pool from intersections ----------------------------


def _synthesize_sf_e(panel_size: int = 110) -> None:
    """Synthesize respondents from the marginal distribution in `intersections.csv`.

    The upstream file gives `population share` for each pair (cat1, val1, cat2, val2).
    We sum across all category pairs to get a per-feature-value share, then sample
    `pool_size` respondents independently per category. This matches the marginals
    but loses the joint structure — clearly noted in docs/paper-pools.md.
    """
    src = UPSTREAM / "data" / "sf_e_110" / "intersections.csv"
    if not src.exists():
        print("[skip] sf_e_110_synthetic: intersections.csv missing")
        return

    # Aggregate to per-(category, value) marginals.
    marginals: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    with src.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            for cat_idx in (1, 2):
                cat = row[f"category {cat_idx}"]
                val = row[f"feature {cat_idx}"]
                marginals[cat][val] += float(row["population share"])
                counts[cat][val] += 1

    # Average (the same value appears in many pairs, with the same marginal share).
    averaged: dict[str, dict[str, float]] = {}
    for cat, vals in marginals.items():
        averaged[cat] = {v: vals[v] / counts[cat][v] for v in vals}
        # Renormalize.
        total = sum(averaged[cat].values())
        averaged[cat] = {v: w / total for v, w in averaged[cat].items()}

    pool_size = 600  # paper sf_e pool was ~660; use 600 as round number for synth
    seed = 7
    rng = _LCG(seed)
    feature_cols = sorted(averaged.keys())

    rows: list[dict[str, str]] = []
    for _ in range(pool_size):
        row = {}
        for cat in feature_cols:
            row[cat] = _categorical(rng, averaged[cat])
        rows.append(row)

    _write_pool(OUT / "sf_e_110_synthetic.csv", rows, feature_cols, "sf_e_110_synth")

    # Quotas: scale marginal × panel_size, ±10% slack
    cats_for_json: dict[str, list[dict[str, int | str]]] = {}
    for cat in feature_cols:
        entries = []
        for val, share in averaged[cat].items():
            target = share * panel_size
            entries.append(
                {"feature": val, "min": max(0, int(target * 0.9)), "max": int(target * 1.1) + 1}
            )
        cats_for_json[cat] = entries
    _write_quotas(OUT / "sf_e_110_synthetic.quotas.json", "sf_e_110_synth", panel_size, cats_for_json)
    print(f"[ok]   sf_e_110_synthetic: {pool_size} synth respondents from marginals, panel={panel_size}")


class _LCG:
    """Simple LCG so this module has no Mulberry32 import dependency."""

    def __init__(self, seed: int) -> None:
        self._state = seed & 0xFFFFFFFF

    def next(self) -> float:
        self._state = (self._state * 1103515245 + 12345) & 0x7FFFFFFF
        return self._state / 0x7FFFFFFF


def _categorical(rng: _LCG, weights: dict[str, float]) -> str:
    u = rng.next()
    acc = 0.0
    keys = sorted(weights.keys())
    for k in keys:
        acc += weights[k]
        if u < acc:
            return k
    return keys[-1]


# --- reference_output: copy aggregated probability curves -------------------


def _copy_reference_distributions() -> None:
    """Copy the paper's published probability allocation curves for sf_a..sf_e.
    These are aggregated (percentile, prob) pairs, not per-respondent — usable
    as cached comparison data for Issue #17 ("leximin-cached-from-paper").
    """
    ref_src = UPSTREAM / "reference_output"
    ref_out = OUT / "reference-distributions"
    ref_out.mkdir(parents=True, exist_ok=True)
    for name in ("sf_a_35", "sf_b_20", "sf_c_44", "sf_d_40", "sf_e_110"):
        src = ref_src / f"{name}_prob_allocs_data.csv"
        if src.exists():
            dst = ref_out / f"{name}_prob_allocs.csv"
            dst.write_bytes(src.read_bytes())
            print(f"[ok]   reference: {name}_prob_allocs")
        else:
            print(f"[skip] reference: {name} missing")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    _convert_full_pool("example_small_20", panel_size=20)
    _convert_full_pool("example_large_200", panel_size=200)
    _synthesize_sf_e(panel_size=110)
    _copy_reference_distributions()


if __name__ == "__main__":
    main()
