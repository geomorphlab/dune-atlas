#!/bin/bash
# Mars cells.zarr on Gadi (PBS). Submitted with qsub -v CODE=<code dir>,MODE=pilot|full[,NPROC=..] and the
# resources on the qsub command line (pilot: ncpus=8 mem=32GB; full: ncpus=48 mem=190GB).
#   CODE  extracted code snapshot (contains pipeline/src and pipeline/gadi/mars, dunefrac.npz)
#   MODE  pilot: 3 shards around Nili Patera / Proctor / the north polar erg + keepbits benchmark
#         full:  every shard into cells.zarr.new, validate, statistics (stats.py), fixture (fixture.py), then swap
#                (old store -> cells.zarr.v0); optional WORKNAME = work subdirectory (default full)
set -euo pipefail
PY=/g/data/k10/ag5517/apps/dune_atlas_venv/bin/python
ROOT=/scratch/k10/ag5517/dune-atlas/mars
RAW=$ROOT/raw/fv3betaout1
test -x "$PY" || { echo "no interpreter $PY"; exit 127; }
test -f "$RAW/03340.atmos_daily.nc" || { echo "no FV3 file"; exit 2; }
test -f "$CODE/dunefrac.npz" || { echo "no dunefrac"; exit 2; }
test -f "$CODE/pipeline/src/dune_atlas_pipeline/mars/cells.py" || { echo "bad code layout"; exit 2; }
export PYTHONPATH=$CODE/pipeline/src
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMBA_NUM_THREADS=1
export NUMBA_CACHE_DIR=${PBS_JOBFS:-/tmp}/numba
NPROC=${NPROC:-$PBS_NCPUS}
"$PY" -c "import dune_atlas_pipeline.mars.fields as F, zarr, numcodecs, netCDF4; print('numba', F.HAVE_NUMBA, 'zarr', zarr.__version__)"
if [ "$MODE" = pilot ]; then
  OUT=$ROOT/work/wind/pilot/cells.zarr; WORK=$ROOT/work/wind/pilot
  rm -rf "$OUT"; mkdir -p "$WORK"
  "$PY" -u -m dune_atlas_pipeline.mars.cells build --fv3 "$RAW" --dunefrac "$CODE/dunefrac.npz" --out "$OUT" \
      --workdir "$WORK" --nproc "$NPROC" --shards 32,112 64,96 0,144 --bench-shard 32,112
  du -sb "$OUT/series" "$OUT/fields" > "$WORK/du.txt" || true
elif [ "$MODE" = full ]; then
  # build into cells.zarr.new, validate, statistics and fixture from the new store, then swap: the previous store
  # (and export) are kept as cells.zarr.v0 (export.v0) until integration. Nothing is swapped if any step fails.
  DS=$ROOT/stores/datasets/fv3-beta1; OUT=$DS/cells.zarr; NEW=$OUT.new; EXP=$DS/export; EXPNEW=$EXP.new
  WORK=$ROOT/work/wind/${WORKNAME:-full}
  if [ -e "$OUT" ] && [ -e "$OUT.v0" ]; then echo "refusing: $OUT.v0 exists"; exit 6; fi
  rm -rf "$NEW" "$EXPNEW"; mkdir -p "$WORK" "$EXPNEW" "$DS"
  "$PY" -u -m dune_atlas_pipeline.mars.cells build --fv3 "$RAW" --dunefrac "$CODE/dunefrac.npz" --out "$NEW" \
      --workdir "$WORK" --nproc "$NPROC" --export "$EXPNEW"
  "$PY" -u -m dune_atlas_pipeline.mars.cells validate --store "$NEW" --out "$WORK/validate.json"
  "$PY" -u -m dune_atlas_pipeline.mars.stats --store "$NEW" --out "$EXPNEW/stats.json" --nproc "$NPROC"
  "$PY" -u -m dune_atlas_pipeline.mars.fixture --store "$NEW" --out "$ROOT/work/wind/fixture/cells.zarr"
  ( cd "$ROOT/work/wind/fixture" && tar cf ../fixture_cells.tar cells.zarr )
  if [ -e "$OUT" ]; then mv "$OUT" "$OUT.v0"; fi
  mv "$NEW" "$OUT"
  if [ -e "$EXP" ]; then rm -rf "$EXP.v0"; mv "$EXP" "$EXP.v0"; fi
  mv "$EXPNEW" "$EXP"
  du -sb "$OUT" "$ROOT/work/wind/fixture_cells.tar" > "$WORK/du.txt" || true
  find "$OUT" -type f | wc -l > "$WORK/objects.txt" || true
elif [ "$MODE" = splice ]; then
  # recompute one grain-size node (SPLICE_INDEX) of `fields` on a copy of the published store, validate (other nodes
  # bit-identical, new node smooth between its neighbours), export, statistics, fixture, then swap; the replaced
  # store/export are kept as *.$OLDTAG. The copy hard-links the unchanged series chunks (series/c/**).
  DS=$ROOT/stores/datasets/fv3-beta1; OUT=$DS/cells.zarr; NEW=$OUT.new; EXP=$DS/export; EXPNEW=$EXP.new
  WORK=$ROOT/work/wind/${WORKNAME:-splice}; FIX=$ROOT/work/wind/fixture_${WORKNAME:-splice}
  test -d "$OUT" && test ! -e "$OUT.$OLDTAG" && test ! -e "$EXP.$OLDTAG" || { echo "refusing: target names exist"; exit 6; }
  rm -rf "$NEW" "$EXPNEW" "$FIX"; mkdir -p "$WORK" "$EXPNEW" "$NEW/series"
  cp -p "$OUT/zarr.json" "$NEW/zarr.json"
  for a in fields dunes dune ls sol; do cp -a "$OUT/$a" "$NEW/$a"; done
  cp "$OUT/series/zarr.json" "$NEW/series/zarr.json"
  cp -al "$OUT/series/c" "$NEW/series/c"
  test "$(find "$NEW" -type f | wc -l)" = "$(find "$OUT" -type f | wc -l)" || { echo "copy incomplete"; exit 7; }
  "$PY" -u -m dune_atlas_pipeline.mars.cells splice --fv3 "$RAW" --store "$NEW" --index "$SPLICE_INDEX" \
      --workdir "$WORK" --nproc "$NPROC"
  "$PY" -u -m dune_atlas_pipeline.mars.cells validate-splice --new "$NEW" --old "$OUT" --index "$SPLICE_INDEX" \
      --out "$WORK/validate_splice.json"
  "$PY" -u -m dune_atlas_pipeline.mars.cells validate --store "$NEW" --out "$WORK/validate.json"
  "$PY" -u -m dune_atlas_pipeline.mars.cells export --store "$NEW" --out "$EXPNEW/fields_export.npz" \
      --rho-mean-from "$EXP/fields_export.npz"
  "$PY" -u -m dune_atlas_pipeline.mars.stats --store "$NEW" --out "$EXPNEW/stats.json" --nproc "$NPROC"
  "$PY" -u -m dune_atlas_pipeline.mars.fixture --store "$NEW" --out "$FIX/cells.zarr"
  ( cd "$FIX" && tar cf ../fixture_fields_${WORKNAME:-splice}.tar cells.zarr/zarr.json cells.zarr/fields )
  mv "$OUT" "$OUT.$OLDTAG"; mv "$NEW" "$OUT"
  mv "$EXP" "$EXP.$OLDTAG"; mv "$EXPNEW" "$EXP"
  du -sb "$OUT" "$OUT.$OLDTAG" "$EXP" "$EXP.$OLDTAG" "$FIX" > "$WORK/du.txt" || true
  find "$OUT" -type f | wc -l > "$WORK/objects.txt" || true
else
  echo "MODE?"; exit 2
fi
echo DONE
