"""Property tests for the synthetic pool generator."""

from __future__ import annotations

import csv
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "scripts" / "generate_pool.py"


def _run(out: Path, *, size: int, seed: int, tightness: float, community: str) -> None:
    subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--size",
            str(size),
            "--seed",
            str(seed),
            "--tightness",
            str(tightness),
            "--community",
            community,
            "--out",
            str(out),
        ],
        check=True,
    )


def _read_rows(p: Path) -> list[dict[str, str]]:
    with p.open("r", newline="") as f:
        return list(csv.DictReader(f))


def test_determinism_same_seed_same_output(tmp_path: Path) -> None:
    """Same args → byte-identical output."""
    a = tmp_path / "a.csv"
    b = tmp_path / "b.csv"
    _run(a, size=200, seed=42, tightness=0.7, community="kleinstadt-bezirkshauptort")
    _run(b, size=200, seed=42, tightness=0.7, community="kleinstadt-bezirkshauptort")
    assert a.read_bytes() == b.read_bytes()


def test_different_seed_different_output(tmp_path: Path) -> None:
    a = tmp_path / "a.csv"
    b = tmp_path / "b.csv"
    _run(a, size=200, seed=42, tightness=0.7, community="kleinstadt-bezirkshauptort")
    _run(b, size=200, seed=43, tightness=0.7, community="kleinstadt-bezirkshauptort")
    assert a.read_bytes() != b.read_bytes()


def test_row_count_matches_size(tmp_path: Path) -> None:
    p = tmp_path / "p.csv"
    _run(p, size=137, seed=1, tightness=0.7, community="industriestadt-klein")
    rows = _read_rows(p)
    assert len(rows) == 137


def test_unique_person_ids(tmp_path: Path) -> None:
    p = tmp_path / "p.csv"
    _run(p, size=500, seed=1, tightness=0.7, community="innenstadt-gross")
    rows = _read_rows(p)
    ids = [r["person_id"] for r in rows]
    assert len(set(ids)) == len(ids)


def test_all_community_profiles_runnable(tmp_path: Path) -> None:
    for c in (
        "innenstadt-gross",
        "aussenbezirk-mittelgross",
        "kleinstadt-bezirkshauptort",
        "bergdorf-tourismus",
        "wachstumsgemeinde-umland",
        "industriestadt-klein",
    ):
        p = tmp_path / f"{c}.csv"
        _run(p, size=50, seed=99, tightness=0.6, community=c)
        rows = _read_rows(p)
        assert len(rows) == 50
        # The community code is the prefix of every person_id.
        assert all(r["person_id"].startswith(c + "-") for r in rows)
