#!/bin/bash
# Mars dune PMTiles + 2-degree overlap-fraction grid (local; conda env dune-atlas-tiles: tippecanoe, geopandas,
# pyproj, shapely, pmtiles). Inputs: the PI shapefile dunes.{shp,shx,dbf,prj,cpg} copied to
# staging/mars/terrain/dunes_src/; optional assessment grid for the comparison.
set -eu
R=$(cd "$(dirname "$0")/../../.." && pwd)
OUT=$R/staging/mars/terrain/dunes
PM=$R/staging/mars/devroot/dune-atlas/mars/v1/dunes/dunes.pmtiles
mkdir -p "$OUT" "$(dirname "$PM")"
cd "$R/pipeline"
PYTHONPATH=src nice python -m dune_atlas_pipeline.mars.dunes --shp "$R/staging/mars/terrain/dunes_src/dunes.shp" \
  --out-dir "$OUT" --pmtiles "$PM" --invert-pmtiles "$(dirname "$PM")/invert.pmtiles" ${ASSESSMENT_NPZ:+--compare "$ASSESSMENT_NPZ"}
cd "$R" && PYTHONPATH=pipeline/src python scripts/mars/terrain/write_registry.py --dunes-summary "$OUT/dunes_summary.json"
