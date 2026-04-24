"""Cross-language consistency: compute_metrics in Python vs TS produce
the same output for the same input (within FP tolerance).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

from quality_metrics import compute_metrics  # noqa: E402


SAMPLE_RESULT = {
    "selected": ["p1", "p3", "p7"],
    "marginals": {
        "p1": 0.3333,
        "p2": 0.0,
        "p3": 0.3333,
        "p4": 0.6667,
        "p5": 0.5,
        "p6": 0.0,
        "p7": 0.3333,
        "p8": 0.6667,
    },
    "quota_fulfillment": [
        {
            "column": "gender",
            "value": "female",
            "selected": 2,
            "bound_min": 1,
            "bound_max": 3,
            "ok": True,
        },
    ],
    "timing": {"total_ms": 1, "num_committees": 1},
    "engine_meta": {
        "engine_id": "engine-a-highs",
        "engine_version": "0.1.0",
        "solver": "highs",
        "algorithm": "maximin",
    },
}


def _ts_metrics(sample_path: Path) -> dict:
    """Invoke tsx CLI to run the TS metrics module and print JSON to stdout."""
    sample_path.write_text(json.dumps(SAMPLE_RESULT))
    tsx_cli = REPO / "node_modules" / ".pnpm" / "tsx@4.21.0" / "node_modules" / "tsx" / "dist" / "cli.mjs"
    if not tsx_cli.exists():
        raise RuntimeError(f"tsx CLI not at {tsx_cli}")
    runner_ts = REPO / "tests" / "python" / "_run_ts_metrics.ts"
    proc = subprocess.run(
        ["node", str(tsx_cli), str(runner_ts), str(sample_path)],
        capture_output=True,
        text=True,
        check=True,
        cwd=REPO,
    )
    return json.loads(proc.stdout)


def test_python_ts_metrics_match(tmp_path: Path) -> None:
    sample = tmp_path / "sample.json"
    py = compute_metrics(SAMPLE_RESULT)
    ts = _ts_metrics(sample)

    keys = ("min_pi", "min_pi_2", "min_pi_3", "variance_pi", "gini", "count_below_epsilon")
    for k in keys:
        assert abs(py[k] - ts[k]) < 1e-9, f"{k}: py={py[k]}, ts={ts[k]}"
    assert py["reproducibility_hash"] == ts["reproducibility_hash"]
