"""Tests for scripts/quality_metrics.py."""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

from quality_metrics import compute_metrics, aggregate_multi_run  # noqa: E402


def make_result(marginals: dict[str, float], selected: list[str]) -> dict:
    return {
        "selected": selected,
        "marginals": marginals,
        "quota_fulfillment": [
            {
                "column": "gender",
                "value": "female",
                "selected": len(selected),
                "bound_min": 1,
                "bound_max": len(selected) + 1,
                "ok": True,
            }
        ],
    }


def test_uniform_distribution_gini_zero() -> None:
    m = compute_metrics(make_result({"a": 0.1, "b": 0.1, "c": 0.1, "d": 0.1}, ["a", "b"]))
    assert abs(m["gini"]) < 1e-8
    assert abs(m["variance_pi"]) < 1e-8
    assert m["min_pi"] == 0.1
    assert m["count_below_epsilon"] == 0


def test_one_zero_outlier_high_gini() -> None:
    m = compute_metrics(make_result({"a": 0, "b": 0.4, "c": 0.4, "d": 0.4}, ["b"]))
    assert m["min_pi"] == 0
    assert m["gini"] > 0.1
    assert m["count_below_epsilon"] == 1


def test_reproducibility_hash_deterministic() -> None:
    r = make_result({"a": 0.5, "b": 0.5}, ["a", "b"])
    m1 = compute_metrics(r)
    m2 = compute_metrics(r)
    assert m1["reproducibility_hash"] == m2["reproducibility_hash"]
    assert len(m1["reproducibility_hash"]) == 64


def test_aggregate_multi_run() -> None:
    a = make_result({"p1": 0.3, "p2": 0.3, "p3": 0.3}, ["p1", "p2"])
    b = make_result({"p1": 0.3, "p2": 0.3, "p3": 0.3}, ["p2", "p3"])
    c = make_result({"p1": 0.3, "p2": 0.3, "p3": 0.3}, ["p1", "p3"])
    agg = aggregate_multi_run([a, b, c])
    assert agg["panel_frequency"]["p1"] == 2
    assert agg["panel_frequency"]["p2"] == 2
    assert agg["panel_frequency"]["p3"] == 2
    assert agg["panel_signature_count"] == 3
