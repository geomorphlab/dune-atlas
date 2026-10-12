# Adding a layer

Every map layer is one entry in the **layer registry**: `registry/layers.yaml` (hand-written) plus
`registry/generated/*.yaml` (written by pipeline commands). The app reads the merged registry at
build time; CI (`npm run validate-registry`) rejects malformed entries. **Adding a layer of an existing
type needs no JavaScript.** Adding a new *type* of layer is covered in `docs/architecture.md`.

The workflow is always the same:

1. **Convert** the data to a web format with a pipeline command → writes into staging.
2. **Upload** to R2 under a versioned path (`dune-atlas/v1/...`; never overwrite a published path —
   publish changes as `v2/`).
3. **Register**: add/append a YAML entry (`source` relative to `data.geomorphlab.org`).
4. **Check & ship**: `cd app && npm run validate-registry && npm test`, preview locally, commit and
   push to `main` → GitHub Actions builds and deploys `map.geomorphlab.org`.

Layer types: `zarr-field` (gridded values, GPU colour-mapped, optional threshold slider),
`pmtiles-vector` (polygons/lines/points as vector tiles), `pmtiles-raster`, `cog`, `geojson-points`
(small point sets, a few MB at most).

---
## Example 0 — a field at its own native resolution (as built for the aridity index, 2026-10-13)

Layers that do not live on the wind grid keep their native grid: `nativepyramid.write_native_pyramid` writes a
GeoZarr pyramid with 2-D (y, x) arrays and level factors that divide the native shape exactly
(`nativepyramid.common_factors`). The atlas's aridity layer is built this way (not with Example 1):

```bash
dune-atlas aridity --out $STAGING/v1/fields/aridity.zarr            # native 30" pyramid + decode report
dune-atlas aridity-cells --out $STAGING/ai_cellmeans.npz            # 0.1-deg cell means (--grid era5 for 0.25 deg)
dune-atlas upload-new --version v1 --work $STAGING --store $STAGING/v1/fields/aridity.zarr=fields/aridity.zarr
dune-atlas extra-registry                                            # registry/generated/x_extra_fields.yaml
```
`upload-new` lists the bucket first and refuses any key that already exists (create-only puts). Per-cell values
for the click panel go into a NEW array of `cells-aux.zarr` (`cellsaux.write_variable`), never into `cells.zarr`.
Third-party data: fill `attribution: {source, citation, doi, licence, url, changes}` and `docs/sources.md`.

## Example 1 — a static gridded field on the 0.1° grid

(Illustrative: `dune-atlas/v1/fields/aridity.zarr` and the `aridity` layer id are now taken by the native
layer of Example 0, which uses the native Global-AI field. Use a new store name and id.)

```bash
conda activate dune-atlas
PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.static \
    --nc ~/Documents/research/projects/dune-world/data/layers.nc --var aridity \
    --title "Aridity index (AI)" --colormap viridis --log \
    --out $STAGING/v1/fields/aridity.zarr          # prints build stats incl. clim
rclone copy $STAGING/v1/fields/aridity.zarr r2:dune-atlas-data/dune-atlas/v1/fields/aridity.zarr \
    --exclude "._*" --exclude ".DS_Store"
```
Any 2-D field on the 0.1° ERA5-Land grid (1801 × 3600) works (`static.build_static_pyramid` from
Python for arrays you compute yourself). Registry entry (`registry/layers.yaml` → `layers:`):

```yaml
- id: aridity
  title: Aridity index (AI)
  group: static              # add `- {id: static, title: Climate & surface}` under groups: if new
  type: zarr-field
  source: dune-atlas/v1/fields/aridity.zarr
  variable: aridity
  thresholdAware: false      # no u*,th dimension → slider does not affect it
  units: dimensionless
  description: Global Aridity Index v3.1 (1970–2000), coarsened to the ERA5-Land 0.1° grid.
  citation: "Zomer et al. (2022) Sci Data; doi:10.6084/m9.figshare.7504448"
  visible: false
  opacity: 0.85
  queryable: false           # cell panel values come from cells.zarr (qsat fields only)
  display: {transform: none, colormap: viridis, clim: [0.0065, 4.2], log: true}
```
Use the `clim` printed by the build. Colormap names: `app/src/generated/colormaps.json`.

## Example 2 — a new threshold-dependent field (same shape as qsat_params)

A new variable with dims `(ut=64, latitude, longitude)` (e.g. a revised flux quantity): add it to
`fields.FIELD_META` (title, group, colormap, transform/log) and to `registry/qsat_field_metadata.json`
(p2/p98), then

```bash
PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.fields build --vars <newvar> --out $STAGING/v1/fields
PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.fields registry     # regenerates registry/generated/qsat_fields.yaml
```
`thresholdAware: true` is set automatically; the global u*,th slider drives it. (If the variable must
also appear in the clicked-cell table, it has to be added to `cells.zarr/fields` — that requires a
cell-store rebuild and a new data version `v2/`.)

## Example 3 — point data (INQUA dune ages)

Points with attributes (e.g. `inqua-luminescence.shp`, ~10⁴ points): vector tiles keep the page fast.

```bash
conda activate dune-atlas-tiles          # has tippecanoe + gdal (see docs/validation-dunes.md)
ogr2ogr -f GeoJSONSeq -t_srs EPSG:4326 $STAGING/inqua-lum.geojsonl \
    ~/Documents/research/projects/dune-world/data/inqua-luminescence.shp
tippecanoe -o $STAGING/v1/points/inqua-luminescence.pmtiles -l inqua_lum -zg \
    --drop-densest-as-needed --extend-zooms-if-still-dropping $STAGING/inqua-lum.geojsonl
rclone copy $STAGING/v1/points r2:dune-atlas-data/dune-atlas/v1/points
```
```yaml
- id: inqua-luminescence
  title: INQUA dune ages (luminescence)
  group: points              # add the group if new
  type: pmtiles-vector
  source: dune-atlas/v1/points/inqua-luminescence.pmtiles
  sourceLayer: inqua_lum
  description: Luminescence ages from the INQUA Dunes Atlas chronologic database.
  citation: "Lancaster et al. (2016) Quat Int; doi:10.1016/j.quaint.2015.10.044"
  visible: false
  opacity: 1
  style:
    circle: {"circle-radius": 3, "circle-color": "#f0a43a", "circle-stroke-color": "#5a2d00", "circle-stroke-width": 0.5}
```
For a small set (< a few thousand points) you can skip tippecanoe: upload a `.geojson` and use
`type: geojson-points` with `source: dune-atlas/v1/points/<file>.geojson`.
(Clicking a point to show its attributes is a planned enhancement; today vector layers display only.)

## Example 4 — a basemap
Append to `basemaps:` in `registry/layers.yaml` (`kind: raster` with `tiles`, `kind: style` with a
MapLibre style URL, or `kind: hillshade` with a terrarium/mapbox DEM). Check the provider's terms and
put the required attribution in `attribution`.

## Checklist before pushing
- [ ] `npm run validate-registry` and `npm test` pass (`cd app`).
- [ ] Data uploaded under a **new or unused** versioned path, and suffix ranges work:
      `curl -s -o /dev/null -w "%{http_code}\n" -H "Range: bytes=-16" https://data.geomorphlab.org/<path>/zarr.json` prints `206`.
- [ ] Licence/citation filled in; attribution for any new data provider.
- [ ] Previewed locally (`docs/development.md`).
