#!/usr/bin/env bash
# Atlas stores of the ERA5 (0.25°) wind dataset, built locally from the land-cell source copies made on Gadi
# (pipeline/gadi/era5/era5_atlas_prep.py). See docs/records/validation-era5.md ("Atlas stores").
#
#   ST=staging/era5/atlas scripts/build_era5_atlas.sh
#
# Inputs in $ST: era5_lsm.npy (Gadi), data/{era5_1950_2024_uam10_hist.zarr, era5_1950_2024_qsat_params.zarr}
# (land cells, extracted from the transfer tars). Outputs in $ST/stores (uploaded under dune-atlas/v1/datasets/era5/).
set -euo pipefail
cd "$(dirname "$0")/.."
ST=${ST:-staging/era5/atlas}
DATA=${DUNE_WORLD_DATA:?set DUNE_WORLD_DATA to the source data directory}
export PYTHONPATH=$PWD/pipeline/src
PY=${PY:-python}
mkdir -p "$ST/stores/fields" "$ST/logs"
D=$ST/data
log() { echo "$(date +%H:%M:%S) $*"; }

# 1. cell masks (land = lsm > 0.5, dunes = overlap with 0.1° dune cells, lsm) and the per-cell external data
[ -f "$ST/era5_cellmasks.nc" ] || $PY -m dune_atlas_pipeline.cellmasks build --lsm "$ST/era5_lsm.npy" --data "$DATA" \
    --out "$ST/era5_cellmasks.nc" > "$ST/cellmasks_stats.json"
ln -sf ../era5_cellmasks.nc "$D/era5_cellmasks.nc"
[ -f "$ST/ai_cellmeans_era5.npz" ] || $PY -m dune_atlas_pipeline.aridity cellmeans --grid era5 --data "$DATA" \
    --out "$ST/ai_cellmeans_era5.npz"

# 2. cells.zarr. The published store was built on Gadi next to the data (pipeline/gadi/era5/era5_atlas_cells.py,
#    same cellstore code) and streamed to R2 in parts (scripts/upload_era5_parts.py), because it needs the
#    histogram store; locally (with $D/era5_1950_2024_uam10_hist.zarr present) the same command is:
if [ -d "$D/era5_1950_2024_uam10_hist.zarr" ] && [ ! -d "$ST/stores/cells.zarr" ]; then
  log cells; $PY -m dune_atlas_pipeline.cellstore write --dataset era5 --data "$D" --out "$ST/stores/cells.zarr" \
      --workers ${WORKERS:-8} > "$ST/logs/cells.log" 2>&1
fi

# 3. colour-limit statistics + field pyramids (3 processes)
log metadata; $PY -m dune_atlas_pipeline.dataset_registry metadata --dataset era5 --data "$D"
VARS=(ab ae at ao rdpa dpm rdpm qnlb qncb qalb qacb qnle qale qace qha_rdp_dp sige_sigh qhab_nl_nc qhab_ac_nc qhne_ac_nl ufm uft qhbf qhef)
pids=()
for k in 0 1 2; do
  sel=(); for i in "${!VARS[@]}"; do [ $((i % 3)) -eq $k ] && sel+=("${VARS[$i]}"); done
  $PY -m dune_atlas_pipeline.fields build --dataset era5 --data "$D" --out "$ST/stores/fields" --vars "${sel[@]}" \
      > "$ST/logs/fields_$k.log" 2>&1 & pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
log fields done

# 4. flux divergence (staging copy, pyramid), sidecars
$PY -m dune_atlas_pipeline.qsdiv compute --dataset era5 --data "$D" --out "$ST/qsdiv_native_era5.zarr" > "$ST/logs/qsdiv_compute.json"
$PY -m dune_atlas_pipeline.qsdiv pyramid --dataset era5 --native "$ST/qsdiv_native_era5.zarr" --out "$ST/stores/fields/qsdiv.zarr" \
    > "$ST/logs/qsdiv_pyramid.json"
[ -d "$ST/stores/cells-aux.zarr" ] || $PY -m dune_atlas_pipeline.cli cells-aux --dataset era5 --data "$D" \
    --qsdiv "$ST/qsdiv_native_era5.zarr" --ai "$ST/ai_cellmeans_era5.npz" --out "$ST/stores/cells-aux.zarr" > "$ST/logs/cells_aux.json"
[ -d "$ST/stores/cells-aux-veg.zarr" ] || $PY -m dune_atlas_pipeline.vegetation cellsaux --dataset era5 \
    --nc staging/new-layers/veg/tot_cov_mean_2001_2025.nc --data "$D" --out "$ST/stores/cells-aux-veg.zarr" > "$ST/logs/cells_aux_veg.json"

# 5. registry files (registry/earth/datasets/era5/)
$PY -m dune_atlas_pipeline.dataset_registry write --dataset era5
# (stores/fields also holds build_stats.jsonl and .<var>.done markers: upload the <var>.zarr directories only)
log done
