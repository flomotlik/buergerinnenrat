#!/usr/bin/env python3
"""Native Python reference runner (Reference C).

Calls `sortition-algorithms` natively (highspy under the hood) and writes a
RunResult JSON in the same shape as Engine A and Engine B. Used as ground
truth for the three-way comparison in Issue #19.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from sortition_algorithms.committee_generation import (
    GUROBI_AVAILABLE,
    find_distribution_maximin,
)
from sortition_algorithms.features import FeatureValueMinMax, set_default_max_flex
from sortition_algorithms.people import People
from sortition_algorithms.utils import CaseInsensitiveDict


SCHEMA_VERSION = "0.1"
ENGINE_ID = "reference-c-native"
ENGINE_VERSION = "0.1.0"


def _read_pool_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    import csv

    with path.open() as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        headers = list(reader.fieldnames or [])
    if "person_id" not in headers:
        raise ValueError("pool CSV must have a 'person_id' column")
    return headers, rows


def _build_features(quotas: dict[str, Any]) -> Any:
    """Translate our QuotaConfig JSON into a FeatureCollection.

    `FeatureCollection` is a TypeAlias for a nested dict
    (CaseInsensitiveDict[str, CaseInsensitiveDict[str, FeatureValueMinMax]]).
    """
    fc: Any = CaseInsensitiveDict()
    for cat in quotas["categories"]:
        col = cat["column"]
        fc[col] = CaseInsensitiveDict()
        for val, b in cat["bounds"].items():
            fc[col][val] = FeatureValueMinMax(min=int(b["min"]), max=int(b["max"]))
    set_default_max_flex(fc)
    return fc


def _build_people(rows: list[dict[str, str]], features: Any) -> People:
    """Build a sortition_algorithms People object from CSV rows."""
    feature_names = list(features.keys())
    people = People(feature_names)
    for i, row in enumerate(rows, start=2):
        pid = row["person_id"]
        people.add(pid, dict(row), features, i)
    return people


def _quota_fulfillment(rows: list[dict[str, str]], selected: Iterable[str], quotas: dict[str, Any]) -> list[dict[str, Any]]:
    sel = set(selected)
    sel_rows = [r for r in rows if r["person_id"] in sel]
    out: list[dict[str, Any]] = []
    for cat in quotas["categories"]:
        col = cat["column"]
        for val, b in cat["bounds"].items():
            count = sum(1 for r in sel_rows if r.get(col) == val)
            out.append(
                {
                    "column": col,
                    "value": val,
                    "selected": count,
                    "bound_min": int(b["min"]),
                    "bound_max": int(b["max"]),
                    "ok": int(b["min"]) <= count <= int(b["max"]),
                }
            )
    return out


def run(pool_csv: Path, quotas_json: Path, seed: int, out_json: Path | None = None) -> dict[str, Any]:
    headers, rows = _read_pool_csv(pool_csv)
    quotas = json.loads(quotas_json.read_text())
    features = _build_features(quotas)
    people = _build_people(rows, features)
    panel_size = int(quotas["panel_size"])
    address_columns: list[str] = []  # iteration 1 disables address checks

    t0 = time.perf_counter()
    committees, probabilities, _report = find_distribution_maximin(
        features,
        people,
        panel_size,
        address_columns,
        solver_backend="highspy",
    )
    t1 = time.perf_counter()

    # Sample one committee from the distribution using the seed.
    import random

    rng = random.Random(seed)
    u = rng.random()
    acc = 0.0
    chosen = next(iter(committees))
    for c, p in zip(committees, probabilities, strict=False):
        acc += p
        if u <= acc:
            chosen = c
            break

    selected = sorted(chosen)
    # `iter(People)` yields person_id strings.
    marginals: dict[str, float] = {pid: 0.0 for pid in people}
    for c, prob in zip(committees, probabilities, strict=False):
        for agent_id in c:
            marginals[agent_id] = marginals.get(agent_id, 0.0) + prob

    result = {
        "selected": selected,
        "marginals": marginals,
        "quota_fulfillment": _quota_fulfillment(rows, selected, quotas),
        "timing": {
            "total_ms": (t1 - t0) * 1000.0,
            "num_committees": len(committees),
        },
        "engine_meta": {
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "solver": "highspy (native)",
            "algorithm": "maximin",
        },
        "committees": [
            {"members": sorted(c), "probability": float(p)}
            for c, p in zip(committees, probabilities, strict=False)
        ],
    }

    payload = {
        "schema_version": SCHEMA_VERSION,
        "input": {
            "pool_csv": str(pool_csv),
            "quotas_json": str(quotas_json),
            "pool_size": len(rows),
            "panel_size": panel_size,
            "seed": seed,
            "gurobi_available": GUROBI_AVAILABLE,
        },
        "result": result,
    }
    if out_json:
        out_json.parent.mkdir(parents=True, exist_ok=True)
        out_json.write_text(json.dumps(payload, indent=2))
    return payload


def main() -> int:
    p = argparse.ArgumentParser(description="Native Python reference runner (Reference C).")
    p.add_argument("--pool", type=Path, required=True, help="pool CSV (must have person_id column)")
    p.add_argument("--quotas", type=Path, required=True, help="quotas JSON (panel_size + categories[])")
    p.add_argument("--seed", type=int, default=42, help="seed for sampling one committee")
    p.add_argument("--out", type=Path, help="output JSON path; if omitted, prints to stdout")
    p.add_argument("--quiet", action="store_true", help="don't print summary line")
    args = p.parse_args()

    payload = run(args.pool, args.quotas, args.seed, args.out)
    if not args.quiet:
        r = payload["result"]
        ms = r["timing"]["total_ms"]
        n = r["timing"]["num_committees"]
        marg = r["marginals"]
        mn = min(marg.values()) if marg else 0
        mx = max(marg.values()) if marg else 0
        print(
            f"reference-c: panel={len(r['selected'])}, |C|={n}, "
            f"min_marg={mn:.4f}, max_marg={mx:.4f}, t={ms:.0f}ms",
            file=sys.stderr,
        )
    if args.out is None:
        print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
