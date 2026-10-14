# Mars app: body-switch build, basemaps, development and keeping Mars in sync with Earth (App track)

Constants and formulas: [mars-spec.md](mars-spec.md) (approved; not repeated here). This document covers
the app side of the Mars atlas.

## 1. Body switch

`VITE_BODY=mars` builds the Mars atlas; anything else (the default) builds the Earth atlas. The Earth
build does not load any Mars code: `vite.config.ts` only adds the body plugin (`app/scripts/body-plugin.ts`)
when `VITE_BODY=mars`. Both builds share one UI (§1a): the header label, the planet toggle, its tour step
and per-body storage keys are shared Earth code, so the Earth build is no longer byte-identical to
`earth/main`; its source differs from `earth/main` only in the files listed in §1a.

### 1a. One UI for both planets (Earth at `/`, Mars at `/mars/`)

* `app/src/body.ts`: `BODY` (`"earth"`, or `"mars"` when `VITE_BODY=mars`), `BODY_NAME`, `storageKey(name)`,
  `otherBodyUrl()`.
* Header (`ui/layerPanel.ts`): h1 "Dune Atlas" followed by the body name ("Earth" / "Mars", class `body-name`,
  `var(--muted)` as the subtitle). Subtitle (`SUBTITLE_HTML`, identical in both builds, two lines, no planet
  name): "Interactive explorer for aeolian geomorphology" / "Developed by the Monash Geomorphology Lab" (link
  https://www.geomorphlab.org/). The Gunn (2026) citation stays in About, citations and downloads. The Mars
  title and subtitle patches are gone; meta description, exports and citations keep "Mars Dune Atlas" in the
  Mars build. The tab title is "MGL - Dune Atlas" in both builds (round 6, §2c).
* Wind dataset selector: shown whenever the registry has a dataset (`>= 1`), so Mars shows "MCMC FV3 2°" (round 7: option text = name + grid, `datasetOptionLabel`; tooltip
  from `datasetTooltip`); Earth unchanged (ERA5-Land, ERA5).
* Planet toggle (`ui/tools.ts`): a `tool-btn planet-btn` directly under the camera button, 18 px inline SVG
  (line icon of a ringed planet: disc plus a tilted elliptical ring whose back arcs stop at the disc;
  `currentColor`, stroke 1.6 as the other tool icons), label/title "Switch to Mars" (Earth) or "Switch to Earth" (Mars).
  It opens the other atlas's default view (no position carried; `?embed=1` carried): Earth → `<base>mars/`,
  Mars → its base without `mars/` (the site root), from `import.meta.env.BASE_URL` (`VITE_BASE`).
  On localhost / 127.0.0.1 / [::1] (vite dev or preview; round 5) the derived same-origin URL would be the
  build itself, so the button opens the LIVE other atlas: Mars → https://map.geomorphlab.org/, Earth →
  https://map.geomorphlab.org/mars/ (`body.ts` `LIVE_SITE`, `isLocalHost`). `VITE_OTHER_BODY_URL` overrides
  both (e.g. `http://localhost:5174/` when the two dev servers run side by side).
* Tour: both tours end with the step `planet` ("Switch planet") on that button, after `tools`;
  `docs/help-text.md` is regenerated from the Earth texts (`npm run help-doc`).
* Same-origin storage: every localStorage key goes through `storageKey`: Earth keys are unchanged
  (`duneAtlas.tourSeen`, `duneAtlas.dataset`, `duneAtlas.cellPanel.*`); Mars keys are `duneAtlasMars.*`, so
  the Mars first-visit tour still shows after visiting Earth (`tests/mars/body.test.ts` also checks that no
  source writes an un-namespaced key). No sessionStorage, no service worker; assets are emitted under the
  Vite base and data URLs are absolute (`VITE_DATA_BASE`), so nothing breaks under `/mars/`.
* Deployment (`.github/workflows/deploy.yml`, not pushed): Earth steps as before, plus
  `validate-registry:mars`, `test:mars`, `build:mars` with `VITE_BODY=mars VITE_BASE=/mars/
  VITE_DATA_BASE=https://data.geomorphlab.org VITE_SITE_URL=https://map.geomorphlab.org/mars/`, then
  `app/dist-mars` copied to `app/dist/mars` before the Pages upload. `npm run test:ci` runs the same from a
  clean `git archive` export (no `staging/`, no `.git`: the local-store test and the drift guard skip).
* Shared text boxes wrap long unbroken text (URLs, DOIs, code): `overflow-wrap: anywhere` on the layer and
  cell panels, info popovers, About, legends and the tool/tour popovers (`style.css`), both builds.
* Info popovers (ⓘ): one structure for every layer of both builds — definition, invert note, then Units, Wind
  data, Slider, Source, Citation, Data DOI, Licence, Link, Changes (`infoHtml`); audit and style guide in
  [info-text-audit.md](info-text-audit.md).
* Group titles: Earth `climate` and Mars `environment` are both "Related data" (ids kept for permalinks).
* Earth source diff vs `earth/main` from this (outside the Mars-only infrastructure: body plugin, Mars scripts,
  `cell/marsphysics.ts`, `generated/constants-mars.json`, package scripts, `vite.config.ts`, `.gitignore`):
  `app/src/body.ts` (new), `app/src/ui/layerPanel.ts` (header label, subtitle, selector with one dataset, info structure), `app/src/style.css` (body-name rule, overflow-wrap rules), `app/src/ui/tools.ts` (planet toggle), `app/src/ui/helpText.ts` (tour step `planet`), `docs/help-text.md` (regenerated), `app/src/ui/tour.ts`, `app/src/ui/cellPanel.ts`, `app/src/main.ts` (storage keys via `storageKey`, Earth key strings unchanged), `registry/layers.yaml`, `registry/generated/x_extra_fields.yaml`, `registry/datasets/era5/x_extra_fields.yaml`, `pipeline/src/dune_atlas_pipeline/extra_layers.py` (generator) and `vegetation.py` (comment) (group title "Related data"), `docs/architecture.md`, `docs/validation-veg.md`, `docs/info-text-audit.md` (new), `app/tests/help.test.ts`, `app/tests/ui.test.ts`, `app/tests/vegetation.test.ts`, `app/tests/body.test.ts` (new), `.github/workflows/deploy.yml`, `app/scripts/test-ci.sh`.

For Mars the plugin applies `app/src/mars/build.ts` in three ways.

**Module substitution** (`MARS_SUBSTITUTES`, 8 modules): an import that resolves to one of these Earth
modules resolves to the Mars module instead (except inside the Mars module itself, which may import the
Earth original). A replacement exports every name of the Earth module (`tests/mars/registry.test.ts`
checks the export sets). Earth fixes to a substituted module do **not** reach Mars unless the Mars module
is a thin wrapper; the drift guard (§6) flags every Earth change.

| Earth module | Mars module | form | what differs and why |
|---|---|---|---|
| `src/config.ts` | `src/mars/config.ts` | thin wrapper (`...EARTH`) | Mars defaults: one sidecar (`cells-aux.zarr`), site URL `VITE_SITE_URL` (deployment URL open). New Earth keys reach Mars automatically. |
| `src/cell/fieldinfo.ts` | `src/mars/cell/fieldinfo.ts` | thin wrapper (`earthFieldInfo`) | long names, descriptions and source units from `registry/mars/qsat_field_metadata.json` (texts of the per-hour Mars threshold); kinds, units, transforms are Earth's (same S2Y). |
| `src/cell/datasetinfo.ts` | `src/mars/cell/datasetinfo.ts` | partial wrapper (re-exports the Earth helpers and type) | one dataset (FV3 beta 1: 2°, 16,032 hours, one Mars year); no land mask (every cell valid); Mars dune rule (MGD3). |
| `src/cell/auxinfo.ts` | `src/mars/cell/auxinfo.ts` | copy (74 lines) | the Mars sidecar variables qsdiv (divergence on R_MARS), rho_mean, elev_mean with the DEM citation and licence; Earth's aridity / vegetation variables do not exist. |
| `src/cell/citation.ts` | `src/mars/cell/citation.ts` | copy (104 lines) | different sources: FV3, Pähtz & Durán (2023), MGD3 dunes, the MOLA–HRSC DEM (`DEM_CITATION`, `DEM_LICENCE`), Gunn (2026); no Copernicus notice (constants kept, empty). |
| `src/ui/helpText.ts` | `src/mars/ui/helpText.ts` | copy (text only; types re-exported) | every help and tour text: grain diameter instead of u*,th, the FV3 dataset, Mars basemaps, Nili Patera tour cell, the planet step ("Switch to Earth"). Same exports and step ids, so `ui/tour.ts`/`tourHooks.ts` work unchanged. |
| `src/ui/cellPanel.ts` | `src/mars/ui/cellPanel.ts` | adapted copy (~600 lines) | the panel's data path differs throughout: hourly series (u, v, T, rho, z) and the per-hour threshold instead of the wind histogram and one u*,th; d instead of u*,th in every label and file name; the series downloads; the height z. Same sections, controls, exports and CSS classes. A wrapper would need hooks in the Earth panel (refactor not done, by decision). |
| `src/main.ts` | `src/mars/main.ts` | adapted copy (~270 lines) | the Earth shell line by line, with the Mars cell store, body-aware scale bar (R_MARS), Mars basemaps (pmtiles hillshade + archive-depth clamp, esri-mars:// protocol), its storage keys through `storageKey` (`duneAtlasMars.*`) and the Mars tour cell. |

**Source patches** (`src/mars/patches.json`, 51 exact find/replace edits in 13 Earth modules): the planet
radius (`map/adapters.ts` viewMetersPerPixel, `layerconfig.ts` metersPerPixel, `export/mapExport.ts` scale
bar: R = 3,389,500 m), the d axis of the modes and divergence plots (`cell/modesplot.ts`, `cell/lineplot.ts`:
x = log10 d with 50–1000 µm ticks), `export/labels.ts` (`$d$ = 200 µm`), texts of `ui/layerPanel.ts`
(data sources incl. the eq. 2.2 u* and the DEM licence), `ui/legend.ts`, `export/mapExport.ts`,
`export/plotExport.ts`, the Mars `DEFAULT_VIEW` (`defaultview.ts`), the coordinate tooltip (`ui/coords.ts`), the Mars
registry paths (`registry/load.ts`, 4 edits; was a substitute) and the grain-size control (`ui/threshold.ts`,
4 edits: µm values, label from the registry, help text; was a substitute). Earth fixes to patched modules
reach Mars automatically. Each `find` must match exactly once (or `count`) or the Mars build fails;
`tests/mars/registry.test.ts` applies all patches to the current Earth sources.

**`index.html`**: title, description and noscript text.

New Mars-only code lives under `app/src/mars/` (cell store, per-hour rose computation, exports, scale bar,
basemaps, Esri protocol). The physics is only `src/cell/marsphysics.ts` (port of
`pipeline/.../mars/physics.py`, Wind track); nothing in the app re-implements it.

### Commands (in `app/`)

| | |
|---|---|
| `npm run build:mars` | typecheck + Mars build to `app/dist-mars/` (gitignored) |
| `npm run dev:mars` | Vite dev server of the Mars build |
| `npm run test:mars` | Mars tests (`tests/mars/*.test.ts`, run with the plugin), including the drift guard |
| `npm run validate-registry:mars` | merged Mars registry vs `registry/layers.schema.json` + Mars checks |
| `npm test` / `npm run build` | Earth, unchanged (Mars tests are excluded from the Earth run) |
| `npm run test:all` | both |

Build-time env: `VITE_DATA_BASE` (as Earth), `VITE_BASE` (public path, e.g. `/mars/`; default `/`),
`VITE_SITE_URL` (texts; https://map.geomorphlab.org/mars/), `VITE_OTHER_BODY_URL` (planet toggle target in local development). The former `VITE_MARS_ESRI` flag is gone
(PI decision 2026-10-14: the Esri basemaps ship).

## 2. What the Mars UI shows

Same panels and controls as Earth. The global control is the median grain diameter d (registry
`threshold`: dim `d`, µm, the 64 values of mars-spec §5, default index 29 = 200 µm); every d-aware layer
selects the `d` index of its `(d, y, x)` pyramid. Layers: dunes (vector), the 23 fields + qsdiv (d-aware),
near-surface air density `rho_mean` and elevation (2-D, group "Related data" (id `environment`), the counterpart of Earth's "Related data" group (id `climate`)). No aridity, vegetation, land mask or ERA5 datasets.

Cell panel (`src/mars/cell/analysis.ts`, `marsflux.ts`): reads `cells.zarr/series` (u, v, T, rho, z per
hour; z = the hour's lowest-level height, ≈ 1.6–3 m) and computes, at the selected d, everything the Earth
panel computes from the histogram: per hour u* from |U| at height z through the smooth-wall mixing-length
profile of Pähtz & Durán (2023) eq. 2.2 under constant stress (`frictionVelocity(u, v, z, ν)`, ν = μ(T)/ρ;
no roughness length), direction, u*,th(d, ρ, T), q(u*) and the crest flux q(u_c) with the same hour's
u*,th; roses per Earth direction bin (128 bins, edges −π…π), sector sums, excess-shear classes u/u*,th
(edges 1, 1.25, 1.5, 2, 3, 5, ∞), % and m²/yr axes; DP/RDP/RDP/DP/RDD and the mode arrows from the stored
fields (the map layers). Extra: median and 5–95 % range of u*,th over the hours, the wind speed at the
median threshold (median over hours of u*,th · u⁺(z u*,th/ν), i.e. at each hour's height), the median
height z, % of hours above threshold and the fraction of hours outside the validity of eq. 3.2
(Ga√s ≤ 81). Wind rose: lowest-level wind (z ≈ 2 m), classes 0–2.5–5–7.5–10–15 and > 15 m/s. One slider
step costs ~10 ms on a full year (16,032 hours) in node.

Downloads (`src/mars/cell/export.ts`): NetCDF with dims hour (16,032), d (64), ua_bin (128); variables u,
v, T, rho, **z (m)**, sol, ls, the 23 fields vs d, qsdiv vs d, rho_mean, elev_mean, dune_present,
dune_fraction and flux_rose(rose_mode, d, ua_bin); CSV bundle wind_series.csv (`hour,sol,ls,u,v,T,rho,z`),
fields_by_grain_size.csv, flux_rose.csv, metadata.json (constants incl. `mixing_length_damping` = 7, no
z/z₀; the eq. 2.2 convention), README.txt.

Distances: scale bar control `src/mars/map/scale.ts` (haversine on R_MARS, MapLibre rounding and element;
Earth keeps the stock `ScaleControl`); arrow/streamline spacing and the export scale bar via the radius
patches. Coordinates: planetocentric °N and °E, −180…180 (as Earth). Default view: globe over the north
polar erg (62° N, 160° E, zoom 2.2), RDD streamlines over the dunes over DP, d = 200 µm, MOLA–HRSC shaded
relief. Tour example cell: Nili Patera (9° N, 67° E → cell (40, 123)). Dune layer: as Earth, a display option
"invert (areas without dunes)" draws the complement from `invertSource: dune-atlas/mars/v1/dunes/invert-r2.pmtiles`,
`invertSourceLayer: invert` (registry/mars/layers.yaml; built by the Terrain track; key and source-layer are
the App default until Terrain reports them). Terrain's fragment replaces the dunes placeholder, so
`src/mars/registry/invert.ts` (applied by the `registry/load.ts` patch) keeps the base layer's invert fields
when the fragment has none. The Mars "Dark background" basemap is removed (PI); old links with
`basemap=dark` open on the default basemap.

### 2a. Info texts, field citation and licences (round 4, PI 2026-10-14; both builds)

* **Definitions at the source.** The generators write definitions without the sentences repeated by the
  popover rows (units, slider, display convention) and keep the TeX of the metadata (KaTeX in the popover).
  Mars: `PYTHONPATH=pipeline/src python -m dune_atlas_pipeline.mars.sidecars registry` rewrites
  `registry/mars/generated/qsat_fields.yaml` and `x_extra_fields.yaml` from the metadata (keeps the colour
  limits of the current `x_extra_fields.yaml`); `rdpa` reads as a compass bearing (the stored convention,
  radians counter-clockwise from east, stays in `qsat_field_metadata.json` and the downloads).
* **One citation for the derived fields**: `Gunn, A. (2026). … doi:10.1038/s41467-026-75466-y; transport law:
  Pähtz, T. & Durán, O. (2023) … doi:10.1017/jfm.2023.343; winds: MCMC FV3 … (Haberle et al. 2019)` —
  `mars/sidecars.py` `CITATION` = `fieldsCitation()` in `src/mars/cell/citation.ts`; used in the Citation row,
  About ("Citing the map fields"), the NetCDF global attribute `fields_citation`, `metadata.json` and the README.
* **Licence row** of every field: "NASA Ames MCMC output; no licence stated (NASA open data)" (`LICENCE`,
  `fieldsLicence()`; also `fields_license` in the downloads and the cell-aux licence of `rho_mean` / `qsdiv`).
* **Basemap ⓘ**: every basemap has an info button with definition · Source · Resolution · (Coverage) ·
  Licence · Link, from the `info` block of `registry/mars/layers.yaml` (schema `layers.schema.json`). HiRISE
  carries the coverage note "HiRISE footprints between about 65° S and 65° N; no imagery at higher latitudes in
  this mosaic (Esri OnMars)."
* DEM name **MOLA–HRSC** everywhere (app, registry, tests, fixture script). See `docs/info-text-audit.md` §4.

### 2b. Round 5 (PI 2026-10-14, both builds)

**Slider-stable numbers** (`src/ui/livenum.ts`; test `tests/jitter.test.ts`, `tests/mars/jitter.test.ts`).
Moving the u*,th / d slider no longer changes the length of wrapped text, so neither panel reflows:

* tabular figures (`font-variant-numeric: tabular-nums`) on the layer panel, the cell panel and legends;
* each live value is set with its unit (no-break space) in one `span.live-num` (inline-block, nowrap) whose
  min-width (ch) is reserved for the longest text over the whole slider axis — from the open cell's 64
  stored values where they exist, else from the widest text of a fixed format per quantity:

  | quantity | format | slot reserved for |
  |---|---|---|
  | slider readout (layer panel, cell panel) | Earth `0.00 m/s`; Mars `d µm` (integer) | widest of the 64 values; padded with figure spaces (U+2007), so `  50 µm` … `1000 µm` |
  | heading "Cell summary at …", "Threshold = …" | as the readout | widest of the 64 values |
  | "≈ x.x m/s wind at 10 m" (Earth) | 1 decimal | the 64 threshold winds |
  | DP, RDP (flux rose), RDP/DP | 3 significant figures (`fmtNum`, ×10ⁿ outside 0.001–10⁵) + `m²/yr` | the cell's 64 stored `dpm`, `rdpm`, `qha_rdp_dp` |
  | RDD and the mode bearings (legend) | `deg° (compass)` | every bearing 0–359° and — |
  | flux-rose total in the caption | `fmtNum` + `m²/yr`, or — | widest possible `fmtNum` text |
  | flux divergence in the caption | `fmtNum` + `m/kyr` | the cell's 64 qsdiv values |
  | Mars: u*,th median, 5–95 % range, threshold wind, % of hours (above threshold; outside the law's validity) | `0.00 m/s`, `0.00–0.00 m/s`, `0.0 m/s`, `0.0 %`, `0.00 %` | widest possible text (9.99 m/s, 99.9 m/s, 100.0 %) — computed per d in the browser, so the 64 values are not at hand |
  | summary table values (all slider-dependent rows) | per field kind: `0.0°`, `0.000` fraction, `fmtNum` + unit | ONE slot width for the value column: widest text over every row and all 64 positions |

* the validity clause of the Mars header is shown at every d when the cell has any hour outside the
  transport law's validity at the smallest d (the fraction only falls with d), with 0.00 % where none;
  the "— = mode direction undefined" note is part of the fixed caption text of the crest modes;
* text around the slots is identical at every position: the test sweeps all 64 positions in both builds
  and asserts that the panels' text and element structure outside the slots are constant and that every
  value fits its slot. SVG plots are fixed-size boxes (their labels move inside them but cause no reflow).
* **slot widths are measured** (review fixes, Oct 2026; review U8 / L11): the conservative character-width
  estimate left visible blank gaps in captions ("DP = 31.4 m²/yr [gap] ."). `livenum.ts` now measures the
  widest text with the page font (canvas `measureText`, `measuredWidthCh`) and reserves that width in ch
  (+0.2 ch); the estimate is the fallback where no canvas is available (tests run with both). Slots in
  captions stand at the end of a line (a bold lead sentence, `.cap-lead`), not mid-sentence, so a reserved
  width never opens a gap inside the text. The key numbers (DP, RDP, RDP/DP, RDD, threshold, dataset,
  period) are in a box at the top of the panel; the full summary table is behind "More: full cell summary
  at …" (section `summary`, closed by default).

**CSV headers** (`src/cell/csvnames.ts`, shared): every CSV is UTF-8 with a BOM and has one header row of
plain ASCII snake_case names [a-z0-9_] — e.g. `sige_sigh` → `sigma_e_over_sigma_h`, `ufm` →
`ustar_mean_above_threshold_over_ustar_th`, `ut` → `ustar_threshold`, `d` → `grain_diameter`, `T` →
`air_temperature`, `flux_rose` → `flux`; the same name for the same quantity on both planets. README.txt and
metadata.json (`files.<csv>.columns`: name, netcdf_name, units, long_name with the UTF-8 symbol) document
each column. NetCDF variable names are unchanged (ASCII short codes). Read with `pd.read_csv(f)`, R
`read.csv(f, fileEncoding = "UTF-8-BOM")` or `readr::read_csv(f)`.

**Cell summary rows**: terse labels (quantity only; no parentheses unless a unit; no trailing symbol, which is
in the Symbol column; `ui/terse.ts`), details in the layer ⓘ and the row's hover title. Removed: Grid cell,
Hours counted, Height of the lowest-level wind (kept in the downloads: metadata.json cell/grid/hours,
wind_series.csv `wind_height`).

**Dune sources** (Mars): the dune layer is MGD3 (Hayward et al. 2007, 2010, 2012, 2014) plus the small dune
fields of Fenton (2020, Icarus 352, 114018, doi:10.1016/j.icarus.2020.114018; checked on CrossRef), merged:
553 polygons < 1 km² (MGD3 maps only fields > 1 km²); equatorward of 65° 2,634 polygons, 120,072 km²
(recomputed from the shapefile with `mars/dunes.py`). In the dunes ⓘ (`registry/mars/generated/dunes.yaml`
from `mars/dunes.py` via `scripts/mars/terrain/write_registry.py`), About, the cell-panel citations and the
downloads, `docs/mars-spec.md` and `docs/validation-mars-terrain.md`. The archive metadata (tippecanoe
attribution/description) cites MGD3 + Fenton (2020) from the round-3 rebuild `dunes-r2.pmtiles` /
`invert-r2.pmtiles` (new keys, R2 is create-only; tiles identical to `dunes.pmtiles` / `invert.pmtiles`,
`docs/validation-mars-terrain.md` §10). The app does not show archive metadata (pmtiles `Protocol()` without
`metadata: true`; attribution comes from the registry and `main.ts`).

**Dunes only** (`src/map/dunemask.ts`; tests `tests/dunesonly.test.ts`, `tests/mars/dunesonly.test.ts`): one
switch under the Wind dataset selector (default off; `dunesonly=1` in ?query links, flag bit 16 of the
`#v=` short link — old links decode as off) restricts every wind-derived map layer to the dataset's dune
cells; cells without dunes are transparent, legends and colour limits unchanged, the cell panel works for
any cell. Wind-derived = `zarr-field` with `thresholdAware` (every field computed from the winds depends on
u*,th / d; registry `windDerived` overrides): the sand-flux fields incl. DP/RDP/RDD/modes, qsdiv and their
arrows / streamlines. Not affected: dunes (and invert), aridity, vegetation, elevation, and Mars `rho_mean`
(atmospheric density, not computed from the wind), basemaps. The mask is the per-cell dune flag already
published in the dataset's cell store — Earth `{dataset}/cells.zarr/dunes` (uint8 1801 x 3600 / 721 x 1440,
`DATASET_INFO.dunesRule`), Mars `{dataset}/cells.zarr/dune` (2° cells overlapping a dune polygon, 2,749
cells) — read once when the switch is first used (Earth ERA5-Land: 120 small blosc chunks, mostly zeros).
**No new data objects.** The field pyramids' level 0 is the cell grid; coarser levels (2x block means) are
masked with "any dune cell in the block". Colour maps: the masked virtual store of `map/maskedstore.ts`
(NaN outside the dune cells, combined with the direction mask of directional fields); arrows / streamlines:
`applyMask` with the level's mask grid. Tour: added to the `layers` step; Help: `layers` section.

**Selected-cell highlight at the poles** (`src/map/selection.ts`, `src/map/globefill.ts`, `cell/snap.ts`;
tests `tests/selection.test.ts`, `tests/mars/selection.test.ts`): on the globe the GeoJSON fill/line was
cut at 85.0511° and its fill triangles on the top tile edge were extended to the pole (`_fillPoles`, a grey
wedge); cells poleward of 86° had no highlight. Now the flat map keeps the GeoJSON layers with the cell
clipped at 85.05° (no vertex on the Mercator edge; the clipped edge is not outlined; a cell entirely
poleward has no flat features), and on the globe they are hidden and the cell is drawn from its TRUE bounds
(`bbox` of the collection, RFC 7946) by a globe fill custom layer and a `GlobeLinesLayer` outline, same
colours (#ffffff 0.12, #ff4d6d 2 px) and drawing order (directly above the GeoJSON layers, below the labels);
a cell touching a pole is outlined by its other latitude circle and the two meridian edges. The switch follows
MapLibre's `projectiontransition`. Other GeoJSON overlays: arrows / streamlines already use `GlobeLinesLayer`
on the globe; the Earth `geojson-points` layer is a fixture placeholder (production dunes are PMTiles); tour
highlights are DOM; map exports omit the `selected-cell*` layers.

**Planet button on localhost**: see §1a.

### 2c. Round 6 (PI 2026-10-14, both builds)

**Streamlines with Dunes only** (`src/map/vectors.ts` `clipStreamlines`, `src/map/adapters.ts`; tests
`tests/vectorclip.test.ts`, `tests/mars/vectorclip.test.ts`, shared `tests/vectorcliplib.ts`): with the toggle
on, streamlines were integrated in the masked field, so a line ended at the first non-dune cell and most
were shorter than the minimum length (few or none drawn). Now they are integrated in the UNMASKED direction
field over the same view window as with the toggle off (same cost) and then clipped to the dune cells: each
line is split at vertex resolution where `sampleNearest(duneGrid)` changes, pieces shorter than
`max(6 px, dsep/3)` are dropped, and a piece of at least 4 head sizes without a regular head gets one at its
midpoint (`arrowheadsAlong(..., atLeastOne)`). Cells without wind data still end lines (NaN, as before).
Counts (all lines / clipped pieces / lines from integrating the masked field): Mars fixture 120 / 244 / 5,
devroot 121 / 244 / 5 (2,749 dune cells); Earth ERA5-Land fixture subset 41 / 26 / 9. Every clipped vertex
lies in a dune cell (checked).

**Arrows anchored at the base** (`arrowFeatures`): the tail is the seed point and the tip is the seed offset by
the arrow length along the bearing (previously centred on the seed). With Dunes only the arrows use the masked
field, so every seed, i.e. every arrow base, is in a dune cell. Headless axis segments stay centred. The legend
swatch was already drawn tail-left.

**Centre on cell** (`src/map/centre.ts`; tests `tests/centre.test.ts`, `tests/mars/centre.test.ts`, shared
`tests/centrelib.ts`): a crosshair button (`button.centre-btn`, 18 px, `currentColor`, aria-label "Centre map
on this cell") next to the cell-panel title (`div.cell-title-row`; the title keeps a fixed width of
"89.9°S, 179.9°W" so the button does not move). It eases the map (600 ms; `jumpTo` with
`prefers-reduced-motion`) to the cell centre at the current zoom, raised if the cell would be under 24 px;
bearing and pitch are kept; latitude is clamped to ±85.05° on the flat map, polar cells are centred exactly
on the globe. Help ("Clicking a cell") and the tour `cell` step have one sentence on it.

**Tab title and icon**: `<title>MGL - Dune Atlas</title>` in `app/index.html` and `MARS_HTML.title`
(the group site's style). The lab icon (from the PI's tarball) is in `app/public/`: `favicon.ico` (multi-size),
`favicon-32.png`, `apple-touch-icon.png` (180 px), `icon-192.png` (not referenced: there is no web manifest).
Links use `%BASE_URL%`, so Earth links `/favicon.ico` and Mars `/mars/favicon.ico`; Vite copies `public/` into
`dist/` and `dist-mars/`, and the Pages layout (`dist-mars` -> `dist/mars`) serves them at both paths
(asserted in `scripts/test-ci.sh`; tests `tests/head.test.ts`, `tests/mars/head.test.ts`, shared
`tests/headlib.ts`).

### 2d. Round 7 (PI 2026-10-14, both builds)

**Map export strip with Dunes only** (`src/export/mapExport.ts` `DUNES_ONLY_STRIP`; tests
`tests/dunesonly.test.ts`, `tests/mars/dunesonly.test.ts`, shared `checkExportStrip` in `tests/dunesonlylib.ts`):
while Dunes only is on and a wind-derived layer is visible, the strip has the line "Dunes only: wind-derived
layers shown in cells with dunes." after the view line (not when off, not with only unaffected layers).

**Embed layout** (`?embed=1`, the Google Sites frame; `src/ui/embed.ts`, `src/ui/layerPanel.ts`,
`src/ui/threshold.ts`, `src/style.css`; tests `tests/embed.test.ts`, `tests/mars/embed.test.ts`, shared
`tests/embedlib.ts`). One layout for both builds:
* "Open full screen ↗" is a pill on the map, top left (accent colour), with the note "Best viewed full screen"
  beside it from 440 px; below 440 px the pill alone (its tooltip has the note). It links to the current view
  (updates with the state) and opens a new tab. The layer panel starts 34 px lower in embed mode. The panel
  header is "Dune Atlas ⟨Body⟩" + Layers only (subtitle hidden in embed, as before).
* Wind dataset and Dunes only: one row each; the selector fills the row; option text is name + grid
  ("ERA5-Land 0.1°", "ERA5 0.25°", "MCMC FV3 2°"); the option and the selector tooltip carry period and land
  rule (`datasetTooltip`).
* Slider block, same DOM in both builds: label line (label + ⓘ) | value + "default ⟨value unit⟩" link |
  slider | one help line "Applies to the map layers and the cell panel." The ⓘ has the definition, range,
  steps, default and (Mars) the per-hour threshold from d. The value keeps its fixed-width slot (no jitter).
  The compact copy in the cell panel is unchanged.
* Embed panel width: `min(330 px, 100vw − 70 px)` (`body.embed`). Before, below 720 px the panel was
  100vw − 70 px: 570 px of a 640 px frame (the PI's "panel takes most of it"). Full-screen layout unchanged.
* Default embed state: list collapsed (as before), at every embed width. Reason: collapsed, the panel shows
  the title, Wind dataset, Dunes only and the slider block in roughly the top 190 px (estimate), and the
  full-width map is visible below it; opened, the panel covers the whole frame height and 290–330 px of the
  width (81 % of a 360 px frame, 69 % of 480, 52 % of 640, 41 % of 800). Layers opens it in one click.
* Checks without a browser (the sandbox cannot start Chrome): DOM signature identical in both builds, the
  CSS rules, and width budgets at 360, 480, 640, 800 px (embed) and 1280 px (full screen) with the export's
  Helvetica metrics × 1.1: every row fits on one line (tightest: Earth slider label + ⓘ and the help line,
  259 of 264 px at 360 px). Screenshots and in-page measurements (boxes, overlaps, line counts) on a desktop:
  `scripts/mars/app/embed-shots.mjs` (both builds; writes `report.json`).

**User-facing text audit**: `docs/user-text-audit.md` (34 changes, 2 strings for the Terrain track, 4 PI
questions). Guard: `tests/usertextlib.ts` (`DEV_PHRASES`) in `tests/usertext.test.ts` and
`tests/mars/publictext.test.ts` (new Mars text collector `tests/mars/publictext.ts`, `TEXT_DUMP=<file>`).

## 3. Basemaps: sources and licences

| id | source | licence / credit shown | notes |
|---|---|---|---|
| `hrsc-mola-hillshade` (**opening basemap**) | self-hosted `pmtiles://dune-atlas/mars/v1/basemaps/hrsc-mola-terrarium.pmtiles/{z}/{x}/{y}` (Terrain track) | Fergason, Hare & Laura (2018), HRSC and MOLA Blended DEM v2, USGS Astrogeology; "MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)"; **the hillshade tiles are released under CC BY-SA 3.0 IGO** (derived from HRSC CC BY-SA 3.0 IGO and MOLA CC0; PI decision 2026-10-14) — in the attribution, About (Data sources), map-export source line and the basemap help | Terrarium 512 px, `maxzoom: 8` (Terrain pilot). The app reads each archive's header and lowers the source maxzoom to the archive's (`clampPmtilesBasemaps`), so a shallower dev subset (z0–5) overzooms instead of requesting missing tiles. |
| `opm-mars` | OpenPlanetaryMap v0.2 (CARTO) | OpenPlanetaryMap / CARTO; data NASA/JPL/GSFC (MOLA), NASA/JPL/ASU (THEMIS), USGS | 256 px PNG, CORS `*` |
| `esri-ctx1` | Esri OnMars `CTX1` (Global CTX Mosaic of Mars V01, The Murray Lab), item [30c4acfe…](https://www.arcgis.com/home/item.html?id=30c4acfe36284b1784bf07d5d73f9e4d) | "NASA/JPL/MSSS/The Murray Lab · Esri" | ~5 m/px; service levels 0–12 → `maxzoom: 13`. CTX beta01 (`OnMars/CTX`) left out. |
| `esri-hirise` | Esri OnMars `HiRISE`, item [c1c4c750…](https://www.arcgis.com/home/item.html?id=c1c4c750a2154842ae523c984cc14fa5) | "NASA/JPL/University of Arizona/USGS · Esri" | sparse (only where imaged), levels 0–17 → `maxzoom: 18` |
| `esri-mdim` | Esri OnMars `MDIM` (Viking MDIM 2.1 colorized), item [1efb1680…](https://www.arcgis.com/home/item.html?id=1efb16809db84f0c892b9b0662dab0c8) | "USGS Astrogeology / NASA / JPL · Esri" | levels 0–7 → `maxzoom: 8` |
| `esri-mcolordem` | Esri OnMars `MColorDEM` (MOLA–HRSC colorized shaded relief), item [07b33bb3…](https://www.arcgis.com/home/item.html?id=07b33bb3067747abbebd1ce34c29816e) | "USGS Astrogeology / NASA / JPL / ESA / DLR (Fergason, Hare & Laura 2018 blended DEM v2; MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)) · Esri" | levels 0–7 → `maxzoom: 8` |

Licence fields of the ArcGIS item pages (read 2026-10-14 via the ArcGIS REST item API, saved in
`staging/mars-app/esri/item_licences.json`): all four state that Esri services are licensed under the Esri
Master License Agreement / Esri Terms of Use. Data: CTX V01 — "free use … for all purposes", credit
NASA/JPL/MSSS/The Murray Lab (access information: Esri, Caltech Murray Lab, NASA, JPL, MSSS); MDIM —
USGS Astrogeology public domain (access information: USGS Astrogeology Science Center, NASA, JPL, Esri);
MColorDEM — USGS Astrogeology public domain, source the MOLA–HRSC blended DEM v2, "please cite authors"
(access information adds ESA, DLR); HiRISE — public domain (credits NASA, JPL, University of Arizona, USGS,
Esri). The PI reviewed and accepted the terms and the beta status of the services and re-read the licence fields (2026-10-14). Each
attribution is the data credit followed by "Esri" linked to the item page; the map attribution control
shows it, and map PNG exports print it (tags stripped) in the source line.

The basemap help section (`src/mars/ui/helpText.ts`, id `basemaps`) describes the choices, HiRISE's partial
coverage and the background where a service has no data. The About text keeps "Basemap credits are shown
in the map attribution".

## 4. Development against the local fixture

The fixture is synthetic but follows the data contract exactly (paths, grid, arrays, dtypes, chunking,
sharding, codecs, root attrs). Generate it (≈ 5 min, ≈ 154 MB, all under `staging/fixture-mars/`):

```
python scripts/mars/app/make_fixture.py --dunefrac <fv3_dunefrac.npz> --workers 1   # env dune-atlas
python scripts/mars/app/make_fixture_tiles.py --shp <dunes.shp>                     # env dune-atlas-tiles
python scripts/mars/app/make_rose_fixture.py                                        # parity reference (committed JSON)
```

* `cells.zarr`: full-size arrays; three shards are written — (2, 7) around Nili Patera and (0, 10), (0, 3)
  on the north polar erg; other cells read as fill. Series (90, 180, 5, 16032) = u, v, T, rho, z from
  `fixture_common.py` (analytic topography, CO₂ pressure cycle, tides, slope winds, red noise; rho and z from
  the lowest-layer mid pressure with the FV3 ak/bk interfaces of the Wind build, z = (R T/g) ln(p_lo/p_mid)
  ≈ 1.6–2.9 m), bit-rounded (keepbits u, v 13; T 14; rho 11; z 11). Fields: the Earth definitions with the
  per-hour Mars law and the eq. 2.2 u* (crest-mode search on every 25th hour). dunes/dune: the real overlap
  fraction.
* `cells-aux.zarr`: qsdiv (divergence on R_MARS of the map RDP/RDD), rho_mean, elev_mean (synthetic).
* `fields/*.zarr`: topozarr pyramids (2 levels; dims `(d, y, x)`) of dpm, rdpm, rdpa, qha_rdp_dp, uft, ufm,
  at, ae, ab, qacb, qace, qsdiv, rho_mean; `fields/elevation.zarr` (0.25°, 3 levels).
* `basemaps/hrsc-mola-terrarium.pmtiles`: FAKE z0–3 terrarium of the synthetic topography (clamped to z3 by
  the archive-depth check).
* `dunes/dunes-r2.pmtiles`: the PI shapefile, z0–7, layer `dunes` (the registry key since Terrain round 3).

Serve and run (on a desktop; the agent sandbox cannot bind sockets or start Chrome):

```
python scripts/serve_data.py staging/fixture-mars --port 8787
cd app && VITE_DATA_BASE=http://127.0.0.1:8787 npm run dev:mars
```

The same command against `staging/mars/devroot` (Wind/Terrain tracks, same keys) is the integration
preview; `MARS_STORE_ROOT=<devroot>/dune-atlas/mars/v1/datasets/fv3-beta1 npm run test:mars` runs the
cell-store checks on the real store. Screenshots without servers: `scripts/mars/app/screenshots.mjs`
(Playwright with request interception). Panel figures without a browser:
`VITE_BODY=mars npx vite-node scripts/mars-panel-preview.ts -- <dataset dir> out.png [lon lat dIndex]`.

### Mars tests (`app/tests/mars/`)

| file | checks |
|---|---|
| `registry.test.ts` | merged Mars registry validates; threshold block = spec §5; layers/groups/basemaps; patches apply to the Earth sources; R_MARS in patches; substitutes export the Earth names |
| `upstream.test.ts` | drift guard (§6): every substituted/patched Earth module is recorded; none changed since reconciled |
| `rose-parity.test.ts` | per-bin flux roses and excess-shear classes (flat + crest, d = 50/200/1000 µm, eq. 2.2 u* at the hour's z) vs the Python reference (pipeline `mars/physics.py`) to 1e-12; threshold statistics; Ga√s validity |
| `geometry.test.ts` | snap on the Mars grid; metersPerPixel and export scale bar on R_MARS; scale-bar control; Esri tile plan; pmtiles archive-depth clamp |
| `esri.test.ts` | Esri basemaps in the registry and their attributions; graceful failure of `esri-mars://` (failing fetch, HTTP 500/400, JSON body, changed tiling, unknown service, cancellation); HiRISE empty quadtree; the registered protocol with a failing global fetch |
| `body.test.ts` | one UI: header "Dune Atlas Mars", two-line subtitle, Wind dataset selector (MCMC FV3), dune invert toggle, info-popover row order (Licence row, KaTeX definitions, one field citation), basemap ⓘ (HiRISE coverage), planet toggle under the camera ("Switch to Earth", site root from `/mars/`, embed carried), Mars tour step, every storage key `duneAtlasMars.*` (Earth flag does not suppress the Mars tour). Earth mirror: `tests/body.test.ts` |
| `panel.test.ts` | Mars panel sections/texts (happy-dom), slider updates, plot exports; NetCDF read-back (incl. z); CSV bundle; no log-law / z₀ wording; public text without Earth-only wording; default view |
| `cellstore.test.ts` | the fixture (or `MARS_STORE_ROOT`) store: contract attrs (5 series vars, z in m); Nili Patera cell; flat-rose total = stored DP; uft = fraction of hours above threshold |
| `jitter.test.ts` | slider over all 64 d: layer and cell panel text/structure constant outside the live slots; every value fits its slot; readout padded |
| `dunesonly.test.ts` | Dunes only: classification (rho_mean, elevation, dunes unaffected), synthetic pyramid masking (level 0 exact, block-any), fixture / devroot `cells.zarr/dune` (2,749 cells) masking of dpm and qsdiv, toggle + short/long link round trip, overlay manager |
| `selection.test.ts` | selected-cell highlight of 84–86°, 86–88°, 88–90° N/S cells: flat source clipped (no vertex on the Mercator edge), globe geometry from the true bounds, layer switch by projection |
| `vectorclip.test.ts` | streamlines with Dunes only: unmasked integration then clipping (every vertex in a dune cell, pieces >= min length, a head on long pieces), fixture / devroot counts vs masked integration; arrows anchored at the base, seeds in dune cells |
| `centre.test.ts` | Centre on cell: button in the title row, ease to the cell (duration, zoom floor, bearing/pitch kept), reduced motion -> jumpTo, polar cell on flat (clamped) and globe |
| `head.test.ts` | tab title "MGL - Dune Atlas" after the Mars HTML transform, `%BASE_URL%` icon links, icon files and sizes |
| `embed.test.ts` | embed layout (shared `tests/embedlib.ts`): DOM signature of header and slider block (same in both builds), full-screen pill on the map only in embed mode, follows the view, no duplicate; CSS rules; width budgets at 360–800 px embed and 1280 px |
| `publictext.test.ts` | Mars user-facing text collected (site + downloads, `TEXT_DUMP`); no implementation / failure / internal / relict phrases (`tests/usertextlib.ts`) |
| `globecaps.test.ts` | polar-cap hook: dune fill/invert specs from the registry (`invert-r2.pmtiles`, layer `invert`); caps in globe projection, absent in Mercator; every Mars basemap switch keeps a matching basemap cap |
| `polarcap.test.ts` | (Terrain) cap geometry, hillshade maths, installation/ordering on a fake map, Esri cap composition |

## 5. Esri OnMars basemaps: method, failure handling, evaluation

Esri's OnMars MapServers (`https://astro.arcgis.com/arcgis/rest/services/OnMars/<service>/MapServer`) are
tiled in geographic Mars 2000 coordinates (wkid 104971, origin (−180, 90), 512 px, level-0 0.3515625°/px =
2 × 1 tiles), not Web Mercator. `src/mars/map/esri.ts` registers `esri-mars://<service>/{z}/{x}/{y}`: for a
Mercator tile it takes Esri level z − 1 (same longitude resolution and column boundaries) plus
round(log₂(1/cos φ)) levels at high latitude (capped by the service depth), fetches the covering tiles (LRU
cache shared between tiles; a cancelled tile aborts the source requests nobody else waits for), and draws
each output row as one horizontally scaled strip of the source row at that row's latitude (OffscreenCanvas;
ImageBitmap returned to MapLibre, no re-encoding). The protocol is registered when the registry lists an
`esri-mars://` basemap; a browser without OffscreenCanvas/createImageBitmap does not list the Esri
basemaps.

Failure handling (a third-party service must never break the map):

* The protocol rejects only with an AbortError for a cancelled tile (MapLibre ignores those). Any other
  failure returns a transparent 512 px tile, so the style's own background fill shows (the `basemap-background` layer, #0e1216, that `map/basemaps.ts` puts under every raster basemap; unrelated to the removed `dark` basemap); MapLibre sees a
  loaded tile and fires no error event.
* Source failures that give transparent areas: network errors; HTTP errors (beyond the data or the deepest
  level the services answer 400/404 without CORS headers, so the browser reports a TypeError); 200
  responses that are not images (decode error). Other source tiles of the same output tile are still drawn.
* Once per service, `MapServer?f=json` is checked (`tilingMismatch`: 512 px tiles, origin (−180, 90), wkid
  104971, level resolutions 0.3515625/2^l up to the depth used). If the scheme changed, the service is
  disabled (all its tiles empty, one console warning) instead of drawing misplaced tiles. An unreadable
  description does not disable it.
* Unknown service or malformed URL: transparent tile and one warning. Every service has its own state, so
  a failing service does not affect the others or the self-hosted basemaps.
* HiRISE is sparse: its PNGs are transparent (tRNS) where there is no image, and deeper levels answer 404
  there. Those areas render as background. A HiRISE source tile that is missing or fully transparent marks
  its quadtree below as empty, so zooming into an empty area sends no further requests (`sourceSkipped`).

Checked 2026-10-14 against the live services (node, real fetch, stub canvas;
`scripts/mars/app/esri_live_smoke.ts`, output in `staging/mars-app/esri/live-smoke.log`): the tiling check passes for CTX1, MDIM, MColorDEM and HiRISE; tiles
at Nili Patera (z 6 and max), Proctor crater (z 9) and a HiRISE gap (22.5° S, 10.8° E, z 12: 2 × HTTP 404 →
transparent tile) behave as above; 0 warnings. Earlier evaluation (prototype, numpy port of the same plan
on the real tiles): alignment of the PI dune polygons on CTX1 at Nili Patera and Proctor (z 8, 10), no seams
(edge jump median 1–5 vs interior 1.5–4.5 grey levels), 12 source tiles per 1280 × 800 view at 9° N
(1.6–2.3 s cold), 64 at 75° N z 7 (7.4 s), MDIM z 5 8 tiles (1.7 s). All 200 responses carry
`Access-Control-Allow-Origin: *`, so the WebGL canvas stays origin-clean for PNG export. **Not executed in a
browser here** (Chrome cannot start in the sandbox); run `scripts/mars/app/screenshots.mjs` on a desktop.

### 5a. Polar coverage of the Esri services (Terrain track, 2026-10-14)

**HiRISE has no imagery poleward of ±65.24° in the Esri service; this is the source, not the protocol.**
Evidence (`staging/mars/terrain/esri_polar_tiles.json`, live requests to `astro.arcgis.com`):

* The service is `TilesOnly` (no `export`/`identify`); `fullExtent` is the whole globe (−180…180, −90…90), so
  the extent says nothing about coverage.
* Level 3 complete (128 tiles each, 0.044°/px): the fraction of opaque pixels per latitude band is 0 for
  HiRISE in 90–85.05, 85.05–80, 80–75, 75–70° N and S, 0.0006 in 70–65° N, 0.022 in 65–60° N, 0.048 in
  30° S–30° N; the poleward-most opaque HiRISE pixel is at ±65.24°. CTX1 is 0.97–1.00 opaque in every band
  to 85.05° and 0.60 in 85.05–90° (data to 88.0°).
* Deeper levels: 48 evenly spaced columns at 82°, 77°, 72° N and S, levels 6 and 9: every HiRISE tile answers
  HTTP 404 (at 40° N and the equator the same sampling returns 200 with data).
* Our protocol at the same places: for Mercator tiles 4/8/0, 4/3/0, 5/16/1, 6/32/3, 6/10/4 (82–85° N) and
  4/8/15, 6/40/60 (82–85° S) `planTile` requests the correct geographic tiles (e.g. 4/8/0 → level 6, rows 1–2,
  cols 64–71; the Mercator stretch adds 3 levels); HiRISE answers 404 for all of them, CTX1 answers 200 with
  fully opaque tiles for the same requests. The empty-quadtree skip only prunes below tiles the service
  reported missing or transparent, so it does not hide data.

HiRISE's polar observations exist (e.g. the north polar erg), but the Esri mosaic does not include them
(probably because polar HiRISE products are distributed in polar stereographic projection). Whether to say
so in the HiRISE attribution / info text is a PI decision (not changed).

### 5b. Polar caps on the globe (`src/mars/map/polarcap.ts`)

All basemaps and vector tiles end at the Web-Mercator limit 85.0511°. MapLibre 5.24's globe stretches the top
tile row of raster/hillshade sources to the pole (`create_tile_mesh` `extendToNorthPole`; `raster.vertex` /
`hillshade.vertex` set `v_pos.y = 0` on the pole vertices → radial smear) and extends fill edges lying on the
tile edge to the pole (`subdivision.ts` `_fillPoles` → wedges). Nothing in our tiles made it worse (the
terrarium top row is the bilinear DEM at 85.05°; `esri-mars` returns data rows to the top edge; HiRISE is
transparent there, i.e. no smear). `polarcap.ts` draws the caps as globe-only custom layers (MapLibre's
`projectTile` prelude, as `map/globelines.ts`; hidden in the flat map and during the globe→Mercator
transition):

* `basemap-polarcap`, directly above the basemap layers: the MOLA–HRSC hillshade from per-pole DEM textures
  (`dune-atlas/mars/v1/basemaps/hrsc-mola-polar/{n,s}-{256…4096}.webp`, polar azimuthal-equidistant,
  terrarium; level chosen so the cap pixel is not larger than the tile pixel at 85.05°) shaded with
  MapLibre's `standard` hillshade maths and the basemap's paint (decoded seam check:
  `docs/validation-mars-terrain.md` §8); Esri imagery composed from the service's geographic tiles
  (`esri.ts` `esriPolarCap`, level 4 / 5 for 512 / 1024 px caps); OpenPlanetaryMap: the background colour.
* `<fill layer>-polarcap`, directly above `ov-dunes-fill` and `ov-dunes-invert`: the polygons poleward of
  85.0511° from `dune-atlas/mars/v1/dunes/polar-caps.json`, with the fill layer's colour, opacity and
  visibility mirrored on every style change.

Hook (App track, wired in round 4): `src/mars/main.ts` calls `globePolarCaps(map, marsPolarCapOptions(dataBase,
reg.basemaps, reg.layers))` (`src/mars/map/globecaps.ts`) right after the map is created, and `polarCaps.sync()`
after every `setProjection`. It installs the caps below while the map is in globe projection and removes them
in Mercator (no custom layers in the flat map or its PNG export); the fill specs are derived from the dunes
layer (`ov-dunes-fill` / `ov-dunes-invert`, `polar-caps.json` beside `dunes-r2.pmtiles`; the invert view uses
`dunes.yaml` `invertSource` / `invertSourceLayer`). A disposed installation's event handlers are disabled
(MapLibre fires a snapshot of the listener list, so its own sync later in the same event would re-add the
caps). Tests: `tests/mars/globecaps.test.ts` (globe / Mercator / back, every Mars basemap keeps a matching cap).
Equivalent to the direct call:

```ts
import { installPolarCaps } from "./map/polarcap";
installPolarCaps(map, {
  dataBase, basemaps: reg.basemaps,
  fills: [
    { layerId: "ov-dunes-fill", url: `${dataBase}/dune-atlas/mars/v1/dunes/polar-caps.json`, part: "dunes" },
    { layerId: "ov-dunes-invert", url: `${dataBase}/dune-atlas/mars/v1/dunes/polar-caps.json`, part: "invert" },
  ],
});
```

## 6. Keeping Mars in sync with Earth

Earth fixes reach Mars in three ways: shared modules (most of `app/src/`) are used as they are; patched
modules (§1) get the Earth change plus the Mars patches; substituted modules and the Mars counterparts of
Earth modules (`src/mars/cell/export.ts` of `cell/export.ts`, `analysis.ts` of `cell/analysis.ts`,
`marsflux.ts` of `cell/flux.ts`, `cellstore.ts` of `cell/cellstore.ts`) need porting by hand.

**Drift guard.** `app/src/mars/upstream.json` records, for each of the 25 Earth modules that are
substituted (8), patched (13) or derived (4), the git blob id of the Earth source last reconciled and that commit (as of 69b4656: 19 modules at `0a5bb7d`, 2 at `91ae0d4`,
3 at `14b8527`, 1 at `69b4656`; `node scripts/mars/app/reconcile.mjs --check` prints the current state). `tests/mars/upstream.test.ts` (part of `npm run test:mars`) hashes the
current file (`git hash-object`), fails naming every module whose source changed, and prints
`git diff <recorded commit> HEAD -- app/<path>` for each. It also fails if a substituted or patched module
is not recorded. `scripts/mars/app/reconcile.mjs` maintains the record:

```
node scripts/mars/app/reconcile.mjs --check [--rev earth/main]   # what changed (or: what a merge of earth/main will flag)
node scripts/mars/app/reconcile.mjs --record src/ui/cellPanel.ts ... # after porting: re-record at HEAD (app-relative paths)
node scripts/mars/app/reconcile.mjs --sync                         # add/drop entries after changing MARS_SUBSTITUTES / patches.json
```

First sync (merge 91ae0d4 of earth/main 704538b; 4 Earth commits since `0a5bb7d`): the guard flagged 5
modules, all now re-recorded at 91ae0d4. `cell/datasetinfo.ts` (substituted; edcbb50): Mars `DATASET_INFO`
sets `landThreshold: 0, nonLandReason: ""` and aliases `LAND_RULE_ERA5` (Earth-only, export set only).
`ui/cellPanel.ts` (substituted; edcbb50, non-land message): Mars has no land mask, re-recorded only.
`ui/helpText.ts` (substituted; 704538b): the Finer/Coarser spacing sentence ported. `ui/layerPanel.ts`
(patched; edcbb50 reworded the ERA5 source line): `find` text of the Data sources patch updated; the
c6a2cd3 tooltip change is shared. `map/adapters.ts` (patched; d527912 globe lines): the radius patch still
applies; the new globe sampling uses great-circle degrees and the patched `viewMetersPerPixel`, so spacing
stays on R_MARS. `map/globelines.ts` and `map/vectors.ts` are shared. The upstream zarr-layer patch changed,
so `npm ci` is needed after the merge (patch-package fails on a tree patched with the old version).

**Procedure** (on branch `mars`, working tree clean for `app/`; all three tracks idle):

1. `git fetch earth` (remote `earth` = the Earth checkout) and preview: `node scripts/mars/app/reconcile.mjs --check --rev earth/main`.
2. `git merge earth/main` — a merge, never a rebase (`mars` is shared by three tracks; its history must stay). Conflicts can only be in files both sides edit (e.g. `app/package.json`, `app/vite.config.ts`, `.gitignore`): keep both sides.
3. Earth: `cd app && npm ci && npm test` — every Earth test passes. Then check that the Earth source differs from `earth/main` only by the shared one-UI changes: `git diff --stat earth/main -- app/src app/tests app/index.html registry/layers.yaml registry/generated registry/datasets docs/help-text.md ':!app/src/mars' ':!app/tests/mars' ':!app/tests/fixtures/mars-*'` must list only the §1a files plus `cell/marsphysics.ts`, `generated/constants-mars.json` and `tests/marsphysics.test.ts` (Mars physics, not bundled in the Earth build); review that diff. The Earth build is otherwise unchanged: `npx vite build` succeeds and `git diff earth/main -- app/src/ui/layerPanel.ts app/src/ui/tools.ts …` shows only the header, toggle, tour-step and storage-key edits.
4. Mars: `npm run test:mars`. The drift guard lists the changed modules with their diffs; a patch whose `find` text changed fails `registry.test.ts`; a new export of a substituted module fails the export-set test (and the Mars build).
5. Port each flagged change: substituted copy — apply what applies to Mars (Earth-only parts, e.g. ERA5 land-mask texts, stay out; new exports must exist in the Mars module); patched — adjust the `find` text and decide whether new Earth wording needs a Mars replacement (new public texts: check `panel.test.ts` "no Earth-only wording"); derived — port fixes to the Mars counterpart. Commit the ports (`git commit -m "Mars app: reconcile with earth/main <sha> ..." -- <paths>`).
6. `node scripts/mars/app/reconcile.mjs --record <each ported module>` (or `--record-all` after reviewing every flagged diff), commit `app/src/mars/upstream.json`.
7. `npm run test:all`, `npm run build`, `npm run build:mars`, `npm run validate-registry && npm run validate-registry:mars`, step 3's source-diff check again, and `npm run test:ci` (the CI workflow from a clean export).

**Pre-go-live checklist**

* [ ] `earth/main` merged; drift guard green (every module re-recorded at the merge or later).
* [ ] Earth: `npm test` all pass; Earth source diff vs `earth/main` limited to the §1a one-UI files (step 3); `npm run build` OK.
* [ ] Mars: `npm run test:mars` green, also with `MARS_STORE_ROOT` on the final store; `validate-registry:mars` OK; `build:mars` OK.
* [ ] Final stores: cells.zarr with 5 series vars (eq. 2.2 u*), pyramids, cells-aux with elev_mean, terrarium PMTiles to z8, dune PMTiles, at the deployment prefix; `VITE_DATA_BASE`, `VITE_BASE`, `VITE_SITE_URL` set.
* [ ] Desktop browser check (`screenshots.mjs`): every basemap incl. the four Esri ones (HiRISE gaps dark, no console errors other than the browser's CORS lines for 404 tiles), PNG export with an Esri basemap, panel, downloads, tour; the planet toggle both ways on the deployed layout (`/` ↔ `/mars/`, `?embed=1` kept); the Mars first-visit tour after visiting Earth.

## 7. Open items (App)

* Screenshots of the running app: run `scripts/mars/app/screenshots.mjs` on a desktop (sandbox cannot start Chrome).
* Reconcile the 3 Earth commits at integration (§6; do not merge from a track).
* Geology map, more wind datasets (the dataset selector appears automatically with a second `registry/mars/datasets/<id>/`).
* Deployment is decided (map.geomorphlab.org/mars/, §1a); the workflow change is committed, not pushed.
