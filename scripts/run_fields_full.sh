#!/usr/bin/env bash
# Build the published global field pyramids (fields/<var>.zarr; cellstore.FIELD_VARS = 19 of 23,
# see constants.WITHHELD_VARS). COGS=1 also builds the DP COG prototype set.
#
#   scripts/run_fields_full.sh [OUT_DIR]        OUT_DIR: e.g. $STAGING/v1
#
# Expected (measured on dpm/at/qhef/qncb/uft, docs/records/validation-fields.md): ~15-20 s and ~4.7 GB peak
# RSS per variable (sequential), ~6-7 GB total on disk. Resumable: a finished variable leaves
# OUT_DIR/fields/.<var>.done and is skipped on re-run (pass FORCE=1 to rebuild).
# Do NOT point OUT_DIR at the internal disk for the full set.
#
# Upload (after review):  rclone copy OUT_DIR/fields r2:<bucket>/dune-atlas/v1/fields --transfers 32
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:?usage: scripts/run_fields_full.sh OUT_DIR}"
DATA="${DUNE_WORLD_DATA:?set DUNE_WORLD_DATA to the source data directory}"
mkdir -p "$OUT/fields"; [[ "${COGS:-0}" == 1 ]] && mkdir -p "$OUT/cogs"
export PYTHONPATH="$PWD/pipeline/src${PYTHONPATH:+:$PYTHONPATH}"
EXTRA=()
[[ "${FORCE:-0}" == 1 ]] && EXTRA+=(--force)

free_gb=$(df -g "$OUT" | awk 'NR==2 {print $4}')
if (( free_gb < 12 )); then echo "only ${free_gb} GB free on $OUT (need ~12 incl. headroom)" >&2; exit 1; fi

# One process per variable keeps peak RSS at ~4.7 GB (one global float32 cube + coarse levels).
VARS=$(python -c "from dune_atlas_pipeline.cellstore import FIELD_VARS; print(' '.join(FIELD_VARS))")
for v in $VARS; do
  python -W ignore -m dune_atlas_pipeline.fields build --data "$DATA" --out "$OUT/fields" --vars "$v" \
    ${EXTRA[@]+"${EXTRA[@]}"} 2>&1 | tee -a "$OUT/fields/build.log"
done
# COG fallback prototype (DP) is not part of the release: DP is withheld (constants.WITHHELD_VARS).
if [[ "${COGS:-0}" == 1 ]]; then
  python -W ignore -m dune_atlas_pipeline.cogs --data "$DATA" --out "$OUT/cogs" 2>&1 | tee -a "$OUT/cogs/build.log"
fi

n=$(ls -d "$OUT"/fields/*.zarr | wc -l | tr -d ' ')
echo "pyramids: $n/23   size: $(du -sh "$OUT/fields" | cut -f1)   cogs: $(du -sh "$OUT/cogs" | cut -f1)"
[[ "$n" == 23 ]]
