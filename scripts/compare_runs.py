#!/usr/bin/env python3
"""Three-way comparison harness — orchestrates Engine A (TS), Engine B (Pyodide),
and Reference C (native Python) on a fixed set of pools × seeds, then
aggregates quality metrics.

Iteration 1 status:
- Engine A: enabled (via tsx wrapper)
- Engine B: SKIPPED — depends on issues #12-#14 which are pending
- Reference C: enabled (via scripts/reference_run.py)

The output bundle lives under .benchmarks/<timestamp>/ with per-run JSON,
a summary.json, and a comparison.md report.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
DEFAULT_BENCHMARKS = REPO / ".benchmarks"


SETUPS = ("engine-a", "reference-c")  # engine-b is pending #12-#14
DEFAULT_SEEDS = (1, 2, 3, 4, 5)


def _run_engine_a(pool_csv: Path, quotas_json: Path, seed: int, out: Path) -> dict[str, Any] | None:
    out.parent.mkdir(parents=True, exist_ok=True)
    tsx_cli = REPO / "node_modules" / ".pnpm" / "tsx@4.21.0" / "node_modules" / "tsx" / "dist" / "cli.mjs"
    runner = REPO / "scripts" / "run_engine_a.ts"
    proc = subprocess.run(
        [
            "node",
            str(tsx_cli),
            str(runner),
            "--pool",
            str(pool_csv),
            "--quotas",
            str(quotas_json),
            "--seed",
            str(seed),
            "--out",
            str(out),
        ],
        capture_output=True,
        text=True,
        cwd=REPO,
        env={**os.environ, "NODE_ENV": "production"},
    )
    if proc.returncode != 0:
        return {"setup": "engine-a", "ok": False, "error": proc.stderr.strip()[:500]}
    return {"setup": "engine-a", "ok": True}


def _run_reference_c(pool_csv: Path, quotas_json: Path, seed: int, out: Path) -> dict[str, Any]:
    out.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [
            sys.executable,
            str(REPO / "scripts" / "reference_run.py"),
            "--pool",
            str(pool_csv),
            "--quotas",
            str(quotas_json),
            "--seed",
            str(seed),
            "--out",
            str(out),
            "--quiet",
        ],
        capture_output=True,
        text=True,
        cwd=REPO,
    )
    if proc.returncode != 0:
        return {"setup": "reference-c", "ok": False, "error": proc.stderr.strip()[:500]}
    return {"setup": "reference-c", "ok": True}


def _run_one(pool_csv: Path, quotas_json: Path, seed: int, setup: str, run_dir: Path) -> dict[str, Any]:
    out = run_dir / setup / f"{seed}.json"
    t0 = time.perf_counter()
    if setup == "engine-a":
        meta = _run_engine_a(pool_csv, quotas_json, seed, out)
    elif setup == "reference-c":
        meta = _run_reference_c(pool_csv, quotas_json, seed, out)
    else:
        meta = {"setup": setup, "ok": False, "error": "unknown setup"}
    t1 = time.perf_counter()
    meta["wall_time_s"] = t1 - t0
    meta["seed"] = seed
    meta["out"] = str(out)
    return meta


def _load_metrics(out_path: Path) -> dict[str, Any] | None:
    if not out_path.exists():
        return None
    try:
        doc = json.loads(out_path.read_text())
        result = doc.get("result")
        if not result:
            return None
        sys.path.insert(0, str(REPO / "scripts"))
        from quality_metrics import compute_metrics  # type: ignore

        return compute_metrics(result)
    except Exception as e:
        return {"error": str(e)}


def _aggregate(run_dir: Path, pools: list[str], setups: tuple[str, ...], seeds: tuple[int, ...]) -> dict[str, Any]:
    summary: dict[str, Any] = {"pools": {}}
    for pool_name in pools:
        per_setup: dict[str, Any] = {}
        for setup in setups:
            metrics_per_seed: list[dict[str, Any]] = []
            wall_times: list[float] = []
            for seed in seeds:
                out = run_dir / pool_name / setup / f"{seed}.json"
                if not out.exists():
                    continue
                m = _load_metrics(out)
                if m and "error" not in m:
                    metrics_per_seed.append(m)
                doc = json.loads(out.read_text())
                if "duration_ms" in doc:
                    wall_times.append(doc["duration_ms"])
                elif "result" in doc and doc.get("result") and "timing" in doc["result"]:
                    wall_times.append(doc["result"]["timing"]["total_ms"])
            if not metrics_per_seed:
                per_setup[setup] = {"n": 0}
                continue
            per_setup[setup] = {
                "n": len(metrics_per_seed),
                "min_pi_avg": sum(m["min_pi"] for m in metrics_per_seed) / len(metrics_per_seed),
                "min_pi_med": sorted([m["min_pi"] for m in metrics_per_seed])[len(metrics_per_seed) // 2],
                "gini_avg": sum(m["gini"] for m in metrics_per_seed) / len(metrics_per_seed),
                "var_pi_avg": sum(m["variance_pi"] for m in metrics_per_seed) / len(metrics_per_seed),
                "below_eps_avg": sum(m["count_below_epsilon"] for m in metrics_per_seed) / len(metrics_per_seed),
                "wall_time_med_ms": sorted(wall_times)[len(wall_times) // 2] if wall_times else None,
                "wall_time_p95_ms": sorted(wall_times)[int(len(wall_times) * 0.95)] if wall_times else None,
            }
        summary["pools"][pool_name] = per_setup
    return summary


def _write_report(summary: dict[str, Any], out: Path, setups: tuple[str, ...]) -> None:
    lines = [
        "# Drei-Wege-Vergleich: Engine A vs Reference C",
        "",
        "Stand: " + dt.datetime.now().isoformat(timespec="seconds"),
        "",
        "Engine B (Pyodide) ist Iteration-1-Issue-12..14 — derzeit nicht enthalten.",
        "",
        "## min π_i (höher ist fairer)",
        "",
        "| Pool | " + " | ".join(setups) + " |",
        "| --- | " + " | ".join(["---"] * len(setups)) + " |",
    ]
    for pool, per in summary["pools"].items():
        cells = []
        for s in setups:
            v = per.get(s, {}).get("min_pi_avg")
            cells.append(f"{v:.4f}" if v is not None else "—")
        lines.append(f"| {pool} | " + " | ".join(cells) + " |")

    lines += ["", "## Gini (niedriger ist gleichmäßiger)", "",
              "| Pool | " + " | ".join(setups) + " |",
              "| --- | " + " | ".join(["---"] * len(setups)) + " |"]
    for pool, per in summary["pools"].items():
        cells = []
        for s in setups:
            v = per.get(s, {}).get("gini_avg")
            cells.append(f"{v:.4f}" if v is not None else "—")
        lines.append(f"| {pool} | " + " | ".join(cells) + " |")

    lines += ["", "## Laufzeit Median (ms)", "",
              "| Pool | " + " | ".join(setups) + " |",
              "| --- | " + " | ".join(["---"] * len(setups)) + " |"]
    for pool, per in summary["pools"].items():
        cells = []
        for s in setups:
            v = per.get(s, {}).get("wall_time_med_ms")
            cells.append(f"{v:.0f}" if v is not None else "—")
        lines.append(f"| {pool} | " + " | ".join(cells) + " |")

    out.write_text("\n".join(lines) + "\n")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, help="output directory; default .benchmarks/<timestamp>")
    p.add_argument("--pool", action="append", help="pool fixture name (can repeat); default: small set")
    p.add_argument("--seeds", default="1,2,3", help="comma-separated seeds")
    p.add_argument("--setups", default=",".join(SETUPS))
    p.add_argument("--small-only", action="store_true", help="only the 100-person synth pool + example_small_20")
    args = p.parse_args()

    timestamp = dt.datetime.now().strftime("%Y%m%dT%H%M%S")
    out_dir = args.out or DEFAULT_BENCHMARKS / timestamp
    out_dir.mkdir(parents=True, exist_ok=True)

    pools = args.pool or [
        "tests/fixtures/paper-pools/example_small_20.csv:auto-quotas-from-paper",
        "tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n100-s42-t070.csv:scripts/quotas/kleinstadt-100-panel20.json",
    ]
    if not args.small_only:
        pools.append(
            "tests/fixtures/synthetic-pools/aussenbezirk-mittelgross-n100-s42-t070.csv:scripts/quotas/aussenbezirk-100-panel20.json"
        )

    seeds = tuple(int(s) for s in args.seeds.split(","))
    setups = tuple(s.strip() for s in args.setups.split(","))

    runs: list[dict[str, Any]] = []
    pool_names: list[str] = []
    for entry in pools:
        if ":" in entry:
            pool_path_s, quotas_path_s = entry.split(":", 1)
        else:
            pool_path_s, quotas_path_s = entry, ""
        pool_path = (REPO / pool_path_s).resolve()
        if quotas_path_s == "auto-quotas-from-paper":
            quotas_path = pool_path.with_suffix(".quotas.json")
            quotas_path = _convert_paper_quotas(quotas_path, out_dir)
        else:
            quotas_path = (REPO / quotas_path_s).resolve()
        if not pool_path.exists() or not quotas_path.exists():
            print(f"[skip] {pool_path.name}: pool or quotas missing")
            continue
        pool_name = pool_path.stem
        pool_names.append(pool_name)
        for setup in setups:
            for seed in seeds:
                meta = _run_one(pool_path, quotas_path, seed, setup, out_dir / pool_name)
                runs.append({"pool": pool_name, **meta})
                if not meta.get("ok"):
                    print(f"[fail] {pool_name}/{setup}/{seed}: {meta.get('error', '')[:120]}")

    summary = _aggregate(out_dir, pool_names, setups, seeds)
    summary["runs"] = runs
    summary["timestamp"] = timestamp
    summary["pools_run"] = pool_names
    summary["setups_run"] = list(setups)
    summary["seeds"] = list(seeds)
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    _write_report(summary, out_dir / "comparison.md", setups)

    print(f"[done] {out_dir}")
    print(f"[done] summary: {out_dir / 'summary.json'}")
    print(f"[done] report:  {out_dir / 'comparison.md'}")
    return 0


def _convert_paper_quotas(paper_quotas: Path, out_dir: Path) -> Path:
    """Translate paper-pools .quotas.json (features[] format) into our
    QuotaConfig (categories[] with bounds map)."""
    out = out_dir / f"{paper_quotas.stem}.engine-quotas.json"
    if out.exists():
        return out
    src = json.loads(paper_quotas.read_text())
    cats: list[dict[str, Any]] = []
    for f in src["features"]:
        bounds: dict[str, Any] = {}
        for v in f["values"]:
            bounds[v["value"]] = {"min": int(v["min"]), "max": int(v["max"])}
        cats.append({"column": f["name"], "bounds": bounds})
    out.write_text(json.dumps({"panel_size": int(src["panel_size"]), "categories": cats}, indent=2))
    return out


if __name__ == "__main__":
    raise SystemExit(main())
