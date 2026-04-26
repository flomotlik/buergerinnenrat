#!/usr/bin/env bash
# Cross-validate the Stage 1 TS implementation against the Python reference
# across many seeds, axis combinations, target sizes, and pool sizes.
# Both implementations MUST produce byte-identical outputs.

set -euo pipefail
cd "$(dirname "$0")/.."

PY=/opt/sortition-venv/bin/python
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

PASS=0
FAIL=0

generate_pool() {
  local size="$1" out="$2"
  pnpm exec tsx -e "
    import { generatePool, PROFILES } from './packages/core/src/index';
    const p = generatePool({ profile: PROFILES['kleinstadt-bezirkshauptort'], size: ${size}, seed: 42, tightness: 0.7 });
    console.log('person_id,gender,age_band,education,migration_background,district');
    for (const r of p) console.log([r.person_id, r.gender, r.age_band, r.education, r.migration_background, r.district].join(','));
  " > "$out" 2>/dev/null
}

run_case() {
  local pool="$1" axes="$2" target_n="$3" seed="$4" label="$5"
  local ts_out="$TMPDIR/ts.json" py_out="$TMPDIR/py.json"

  pnpm exec tsx scripts/stage1_cli.ts --input "$pool" --axes "$axes" \
    --target-n "$target_n" --seed "$seed" --out "$ts_out" 2>/dev/null

  $PY scripts/stage1_reference.py --input "$pool" --axes "$axes" \
    --target-n "$target_n" --seed "$seed" --output-json "$py_out"

  # Strict byte-equal comparison (after canonicalization).
  if $PY -c "
import json,sys
ts=json.load(open('$ts_out')); py=json.load(open('$py_out'))
sys.exit(0 if ts==py else 1)
"; then
    PASS=$((PASS+1))
    printf '  [PASS] %s\n' "$label"
  else
    FAIL=$((FAIL+1))
    printf '  [FAIL] %s\n' "$label"
    diff <($PY -c "import json; print(json.dumps(json.load(open('$ts_out')), indent=2, sort_keys=True))") \
         <($PY -c "import json; print(json.dumps(json.load(open('$py_out')), indent=2, sort_keys=True))") | head -30
  fi
}

# ---------------------------------------------------------------------------
echo "=== Generating pool fixtures ==="
generate_pool 200  "$TMPDIR/pool-200.csv"
generate_pool 1000 "$TMPDIR/pool-1000.csv"
generate_pool 6000 "$TMPDIR/pool-6000.csv"

echo
echo "=== Test sweep ==="

# Vary seeds (5 different seeds on same setup).
for seed in 1 42 12345 999999 2147483647; do
  run_case "$TMPDIR/pool-1000.csv" "district,age_band,gender" 100 "$seed" \
    "1000-pool, 100-target, 3-axes, seed=$seed"
done

# Vary target_n (small, mid, almost-pool).
for n in 1 50 100 300 999; do
  run_case "$TMPDIR/pool-1000.csv" "district,age_band,gender" "$n" 42 \
    "1000-pool, target=$n, 3-axes, seed=42"
done

# Vary axes (1-axis, 2-axes, 3-axes, no axes / SRS).
run_case "$TMPDIR/pool-1000.csv" "district"              100 42 "1000-pool, 1-axis (district)"
run_case "$TMPDIR/pool-1000.csv" "district,age_band"     100 42 "1000-pool, 2-axes"
run_case "$TMPDIR/pool-1000.csv" "district,age_band,gender" 100 42 "1000-pool, 3-axes"
run_case "$TMPDIR/pool-1000.csv" ""                      100 42 "1000-pool, 0-axes (SRS)"

# Vary pool size (small, medium, large).
run_case "$TMPDIR/pool-200.csv"  "district,age_band,gender"  50 42 "200-pool, 50-target"
run_case "$TMPDIR/pool-1000.csv" "district,age_band,gender" 100 42 "1000-pool, 100-target"
run_case "$TMPDIR/pool-6000.csv" "district,age_band,gender" 300 42 "6000-pool, 300-target"

# Edge: target_n = pool size (must select everything).
run_case "$TMPDIR/pool-200.csv"  "district,age_band,gender" 200 42 "200-pool, target=200 (all)"

# Edge: very fine stratification that produces empty / underfilled strata.
run_case "$TMPDIR/pool-200.csv"  "district,age_band,gender,education,migration_background" 100 42 \
    "200-pool, 5-axes (fine stratification, expect underfills)"

# Edge: target = 0.
run_case "$TMPDIR/pool-1000.csv" "district,age_band,gender" 0 42 "1000-pool, target=0 (empty result)"

# Umlaut robustness — verifies codepoint sort (not localeCompare).
# Pre-fix this case would diverge between TS and Python because TS
# String.prototype.localeCompare put 'Ä' next to 'A' in DE locale, but
# Python's default sort uses Unicode codepoint order (where 'Ü' > 'W').
{
  echo "person_id,district,gender"
  for i in 1 2 3 4 5; do echo "u${i},Wörth,male"; done
  for i in 6 7 8 9 10; do echo "u${i},Aachen,female"; done
  for i in 11 12 13 14 15; do echo "u${i},Übach,diverse"; done
} > "$TMPDIR/pool-umlaut.csv"
run_case "$TMPDIR/pool-umlaut.csv" "district,gender" 6 42 "umlaut-pool, codepoint sort verified"

echo
echo "=== Summary ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
[ "$FAIL" -eq 0 ]
