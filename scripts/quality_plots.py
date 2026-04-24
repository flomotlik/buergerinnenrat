#!/usr/bin/env python3
"""Generate matplotlib plots for the iteration-1 quality report.

Reads benchmark data from .benchmarks/<timestamp>/ and writes PNGs into
docs/quality-comparison-figures/.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

REPO = Path(__file__).resolve().parents[1]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--bench", type=Path, required=True, help="benchmark directory")
    p.add_argument("--out", type=Path, default=REPO / "docs" / "quality-comparison-figures")
    args = p.parse_args()

    summary = json.loads((args.bench / "summary.json").read_text())
    args.out.mkdir(parents=True, exist_ok=True)

    pools = summary["pools_run"]
    setups = summary["setups_run"]
    seeds = summary["seeds"]

    # min_pi per (pool, setup) across seeds.
    fig, ax = plt.subplots(figsize=(8, 4))
    width = 0.35
    x = list(range(len(pools)))
    for i, setup in enumerate(setups):
        per_seed_vals = []
        for pool in pools:
            seed_vals = []
            for seed in seeds:
                f = args.bench / pool / setup / f"{seed}.json"
                if not f.exists():
                    continue
                try:
                    doc = json.loads(f.read_text())
                    result = doc.get("result")
                    if result:
                        seed_vals.append(min(result["marginals"].values()))
                except Exception:
                    pass
            per_seed_vals.append(sum(seed_vals) / len(seed_vals) if seed_vals else 0)
        offset = (i - (len(setups) - 1) / 2) * width
        ax.bar([xi + offset for xi in x], per_seed_vals, width, label=setup)

    ax.set_xticks(x)
    ax.set_xticklabels(pools, rotation=20, ha="right", fontsize=8)
    ax.set_ylabel("avg min π_i over seeds (höher = fairer)")
    ax.set_title("Iteration 1: minimale Auswahlwahrscheinlichkeit pro Setup")
    ax.legend()
    plt.tight_layout()
    plt.savefig(args.out / "min-pi-per-setup.png", dpi=120)
    plt.close()

    # Wall-time medians.
    fig, ax = plt.subplots(figsize=(8, 4))
    for i, setup in enumerate(setups):
        med = []
        for pool in pools:
            v = summary["pools"].get(pool, {}).get(setup, {}).get("wall_time_med_ms")
            med.append(v if v is not None else 0)
        offset = (i - (len(setups) - 1) / 2) * width
        ax.bar([xi + offset for xi in x], med, width, label=setup)
    ax.set_xticks(x)
    ax.set_xticklabels(pools, rotation=20, ha="right", fontsize=8)
    ax.set_ylabel("ms (Median über Seeds)")
    ax.set_title("Iteration 1: Laufzeit pro Setup")
    ax.legend()
    plt.tight_layout()
    plt.savefig(args.out / "wall-time-per-setup.png", dpi=120)
    plt.close()

    print(f"plots written to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
