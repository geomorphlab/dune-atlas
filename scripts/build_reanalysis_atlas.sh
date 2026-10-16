#!/usr/bin/env bash
# Atlas stores of the MERRA-2 and JRA-3Q wind datasets (1980–2025), assembled locally from the parts made on Gadi
# (pipeline/gadi/reanalysis/atlas_cells.pbs -> pipeline/gadi/era5/era5_atlas_cells.py --dataset DS --qsat-subset
# --split-mb 200). Same code and order as the ERA5 atlas (scripts/build_era5_atlas.sh,
# scripts/build_era5_fields_pervar.py). See docs/records/validation-merra2-jra3q.md.
#
#   DUNE_WORLD_DATA=... scripts/build_reanalysis_atlas.sh merra2      (or jra3q)
#
# Inputs in $ST = staging/reanalysis/DS: DS_cellmasks.nc (cellmasks build --dataset DS), parts/ (tar parts and
# parts.md5 from Gadi). Outputs in $ST/stores (cells.zarr, fields/<var>.zarr x 23 + qsdiv.zarr, cells-aux.zarr,
# cells-aux-veg.zarr), uploaded under dune-atlas/v2/datasets/DS/; registry files in registry/earth/datasets/DS/.
set -euo pipefail
cd "$(dirname "$0")/.."
DS=${1:?usage: build_reanalysis_atlas.sh merra2|jra3q}
case "$DS" in merra2|jra3q) ;; *) echo "unknown dataset $DS" >&2; exit 2 ;; esac
ST=${ST:-staging/reanalysis/$DS}
DATA=${DUNE_WORLD_DATA:?set DUNE_WORLD_DATA to the source data directory}
export PYTHONPATH=$PWD/pipeline/src
PY=${PY:-python}
QS=${DS}_1980_2025_qsat_params.zarr
W=${W:-$ST/work}                  # scratch: the land-cell qsat copy (removed variable by variable)
mkdir -p "$ST/stores/fields" "$ST/logs" "$W" "$ST/vars"
log() { echo "$(date +%H:%M:%S) $*"; }

# 1. parts -> tars (md5 of every part as on Gadi) -> cells.zarr in stores/, land-cell qsat copy in work/
if [ ! -f "$ST/stores/cells.zarr/zarr.json" ]; then
  log "check parts"; (cd "$ST/parts" && md5sum -c --quiet parts.md5)
  for t in $(ls "$ST/parts" | sed -n 's/\.part[0-9][0-9]$//p' | sort -u); do
    log "tar $t"                          # parts streamed into tar (no reassembled copy on disk)
    case "$t" in
      cells_*) cat "$ST/parts/$t".part* | tar -xf - -C "$ST/stores" ;;
      "$QS.tar") cat "$ST/parts/$t".part* | tar -xf - -C "$W" ;;
    esac
  done
fi
ln -sf "$(cd "$ST" && pwd)/${DS}_cellmasks.nc" "$W/${DS}_cellmasks.nc"

# 2. aridity means on this dataset's footprints
[ -f "$ST/ai_cellmeans_$DS.npz" ] || $PY -m dune_atlas_pipeline.aridity cellmeans --grid "$DS" --data "$DATA" \
    --out "$ST/ai_cellmeans_$DS.npz"

# 3. field pyramids, colour-limit statistics and flux divergence, one variable at a time (all variables are
#    already in work/; the script removes each one when its pyramid is written)
$PY scripts/build_era5_fields_pervar.py --dataset "$DS" --vars-dir "$ST/vars" --work "$W" --st "$ST" \
    > "$ST/logs/fields.log" 2>&1
log fields done

# 4. sidecars
[ -d "$ST/stores/cells-aux.zarr" ] || $PY -m dune_atlas_pipeline.cli cells-aux --dataset "$DS" --data "$W" \
    --qsdiv "$ST/qsdiv_native_$DS.zarr" --ai "$ST/ai_cellmeans_$DS.npz" --out "$ST/stores/cells-aux.zarr" \
    > "$ST/logs/cells_aux.json"
[ -d "$ST/stores/cells-aux-veg.zarr" ] || $PY -m dune_atlas_pipeline.vegetation cellsaux --dataset "$DS" \
    --nc staging/new-layers/veg/tot_cov_mean_2001_2025.nc --data "$W" --out "$ST/stores/cells-aux-veg.zarr" \
    > "$ST/logs/cells_aux_veg.json"

# 5. registry files (registry/earth/datasets/DS/): colour limits from this build's statistics
mkdir -p "registry/earth/datasets/$DS"
cp "$ST/qsat_field_metadata.json" "registry/earth/datasets/$DS/qsat_field_metadata.json"
$PY -m dune_atlas_pipeline.dataset_registry write --dataset "$DS"
# (stores/fields also holds .<var>.done markers: upload the <var>.zarr directories only)
log done
