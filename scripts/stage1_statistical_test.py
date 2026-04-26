"""
Statistical uniformity test for Stage 1.

Runs the Python reference implementation N_TRIALS times with different seeds
on the same input pool, and checks that each person's empirical selection
frequency converges to the theoretical n_h/N_h within statistical bounds.

If the algorithm is unbiased, the per-person selection count after N_TRIALS
should be approximately Binomial(N_TRIALS, n_h/N_h). We check that no person
falls outside a 4-sigma envelope (very loose; would catch any meaningful bias).

Usage:
    python3 scripts/stage1_statistical_test.py
"""
from __future__ import annotations

import math
import sys
from collections import Counter
from pathlib import Path

# Reuse the reference implementation.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from stage1_reference import stratify  # noqa: E402
from generate_pool import Mulberry32, generate_rows, PROFILES  # noqa: E402


# Reuse the kleinstadt-bezirkshauptort profile from generate_pool.py via
# the same generator the iteration-1 fixtures use.

POOL_SIZE = 1000
TARGET_N = 100
N_TRIALS = 2000  # Each trial: a different seed.
AXES = ["district", "age_band", "gender"]


def make_pool(size: int, seed: int) -> list[dict[str, str]]:
    return generate_rows(
        profile=PROFILES["kleinstadt-bezirkshauptort"],
        size=size,
        seed=seed,
        tightness=0.7,
    )


def stratum_key(row: dict[str, str], axes: list[str]) -> str:
    return "|".join(row[a] for a in axes)


def main() -> int:
    print(f"Stratified sampling statistical uniformity test")
    print(f"  Pool size:   {POOL_SIZE}")
    print(f"  Target N:    {TARGET_N}")
    print(f"  Trials:      {N_TRIALS}")
    print(f"  Axes:        {AXES}")
    print()

    pool = make_pool(POOL_SIZE, seed=42)

    # Bucketize once to know each person's stratum size + target allocation.
    stratum_to_indices: dict[str, list[int]] = {}
    for i, p in enumerate(pool):
        stratum_to_indices.setdefault(stratum_key(p, AXES), []).append(i)

    # Compute theoretical per-person selection probability under proportional
    # allocation: n_h / N_h, where n_h is the LRA target for the stratum.
    # For a clean test we use the LRA target from the first trial (it's
    # deterministic given pool composition + target_n; doesn't depend on seed).
    seed_for_alloc = 1
    first_run = stratify(pool, AXES, TARGET_N, seed_for_alloc)
    stratum_alloc: dict[str, int] = {}
    for s in first_run["strata"]:
        key = "|".join(s["key"][a] for a in AXES)
        stratum_alloc[key] = s["n_h_target"]

    # Per-person theoretical probability.
    theoretical_p: list[float] = []
    for i, p in enumerate(pool):
        k = stratum_key(p, AXES)
        n_h_target = stratum_alloc[k]
        n_h_pool = len(stratum_to_indices[k])
        p_select = n_h_target / n_h_pool if n_h_pool > 0 else 0.0
        theoretical_p.append(p_select)

    # Run N_TRIALS independent stratifications, each with a different seed.
    selection_count: list[int] = [0] * len(pool)
    for trial in range(N_TRIALS):
        seed = trial + 1  # 1..N_TRIALS, all uint32-safe
        result = stratify(pool, AXES, TARGET_N, seed)
        for idx in result["selected"]:
            selection_count[idx] += 1
        if (trial + 1) % 500 == 0:
            print(f"  ... {trial + 1}/{N_TRIALS} trials done")

    # Per-person: empirical count vs Binomial(N, p) expectation.
    # Theoretical mean: N * p; theoretical std: sqrt(N * p * (1-p)).
    # We flag any person whose count deviates by more than 4 sigma.
    print()
    print("Bias check (per-person 4-sigma envelope):")

    sigma_violations = 0
    max_z = 0.0
    max_z_person = -1
    sum_relative_dev = 0.0
    n_with_p_gt_zero = 0

    for i, p_select in enumerate(theoretical_p):
        if p_select == 0.0:
            # Person in a stratum with n_h_target=0 — should never be selected.
            if selection_count[i] != 0:
                print(f"  ERROR: person {i} in zero-target stratum was selected {selection_count[i]} times")
                sigma_violations += 1
            continue
        n_with_p_gt_zero += 1
        mean = N_TRIALS * p_select
        std = math.sqrt(N_TRIALS * p_select * (1 - p_select))
        observed = selection_count[i]
        z = (observed - mean) / std if std > 0 else 0.0
        if abs(z) > max_z:
            max_z = abs(z)
            max_z_person = i
        if abs(z) > 4.0:
            sigma_violations += 1
        if mean > 0:
            sum_relative_dev += abs(observed - mean) / mean

    avg_relative_dev = sum_relative_dev / max(1, n_with_p_gt_zero)

    print(f"  Persons with p > 0:               {n_with_p_gt_zero}")
    print(f"  Max |z-score|:                    {max_z:.2f}  (person {max_z_person}, p={theoretical_p[max_z_person]:.4f})")
    print(f"  Persons outside 4-sigma envelope: {sigma_violations}")
    print(f"  Avg |observed - expected| / expected: {avg_relative_dev * 100:.2f}%")

    # Strata-level check: total selections per stratum vs N_TRIALS * n_h_target.
    print()
    print("Stratum-level total selections vs N_TRIALS * n_h_target:")
    print("  (showing top 5 by relative deviation)")

    by_stratum_obs: Counter[str] = Counter()
    for i in range(len(pool)):
        if selection_count[i] > 0:
            by_stratum_obs[stratum_key(pool[i], AXES)] += selection_count[i]

    deviations = []
    for k, n_h_target in stratum_alloc.items():
        expected = N_TRIALS * n_h_target
        observed = by_stratum_obs[k]
        if expected > 0:
            rel = (observed - expected) / expected
            deviations.append((abs(rel), k, observed, expected, rel))
    deviations.sort(reverse=True)
    for _, k, obs, exp, rel in deviations[:5]:
        print(f"  {k:<60s} observed={obs:6d} expected={exp:6d} rel={rel * 100:+.2f}%")

    print()
    if sigma_violations == 0:
        print("PASS: No person outside 4-sigma envelope. Algorithm appears unbiased.")
        return 0
    else:
        print(f"FAIL: {sigma_violations} persons outside 4-sigma envelope.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
