#!/usr/bin/env bash
# Build the iteration-1 synthetic-pool fixtures.
# Six community profiles × four sizes × tightness=0.7 plus extra tightness sweeps.

set -euo pipefail
cd "$(dirname "$0")/.."

OUT=tests/fixtures/synthetic-pools
mkdir -p "$OUT"

for community in \
  innenstadt-gross \
  aussenbezirk-mittelgross \
  kleinstadt-bezirkshauptort \
  bergdorf-tourismus \
  wachstumsgemeinde-umland \
  industriestadt-klein
do
  for size in 100 500 1000 2000; do
    python scripts/generate_pool.py \
      --size "$size" --seed 42 --tightness 0.7 \
      --community "$community" \
      --out "$OUT/${community}-n${size}-s42-t070.csv"
  done
done

# Tightness sweep on the medium-sized community for property tests.
declare -a SWEEP=("0.3 030" "0.5 050" "0.7 070" "0.9 090")
for entry in "${SWEEP[@]}"; do
  tight="${entry% *}"
  tag="${entry#* }"
  python scripts/generate_pool.py \
    --size 500 --seed 7 --tightness "$tight" \
    --community kleinstadt-bezirkshauptort \
    --out "$OUT/sweep-kleinstadt-n500-s7-t${tag}.csv"
done

echo "fixtures generated: $(ls $OUT | wc -l)"
