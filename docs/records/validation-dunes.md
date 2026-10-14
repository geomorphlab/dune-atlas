# Validation: dune map → polygons → PMTiles

Build: `PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.dunes --out staging/dunes`
(conda env with tippecanoe ≥ 2.17 and `pmtiles`; built here with tippecanoe v2.79.0, pmtiles
python 3.x writer, verified with go-pmtiles v1.31.2). Runtime ≈ 7 s. Tests:
`pipeline/tests/test_dunes.py` (12 tests; the raster round-trip needs the `pmtiles` package and is
skipped without it).

Outputs (`staging/dunes/`, gitignored; upload to `dune-atlas/v1/dunes/` on R2):

| file | bytes | content |
|---|---|---|
| `dunes.pmtiles` | 5,554,575 (5.3 MiB) | MVT, layer `dunes`, z0–10, gzip, 27,100 addressed tiles |
| `dunes-raster.pmtiles` | 936,222 (0.9 MiB) | PNG (palette + tRNS), z0–7, 1,426 tiles |
| `dunes.geojson` | 874,367 | 1,428 features, RFC 7946, coordinates on the 0.05° lattice |
| `dunes_summary.json`, `dunes_validation.json` | — | numbers below |

## Source and method
- Mask: `layers.nc` `dunes` (canonical, 106,540 cells). `dune-mask-new*.tif` not used.
- Fields: 8-connected components; connectivity wraps across the antimeridian (col 3599 ↔ col 0).
- Geometry: 4-connected blocks polygonised with `rasterio.features.shapes` on the label raster
  (pixel-registered transform, origin −180.05, 90.05), grouped per field into a (Multi)Polygon;
  diagonal-only contacts are separate parts touching at a vertex. Column 0 straddles ±180, so it
  is duplicated east of column 3599 and all geometry is clipped to [−180, 180] × [−90, 90]
  (RFC 7946 split). Coordinates rounded to 2 dp (exact: edges are multiples of 0.05°).
- Attributes (per field): MVT feature `id` (1 = largest by area; tippecanoe moves `id` from
  properties to the feature id), `cells`, `area_km2`, `lon`/`lat` (area-weighted centroid of
  cell centres on the unit sphere — correct across ±180), `west/south/east/north` (cell-edge
  bbox; `west > east` would mean the field crosses ±180).
- Area: `layers.nc` `area` is the spherical cell area in m² (R ≈ 6,371,007 m; Earth total
  510,064,278 km²). Checked against a spherical formula (agreement < 1e-5) and against WGS84
  ellipsoidal geodesic area of the polygons (pyproj): ellipsoidal total is 0.17 % smaller.

## Counts and fractions
| quantity | value |
|---|---|
| dune cells (mask) | 106,540 |
| Σ polygon `cells` | **106,540** (exact) |
| Σ planar polygon area / 0.01 deg² | 106,540.000 (per-field agreement, every field) |
| dune fields (8-connected) | 1,428 (4-connected: 2,008 blocks); 1,170 Polygon, 258 MultiPolygon; 0 invalid |
| single-cell fields | 330 |
| field size (cells) median / p90 / p99 / max | 3 / 25 / 579 / 44,373 (Sahara) |
| fields crossing ±180 | 0 (no dune cells in columns 0 or 3599; wrap handling unit-tested) |
| dune extent | lat 71.55 N – 77.45 S, lon 160.25 W – 174.75 E |
| dune cells not flagged `land` | 1 |
| dune area (Σ `area`) | 11,614,510 km² (WGS84 geodesic: 11,594,373 km²) |
| land cells / land area | 2,212,863 / 148,713,964 km² |
| **dune fraction of land, area-weighted** | **7.810 %** — matches the paper's 7.8 % |
| dune fraction of land, cell count | 4.815 % (cells shrink poleward; not the paper's measure) |
| area-weighted, land north of 60 S only | 8.613 % (cell count 6.899 %) |
| dune fraction of Earth's total surface | 2.277 % |

So the paper's "7.8 % of the surface" is the area-weighted fraction of land (incl. Antarctica).

Largest fields: 1 Sahara 5.07 M km² (44,373 cells); 2 Australia 1.74 M; 3 Arabia 0.91 M;
4 Karakum/Kyzylkum 0.54 M; 5 Taklamakan 0.37 M; 6 Badain Jaran/Tengger 0.21 M; 7 Thar 0.20 M.

## Vector tiles (tippecanoe)
Options (`dunes.TIPPECANOE_ARGS`): `--layer=dunes -Z0 -z10 --simplify-only-low-zooms
--no-tiny-polygon-reduction --no-feature-limit --no-tile-size-limit --use-attribute-for-id=id`.
tippecanoe is invoked by bare name with relative paths because it writes its command line into
the public `generator_options` metadata.

Zoom behaviour (every tile decoded with `tippecanoe-decode`):

| z | tiles | total bytes | max tile | fields present | single-cell fields present |
|---|---|---|---|---|---|
| 0 | 1 | 76,324 | 76,324 | 1,428 / 1,428 | 330 / 330 |
| 1 | 4 | 94,601 | 47,695 | 1,428 | 330 |
| 2 | 11 | 98,230 | 39,906 | 1,428 | 330 |
| 3 | 29 | 111,191 | 23,890 | 1,428 | 330 |
| 4 | 67 | 129,693 | 9,768 | 1,428 | 330 |
| 5 | 150 | 155,249 | 5,018 | 1,428 | 330 |
| 6 | 343 | 206,086 | 2,492 | 1,428 | 330 |
| 7 | 854 | 319,357 | 1,168 | 1,428 | 330 |
| 8 | 2,165 | 577,686 | 730 | 1,428 | 330 |
| 9 | 5,875 | 1,272,796 | 485 | 1,428 | 330 |
| 10 | 17,601 | 3,438,132 | 354 | 1,428 | 330 |

- No field is dropped at any zoom. With tippecanoe's default tiny-polygon reduction, z0 kept only
  1,172 fields (132/330 single-cell fields); `--no-tiny-polygon-reduction` keeps all at the same
  size (+9 kB), so it is used. Sub-pixel fields at z0–3 are made visible by the outline layer.
- z10 (max zoom) is unsimplified: of 136,543 decoded vertices, 44,720 lie on the 0.05° cell-edge
  lattice (max deviation 8.4 m = MVT quantisation at z10, detail 12) and 91,823 lie on tile
  buffer clip lines; **0 vertices are off both** → edges are cell-exact at z10 and beyond
  (MapLibre overzooms z10 tiles). z0–9 are Douglas–Peucker simplified (expected visual shift
  ≤ ~1 px at that zoom).
- Largest tile 76 kB (z0); z ≥ 5 tiles ≤ 5 kB.
- Metadata `center` zoom is 10 (tippecanoe default); the app should set its own initial view.

## Raster fallback (`dunes-raster.pmtiles`)
- Web Mercator 256-px PNG tiles z0–7, only tiles containing dunes (1, 4, 11, 28, 67, 147, 336,
  832 per zoom). z7 is rendered by 4×4-supersampled nearest lookup of the 0.1° grid (a cell is
  ≥ 9 px at z7); lower zooms are 2×2 mean-pooled coverage.
- Colour #d69634 (same as the vector fill); alpha = coverage quantised to 16 levels, floored at
  0.45 where coverage > 0 so isolated cells remain visible at z0–3.
- Check: Σ alpha × spherical pixel area over z7 = 11,651,577 km² vs 11,614,510 km² mask area
  (+0.3 %, from the alpha floor/quantisation on edge pixels). Visual check of the z2 mosaic
  reproduces the paper's map (Sahara, Arabia, central Asia, Australia, Namib/Kalahari, etc.).
- `pmtiles verify` passes for both archives.

## Registry
`registry/generated/dunes.yaml`: group `dunes`; layers `dunes` (pmtiles-vector, sourceLayer
`dunes`, visible, fill + line style) and `dunes-raster` (pmtiles-raster, hidden). Both validate
against `layers.schema.json` `$defs/layer`, and the fragment validates inside a minimal registry
document (test `test_registry_fragment_validates`). `style.fill` / `style.line` are intended as
MapLibre paint objects for a fill and a line layer on the same source.
