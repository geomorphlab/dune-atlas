#!/usr/bin/env bash
# Full-grid conversion of the ERA5-Land wind histograms + qsat vectors to $STAGING/cells.zarr,
# followed by stats and validation. Resumable: rerun the same command to continue after an
# interruption (finished shards are recorded in $STAGING/cells.zarr.manifest.json).
#
#   conda activate dune-atlas
#   STAGING=/Volumes/MGL2TB/dune-atlas-staging scripts/run_cells_full.sh
#
# Env: STAGING (default /Volumes/MGL2TB/dune-atlas-staging), DUNE_WORLD_DATA (source dir),
#      WORKERS (default 4; ~1.5 GB RAM each), REGION ("y0 y1 x0 x1", default whole grid),
#      PYTHON (default python), CLEAN_APPLE_METADATA=1 to delete ._* / .DS_Store inside the store.
# Expect ~22-27 GB written, ~21,150 objects (see docs/validation-cells.md for the estimate).
set -euo pipefail

STAGING=${STAGING:-/Volumes/MGL2TB/dune-atlas-staging}
DATA=${DUNE_WORLD_DATA:-$HOME/Documents/research/projects/dune-world/data}
WORKERS=${WORKERS:-4}
REGION=${REGION:-0 1801 0 3600}
PYTHON=${PYTHON:-python}
REPO=$(cd "$(dirname "$0")/.." && pwd)
export PYTHONPATH="$REPO/pipeline/src${PYTHONPATH:+:$PYTHONPATH}"
export COPYFILE_DISABLE=1          # no AppleDouble (._*) files from macOS copy tools
export PYTHONWARNINGS=ignore::UserWarning   # zarr warns about .DS_Store in the source stores

[ -d "$STAGING" ] || { echo "staging dir $STAGING not found (drive mounted? app granted access?)" >&2; exit 2; }
[ -d "$DATA" ] || { echo "source data dir $DATA not found" >&2; exit 2; }
OUT="$STAGING/cells.zarr"
mkdir -p "$STAGING/logs"
touch "$STAGING/.metadata_never_index"   # ask Spotlight not to index the staging tree
STAMP=$(date +%Y%m%dT%H%M%S)
LOG="$STAGING/logs/cells_full_$STAMP.log"

free_gb=$(df -k "$STAGING" | awk 'NR==2 {print int($4/1048576)}')
echo "$(date) start: out=$OUT region=[$REGION] workers=$WORKERS free=${free_gb}GB" | tee -a "$LOG"
if [ "$REGION" = "0 1801 0 3600" ] && [ "$free_gb" -lt 30 ]; then
  echo "need >= 30 GB free on $STAGING (have ${free_gb} GB)" | tee -a "$LOG" >&2; exit 3
fi

T0=$(date +%s)
# shellcheck disable=SC2086
"$PYTHON" -m dune_atlas_pipeline.cellstore write --out "$OUT" --data "$DATA" \
  --region $REGION --workers "$WORKERS" 2>&1 | tee -a "$LOG"
T1=$(date +%s)
echo "$(date) conversion wall time $((T1 - T0)) s" | tee -a "$LOG"

junk=$(find "$OUT" \( -name '._*' -o -name '.DS_Store' \) | wc -l | tr -d ' ')
echo "macOS metadata files inside store: $junk" | tee -a "$LOG"
if [ "$junk" != "0" ] && [ "${CLEAN_APPLE_METADATA:-0}" = "1" ]; then
  find "$OUT" \( -name '._*' -o -name '.DS_Store' \) -print -delete | tee -a "$LOG"
fi

"$PYTHON" -m dune_atlas_pipeline.cellstore stats --out "$OUT" | tee "$STAGING/logs/cells_stats_$STAMP.json"
du -sk "$OUT" | awk '{printf "du: %.2f GB\n", $1/1048576}' | tee -a "$LOG"

"$PYTHON" -m dune_atlas_pipeline.cellstore validate --out "$OUT" --data "$DATA" --n 500 \
  --json "$STAGING/logs/cells_validate_$STAMP.json" > /dev/null
echo "$(date) validation passed ($STAGING/logs/cells_validate_$STAMP.json); total $(( $(date +%s) - T0 )) s" | tee -a "$LOG"
