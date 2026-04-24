#!/usr/bin/env python3
"""Convert pgoelz reference_output/sf_*_prob_allocs_data.csv into our format.

Output format: a JSON file per pool with quantile curves of the Legacy and
Leximin selection probabilities. This is *not* per-person marginals — those
were not published — but quantile points (percentile of pool, probability).
That's enough to overlay our own engines' empirical CDFs against the paper's.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def convert(src: Path, instance_id: str) -> dict:
    by_algo: dict[str, list[dict[str, float]]] = defaultdict(list)
    with src.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            by_algo[row["algorithm"]].append(
                {
                    "percentile": float(row["percentile of pool members"]),
                    "probability": float(row["selection probability"]),
                }
            )
    return {
        "instance_id": instance_id,
        "source": "Flanigan et al. 2021 (Nature) — citizensassemblies-replication, reference_output/",
        "format": "quantile_curve",
        "note": (
            "Aggregated quantile curves of selection probability per algorithm. "
            "Not per-person marginals — those were not released for privacy reasons. "
            "Use these to overlay engine output CDFs in the comparison report (#20)."
        ),
        "curves": dict(by_algo),
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--out-dir", type=Path, default=REPO / "tests" / "fixtures" / "paper-leximin-results")
    args = p.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    src_dir = REPO / "tests" / "fixtures" / "paper-pools" / "reference-distributions"
    if not src_dir.exists():
        print(f"[error] {src_dir} not found — did issue 04 run?")
        return 1

    converted = 0
    for src in sorted(src_dir.glob("sf_*_prob_allocs.csv")):
        instance_id = src.stem.replace("_prob_allocs", "")
        payload = convert(src, instance_id)
        out = args.out_dir / f"{instance_id}.json"
        out.write_text(json.dumps(payload, indent=2))
        algos = list(payload["curves"].keys())
        print(f"[ok]   {instance_id}.json — algorithms: {', '.join(algos)}")
        converted += 1

    print(f"converted {converted} pools")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
