# Mars terrain track: validation

Terrain products of the Mars atlas (docs/reference/mars-spec.md §1, §6): the MOLA–HRSC terrarium basemap (PMTiles), the
elevation field (`fields/elevation.zarr`), the 2° cell mean elevation (`cells-aux.zarr` `elev_mean`), the dune
PMTiles and the dune overlap fraction on the contract grid (`cells.zarr` `dunes`/`dune`).

Code: `pipeline/src/dune_atlas_pipeline/mars/terrain.py`, `pipeline/src/dune_atlas_pipeline/mars/dunes.py`;
Gadi jobs `pipeline/gadi/mars_terrain/*.pbs` (staged by `stage_and_submit.sh`); local dune build
`scripts/mars/terrain/build_dunes.sh`; registry fragments `scripts/mars/terrain/write_registry.py` →
`registry/mars/generated/{dunes.yaml,x_elevation.yaml}`. Tests: `pipeline/tests/test_mars_terrain.py`,
`pipeline/tests/test_mars_dunes.py`.

## 1. DEM facts (read in place on Gadi, never copied or modified)

`$(dirname $DUNE_ATLAS_MARS_DEM)/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif`, 11,384,463,908 bytes.

| property | value (rasterio, 2026-10-13) |
|---|---|
| driver / dtype | GTiff, int16, 1 band, uncompressed, strips of 1 row (block 1 × 106,694) |
| size | 106,694 × 53,347 px |
| CRS | `GEOGCS["GCS_Mars_2000_Sphere", SPHEROID["Mars_2000_Sphere_IAU_IAG", 3396190, 0]]` — geographic, planetocentric, positive east, longitude domain −180…180 |
| pixel size | 0.003374120830641° (= 200.0 m at the equator on R = 3,396,190 m; 296.37 px/°) |
| outer edges | lon −180 … 179.998448, lat 90 … −89.999224 (the raster is 0.00155° ≈ ½ px short of 360°; the column wrap at ±180 treats the last and first columns as neighbours) |
| nodata | −32768; 40,090 nodata pixels in the whole raster (counted by the elevation job, which reads every pixel once) |
| scale / offset | 1 / 0 (values are integer metres relative to the MOLA areoid) |

Citation and licence, copied from the USGS product page
(https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m, fetched 2026-10-13):

* Recommended citation: Fergason, R. L, Hare, T. M., & Laura, J. (2018). HRSC and MOLA Blended Digital Elevation
  Model at 200m v2. Astrogeology PDS Annex, U.S. Geological Survey.
  https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m
* Access constraints: **MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)**; use constraints: "Please cite authors".
  The HRSC part is share-alike: derived tiles/stores carry the same statement (PMTiles metadata `license`,
  zarr root `license`/`attribution`, registry `attribution.licence`). See open issues.

The same strings are in `terrain.DEM_ATTRIBUTION` and therefore in the PMTiles metadata, the elevation store
attributes and the registry fragment.

## 2. Tiling method (terrarium basemap)

* MapLibre computes tile bounds with spherical Web-Mercator math on lon/lat, so Mars planetocentric lon/lat is
  treated as EPSG:4326 and mapped to EPSG:3857 XYZ tiles (no datum shift; the radius never enters the tile
  geometry). Coverage is the Mercator square, |lat| ≤ 85.0511°.
* 512 px tiles. Pixel (i, j) of tile (z, x, y) has its centre at lon = 360 (512x + j + ½)/(512·2^z) − 180,
  lat = atan(sinh(π (1 − 2 (512y + i + ½)/(512·2^z)))).
* Maximum zoom z8: 0.002747° per pixel at the equator (Mercator pixels are smaller in latitude elsewhere), i.e.
  finer than the 0.003374° DEM pixel everywhere, so z8 is sampled **bilinearly** at pixel centres from the DEM
  (separable, longitude periodic, rows clamped at the poles). DEM nodata gets zero weight; where all four
  neighbours are nodata the sample is taken from a gap-filled padded window (iterative 3 × 3 mean of valid
  neighbours, `terrain.fill_nan`).
* Every lower zoom is the **2 × 2 mean** of the zoom above (float32, Mercator pixel space) — an average filter for
  all downsampling. Values are quantised only when a tile is encoded.
* Terrarium: v = round(elevation, 1 m) + 32768, R = ⌊v/256⌋, G = ⌊v⌋ mod 256, B = ⌊256 frac(v)⌋ (= 0 with 1 m
  rounding); decoded elevation = R·256 + G + B/256 − 32768 m. Lossless WebP via PIL (`lossless=True, quality=75,
  method=4`, chosen in the pilot below).
* Parallel unit: one z4 tile (16 × 16 z8 tiles = 8192² px) and its subtree z4–z8, written to a per-block blob +
  index; z0–z3 from the 256 z4 tiles; one PMTiles archive assembled in tile-id order (clustered), WebP, no
  tile compression. A z0–5 subset archive (same tile bytes) is written for the local dev mirror.

## 3. Pilot (PBS 181181878, 12 cores, 291 s wall, 2026-10-13)

432 sample tiles on regular strides over the whole Mercator square (z4 stride 4 × 4, z5 8 × 4, z6 8 × 8,
z7 16 × 16, z8 16 × 16), each rendered exactly as the full build renders it (z8 bilinear, 2 × 2 means) and
encoded four ways. Mean tile size (kB) / mean encode time (s) per 512 px tile:

| z | sampled | tiles at zoom | render s | 1 m, q100/m6 | 1 m, q75/m4 | 1 m, q50/m2 | 0.25 m, q100/m6 | extrapolated zoom total (GB, q75/m4) |
|---|---|---|---|---|---|---|---|---|
| 4 | 16 | 256 | 3.151 | 170.1 / 4.86 | 171.0 / 0.16 | 172.9 / 0.10 | 253.7 / 5.30 | 0.044 |
| 5 | 32 | 1,024 | 0.512 | 127.8 / 3.93 | 128.6 / 0.16 | 129.9 / 0.10 | 210.1 / 5.17 | 0.132 |
| 6 | 64 | 4,096 | 0.119 | 97.3 / 3.18 | 98.0 / 0.15 | 99.1 / 0.10 | 172.3 / 4.36 | 0.402 |
| 7 | 64 | 16,384 | 0.039 | 66.5 / 2.67 | 67.4 / 0.13 | 68.5 / 0.09 | 128.5 / 3.53 | 1.105 |
| 8 | 256 | 65,536 | 0.015 | 48.6 / 2.24 | 49.6 / 0.12 | 50.6 / 0.09 | 100.1 / 3.11 | 3.248 |

Extrapolations (mean size × 4^z, z0–3 ≈ z4/3):

| encoding | z0–8 total | z0–7 total | est. core-hours z0–8 |
|---|---|---|---|
| 1 m, q100/m6 | 4.86 GB | 1.68 GB | 82.2 |
| **1 m, q75/m4 (chosen)** | **4.94 GB** | 1.70 GB | **3.7** |
| 1 m, q50/m2 | 5.03 GB | 1.72 GB | 2.6 |
| 0.25 m, q100/m6 | 9.67 GB | 3.11 GB | 104.4 |

Decisions: **maxzoom 8** (4.9 GB ≪ 15 GB); **1 m quantisation** (the DEM is integer metres; 0.25 m doubles the size
for synthetic sub-metre detail of bilinear interpolation); **q75/m4** (1–2 % larger than maximum effort, 19× faster).
No sampled tile contained nodata or NaN. Checks in the pilot: decoded − float tile ≤ 0.5 m at every zoom; 5,120
random z8 pixels vs an independent bilinear DEM sample (`DEM.point`, direct 2 × 2 read): max |Δ| = 0.4999 m.

## 4. Full builds

### Terrarium PMTiles (PBS 181182156, 48 cpu / 190 GB, 46 workers, 5 min 17 s wall, 8.45 SU)

256 z4 blocks rendered in 279.5 s (DEM read 10.85 GB in total, peak memory 71.9 GB of 190), assembly 34 s; total
313 s. `stores/basemaps/hrsc-mola-terrarium.pmtiles`: **4,947,184,858 bytes (4.95 GB; pilot predicted 4.94 GB),
87,381 tiles z0–8, every zoom complete (4^z tiles)**, clustered, WebP, no tile compression, bounds ±180 / ±85.0511°.
No NaN pixel at any zoom; 76,476 nodata DEM pixels were read (with overlaps) but none required the gap fill (every
z8 sample had at least one valid neighbour).

| z | tiles | MB | mean kB | max kB |
|---|---|---|---|---|
| 0 | 1 | 0.3 | 290.9 | 290.9 |
| 1 | 4 | 1.1 | 265.8 | 294.3 |
| 2 | 16 | 3.8 | 237.1 | 307.2 |
| 3 | 64 | 13.2 | 205.6 | 300.9 |
| 4 | 256 | 43.6 | 170.2 | 295.0 |
| 5 | 1,024 | 137.6 | 134.4 | 285.4 |
| 6 | 4,096 | 409.9 | 100.1 | 274.5 |
| 7 | 16,384 | 1,164.4 | 71.1 | 243.2 |
| 8 | 65,536 | 3,173.2 | 48.4 | 188.4 |

Read-back check (PBS 181182332, `terrain check`, 1 cpu, 61 s): header/metadata as written (tile type WEBP,
`encoding: terrarium`, citation/licence/attribution from §1); 100 random z8 tiles decoded, 6,400 random pixels vs
an independent bilinear DEM sample: **max |Δ| = 0.49995 m, mean 0.221 m** (≤ 0.5 m = the 1 m rounding); each
sampled z7 parent equals the 2 × 2 mean of its four decoded z8 children within 0.75 m (≤ 1 m expected from two
roundings). The z0–5 subset (`work/terrain/tiles/hrsc-mola-terrarium-z0-5.pmtiles`, 199,528,461 bytes, 1,365 tiles,
same tile bytes, header max_zoom 5) is complete at every zoom; sha256
0a2bd01f0e23bb3b5a2168933c73577623c13eb4506394c688c46cd9168a5ef0, copied to the local dev mirror under the contract
name. Cross-product check (local): 20 random z5 tiles vs the nearest 1/64° pixel of `elevation.zarr` level 0
(5.24 M px): median |Δ| 2 m, p95 22 m, p99 57 m (different footprints: ~4.4 km Mercator means vs 0.93 km
pixels), i.e. no geometric offset between the two products.

### Elevation store and elev_mean (PBS 181181905, 4 cores, 1 min 55 s wall, 0.26 SU)

* 1/64° grid (11,520 × 23,040, outer edges −180…180, 90…−90): exact area-overlap mean of DEM pixels (separable
  sparse overlap weights, `aridity.overlap_weights`, longitude periodic, nodata excluded), whole DEM read once
  (11.42 GB, 66 s). No NaN; range −8,502.9 … 21,159.7 m.
* `stores/fields/elevation.zarr`: Earth `nativepyramid.write_native_pyramid` (the `fields/aridity.zarr`
  conventions: GeoZarr multiscales/proj/spatial, EPSG:4326 label, pixel registration, sharded blosc-zstd5
  shuffle, inner 512², shard 4096²). Level 0 rounded to integer metres; `keepbits=14` keeps every integer
  |z| < 32,768 exactly and rounds coarser means to ≤ 0.5 m. Levels (factor → shape): 1 → 11520×23040, 2 → 5760×11520,
  4 → 2880×5760, 8 → 1440×2880, 16 → 720×1440, 32 → 360×720, 64 → 180×360, 128 → 90×180.
  **366,592,415 bytes, 97 objects**. Read back locally: level 0 integer-valued (−8,503 … 21,160 m); level 3 equals
  the 8 × 8 mean of level 0 within 0.5 m; transferred tar md5 identical to Gadi (f114313588c44b53be8bd54c1ec73c7c).
* `elev_mean` (90, 180) on the contract grid (rows lat 89 → −89, cols lon −179 → 179): spherical-area-weighted
  mean of the 1/64° grid (row weights sin φ_n − sin φ_s; 128 × 128 fine pixels per cell). Range −7,396 … 18,772 m;
  maximum at (17° N, 133° W) = Olympus Mons, minimum at (33° S, 63° E) = Hellas. Agrees with cell means of the
  rounded level 0 to 0.13 m. File `elev_mean.npz` (keys elev_mean, lat, lon, grid, source).

## 5. Dunes

Input: PI shapefile, 3,514 records (3,507 Polygon + 7 MultiPolygon), Mars 2000 sphere, lon −180…180, only `FID`.
Sources (PI round 5): the USGS Mars Global Digital Dune Database (MGD3; Hayward et al. 2007, 2010, 2012, 2014)
plus the small dune fields of Fenton, L. K. (2020). Updating the global inventory of dune fields on Mars and
identification of many small dune fields. Icarus, 352, 114018. https://doi.org/10.1016/j.icarus.2020.114018
(DOI checked on CrossRef 2026-10-14), merged. Composition, recomputed from the shapefile with `mars/dunes.py`
`features` (summary keys `n_lt_1km2`, `n_equatorward_65`, `area_equatorward_65_km2`): 553 polygons < 1 km²
(MGD3 mapped only fields > 1 km²); equatorward of 65° (area centroid) 2,634 polygons, 120,072 km² (MGD3
equatorial ≈ 70,000 km² plus Fenton's 52,032 km², merged). These sentences are in the dunes ⓘ definition
(`registry/mars/generated/dunes.yaml`), the citation is in the ⓘ, About, the cell-panel citations and downloads.
All records valid; 141,796 vertices. Six records cross the antimeridian and are already split into parts on both
sides of ±180 (no ring has a longitude step > 180°; asserted for every record), so the GeoJSON keeps the source
coordinates (rounded to 1e-6°, exterior rings counter-clockwise).

| check | value |
|---|---|
| features in / out | 3,514 / 3,514 (one feature per record; id 1 = largest) |
| total area (geodesic, sphere R = 3,396,190 m) | 1,047,155.6 km² |
| largest / median / smallest | 753,396 km² (north polar erg) / 9.58 km² / 1.5e-7 km² |
| degenerate records (area < 0.001 km²) | 14 (kept, as in the source) |
| antimeridian-crossing features | 6 (west > east in the bbox attributes) |
| latitude range | −81.47 … 85.68°; 5 fields reach north of 85.05° N, 1 (id 451) lies wholly north of it |
| PMTiles | 13,174,957 bytes, z0–10, 103,123 tiles, tippecanoe 2.79.0 with Earth's `TIPPECANOE_ARGS` (only name/description/attribution changed); geometry clipped at the Web-Mercator limit and pole-edge nudged (§5a) |
| fields present in tiles | z0 3,084 · z3 3,495 · z6 3,507 · z10 3,511 of 3,514 (id 451 is drawn by the globe cap, §5b) |

The three fields absent at z10: id 451 (98 km², 85.10–85.25° N, wholly outside the Mercator square; drawn on the
globe by the polar cap) and ids 3513/3514 (zero-area slivers at 78.3° S). Missing fields at low zoom are sub-pixel polygons that tippecanoe drops
at that zoom even with `--no-tiny-polygon-reduction` (as on Earth); every field with area > 0 inside the Mercator
square is present at z10.

Attributes per feature: `id`, `src_fid`, `area_km2`, `lon`/`lat` (area centroid via a Lambert azimuthal
equal-area projection about the field, antimeridian-safe), `west`/`south`/`east`/`north`. No `cells` (the Mars
dune map is not gridded). The invert layer is described in §5c.

Overlap fraction on the contract grid (`mars_dunefrac_contract.npz`: frac float32, dune uint8, lat, lon, grid):
intersections with each 2° cell in lon/lat, measured in the cylindrical equal-area plane (lon, sin lat), exact for
the cell edges. 2,749 cells with dunes, max fraction 1.0 (to 1.3e-15), Σ frac × cell area = 1,047,125.9 km² (−0.003 %
vs the geodesic polygon total). Against the assessment artifact `fv3_dunefrac.npz` (re-oriented: lat flipped,
lon rolled by 90 columns): identical set of 2,749 dune cells (0 only-new, 0 only-old), max |Δfrac| = 4.4e-4,
mean |Δfrac| over dune cells 6.1e-6, assessment area 1,047,127.9 km².

### 5a. Polar wedges on the globe (round 2, 2026-10-14): cause and fix

**Symptom** (PI screenshot, globe, north pole): grey wedges from the pole to the polar dune fields.
**Cause**: the v1 tiles carried the five fields that reach north of 85.0511° up to tippecanoe's buffer above the
world's top edge (tile y < 0). MapLibre 5.24 subdivides fill polygons on a grid that includes the tile edge y = 0,
and for tiles of the top row (`canonical.y === 0`) `subdivision.ts` `_fillPoles` adds, for every triangle edge
lying on y = 0, a quad from that edge to the pole: a polygon crossing the edge becomes a wedge from its crossing
points to the pole (the same at the south edge). Not a ring-winding or antimeridian problem: all rings are valid
and the six antimeridian features are split at ±180 in the source.
**Fix** (`mars/dunes.py`): (1) the tile GeoJSON is clipped exactly at the Web-Mercator limit (85.051128°, the limit
rounded down to the 1e-6° coordinate grid), so rings close properly along it; (2) after tippecanoe, every tile of
the top and bottom rows is rewritten (`nudge_pole_edges`: minimal MVT decoder/encoder, only polygon geometry
changed): vertices on or beyond the world edge move one tile unit inside (1/4096 of a tile, sub-pixel), rings
that become degenerate are dropped. 106 of 103,123 tiles changed, 389 vertices moved. The flat map keeps the geometry to
the limit; the globe draws the rest from the source polygons (§5b). The 2° overlap grid is unaffected (identical
to the round-1 grid).

Decoded check (`polar_tile_check`, every tile of the top/bottom rows z0–10; MVT decoded in tile units):

| zoom | before: vertices on/beyond the edge, edges on the edge | after |
|---|---|---|
| 0 | 109, 95 | 0, 0 |
| 1 | 73, 60 | 0, 0 |
| 2 | 62, 49 | 0, 0 |
| 3 | 56, 43 | 0, 0 |
| 4 | 41, 30 | 0, 0 |
| 5 | 45, 28 | 0, 0 |
| 6 | 39, 24 | 0, 0 |
| 7 | 48, 27 | 0, 0 |
| 8 | 54, 27 | 0, 0 |
| 9 | 76, 34 | 0, 0 |
| 10 | 115, 39 | 0, 0 |

No vertex lies outside the tile buffer at z0–5 (all tiles). The longest polar-row edge not on a clip line is a
source segment (id 4, a 0.37° straight edge at 85.03–85.05° N, 1.25 z10 tiles), not a spike. Figure: artifact
`dunes_polar_before_after.png` (decoded z2 top-row tiles in north-polar stereographic; red = the edges MapLibre
extends to the pole: 49 before, 0 after; blue = the globe cap triangles).

### 5b. Dune polygons poleward of 85.05° on the globe

`polar_cap_meshes` intersects the **unclipped** polygons with the caps |lat| ≥ 85.0511°, cuts them on a 2° × 0.25°
grid (short chords on the sphere) and triangulates each piece (shapely constrained Delaunay) →
`dune-atlas/mars/v1/dunes/polar-caps.json` (551,365 bytes; `layers.dunes` and `layers.invert`, N and S, flat lon/lat
triangles). Drawn by `app/src/mars/map/polarcap.ts` as a globe-only custom layer directly above its fill layer
with the same colour, opacity and visibility (`docs/guide/mars.md` §5b).

| cap | dune area, source (km²) | dune area, mesh | triangles | invert area, source | invert, mesh | triangles |
|---|---|---|---|---|---|---|
| N | 867.48 | 867.52 | 284 | 269,298.6 | 269,298.6 | 7464 |
| S | 0.00 | 0.00 | 0 | 270,166.1 | 270,166.1 | 7200 |

Cap area 270,166.1 km² each. Mesh and source agree to 6e-5 (straight lon/lat triangle edges in the equal-area plane).
The 85.1–85.25° N field (id 451) is in the mesh with 98.1 km² (test `test_built_mars_dune_products`).

### 5c. Invert layer (surface without dunes)

Earth's invert (`dunes.build_nondune_pmtiles`) tiles land cells without dunes with `NONDUNE_TIPPECANOE_ARGS`; Mars
mirrors it with the complement of the dune polygons over the whole sphere: one feature (id 1), tile geometry =
the Web-Mercator band minus the tile-clipped dunes (pole-edge nudged like the dunes), the caps beyond 85.0511°
(with holes for the polar dunes) from `polar-caps.json` `layers.invert`. Tippecanoe arguments: Earth's
`NONDUNE_TIPPECANOE_ARGS` with layer **`invert`** and Mars name/description/attribution; same zoom range z0–10.
`dune-atlas/mars/v1/dunes/invert.pmtiles`: 7,851,920 bytes (67 parts, 3,499 holes, 141,326 vertices; most deep tiles are identical
full squares and deduplicated). Registry: `dunes.yaml` `invertSource: dune-atlas/mars/v1/dunes/invert.pmtiles`,
`invertSourceLayer: invert`.

Areas (cylindrical equal-area plane, exact for lon/lat boxes): sphere 144,941,857.2 km² = dunes 1,047,122.4 (union; overlapping source
polygons share 6.2 km²) + invert 143,894,734.7; closure error 4.3e-16. Displayed: invert tiles 143,355,269.9 + dune tiles + caps
(2 × 270,166.1) + 2 strips of 0.09 km² (85.051128–85.0511288°) = sphere (test `test_polar_cap_meshes_and_sphere_closure`).
Polar rows: no vertex on the world edge at any zoom; every top/bottom tile carries the layer.

**Behaviour per projection.** Flat map (Mercator): dune and invert tiles to 85.0511° (the nudge leaves a 1/4096-tile
strip at the edge); the caps are not drawn (not representable). Globe: tiles to 85.0511°, caps from 85.0511° to the
pole from the source polygons; no pole wedges. Globe→Mercator transition (high zoom): the cap layers are hidden
while MapLibre blends (`projectionTransition < 0.999`).

## 6. Gadi jobs, paths and costs

| job | PBS id | resources | wall | SU |
|---|---|---|---|---|
| DEM header probe | login-node rasterio read | — | seconds | — |
| pilot | 181181878 | 12 cpu, 47 GB | 4 min 58 s | 1.99 |
| elevation | 181181905 | 4 cpu, 16 GB | 1 min 55 s | 0.26 |
| terrarium PMTiles | 181182156 | 48 cpu, 190 GB | 5 min 17 s | 8.45 |
| PMTiles read-back | 181182332 (afterok 181182156) | 1 cpu, 8 GB | 1 min 01 s | 0.07 |
| polar-cap DEM textures (round 2) | 181226105 | 4 cpu, 16 GB | ~6 min | ≈ 0.4 (est.) |

Total ≈ 10.8 SU. Temporaries removed after the build (4.9 GB tile blobs, the 1 GB float grid, transfer tars).

Paths: code `$DUNE_ATLAS_WORK/mars/code/terrain-{465a1cd,40f3a1b,5ebfc90}/`; work
`$DUNE_ATLAS_WORK/mars/work/terrain/{pilot,elevation,tiles}/`; logs
`$DUNE_ATLAS_WORK/mars/logs/terrain_*.log`; stores
`$DUNE_ATLAS_WORK/mars/stores/{basemaps/hrsc-mola-terrarium.pmtiles,basemaps/hrsc-mola-polar/,fields/elevation.zarr}`; round-2 code `code/terrain-ad4b176/`.

Local dev mirror (`staging/mars/devroot/dune-atlas/mars/v1/`): `dunes/{dunes.pmtiles,invert.pmtiles,polar-caps.json}`, `basemaps/hrsc-mola-polar/`, `fields/elevation.zarr`,
`basemaps/hrsc-mola-terrarium.pmtiles` (**the z0–5 subset**, 200 MB; the full z0–8 archive stays on Gadi); local work files `staging/mars/terrain/{dunes,elevation}/`.

## 8. Basemap polar caps (round 2)

**Cause confirmed (MapLibre 5.24 source):** every basemap is a Web-Mercator tile source ending at 85.0511°. For the
top/bottom tile rows the globe uses a tile mesh with an extra row to the pole (`create_tile_mesh`
`extendToNorthPole`/`SouthPole`; `getMeshFromTileID(…, allowPoles = true)` for raster and hillshade), and
`raster.vertex` / `hillshade.vertex` set the texture coordinate of the pole vertices to the tile's top (bottom) edge
(`v_pos.y = 0`), so each column's last pixel is stretched to the pole: radial smearing. The zarr fields avoid it
because their globe mesh runs to ±90 (Earth 704538b). Our tiles do not add to it: the terrarium top row is the
bilinear DEM at 85.05° (decoded check §4), `esri-mars` fills rows to the top edge (CTX1 tiles are opaque there),
HiRISE is transparent there (no smear, background).

**Fix (Mars):** `app/src/mars/map/polarcap.ts` `basemap-polarcap`, a globe-only custom layer directly above the
basemap layers and below all data layers (hook in `docs/guide/mars.md` §5b):

* MOLA–HRSC hillshade: DEM textures per pole from `mars/terrain_polar.py` (PBS 181226105, 4 cpu, ~6 min):
  polar azimuthal-equidistant, radius 5.05° (to 84.95°, so the 3 × 3 stencil has real neighbours at the seam),
  bilinear from the 200 m DEM at 4096² (146 m/px), 2 × 2 means for 2048 / 1024 / 512 / 256, 1 m terrarium lossless
  WebP: north 8.0 MB, south 7.3 MB (`stores/basemaps/hrsc-mola-polar/`, keys
  `dune-atlas/mars/v1/basemaps/hrsc-mola-polar/{n,s}-{N}.webp` + `index.json`). Decode ≤ 0.5 m at every level;
  independent point check (200 px per pole vs `DEM.point`) max 0.500 m (N), 0.499 m (S). Elevation range north
  −5,120 … −1,908 m, south 1,197 … 4,863 m. Shaded in the fragment shader with MapLibre's `hillshade_prepare`
  scaling (Earth circumference constant, zoom exaggeration, ±4 clamp, ÷ cos lat) and `standard_hillshade` with the
  basemap paint (exaggeration 0.65, colours, 335° viewport-anchored light), in the local east/south frame of the
  tiles; texture level = the coarsest N whose pixel is not larger than the tile pixel at 85.05° (z0 256 … z4+ 4096).
* Esri OnMars (CTX1, MDIM, MColorDEM, HiRISE): a cap texture composed from the service's geographic tiles
  (`esri.ts` `esriPolarCap`; level 4 → 512 px below zoom 3, level 5 → 1024 px), premultiplied; areas without data
  (CTX1 beyond 88°, all of HiRISE) show the basemap background.
* OpenPlanetaryMap (no polar data): the basemap background colour; the background-only `dark` basemap gets no cap.

**Decoded seam check** (`scripts/mars/terrain/polar_seam_check.py`, north, real data: the local z0–5 terrarium
tiles and the cap textures, both shaded with the MapLibre maths; artifact `polar_seam_check.png`): mean |ΔRGB|
across the seam vs between two tile rows 2 px apart (natural variation):

| zoom | cap texture | seam mean / p95 | adjacent rows mean / p95 | mean RGB tile → cap |
|---|---|---|---|---|
| 2 | 1024 | 7.94 / 34.81 | 5.16 / 23.04 | [33.4, 37.1, 41.7] → [33.5, 37.2, 41.7] |
| 3 | 2048 | 4.71 / 21.29 | 2.85 / 12.44 | [32.3, 36.0, 40.7] → [32.4, 36.1, 40.7] |
| 4 | 4096 | 2.99 / 12.93 | 1.72 / 7.59 | [31.3, 35.1, 39.8] → [31.6, 35.3, 40.0] |
| 5 | 4096 | 1.27 / 5.29 | 0.88 / 3.6 | [29.7, 33.6, 38.4] → [29.6, 33.5, 38.2] |

No tonal step (mean colours agree within 0.3 levels); the per-pixel differences are 1.4–1.7× the row-to-row
variation (different sampling grids: Mercator tile pixels vs AEQD texels, and the two compared rows lie 3–20 km
apart at z2–z5). App tests (`tests/mars/polarcap.test.ts`): MapLibre's prepare maths reproduced, synthetic-relief
seam continuity (< 0.02 in colour), cap area, layer order and style mirroring, Esri cap composition. **Not rendered
in a browser here** (no WebGL in the sandbox): the screenshots are the App track's.

**What Earth would need** (not implemented): the same `PolarCapLayer` and installer. OpenFreeMap (vector style
basemap) does not smear (vector layers get no pole fill; the background shows) but its land and water stop at
85.05°, so a neutral cap in the style's background (or ocean / ice) colour; the Esri World Imagery and OpenTopoMap
rasters smear exactly as on Mars, and both exist only in Web Mercator, so either the background colour or a cap
image from a separate polar dataset; the Mapterhorn terrarium hillshade needs polar DEM textures from a DEM that
reaches 90° (e.g. ArcticDEM / Copernicus GLO-90 north, REMA south), shaded with the same shader with the Earth
radius in `maplibreDeriv` (k = 1).

## 9. HiRISE near the poles

Source, not ours: the Esri OnMars HiRISE service has no imagery poleward of ±65.24° (level 3 complete coverage
map; levels 6 and 9 sampled at 72–82° N/S all answer HTTP 404), while CTX1 returns opaque tiles for the same
geographic tiles our protocol requests. Evidence and the protocol check: `docs/guide/mars.md` §5a. Whether to state
this in the HiRISE attribution / info is left to the PI.

## 10. Dune tiles with MGD3 + Fenton (2020) metadata (round 3, PI 2026-10-14)

The uploaded `dunes.pmtiles` / `invert.pmtiles` carried the pre-Fenton tippecanoe metadata
(attribution "… (Hayward et al. 2007, 2010, 2012), compiled by A. Gunn"; dunes description "USGS MGD3
compilation"). R2 objects are create-only, so both were rebuilt under new keys with `scripts/mars/terrain/build_dunes.sh`
(same shapefile, same `mars/dunes.py` clip at the Mercator limit and pole-edge nudge, same tippecanoe v2.79.0
arguments apart from the metadata). Metadata now: attribution = `dunes.ATTRIBUTION` "Dune fields: USGS Mars Global
Digital Dune Database (Hayward et al. 2007, 2010, 2012, 2014) and Fenton (2020), merged, compiled by A. Gunn"
(both archives); dunes description "Mars dune fields (USGS MGD3 and Fenton 2020, merged), Mars 2000 planetocentric
lon/lat"; the names and the invert description are unchanged.

| key (`dune-atlas/mars/v1/dunes/`) | bytes | md5 | vs. round 2 |
|---|---|---|---|
| `dunes-r2.pmtiles` | 13,174,988 | ca48b57aa1620ccfd608eb8ef724b740 | 103,123 tiles, all decompressed MVT bytes identical to `dunes.pmtiles` (134,462 features); header identical; metadata differs in attribution, description, generator_options |
| `invert-r2.pmtiles` | 7,852,169 | 0ae6aca711b1a314325dfce3a48c02be | 1,338,185 tiles, all decompressed MVT bytes identical to `invert.pmtiles`; header identical except tile_contents_count 43,215 vs 43,213 (tippecanoe deduplication, storage only); metadata differs in attribution, generator_options |
| `polar-caps.json` | 551,365 | b1a4e774597bb982caa2195ec6ca929f | unchanged (no citation fields; rewritten byte-identical by the build), same key |

Check: `scripts/mars/terrain/compare_tiles.py OLD NEW` decodes every tile id of both archives (gzip-decompressed
bytes; on a difference, layers and features with id, type, resolved tags and geometry commands, in order and as a
multiset); result files `staging/mars/terrain/dunes/compare_{dunes,invert}_r2.json`. Two successive builds give
archives with different md5s (gzip / deduplication) but identical decoded tiles, so the comparison is on
decoded tiles, not on archive bytes. The work GeoJSONs and the 2° grid arrays are byte-identical to round 2 (the
grid npz `citation` string now includes Hayward et al. 2014 and Fenton 2020). Registry:
`registry/mars/generated/dunes.yaml` `source: dune-atlas/mars/v1/dunes/dunes-r2.pmtiles`,
`invertSource: dune-atlas/mars/v1/dunes/invert-r2.pmtiles` (`mars/dunes.py` `DUNES_KEY` / `INVERT_KEY`); the app
fetches `polar-caps.json` from the directory of `source`, so its key stays. The old objects stay in place.

Archive metadata in the app: none of it is user-visible. The pmtiles protocol is created as `new Protocol()`
(`src/map/adapters.ts`), without `metadata: true`, so the vector sources' TileJSON is built from the header only
(no `attribution`/`description` from the archive); basemaps use `tiles: [pmtiles://…/{z}/{x}/{y}]` templates
with the registry `attribution`, and `clampPmtilesBasemaps` reads only the header maxZoom. The Gadi terrarium
archive's internal "HRSC-MOLA" name/attribution is therefore shown only by archive tools (e.g. `pmtiles show`,
the PMTiles viewer) and was not rebuilt.

## 7. Open issues

* HRSC component licence is CC BY-SA 3.0 IGO (share-alike); the PI should confirm that publishing derived tiles
  under the same terms with attribution is acceptable.
* Web-Mercator excludes |lat| > 85.05° in the flat map; on the globe the dune / invert caps and the basemap caps
  draw it (§5b, §8) once the App track installs `installPolarCaps` (hook in `docs/guide/mars.md` §5b).
* The globe cap layers are not yet checked in a browser (no WebGL here); a possible 1-px fill-antialias line of the
  dune / invert tiles at 85.05° (MapLibre outlines every polygon edge inside a tile) is to be looked at in the
  screenshots.
* The Gadi terrarium PMTiles metadata still says "HRSC-MOLA" (built before the naming decision); the code now writes
  "MOLA–HRSC"; changing the 4.9 GB archive's metadata needs a rewrite job (not done; not shown in the app, §10).
* The local dev mirror's basemap is the z0–5 subset under the full archive's name: MapLibre overzooms z5 beyond
  zoom 5 locally only if the source maxzoom is read from the PMTiles header (registry says 8).
* 14 degenerate source polygons (< 0.001 km²) are kept as in the source; the PI may want them removed upstream.
