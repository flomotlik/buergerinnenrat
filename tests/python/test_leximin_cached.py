"""Property tests for the cached paper leximin curves."""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FIXTURES = REPO / "tests" / "fixtures" / "paper-leximin-results"
EXPECTED_INSTANCES = ("sf_a_35", "sf_b_20", "sf_c_44", "sf_d_40", "sf_e_110")


def test_all_five_pools_present() -> None:
    for inst in EXPECTED_INSTANCES:
        assert (FIXTURES / f"{inst}.json").exists(), f"missing {inst}"


def test_each_pool_has_legacy_and_leximin() -> None:
    for inst in EXPECTED_INSTANCES:
        doc = json.loads((FIXTURES / f"{inst}.json").read_text())
        algos = doc["curves"].keys()
        assert "Legacy" in algos
        assert "LexiMin" in algos


def test_quantile_curve_monotone_in_percentile() -> None:
    for inst in EXPECTED_INSTANCES:
        doc = json.loads((FIXTURES / f"{inst}.json").read_text())
        for algo, points in doc["curves"].items():
            percentiles = [p["percentile"] for p in points]
            assert percentiles == sorted(percentiles), f"{inst}/{algo} not monotone"


def test_probabilities_in_unit_interval() -> None:
    for inst in EXPECTED_INSTANCES:
        doc = json.loads((FIXTURES / f"{inst}.json").read_text())
        for algo, points in doc["curves"].items():
            for p in points:
                assert 0.0 <= p["probability"] <= 1.0, f"{inst}/{algo}: {p}"


def test_metadata_present() -> None:
    for inst in EXPECTED_INSTANCES:
        doc = json.loads((FIXTURES / f"{inst}.json").read_text())
        assert doc["instance_id"] == inst
        assert "Flanigan" in doc["source"]
        assert doc["format"] == "quantile_curve"
