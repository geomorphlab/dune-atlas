# Architecture

## Web app (`app/`)

Static TypeScript + Vite site (MapLibre GL JS v5), dark-themed and strictly 2D (no pitch,
rotation or 3D terrain). No backend: map fields stream from GeoZarr
pyramids and the click panel range-reads one cell from `cells.zarr`, both on R2
(`data.geomorphlab.org`).

### Module map

| module | role |
|---|---|
| `src/main.ts` | bootstrap: merged registry → initial state (registry defaults + URL) → map, controls, panels; wires store changes to map/panels/URL |
| `src/store.ts` | minimal observable state (`basemap, projection, utIndex, layers{visible,opacity,cfg}, order, dataset, cell, embed`); `moveInOrder` / `normaliseOrder` |
| `src/layerconfig.ts` | per-layer user config on top of registry defaults (colormap, reverse, clim, log, render mode, line colour, spacing in km + km→px conversion, fill colour, invert); effective display; URL tokens |
| `src/urlstate.ts` | permalink parse/serialise: `lon lat zoom basemap layers(id[:opacity][~key=value]*,…) ut cell(iy,ix) proj embed order dataset`; layer keys `cm rev lo hi log mode vc km fc inv` (legacy `ds` migrated, `lc`/`ol` ignored) |
| `src/config.ts` | build-time config from `VITE_*` env (data base, cell store path, suffix ranges) |
| `src/registry/types.ts` | TS mirror of `registry/layers.schema.json` |
| `src/registry/merge.ts` | merge `layers.yaml` + `generated/*.yaml` fragments; `resolveSource()` |
| `src/registry/load.ts` | `import.meta.glob(..., {query: "?raw", eager: true})` inlines the YAML at build time |
| `src/registry/validate.ts` | ajv (2020-12) schema + semantic checks incl. rejecting `WITHHELD_VARS` (CI and tests only; not bundled) |
| `src/map/basemaps.ts` | registry basemap → full MapLibre style on a dark background; `transformStyle` adds projection + dark `sky` (space/horizon/fog) so nothing light shows around the globe |
| `src/map/adapters.ts` | **one adapter per layer `type`** (`zarr-field`, `pmtiles-vector`, `pmtiles-raster`, `cog`, `geojson-points`); handles accept config changes in place (`applyConfig`) or ask to be re-created |
| `src/map/vectors.ts`, `fieldreader.ts` | arrows and Jobard–Lefer evenly spaced streamlines in screen space on a unit-vector field (pure geometry) and a zarrita window reader for GeoZarr multiscale levels |
| `src/map/shader.ts` | zarr-layer `customFrag` bodies: `rad-to-bearing`, `rad-to-axis`, `scale`, log colour scaling |
| `src/map/overlays.ts` | lazily adds/removes overlays, keeps registry order below basemap labels, re-attaches after a basemap swap, fans out the threshold |
| `src/ui/layerPanel.ts`, `legend.ts`, `threshold.ts` | registry-generated panel: dataset selector (> 1 dataset), pinned u\*,th control, 'Active layers' list (drawing order: drag / move buttons, opacity slider per row, × to hide), groups, toggles, display options (colormap chooser, reverse, clim + reset, log, render mode, line colour, spacing (km); fill colour + invert for vectors), legends, info popovers, basemap radio, globe toggle, About & citation |
| `src/util/math.ts` | KaTeX rendering of `$…$` segments (titles, units, descriptions, table symbols) with a plain fallback (`tex.ts`) |
| `src/ui/cellPanel.ts` | click-to-cell side panel / bottom sheet (resizable, width/height in localStorage, figures re-render to fit): compact synced u\*,th control, wind + flux roses (flux mode flat/elongation/transverse, petals stacked by excess shear, sector sliders, %/m²/yr axis), polar modes plot, flux divergence vs threshold (cells-aux), Symbol/Quantity/Value table, downloads; every section (wind rose, flux rose, modes, qsdiv, cell summary, download & cite) is a `<details class="section">` whose `<summary>` holds the section `<h3>`, open by default, state in localStorage `duneAtlas.cellPanel.<key>Open` (`PANEL_SECTIONS`) |
| `src/cell/snap.ts` | lon/lat → nearest cell of the store's grid (root attrs `grid`; antimeridian wrap, polar clamp, any spacing / lon0) |
| `src/cell/cellstore.ts` | zarrita reader for `cells.zarr` (`hist`, `fields`, `dunes`) + caching store (shard indexes, metadata) |
| `src/cell/flux.ts` | line-for-line port of `pipeline/.../flux.py` (bins from the store attrs): `fluxRose`, `dpRdpRdd` (time-averaged flat-bed flux), `crestFluxRose` (crest flux with speed-up), `fluxRoseByExcessShear` |
| `src/cell/analysis.ts` | per cell × threshold: wind rose, time-averaged flux rose (flat bed or crest flux about αE / αH; m²/yr and %), stored DP/RDP/RDP/DP/RDD, αT/αE/αO/αH/RDD bearings and series with the mode-visibility rule (`modeDefined`) |
| `src/cell/roses.ts`, `modesplot.ts` | pure SVG-string renderers (unit-tested in node): gapless roses with 8/16/32/64/128 sectors (divisors of the 128 source bins), polar modes-vs-u\*,th plot |
| `src/cell/export.ts`, `netcdf3.ts`, `zip.ts` | per-cell downloads: NetCDF-3 (64-bit offset, CF-1.8 style; pure-TS writer) and the CSV bundle (store-only zip writer) |
| `src/cell/downloads.ts`, `citation.ts`, `fieldinfo.ts` | citation text + download trigger; AI notice; display units for the fields |
| `src/generated/constants.json` | **generated** from `pipeline/.../constants.py` by `scripts/export-constants.py` (incl. `QSAT_VARS`, `WITHHELD_VARS`) |
| `src/generated/colormaps.json` | **generated** (matplotlib) by `scripts/gen-colormaps.py` |

Scripts: `validate-registry.ts` (CI gate), `make-parity-fixture.py` (Python reference →
`tests/fixtures/flux-parity.json`), `check-cell-query.ts` (exercises the cell path against a
local store with range reads; also writes the cell's .nc / .zip), `check-decode.mjs` (pipeline decode
check), `write-cell-exports.ts` + `check-netcdf.py` (`npm run check-netcdf`: writes the downloads
for 3 fixture cells in node and reads them back with xarray — scipy and netCDF4 engines — against
cells.zarr and the pipeline flux functions).

**Patched dependency**: `patches/@carbonplan+zarr-layer+0.4.3.patch` (patch-package, applied by
the `postinstall` script, so `npm ci` in CI applies it; the zarr-layer version is pinned). It gives
every pyramid level of an untiled (multiscales layout) store its own cell-edge bounds from that
level's `spatial:transform` + `spatial:shape` (`level.xyLimits` in `_parseUntiledMultiscale`,
looked up by level shape in `UntiledMode.levelXYLimits`, used by `getRegionBounds` and
`getVisibleRegions`). `tests/georef.test.ts` runs the library's own patched methods on v1-like
and fixture layouts and fails if an upgrade changes them.

### Data flow

* **Threshold**: one control (`registry.threshold`, 64 values, default index 14 = 0.15 m/s,
  pinned above the scrolling layer list; a compact copy at the top of the cell panel) →
  `store.utIndex` → every `thresholdAware` handle gets `setSelector({ut: {selected: i, type: "index"}})`
  (arrow/streamline layers re-read their window), and the cell panel refreshes roses, modes and
  table from the cached cell (no refetch).
* **Layer config**: panel controls → `store.setLayerConfig` → overlay manager calls
  `handle.applyConfig(cfg)` (colormap/clim/colours/invert in place) or re-creates the layer
  (render mode or log toggle) → URL tokens. Registry values are defaults only.
* **Directional render modes** (`rad-to-bearing` fields; `rad-to-axis` = headless axis): 'colour
  map' (zarr-layer), 'arrows' (screen grid every dsep px; length/opacity scaled by
  `display.magnitudeVar`, falling back to `DEFAULT_MAGNITUDE` in `adapters.ts`: rdpa→rdpm,
  at/ab→qacb, ae/ao→qace) or 'streamlines': Jobard–Lefer in SCREEN space (`dsep` px;
  `dtest` = dsep/2; RK4 step 1.5 px; forward + backward; stop at the
  viewport/globe limb, no data, weak field, > 45° turn in one step, within `dtest` of another line
  (spatial hash, own last points ignored) or max length; seeds at ±dsep normals then a grid;
  lines < 2 dsep dropped; ≤ 2500 lines, 250 ms). The field is sampled on the SPHERE
  (`sampleUnitSphere`): each grid corner's bearing becomes a 3D tangent vector in its own
  east/north frame, the four are blended bilinearly in 3D and expressed in the query point's
  frame (axial αH: doubled angles, sign chosen to continue the line), so sampling is regular at
  the poles and the antimeridian (the old (sin, cos) blend in lon/lat frames and the cos(lat)
  clamp are gone); rows are clamped to the grid including the pole rows. Pyramid level: cell
  ≤ dsep/4 px. The screen direction comes from a 3D Jacobian: central differences of the node
  positions on the unit sphere (≤ 20k nodes over the screen), least-squares solved for the screen
  vector of the tangent — equivalent to integrating on the sphere and projecting, with spacing
  kept in screen px (deliberately not great-circle stepping on the sphere, which would lose
  the even screen spacing). Read window (`readWindow`): in the globe the latitudes of a 17×17
  screen sample plus 1° pad, extended to the pole (row ±90 included) when the pole is on the
  visible hemisphere (project/unproject round trip at ±89.9999°); never clamped at ±85.05°.
  Direction fields get arrowheads along the lines.
  *Flat map:* screen vertices are unprojected and passed through `geoPolylines`: longitudes
  unwrapped along the line, split at the antimeridian with a shared interpolated vertex at ±180
  (otherwise MapLibre joins 179.9 → −179.9 the long way, a ring around the globe), and split at
  any step longer than 4·dsep in degrees or a non-finite vertex; arrows use the spherical
  destination (`offset`, exact near the poles) and the same split; drawn as a GeoJSON line layer
  `ov-<id>-vec`. *Globe:* GeoJSON layers cannot be drawn beyond ±85.05° in MapLibre's globe, so the
  lines go to a custom WebGL layer `ov-<id>-vec-globe` (`src/map/globelines.ts`, `GlobeLinesLayer`):
  vertices as unclamped Mercator x/y (latitudes up to ±89.9999°), projected with MapLibre's
  `projectTile` shader prelude, extruded in screen space (line width in px, 1 px antialiasing,
  premultiplied alpha, per-vertex alpha for the arrows' magnitude scaling); lines are split where
  consecutive screen vertices are > 4·dsep apart (`splitByScreenGap`), the GeoJSON source is
  emptied while the globe layer draws, and the layer draws nothing in Mercator. Opacity and line
  colour apply to both layers. Recomputed on `moveend`, `projectiontransition` and threshold change.
* **Arrow / streamline spacing** is set on the ground: slider 'Spacing (km)' with steps 10, 20,
  50, 100, 200, 500, 1000 km (default 100; URL `~km=`). On every recompute it is converted to
  screen px at the view centre with the measured ground resolution (great-circle distance between
  points ±25 px about the centre, so the same in globe and mercator; fallback Web-Mercator
  `40075016.686·cos(lat)/(512·2^zoom)` m/px — MapLibre zooms are 512-px tiles, half the 256-px
  `156543.03` constant), then clamped to 8–120 px (`DSEP_PX_CLAMP`). The panel shows the
  The km value is the only state (store + URL); the px value is internal to each recompute and
  is never shown or written back (fixed-width tabular label, so the slider does not shift while
  dragging). Old links with px spacing (`~ds=`) are migrated once to the nearest km step at
  the initial view.
* **Datasets**: `registry.datasets[{id, title, prefix, …}]` + `defaultDataset`; a source containing
  `{dataset}` expands to the selected dataset's `prefix` (cell store: `{dataset}/cells.zarr`);
  sources without it (dunes, aridity, vegetation) are dataset-independent. The selector ("Wind
  dataset": ERA5-Land 0.1° | ERA5 0.25°) appears only with > 1 dataset.
* **Dataset variants**: `registry/datasets/<id>/*.yaml` (dataset entry + generated field
  fragments, same layer ids) are merged by `addDatasets` into `registry.datasetLayers[id]` (only
  layers that differ: colour limits, citation, attribution, descriptions). `applyDatasetLayers`
  swaps them into the shared layer objects in place (base copies kept for switching back) and
  returns the changed ids. Choice: the share link's dataset; a `?query` permalink's `dataset=`, or
  `defaultDataset` (ERA5-Land) if it has none (permalinks were written without it for ERA5-Land;
  the app now always writes it); with no view state in the URL, the user's last explicit switch
  (localStorage `duneAtlas.dataset`), else the default view's (ERA5). A switch goes
  through `Store.intercept`: definitions swapped, persisted, colour-limit overrides of the
  swapped layers dropped (`layersForDatasetSwitch`; colormap, reverse, log, mode, colours,
  opacity, visibility and order kept); then the overlays re-resolve their sources
  (`setDatasetPrefix` + `reattach`), the cell store reopens and the selected location is
  re-snapped to the new grid (stale opens from rapid switching are ignored), and the layer panel
  re-renders legends and info popovers. Panel / downloads / citations take the dataset from
  `exportMeta().datasetId`: `cell/datasetinfo.ts` (name, resolution, hours, land and dune rules),
  `cell/auxinfo.ts` ({res}/{npx} texts), `cell/citation.ts` (`datasetSourceIds`: ERA5 →
  Hersbach 2020 + CDS DOI + ERA5 notice).
* **Dataset parity of the panel and downloads**: the summary table, NetCDF, CSV bundle,
  metadata.json and README have the same rows / variables / columns / keys, order, units and
  texts for both datasets; only dataset-specific values differ (name, resolution / grid, hours,
  references / citation / notice, file name, cell position) - enforced by `tests/parity.test.ts`
  (explicit allowlist). `harmonizeAux` (in `CellStore.query`) maps the sidecars of every dataset
  onto `AUX_ORDER` = qsdiv, ai_mean, ai_valid_frac, ai_sat_frac, tot_cov_mean,
  tot_cov_valid_frac: the 0.1° valid fraction is 1 where the 0.1° mean is valid (else 0); the
  ERA5 `lsm` and the 0.1° `tot_cov_n_months` stay in the stores but are not published per cell.
  Shared texts: dune presence = "the cell overlaps at least one 0.1° dune cell" (the 0.1° cell
  itself for ERA5-Land). Land definitions are app constants (`cell/datasetinfo.ts`, never the
  store attrs): ERA5-Land land–sea mask fraction > 0.5 ("mainly water" otherwise), ERA5 > 0 (any
  land; the stores under `dune-atlas/v2/datasets/era5`, rebuilt with this mask); the no-data
  message names the dataset's rule. `tests/publictext.test.ts` passes the real ERA5 v2 root attrs
  (`tests/fixtures/era5-v2-cells-attrs.json`) through the panels and downloads and checks, with a
  sentinel mark on every free-text attr, that none of it reaches the site or the files. The Wind
  dataset selector tooltips are app text too (`datasetTooltip`: "ERA5 0.25°, 1950–2024; land cells:
  land–sea mask fraction > 0"), not the generated registry `description` (also marked in that test).
* **Panel re-renders keep the view**: the scrolling element persists while the panel is open;
  threshold changes and re-renders keep its scroll position, and `show()` of the same location
  (`sameLocation`: either cell centre inside the other cell - a dataset switch re-snap or the same
  cell) keeps the old content (aria-busy, dimmed) until the new data are in, then re-renders at
  the same scroll position; another location starts at the top. Collapsed sections persist.
* **Help, tour, share, export** (`ui/tools.ts`, `ui/tour.ts`, `ui/helpText.ts`, `share/shortlink.ts`,
  `export/`): a MapLibre control under the zoom buttons (never under the side panels or the mobile
  bottom sheet) with Help and tour (?), Share / copy link and Export map image; each opens a small
  dialog (Esc / × / click outside close it). All help, tour, share and export text is in
  `ui/helpText.ts`; `docs/help-text.md` is generated from it (`npm run help-doc`, checked by a test)
  and the public-text test covers it. The tour (8 steps, no tour library) runs once on the first visit
  (localStorage `duneAtlas.tourSeen`; never in embed mode unless `?tour=1`); step 1 highlights the
  help button. Steps highlight the first visible of their targets (else a centred popover);
  Back / Next / Skip, Esc and click outside skip, arrows, focus trap, aria-live. Two steps
  demonstrate the UI through enter / leave hooks (`ui/tourHooks.ts`, run in sequence on a promise
  chain so fast clicking cannot interleave them): step 4 (Layers) first opens the layer list if it
  is collapsed (desktop toggle or narrow screens; `setLayerPanelOpen`, as the Layers button), then
  the drift-potential group and the Display section of RDD (`rdpa`), centres it in the list and
  spotlights it; step 6 (Click a land cell) selects the
  example Namib cell (15.2° E, 24.5° S, the containing cell of the current dataset) without moving
  the map, waits for the panel to render, outlines the panel's own u*,th slider and the Download & cite section, and resets the
  mobile sheet to its default height (fallback text if the cell cannot be loaded). Leaving either
  step by any route restores the exact previous state (group / Display open, layer-list scroll and
  collapsed state, previous selection or none, its panel scroll, sheet height); no layer is added.
* **Short share links** `#v=<base64url>` (format v1, binary, varints): camera, projection, dataset,
  basemap, u*,th index, selected cell, layer panel open, and the visible layers in drawing order with
  opacity and display config (colormap, reverse, limits to 6 significant digits, log, render mode,
  line colour, spacing, fill, invert). Ids are indices into append-only tables (`SHARE_IDS`; unknown
  ids inline), so links survive registry growth. Typical links: 58–77 characters with the site
  address. `?query` permalinks are still parsed and still written to the address bar.
* **Cursor coordinates** (`ui/coords.ts`): a MapLibre control floated beside the scale bar
  (bottom left, same dark box, 10 px tabular figures, `pointer-events: none`): "24.53° S, 15.21° E"
  (2 decimals, hemisphere letters, longitude wrapped). Mouse: follows the cursor, keeps the last
  value dimmed when the cursor leaves the map. Touch screens (`hover: none`): hidden until a tap,
  then the last tapped point. DOM only, so never in image exports.
* **Opening view** (`src/defaultview.ts`): without view state in the URL (no `#v=`, no view keys in
  `?query`; `embed=1` / `tour=1` alone do not count, so embeds open the same way) the atlas opens
  in `DEFAULT_VIEW`, the decoded author link `#v=AQXirhW4wRLgAgIBDgMJVSACAWQAB1UA`: globe centred
  at 15.1644° N, 17.5025° E, zoom 3.52; ERA5 0.25°; u*,th = 0.15 m/s (index 14); dark basemap;
  RDD as streamlines at 85 % over the dune fields (100 %) over DP (85 %); no selected cell; layer
  list open (on narrow screens it stays collapsed, the responsive default). Defaults are set at the
  source (`resolveInitialState` -> `initialAppState`), not by redirecting: the address stays bare
  while the state equals the opening one (and becomes bare again when it returns to it, e.g. after
  the tour's example cell). Precedence: `#v=` > `?query` (missing fields from the default view) >
  default view (dataset: the stored explicit choice, if any). Encoding the opening state gives the
  same link (tested). The registry's `visible` / `opacity` remain the defaults of layers switched
  on later and of permalinks that omit them.
* **Image exports** (one size, tagged 300 dpi): the map is captured from the live canvas after
  `idle` + overlay adds at the pixel ratio giving W = clamp(on-screen width x 1.5, 1600, 2400) px
  (`export/png.ts`; basemap layers hidden for a transparent background, selected-cell outline always
  hidden; `maxCanvasSize` 16384). Plots are exported 1600 px wide. The PNG pHYs chunk is always
  300 dpi (11811 px/m): it only sets the print size (W / 300 in). Sizing is RELATIVE to W: the
  strip (`export/strip.ts`) is laid out 1000 units wide whatever the pixel width, with body text,
  legends, colour-bar titles and ticks 0.018 W, the heading 0.024 W (about 17 pt and 23 pt when the
  image fills a 13.33 in slide), colour bars 0.28 W x 0.022 W (3 per row, wrapping), and line
  widths, ticks, north arrow and scale bar scaled likewise. Plot exports draw the plot 0.96 W
  (wide plots) or 0.66 W (roses) wide with its labels at 0.018 W (`exportPlotTheme`). The strip
  spans the canvas's ACTUAL width with one factor on both axes (a clamped canvas never squeezes
  text). Layout: image, full-width separator padded from it, colour bars, keys, north arrow and
  scale bar (its length in strip units = the map's scale), then the descriptive text. Colour bars
  carry title, ticks, units and u*,th only; no grid row / column anywhere; rose ring labels have no
  halo. Text is placed with Helvetica / Arial advance widths (`export/texsvg.ts`).
* **Symbols in exports** (`export/texsvg.ts`, `export/mathjax.ts`, `export/labels.ts`): every
  label of the exported images may contain TeX ($...$): layer titles (`exportTitleTex`: the
  English title with the symbol of `titleTex`, e.g. "Drift potential ($DP$)"), units
  (`unitsTex`: upright with superscripts, $\mathrm{m^{2}\,yr^{-1}}$), the threshold ($u_{*,th}$),
  mode legends ($\alpha_T$ ...), $DP$ / $RDP$ / $RDD$, axis labels and the captions (the on-screen
  KaTeX carries its source in `data-tex`). Formulas are drawn as SVG paths by MathJax (TeX input,
  SVG output, no font cache: glyphs embedded, no font dependence), scaled with the surrounding
  text (x 1.18 for matching x-heights). MathJax is a separate chunk (about 1.6 MB, 590 kB gzipped)
  loaded only when an image is exported; if it cannot be loaded the symbols fall back to plain text.
* **Antimeridian**: both wind grids have an edge column that straddles ±180 (ERA5-Land
  −180.05..−179.95, ERA5 −180.125..−179.875). zarr-layer patch (`patches/`): raster x bounds are
  not clamped to ±180 (the column keeps its width; the part beyond −180 is drawn at x < 0, which
  wraps on the globe and is drawn again at world offset +1 in Mercator), world offsets padded by 1°,
  and `getVisibleRegions` intersects the unwrapped (or west > east) viewport with the data extent
  at ±360° shifts so regions on both sides of the seam are fetched and drawn. The selected-cell
  highlight of a seam cell is split into two parts within ±180 (`cellFeature`, no outline on the
  seam). Arrows / streamlines read one continuous window across the seam (`FieldReader.read`
  joins the columns of both ends of a global grid; sampling tries lon ± 360) and split their
  lines at ±180 (`geoPolylines`).
* **Grid-agnostic cell queries**: grid (`lat0, dlat, lon0, dlon, ny, nx`), histogram bin edges and
  `ut_values` come from the cell store root attrs (ERA5-Land constants only as a fallback), so a
  0.25° ERA5 store (721 × 1440) works unchanged.
* **Active layers / drawing order**: `store.order` (top first, all layers) drives map stacking via
  `OverlayManager.setOrder` (`moveLayer`); the 'Active layers' section lists the visible layers
  with numbers, drag handles, the per-layer opacity slider (the only opacity control), move
  buttons and a × that hides the layer (the same state as unticking it); rows are reused (not
  rebuilt) unless the visible set or order changes, so slider drags are not interrupted;
  ticking a layer (in the list) puts it on top of the order; saved in the URL (`order=`) when it differs from the registry.
* **Raster georeferencing**: every zarr-layer gets explicit cell-EDGE `bounds` (+
  `latIsAscending`) from the store's root attrs (`map/zarrgeo.ts`: finest
  `multiscales.layout[].spatial:transform` × `spatial:shape`, else `spatial:bbox`; v1 =
  [-180.05, -90.05, 179.95, 90.05]; ERA5 0.25° works the same). Without them zarr-layer 0.4.3
  infers bounds from the centre coordinates and snaps a ~360° extent to ±180
  (`_loadSpatialMetadata`), shifting the raster 0.05° east. With explicit bounds the untiled
  path (our layout stores) uses them verbatim (`UntiledMode.getRegionBounds` is linear in pixel
  index); `normalizeGlobalExtent` (±180/±90) is only reached from the tiled helpers
  (guarded by a test that reads the library source). Arrows/streamlines (`FieldReader`, from the
  same per-level transforms) and click snapping (cell store grid) use the same edges. Coarse
  pyramid levels whose size is not an exact halving (1801 rows → 900, …) use their own bounds
  (patched zarr-layer, see "Patched dependency"), so every level is cell-exact.
* **Per-cell downloads** ('Download & cite'): 'NetCDF (.nc)' — dims um_bin 128, ua_bin 128, ut 64,
  nv 2, rose_mode 3 (+ name_strlen); coords um_bin/ua_bin (+ _bnds; ua_bin in the source
  convention, radians CCW from east, toward; ua_bin_bearing_toward / _from in degrees), ut
  (rounded to 2 d.p. = the linspace(0.01, 0.64, 64) grid), latitude, longitude, cell_y/cell_x
  (grid attrs); wind_hist(um_bin, ua_bin) NC_INT hours; the 23 fields as var(ut) NC_FLOAT (exact
  store float32; units (UDUNITS), long_name (plain text, `util/plaintext.ts`), long_name_latex,
  description, description_latex); dune_present; flux_rose(rose_mode, ut,
  ua_bin) m2 yr-1 (flat bed / elongation / transverse = the panel's functions; crest rows _FillValue where
  qace / qacb is 0); global attrs (title, institution, source, dataset_id, data_version from the
  dataset prefix, references grouped by source, CC BY 4.0, CF-1.8, history with the permalink,
  comment = AI notice). 'CSV bundle (.zip)' (DEFLATE via CompressionStream('deflate-raw'), stored
  fallback) — every CSV has 3 header rows (NetCDF variable names, UDUNITS units, plain long names;
  pandas `pd.read_csv(f, header=0, skiprows=[1, 2])`, R recipes in README.txt), numbers as the
  shortest text that reproduces the NetCDF value, empty = undefined: wind_histogram.csv and flux_rose.csv
  in tidy long format with the same direction columns (ua_bin, ua_bin_lo, ua_bin_hi,
  ua_bin_bearing_toward, ua_bin_bearing_from; source bin order), fields_by_threshold.csv (ut + the
  23 variable names), metadata.json (column definitions, field names plain + LaTeX, descriptions,
  citation), README.txt. File names `dune-atlas_<dataset>_<lat>_<lon>.nc|.zip`. Plus
  'Citation (TXT)' and 'Copy citation'.
* **Citations** (`cell/citation.ts`): grouped by SOURCE, each with Paper / Data entries (+ notice):
  Dune Atlas / dune map (paper doi:10.1038/s41467-026-75466-y; data: wind histograms and
  sand-flux fields = Supplementary Data doi:10.5281/zenodo.20046812, CC BY 4.0; dune map
  (dune-mask-rev1.tif) = Supplementary Code v1.0.0 doi:10.5281/zenodo.20054674, MIT) and ERA5-Land (Muñoz-Sabater et al. 2021 ESSD;
  CDS doi:10.24381/cds.e2161bac; Copernicus notice). The same structure feeds the panels, the TXT
  / clipboard text, NetCDF `references` and metadata.json. `CITATION_SOURCES.aridity` is a hook for
  the aridity-index layer (`citationSources(["aridity"])`), not cited until that layer lands.
* **Land-surface / derived layers** (group id `climate`, title "Land surface") (`registry/generated/x_extra_fields.yaml`, generated by
  `pipeline ... extra_layers`; the `x_` prefix makes it merge after `qsat_fields.yaml`, so qsdiv
  is listed after DP/RDP/RDD in the `drift` group). Group order is fixed in `registry/layers.yaml`:
  dunes, orientation, crest-fluxes, morphology, wind, drift, climate. `aridity` (Global-AI v3.1,
  native 30″ GeoZarr, 2-D, extent 90° N–60° S, 9 levels incl. non-power-of-two factors) is
  `thresholdAware: false` (no selector, no setThreshold; info says threshold-independent), log
  BrBG [0.003, 6.5] with `display.ticks` (UNEP limits 0.03 / 0.2 / 0.5 / 0.65; close labels are
  staggered), `display.topLabel` ("≥ 6.5") and `display.legendNote` (saturation, no data south of
  60° S). `qsdiv` (flux divergence, data in m/yr, shown in m/kyr) uses PiYG ±0.3 m/kyr; with "log scale"
  ticked it uses a symmetric log scale (linear threshold 10^(floor(log10 max|clim|) − 2), 0 at the
  colormap centre for symmetric limits or diverging colormaps; shader uniforms u_linthresh/u_centred).
  Explicit bounds and per-level bounds come from each store's own transforms, so the aridity box
  (-180..180, -60..90) needs nothing special (tested with its real root metadata).
* **Attribution**: a layer's optional `attribution` {source, citation, doi, licence, url, changes}
  is shown in its info popover (`infoHtml` / `attributionHtml`; links only for http(s) URLs).
* **Per-cell sidecars** (`cells-aux.zarr`, `cells-aux-<name>.zarr`, one store per later set of
  per-cell variables): `CellStore.open(url, {aux: [...]})` opens every store of the dataset's
  `cellAuxStores` (registry; default `CONFIG.cellAuxPaths` = cells-aux, cells-aux-veg; env
  `VITE_CELL_AUX_STORES`) and merges their variables into `cell.aux` (first store wins on a name
  clash; a store that cannot be opened only drops its own values). Names, descriptions and source
  statements of the variables shown / exported are in `cell/auxinfo.ts` (`AUX_META`).
* **Vegetation cover** (`fields/vegetation.zarr`, Land surface group after aridity): linear
  0–100 %, `ylgn`; panel row "Vegetation cover" from `tot_cov_mean` with `tot_cov_valid_frac`;
  scalars in NetCDF / metadata.json; citation source `vegetation` (CELL_SOURCE_IDS, About).
* **Links in registry text**: descriptions, legend notes, attribution values and citation
  notices may contain `[label](https://…)` or bare http(s) URLs; `util/richtext.ts` renders them
  as new-tab links and escapes everything else (non-http(s) URLs stay text).
* **cells-aux.zarr contents**: `query` adds `cell.aux = {series: {qsdiv[64]}, scalars: {ai_mean, ai_valid_frac, ai_sat_frac},
  attrs}`. Panel: summary rows for ∇·q_s at the current threshold (m/kyr) and the aridity cell mean
  with UNEP class, valid / saturated fractions and "≥" when saturated pixels are included, plus a
  small "flux divergence vs threshold" line plot. Downloads: NetCDF `qsdiv(ut)` (m yr-1, float32 as
  stored) and scalar `ai_mean`, `ai_valid_frac`, `ai_sat_frac` with source/licence attrs;
  fields_by_threshold.csv column `qsdiv`; metadata.json `aux`; the Global-AI source is cited in
  every cell download (`CELL_SOURCE_IDS`).
* **Direction-validity mask**: a direction field is no data where its paired magnitude is ≤ 0 or
  NaN — `display.maskVar` ?? `display.magnitudeVar` ?? `DIRECTION_MASK_VAR` (rdpa↔rdpm,
  at/ab↔qacb, ae/ao↔qace; rdpa is exactly 0 = east where DP = 0, ae/ao arbitrary where the
  elongation-mode crest flux is 0). Colour map: zarr-layer reads a virtual store
  (`map/maskedstore.ts`) that re-describes each level's direction array as unsharded,
  uncompressed chunks of one threshold and fills each chunk by decoding the direction and mask
  windows (NaN where masked; NaN pixels are discarded by the shader). Arrows/streamlines:
  `applyMask` sets masked cells to NaN before seeding/integration. The side panel uses the same
  rule (`MODE_DEFINED_BY` = the mask var).
* **Missing data**: no availability probes; a layer whose data cannot be loaded logs a
  `console.warn` only.
* **Dunes invert**: `invertSource`/`invertSourceLayer` (land without dunes, cell-exact): the
  dunes fill is hidden and the complement filled in the chosen colour. Vector layers are drawn
  as fills only: no outline layer, colour or toggle (a registry `line` style is ignored; old URL
  keys `lc`/`ol` are ignored), and no legend swatch (the fill picker shows the colour). Vector
  tiles end at ±85.05°, so interior Antarctica is not coloured.
* **Click**: `snapToCell` → `CellStore.query(iy, ix)` reads `hist[iy,ix,:,:]` (uint32 128×128),
  `fields[iy,ix,:,:]` (float32 n×64, n and order = root attrs `field_vars`, currently all 23) and
  `dunes[iy,ix]` in parallel. First click in a shard: 5 range reads ≈ 20 kB; next click in the
  same 16×16 shard: 2 reads ≈ 11 kB (fixture measurement, `npm run check-cell-query`).
* **Field data provenance**: the cell store and pyramids are built from qsat_params via
  `pipeline/.../qsat_view.py`: fields are time-averaged over the hourly record (`dpm, rdpm, rdpa,
  qha_rdp_dp` from the drift store of `scripts/drift/compute_drift.py`) and `qhbf, qhef` are
  fractions in [0, 1] (undefined = no crest flux, shown as "—"). The panel shows fractions (`uft, qhbf, qhef, qha_rdp_dp`) to 3 decimals.
* **Withheld fields**: `constants.WITHHELD_VARS` is currently empty (all 23 shown). If names
  are added there (re-run `scripts/export-constants.py`), the app drops them from the summary
  table and fields JSON (`isPublishedField`) and `validate-registry` rejects layers using them.
* **Flux rose**: modes 'Flat bed' (q from u\*f, `flux_rose`), 'Elongation (αE)'
  and 'Transverse migration (αH)' (crest flux with speed-up `uc = uf (1 + BETA·DASPECT·|sin(ua − α)|)`
  about the mode directions ae / ab at the current u\*,th, `flux.py crest_flux_rose`), all time-averaged
  `Σ_speed n·q / Σ_all n` (the same reduction as the fields), caption states the
  mode and total (DP or ⟨|Q(α)|⟩); petals aggregated into 8–128 sectors (slider) by the direction sand moves TOWARD; radial
  axis % of total flux (sums to 100; default) or m²/yr (sums to DP), DP stated in the caption. There is no reduction option. DP, RDP, RDP/DP and RDD in the panel, the RDD
  arrow and the RDD line in the modes plot are the cell-store fields at the current
  threshold (so the panel matches the map); arrows αT, αE (toward) and the αH axis likewise.
* **Excess-shear stacking**: each flux rose sector is split by the class of u\*/u\*,th of the
  winds carrying the flux — u\*f/u\*,th (flat bed) or uc/u\*,th (crest modes) — with class edges
  1, 1.25, 1.5, 2, 3, 5, ∞ (`EXCESS_SHEAR_EDGES`; only u\* > u\*,th transports). Per (speed,
  direction) bin the class is fixed, so the classes partition the rose exactly
  (`fluxRoseByExcessShear`, Python reference `flux.py flux_rose_by_excess_shear`). Works with the
  % / m²/yr axis and the sector slider; colour key below the rose.
  **Visibility rule**: a direction is hidden (arrow, polar trace, table "—") where its paired
  magnitude is not > 0 — the map's direction-validity mask: RDD needs rdpm > 0, αH/αT need
  qacb > 0, αE/αO need qace > 0. Rose sectors default to 128 (wind and flux). The
  wind rose is drawn FROM (toward + 180°), % of counted hours (normalised by the histogram sum;
  hours > 20 m/s are not in the histogram); it does not depend on u*,th. Every threshold-dependent
  element (flux rose + DP/RDP/RDD, modes ring and dots, qsdiv marker, summary heading and table,
  meta line) is re-rendered in place by `update()` on a slider change.
* **Basemap swap**: `basemaps.setBasemap` = `setStyle(diff:false, transformStyle)` (MapLibre defers
  the swap until the previous style has loaded; only the final style of a rapid sequence emits
  `style.load`). On `style.load`, `overlays.restoreOverlays` adds the selected-cell highlight
  (below the first basemap label) and `reattach`es every active overlay: old handles are
  disposed, every visible layer is re-added with its opacity / config, and **each completed add
  re-applies the drawing order** (`setOrder`), because adds finish asynchronously in any order
  (zarr layers await their store metadata, vector layers are synchronous). Handles track the
  map-object instances they created (`adapters.Owned`): after a swap the new style has layers
  and sources with the same ids, and a stale handle never styles or removes them; async
  adapters check `ctx.alive()` before touching the map (`StaleLayerError`). Tested on a
  MapLibre stand-in (`tests/fakemap.ts`, `tests/basemapswitch.test.ts`).

### Registry contract

* `registry/layers.yaml` (hand-written: `version, dataBase, threshold, basemaps, groups, layers`)
  plus every `registry/generated/*.yaml` fragment (`{groups, layers}` only), merged in filename
  order: a fragment layer with an existing id **replaces** it in place (this is how the
  placeholder `dpm/at/qha_rdp_dp/ae/uft/dunes` entries are superseded), a fragment group with an
  existing id updates it, new entries append. Panel order = merged order; map stacking =
  merged order (later on top), always below basemap labels and the selected-cell outline.
* `source` is a URL or a path relative to `VITE_DATA_BASE` (default `registry.dataBase`).
* `display.clim` is in display units (after `transform`); `log: true` needs `clim[0] > 0`.
  `colormap` names come from `src/generated/colormaps.json`. These are defaults; users can
  change colormap/clim/log in the panel. Optional `display.magnitudeVar` pairs a directional
  field with the variable scaling its arrows; optional `invertSource`/`invertSourceLayer` give a
  vector layer an 'invert' complement tileset.
* `style` (vector/raster types): keys are MapLibre layer types (`fill`, `line`, `circle`,
  `raster`), values are paint objects; the layer opacity multiplies the `*-opacity` paint value.
* CI (`npm run validate-registry`, also `tests/registry.test.ts`) validates `layers.yaml` alone
  and the merged result: schema + duplicate ids, unknown groups/colormaps, missing clim/variable,
  threshold values = pipeline `UT_VALUES`, one default basemap, `thresholdAware` only on
  `zarr-field`, `sourceLayer` for `pmtiles-vector`.

### Adding a layer type

1. Write an adapter in `src/map/adapters.ts`: `(layer, ctx, opacity) => LayerHandle` that adds its
   MapLibre source/layers *before `ctx.beforeId`* and returns `{layerIds, setOpacity, remove,
   setThreshold?}`. Register it in `ADAPTERS`.
2. Add the type to `registry/layers.schema.json` → `$defs/layer/properties/type/enum` and to
   `LayerType` in `src/registry/types.ts` (TypeScript then forces the `ADAPTERS` entry).
3. Add semantic checks to `src/registry/validate.ts` and a negative case to
   `tests/registry.test.ts`; add legend handling in `src/ui/legend.ts` if needed.

Adding a layer of an existing type needs no code: a YAML entry (or a pipeline-generated fragment).

### Build-time configuration

| env | default | meaning |
|---|---|---|
| `VITE_DATA_BASE` | `registry.dataBase` | base URL for relative sources |
| `VITE_CELL_STORE` | `dune-atlas/v1/cells.zarr` | cell store path under the data base |
| `VITE_SUFFIX_RANGE` | `1` | `0` → HEAD + range instead of `Range: bytes=-N` for shard indexes |

Local dev against the fixture: the generated fragments use `dune-atlas/v1/...` paths, so serve a
directory that maps that prefix onto the fixture, e.g.
`mkdir -p staging/devroot/dune-atlas && ln -s ../../fixture staging/devroot/dune-atlas/v1 &&
python scripts/serve_data.py staging/devroot --port 8787`, then
`cd app && VITE_DATA_BASE=http://127.0.0.1:8787 npm run dev`. Only the five fixture fields and
the fixture region exist there (`at ae qacb sige_sigh uft`); other layers log a load error.

### Tests

`npm run test:ci` (scripts/test-ci.sh) reproduces the CI job from a clean `git archive` (no `notes/`,
no `staging/`): `npm ci`, `validate-registry`, `npm test`, build, and lists the tests skipped
because the fixture data are absent; `CI_NODE=<dir of node 22>` runs it with the CI Node version.
Test timeout 20 s (shared runners are slower than a laptop).

`npm test` (vitest): flux parity vs `flux.py`, the crest flux rose (both modes) and the excess-shear split (flat + elongation, 2 cells × 3 thresholds; classes match Python and sum to the unstacked rose and sector totals, rtol 1e-12) (7 cells incl. one synthetic with 40
empty direction bins × 6 thresholds; rtol 1e-12 on DP and the per-direction rose, 1e-10 on RDP,
1e-9 rad on RDD), the check that the TS DP/RDP/RDD and the petal sum equal the cell-store
`dpm/rdpm/rdpa/qha_rdp_dp` (float32; rtol 1e-6, RDD 1e-5 rad), bearing conventions and sector alignment, snapping
(edges, antimeridian, poles), URL state, registry schema/merge and negative cases (incl.
withheld-field rejection, invert/magnitude properties), URL layer-config tokens, the NetCDF-3 writer
(parsed back by a minimal reader), zip writer (CRC-32, headers), export builders (flux_rose table =
panel functions, masked rows, CSV shapes and conventions), per-level bounds of the patched
zarr-layer, an attribute audit (every *_latex string rendered by KaTeX with throwOnError; plain
attributes free of `\` / `$`; UDUNITS units), deflated zip read back with node zlib, SVG/legend builders (gapless sectors for every allowed count, flux % sums to 100, polar modes plot), arrows and
Jobard–Lefer streamlines on synthetic fields (uniform, vortex, ±π wrap, axial field across 0/180°:
no sign flips, median length ≫ dsep, separation, stops at no data) and a < 200 ms budget, datasets
and {dataset} expansion, a synthetic 0.25° grid for snapping, the ERA5 dataset (`tests/era5.test.ts`:
variants and sources, in-place swap and restore, config kept / limits reset, initial-dataset rules,
0.25° snapping incl. antimeridian and poles, panel + downloads on `staging/fixture/datasets/era5`
incl. the ocean message, overlays reloaded with ERA5 sources then a basemap switch, layer panel
refresh; per-level bounds of the ERA5 pyramids in `georef.test.ts`), drawing order, the multiscale window reader on
the fixture pyramids, KaTeX rendering, DOM tests of both panels (happy-dom:
pinned threshold, colormap chooser, render modes, km spacing slider + km→px/clamp/legacy migration, dune fill/invert without outline controls, invert, drawing order (× and re-tick on top), dataset selector, flux modes, visibility rule, resize handle, AI notice, sector
sliders, flux axis toggle, Symbol/Quantity/Value table), and the cell store against
`staging/fixture` (fixture-dependent tests are skipped when it is absent, e.g. in CI).
