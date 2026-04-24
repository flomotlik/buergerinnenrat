#!/usr/bin/env python3
"""Quality metrics for a RunResult JSON. Python twin of packages/metrics.

Computes the same metrics as the TS twin to FP tolerance, so we can compare
engine outputs cross-language.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any

DEFAULT_EPSILON = 0.01


def gini(values: list[float]) -> float:
    if not values:
        return 0.0
    sorted_v = sorted(values)
    n = len(sorted_v)
    s = sum(sorted_v)
    if s == 0:
        return 0.0
    cum = sum((i + 1) * v for i, v in enumerate(sorted_v))
    return (2 * cum) / (n * s) - (n + 1) / n


def variance(values: list[float]) -> float:
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    return sum((v - mean) ** 2 for v in values) / len(values)


def _fmt(v: float) -> str:
    """Format a float canonically: round to 9 digits, strip trailing zeros
    but keep at least one digit after the decimal. Matches the TS twin's
    `fmt()` helper in packages/metrics/src/index.ts.
    """
    r = round(v, 9)
    s = f"{r:.9f}"
    s = s.rstrip("0")
    if s.endswith("."):
        s += "0"
    return s


def reproducibility_hash(selected: Iterable[str], marginals: dict[str, float]) -> str:
    ids = sorted(selected)
    canon = sorted(marginals.items())
    canon_str = ",".join(f"{k}={_fmt(v)}" for k, v in canon)
    text = ",".join(ids) + "|" + canon_str
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_metrics(result: dict[str, Any], epsilon: float = DEFAULT_EPSILON) -> dict[str, Any]:
    pis = list(result["marginals"].values())
    sorted_pis = sorted(pis)

    slack = []
    for q in result["quota_fulfillment"]:
        slack.append(
            {
                "column": q["column"],
                "value": q["value"],
                "selected": q["selected"],
                "bound_min": q["bound_min"],
                "bound_max": q["bound_max"],
                "slack_min": q["selected"] - q["bound_min"],
                "slack_max": q["bound_max"] - q["selected"],
            }
        )

    return {
        "min_pi": sorted_pis[0] if sorted_pis else 0.0,
        "min_pi_2": sorted_pis[1] if len(sorted_pis) > 1 else 0.0,
        "min_pi_3": sorted_pis[2] if len(sorted_pis) > 2 else 0.0,
        "variance_pi": variance(pis),
        "gini": gini(pis),
        "count_below_epsilon": sum(1 for v in pis if v < epsilon),
        "epsilon": epsilon,
        "quota_slack_per_category": slack,
        "reproducibility_hash": reproducibility_hash(result["selected"], result["marginals"]),
    }


def aggregate_multi_run(results: list[dict[str, Any]], top_k: int = 5) -> dict[str, Any]:
    freq: dict[str, int] = {}
    signatures: set[str] = set()
    for r in results:
        for pid in r["selected"]:
            freq[pid] = freq.get(pid, 0) + 1
        signatures.add(",".join(sorted(r["selected"])))
    sorted_freq = sorted(freq.items(), key=lambda x: -x[1])
    return {
        "num_runs": len(results),
        "panel_frequency": freq,
        "panel_signature_count": len(signatures),
        "most_frequent": [pid for pid, _ in sorted_freq[:top_k]],
        "least_frequent": [pid for pid, _ in list(reversed(sorted_freq[-top_k:]))],
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("inputs", type=Path, nargs="+", help="run-result JSON file(s)")
    p.add_argument("--epsilon", type=float, default=DEFAULT_EPSILON)
    p.add_argument("--out", type=Path)
    args = p.parse_args()

    payloads = []
    for f in args.inputs:
        doc = json.loads(f.read_text())
        result = doc.get("result", doc)
        payloads.append(result)

    per_run = [compute_metrics(r, args.epsilon) for r in payloads]
    out: dict[str, Any] = {"per_run": per_run}
    if len(payloads) > 1:
        out["multi_run"] = aggregate_multi_run(payloads)

    text = json.dumps(out, indent=2)
    if args.out:
        args.out.write_text(text)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
