#!/usr/bin/env python3
"""Synthetic pool generator (Python).

Produces a CSV pool of fake residents drawn from realistic-ish distributions
of Austrian cadastral community ("Katastralgemeinde") profiles. Designed to
generate the *same bytes* as the TypeScript twin in tools/generate-pool.ts
when given the same --size, --seed, --tightness, and --community.

The output is sorted by person_id ascending, which makes byte-identity
robust against PRNG-walk differences between the Python and TS implementations.

Why two implementations?
- The Python CLI feeds the native-Python reference runner (Issue #15) and
  the property-test fixtures (Issue #09).
- The TS implementation feeds the browser engines and Vitest property tests.

Both must converge on identical fixtures so that downstream comparisons
(Issue #19, three-way comparison) are not contaminated by data drift.
"""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path

# --- mulberry32 PRNG ---------------------------------------------------------
# Identical to the TS twin. Returns floats in [0, 1).
# Constants: 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35 — same as the canonical impl.

UINT32_MASK = 0xFFFFFFFF


class Mulberry32:
    """32-bit deterministic PRNG; identical output as the TS twin."""

    def __init__(self, seed: int) -> None:
        self._state = seed & UINT32_MASK

    def next_u32(self) -> int:
        self._state = (self._state + 0x6D2B79F5) & UINT32_MASK
        t = self._state
        t = ((t ^ (t >> 15)) * (t | 1)) & UINT32_MASK
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & UINT32_MASK)) & UINT32_MASK
        return (t ^ (t >> 14)) & UINT32_MASK

    def next_float(self) -> float:
        return self.next_u32() / 4294967296.0


# --- Community profiles ------------------------------------------------------
# Each profile is a target weight vector per attribute. The "tightness"
# parameter at sampling time says how strictly individuals reproduce these
# weights vs. how much noise is added — see _sample_attr().


@dataclass(frozen=True)
class CommunityProfile:
    code: str
    description: str
    typical_size: int
    gender: dict[str, float]
    age_band: dict[str, float]
    education: dict[str, float]
    migration_background: dict[str, float]
    districts: dict[str, float]  # sub-district / Sprengel-like split


GENDER_VALUES = ("female", "male", "diverse")
AGE_BANDS = ("16-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75+")
EDUCATION_VALUES = ("compulsory", "vocational", "matura", "tertiary")
MIGRATION_VALUES = ("none", "second_gen", "first_gen")


# Six Austrian-flavoured profiles spanning urban/suburb/small-town/rural axes.
# Distributions are stylised, not statistically validated — the generator is
# for testing the algorithm, not for demographic research.
PROFILES: dict[str, CommunityProfile] = {
    "innenstadt-gross": CommunityProfile(
        code="innenstadt-gross",
        description="Großstadtkern (Wien-Innere Stadt-artig): jung, hochgebildet, hoher Migrationsanteil.",
        typical_size=1500,
        gender={"female": 0.50, "male": 0.49, "diverse": 0.01},
        age_band={
            "16-24": 0.13,
            "25-34": 0.24,
            "35-44": 0.20,
            "45-54": 0.15,
            "55-64": 0.12,
            "65-74": 0.09,
            "75+": 0.07,
        },
        education={"compulsory": 0.12, "vocational": 0.28, "matura": 0.22, "tertiary": 0.38},
        migration_background={"none": 0.50, "second_gen": 0.20, "first_gen": 0.30},
        districts={"01-zentrum": 0.30, "02-uni": 0.25, "03-markt": 0.25, "04-bahnhof": 0.20},
    ),
    "aussenbezirk-mittelgross": CommunityProfile(
        code="aussenbezirk-mittelgross",
        description="Großstädtischer Außenbezirk (Wien-Floridsdorf-artig): familiengeprägt, mittlere Bildung.",
        typical_size=1000,
        gender={"female": 0.51, "male": 0.485, "diverse": 0.005},
        age_band={
            "16-24": 0.11,
            "25-34": 0.16,
            "35-44": 0.18,
            "45-54": 0.18,
            "55-64": 0.15,
            "65-74": 0.13,
            "75+": 0.09,
        },
        education={"compulsory": 0.20, "vocational": 0.40, "matura": 0.22, "tertiary": 0.18},
        migration_background={"none": 0.62, "second_gen": 0.22, "first_gen": 0.16},
        districts={
            "01-altsiedlung": 0.35,
            "02-neubau": 0.30,
            "03-gewerbe": 0.20,
            "04-wohnring": 0.15,
        },
    ),
    "kleinstadt-bezirkshauptort": CommunityProfile(
        code="kleinstadt-bezirkshauptort",
        description="Bezirkshauptort einer ländlichen Region (Tulln-artig): mittleres Alter, mittlere Bildung.",
        typical_size=600,
        gender={"female": 0.51, "male": 0.485, "diverse": 0.005},
        age_band={
            "16-24": 0.10,
            "25-34": 0.13,
            "35-44": 0.14,
            "45-54": 0.17,
            "55-64": 0.18,
            "65-74": 0.16,
            "75+": 0.12,
        },
        education={"compulsory": 0.22, "vocational": 0.45, "matura": 0.20, "tertiary": 0.13},
        migration_background={"none": 0.78, "second_gen": 0.13, "first_gen": 0.09},
        districts={"01-stadtkern": 0.40, "02-katastral-nord": 0.30, "03-katastral-sued": 0.30},
    ),
    "bergdorf-tourismus": CommunityProfile(
        code="bergdorf-tourismus",
        description="Bergdorf mit Tourismus (Sankt Anton-artig): klein, älter, niedrige formale Bildung im Schnitt.",
        typical_size=250,
        gender={"female": 0.49, "male": 0.51, "diverse": 0.0},
        age_band={
            "16-24": 0.08,
            "25-34": 0.10,
            "35-44": 0.11,
            "45-54": 0.16,
            "55-64": 0.20,
            "65-74": 0.20,
            "75+": 0.15,
        },
        education={"compulsory": 0.30, "vocational": 0.50, "matura": 0.13, "tertiary": 0.07},
        migration_background={"none": 0.85, "second_gen": 0.08, "first_gen": 0.07},
        districts={"01-dorfkern": 0.55, "02-streusiedlung": 0.45},
    ),
    "wachstumsgemeinde-umland": CommunityProfile(
        code="wachstumsgemeinde-umland",
        description="Wachstumsgemeinde im Speckgürtel (Mödling-artig): jung-familiär, hochgebildet.",
        typical_size=500,
        gender={"female": 0.505, "male": 0.49, "diverse": 0.005},
        age_band={
            "16-24": 0.11,
            "25-34": 0.18,
            "35-44": 0.22,
            "45-54": 0.18,
            "55-64": 0.13,
            "65-74": 0.10,
            "75+": 0.08,
        },
        education={"compulsory": 0.10, "vocational": 0.30, "matura": 0.25, "tertiary": 0.35},
        migration_background={"none": 0.72, "second_gen": 0.18, "first_gen": 0.10},
        districts={
            "01-altort": 0.30,
            "02-neubaugebiet": 0.40,
            "03-streusiedlung": 0.20,
            "04-bahnhof": 0.10,
        },
    ),
    "industriestadt-klein": CommunityProfile(
        code="industriestadt-klein",
        description="Kleine Industriestadt (Steyr-Stadtteil-artig): älter, niedrigere Bildung, mittlerer Migrationsanteil.",
        typical_size=400,
        gender={"female": 0.50, "male": 0.495, "diverse": 0.005},
        age_band={
            "16-24": 0.10,
            "25-34": 0.13,
            "35-44": 0.13,
            "45-54": 0.16,
            "55-64": 0.18,
            "65-74": 0.17,
            "75+": 0.13,
        },
        education={"compulsory": 0.25, "vocational": 0.50, "matura": 0.15, "tertiary": 0.10},
        migration_background={"none": 0.65, "second_gen": 0.20, "first_gen": 0.15},
        districts={"01-werkssiedlung": 0.45, "02-zentrum": 0.30, "03-randlage": 0.25},
    ),
}


# --- categorical sampling ----------------------------------------------------
# tightness in [0, 1] interpolates between uniform-noise (0) and exact target
# weights (1). At tightness=1 every draw uses the profile weights as-is.
# At tightness=0 every draw is uniform across categories (worst-case-quotas).


def _blend_weights(weights: dict[str, float], tightness: float) -> dict[str, float]:
    keys = list(weights.keys())
    uniform = 1.0 / len(keys)
    return {k: tightness * weights[k] + (1.0 - tightness) * uniform for k in keys}


def _sample_categorical(rng: Mulberry32, weights: dict[str, float], keys: tuple[str, ...]) -> str:
    """Sample one category. `keys` enforces deterministic key order across runs."""
    u = rng.next_float()
    acc = 0.0
    for k in keys:
        acc += weights[k]
        if u < acc:
            return k
    # numerical fallback — return last key
    return keys[-1]


# --- main generation ---------------------------------------------------------


def generate_rows(
    profile: CommunityProfile,
    size: int,
    seed: int,
    tightness: float,
) -> list[dict[str, str]]:
    rng = Mulberry32(seed)
    g = _blend_weights(profile.gender, tightness)
    a = _blend_weights(profile.age_band, tightness)
    e = _blend_weights(profile.education, tightness)
    m = _blend_weights(profile.migration_background, tightness)
    d = _blend_weights(profile.districts, tightness)

    district_keys = tuple(profile.districts.keys())
    rows: list[dict[str, str]] = []
    width = max(4, len(str(size)))
    for i in range(size):
        person_id = f"{profile.code}-{str(i + 1).zfill(width)}"
        rows.append(
            {
                "person_id": person_id,
                "gender": _sample_categorical(rng, g, GENDER_VALUES),
                "age_band": _sample_categorical(rng, a, AGE_BANDS),
                "education": _sample_categorical(rng, e, EDUCATION_VALUES),
                "migration_background": _sample_categorical(rng, m, MIGRATION_VALUES),
                "district": _sample_categorical(rng, d, district_keys),
            }
        )
    rows.sort(key=lambda r: r["person_id"])
    return rows


def write_csv(rows: list[dict[str, str]], out: Path) -> None:
    fields = ["person_id", "gender", "age_band", "education", "migration_background", "district"]
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Synthetic Austrian-style pool generator.")
    p.add_argument("--size", type=int, required=True, help="number of rows")
    p.add_argument("--seed", type=int, default=42, help="PRNG seed (uint32)")
    p.add_argument(
        "--tightness",
        type=float,
        default=0.7,
        help="0..1; 0 = uniform across categories, 1 = exact profile weights",
    )
    p.add_argument(
        "--community",
        choices=sorted(PROFILES.keys()),
        default="kleinstadt-bezirkshauptort",
        help="community profile to sample from",
    )
    p.add_argument("--out", type=Path, required=True, help="output CSV path")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not 0.0 <= args.tightness <= 1.0:
        print("--tightness must be in [0, 1]", file=sys.stderr)
        return 2
    profile = PROFILES[args.community]
    rows = generate_rows(profile, args.size, args.seed, args.tightness)
    write_csv(rows, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
