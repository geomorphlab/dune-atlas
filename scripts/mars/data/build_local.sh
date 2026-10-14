#!/bin/bash
# Mars Wind track, local part (after the Gadi build; pipeline/gadi/mars/cells_job.sh MODE=full):
#   staging/mars/export/fields_export.npz   (from /scratch/k10/ag5517/dune-atlas/mars/stores/datasets/fv3-beta1/export/)
#   staging/mars/export/fixture_cells.tar   (from /scratch/k10/ag5517/dune-atlas/mars/work/wind/fixture_cells.tar)
#   ELEV_NPZ (env)                          Terrain track's elev_mean.npz (cells-aux elev_mean)
# writes field pyramids + cells-aux.zarr into the dev mirror, the registry fragments and the field metadata,
# and unpacks the fixture cells.zarr into the dev mirror.
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
EXP=$REPO/staging/mars/export
ELEV_NPZ=${ELEV_NPZ:?set ELEV_NPZ to the Terrain elev_mean.npz}
DEV=$REPO/staging/mars/devroot
DS=$DEV/dune-atlas/mars/v2/datasets/fv3-beta1
mkdir -p "$DS"
cd "$REPO/pipeline"
PYTHONPATH=src nice python -m dune_atlas_pipeline.mars.sidecars all --export "$EXP/fields_export.npz" --devroot "$DEV" \
    --stats-out "$EXP/sidecars_stats.json" --elev-mean "$ELEV_NPZ"
rm -rf "$DS/cells.zarr"
tar xf "$EXP/fixture_cells.tar" -C "$DS"
du -sh "$DS"/* | sort -h
