# Mars app: body-switch build, basemaps, development and keeping Mars in sync with Earth

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
  Mars build. The tab title is "MGL - Dune Atlas" in both builds.
* Wind dataset selector: shown whenever the registry has a dataset (`>= 1`), so Mars shows "MCMC FV3 2°" (option text = name + grid, `datasetOptionLabel`; tooltip
  from `datasetTooltip`); Earth unchanged (ERA5-Land, ERA5).
* Planet toggle (`ui/tools.ts`): a `tool-btn planet-btn` directly under the camera button, 18 px inline SVG
  (line icon of a ringed planet: disc plus a tilted elliptical ring whose back arcs stop at the disc;
  `currentColor`, stroke 1.6 as the other tool icons), label/title "Switch to Mars" (Earth) or "Switch to Earth" (Mars).
  It opens the other atlas's default view (no position carried; `?embed=1` carried): Earth → `<base>mars/`,
  Mars → its base without `mars/` (the site root), from `import.meta.env.BASE_URL` (`VITE_BASE`).
  On localhost / 127.0.0.1 / [::1] (vite dev or preview) the derived same-origin URL would be the
  build itself, so the button opens the LIVE other atlas: Mars → https://map.geomorphlab.org/, Earth →
  https://map.geomorphlab.org/mars/ (`body.ts` `LIVE_SITE`, `isLocalHost`). `VITE_OTHER_BODY_URL` overrides
  both (e.g. `http://localhost:5174/` when the two dev servers run side by side).
* Tour: both tours end with the step `planet` ("Switch planet") on that button, after `tools`;
  `docs/reference/help-text.md` is regenerated from the Earth texts (`npm run help-doc`).
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
  data, Slider, Source, Citation, Data DOI, Licence, Link, Changes (`infoHtml`).
* Group titles: Earth `climate` and Mars `environment` are both "Related data" (ids kept for permalinks).
* Earth source diff vs `earth/main` from this (outside the Mars-only infrastructure: body plugin, Mars scripts,
  `cell/marsphysics.ts`, `generated/constants-mars.json`, package scripts, `vite.config.ts`, `.gitignore`):
  `app/src/body.ts` (new), `app/src/ui/layerPanel.ts` (header label, subtitle, selector with one dataset, info structure), `app/src/style.css` (body-name rule, overflow-wrap rules), `app/src/ui/tools.ts` (planet toggle), `app/src/ui/helpText.ts` (tour step `planet`), `docs/reference/help-text.md` (regenerated), `app/src/ui/tour.ts`, `app/src/ui/cellPanel.ts`, `app/src/main.ts` (storage keys via `storageKey`, Earth key strings unchanged), `registry/earth/layers.yaml`, `registry/earth/generated/x_extra_fields.yaml`, `registry/earth/datasets/era5/x_extra_fields.yaml`, `pipeline/src/dune_atlas_pipeline/extra_layers.py` (generator) and `vegetation.py` (comment) (group title "Related data"), `docs/guide/architecture.md`, `docs/records/validation-veg.md`, `app/tests/help.test.ts`, `app/tests/ui.test.ts`, `app/tests/vegetation.test.ts`, `app/tests/body.test.ts` (new), `.github/workflows/deploy.yml`, `app/scripts/test-ci.sh`.

Per-body code lives in `app/src/bodies/<body>/`; shared modules import it through the `@body/` alias
(`vite.config.ts` resolves `@body/<module>` to `src/bodies/earth/` or `src/bodies/mars/` by `VITE_BODY`;
`tsconfig.json` and `tsconfig.mars.json` type-check the two bodies). Each body provides:

| module | content |
|---|---|
| `profile.ts` | `PROFILE` (`BodyProfile`, `src/profile.ts`): radius and Web Mercator circumference, export names and strip texts, invert wording, the slider quantity (Earth u\*,th, Mars d: readout, TeX, ⓘ, plot axes; Mars plots use log10 d), coordinates tooltip, opening view |
| `citation.ts` | cited sources per dataset / cell download / About, field citation and licence, map attribution, image-export credit lines (formatting: `src/cell/citation.ts`) |
| `datasetinfo.ts` | the wind dataset table (functions: `src/cell/datasetinfo.ts`) |
| `auxinfo.ts` | the per-cell sidecar variables (Earth: qsdiv, aridity, vegetation; Mars: qsdiv on R_MARS, rho_mean, elev_mean) |
| `fieldinfo.ts` | source attributes of the qsat fields (`registry/<body>/qsat_field_metadata.json`) |
| `helpText.ts` | help sections, tour steps, dataset ⓘ, share text and the About texts (shared labels: `src/ui/helpText.ts`) |
| `config.ts` | build defaults (sidecar paths, site URL) |
| `registry.ts` | the registry files `registry/<body>/{layers.yaml, generated/*.yaml, datasets/*/*.yaml}` |

The Mars build additionally substitutes two Earth modules with Mars modules (`app/scripts/body-plugin.ts`,
`MARS_SUBSTITUTES` in `src/bodies/mars/build.ts`): `src/main.ts` → `src/bodies/mars/main.ts` and
`src/ui/cellPanel.ts` → `src/bodies/mars/ui/cellPanel.ts` (the hourly-series data path of the Mars cell
panel), and sets the `index.html` title, description and noscript text. There are no source patches.

New Mars-only code lives under `app/src/bodies/mars/` (cell store, per-hour rose computation, exports,
scale bar, basemaps, Esri protocol). The physics is only `src/cell/marsphysics.ts` (port of
`pipeline/.../mars/physics.py`); nothing in the app re-implements it.

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
(the Esri basemaps ship by default).

## 2. What the Mars UI shows

Same panels and controls as Earth. The global control is the median grain diameter d (registry
`threshold`: dim `d`, µm, the 64 values of mars-spec §5, default index 29 = 200 µm); every d-aware layer
selects the `d` index of its `(d, y, x)` pyramid. Layers: dunes (vector), the 23 fields + qsdiv (d-aware),
near-surface air density `rho_mean` and elevation (2-D, group "Related data" (id `environment`), the counterpart of Earth's "Related data" group (id `climate`)). No aridity, vegetation, land mask or ERA5 datasets.

Cell panel (`src/bodies/mars/cell/analysis.ts`, `marsflux.ts`): reads `cells.zarr/series` (u, v, T, rho, z per
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

Downloads (`src/bodies/mars/cell/export.ts`): NetCDF with dims hour (16,032), d (64), ua_bin (128); variables u,
v, T, rho, **z (m)**, sol, ls, the 23 fields vs d, qsdiv vs d, rho_mean, elev_mean, dune_present,
dune_fraction and flux_rose(rose_mode, d, ua_bin); CSV bundle wind_series.csv (`hour,sol,ls,u,v,T,rho,z`),
fields_by_grain_size.csv, flux_rose.csv, metadata.json (constants incl. `mixing_length_damping` = 7, no
z/z₀; the eq. 2.2 convention), README.txt.

Distances: scale bar control `src/bodies/mars/map/scale.ts` (haversine on R_MARS, MapLibre rounding and element;
Earth keeps the stock `ScaleControl`); arrow/streamline spacing and the export scale bar via the body
profile radius. Coordinates: planetocentric °N and °E, −180…180 (as Earth). Default view: globe over the north
polar erg (62° N, 160° E, zoom 2.2), RDD streamlines over the dunes over DP, d = 200 µm, MOLA–HRSC shaded
relief. Tour example cell: Nili Patera (9° N, 67° E → cell (40, 123)). Dune layer: as Earth, a display option
"invert (areas without dunes)" draws the complement from `invertSource: dune-atlas/mars/v1/dunes/invert-r2.pmtiles`,
`invertSourceLayer: invert` (registry/mars/layers.yaml; generated separately; key and source-layer are
the App default until Terrain reports them). Terrain's fragment replaces the dunes placeholder and carries
the same invert fields. The Mars "Dark background" basemap is removed; old links with
`basemap=dark` open on the default basemap.

## 3. Basemaps: sources and licences

| id | source | licence / credit shown | notes |
|---|---|---|---|
| `hrsc-mola-hillshade` (**opening basemap**) | self-hosted `pmtiles://dune-atlas/mars/v1/basemaps/hrsc-mola-terrarium.pmtiles/{z}/{x}/{y}` | Fergason, Hare & Laura (2018), HRSC and MOLA Blended DEM v2, USGS Astrogeology; "MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)"; **the hillshade tiles are released under CC BY-SA 3.0 IGO** (derived from HRSC CC BY-SA 3.0 IGO and MOLA CC0) — in the attribution, About (Data sources), map-export source line and the basemap help | Terrarium 512 px, `maxzoom: 8`. The app reads each archive's header and lowers the source maxzoom to the archive's (`clampPmtilesBasemaps`), so a shallower dev subset (z0–5) overzooms instead of requesting missing tiles. |
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
Esri). The terms and the beta status of the services apply to all four providers. Each
attribution is the data credit followed by "Esri" linked to the item page; the map attribution control
shows it, and map PNG exports print it (tags stripped) in the source line.

The basemap help section (`src/bodies/mars/ui/helpText.ts`, id `basemaps`) describes the choices, HiRISE's partial
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
* `dunes/dunes-r2.pmtiles`: the dune shapefile, z0–7, layer `dunes` (the registry key).

Serve and run (on a desktop with Chrome):

```
python scripts/serve_data.py staging/fixture-mars --port 8787
cd app && VITE_DATA_BASE=http://127.0.0.1:8787 npm run dev:mars
```

The same command against `staging/mars/devroot` (the full local build, same keys) is the integration
preview; `MARS_STORE_ROOT=<devroot>/dune-atlas/mars/v1/datasets/fv3-beta1 npm run test:mars` runs the
cell-store checks on the real store. Screenshots without servers: `scripts/mars/app/screenshots.mjs`
(Playwright with request interception). Panel figures without a browser:
`VITE_BODY=mars npx vite-node scripts/mars-panel-preview.ts -- <dataset dir> out.png [lon lat dIndex]`.

### Mars tests (`app/tests/mars/`)

| file | checks |
|---|---|
| `registry.test.ts` | merged Mars registry validates; threshold block = spec §5; layers/groups/basemaps; R_MARS in the body profile; no Earth radius literal in shared modules; substitutes export the Earth names |
| `upstream.test.ts` | drift guard (§6): every substituted Earth module is recorded; none changed since reconciled |
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
2 × 1 tiles), not Web Mercator. `src/bodies/mars/map/esri.ts` registers `esri-mars://<service>/{z}/{x}/{y}`: for a
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
on the real tiles): alignment of the dune polygons on CTX1 at Nili Patera and Proctor (z 8, 10), no seams
(edge jump median 1–5 vs interior 1.5–4.5 grey levels), 12 source tiles per 1280 × 800 view at 9° N
(1.6–2.3 s cold), 64 at 75° N z 7 (7.4 s), MDIM z 5 8 tiles (1.7 s). All 200 responses carry
`Access-Control-Allow-Origin: *`, so the WebGL canvas stays origin-clean for PNG export. **Not executed in a
browser here** (Chrome cannot start in this environment); run `scripts/mars/app/screenshots.mjs` on a desktop.

### 5a. Polar coverage of the Esri services

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
so in the HiRISE attribution / info text is not decided (left unchanged).

### 5b. Polar caps on the globe (`src/bodies/mars/map/polarcap.ts`)

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
  `docs/records/validation-mars-terrain.md` §8); Esri imagery composed from the service's geographic tiles
  (`esri.ts` `esriPolarCap`, level 4 / 5 for 512 / 1024 px caps); OpenPlanetaryMap: the background colour.
* `<fill layer>-polarcap`, directly above `ov-dunes-fill` and `ov-dunes-invert`: the polygons poleward of
  85.0511° from `dune-atlas/mars/v1/dunes/polar-caps.json`, with the fill layer's colour, opacity and
  visibility mirrored on every style change.

Hook: `src/bodies/mars/main.ts` calls `globePolarCaps(map, marsPolarCapOptions(dataBase,
reg.basemaps, reg.layers))` (`src/bodies/mars/map/globecaps.ts`) right after the map is created, and `polarCaps.sync()`
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

Earth changes reach Mars in two ways: shared modules (most of `app/src/`, with the per-body parts in
`@body` modules, §1) are used as they are; the two substituted modules and the Mars counterparts of
Earth modules (`src/bodies/mars/cell/export.ts` of `cell/export.ts`, `analysis.ts` of `cell/analysis.ts`,
`marsflux.ts` of `cell/flux.ts`, `cellstore.ts` of `cell/cellstore.ts`) need porting by hand.

**Drift guard.** `app/src/bodies/mars/upstream.json` records, for each of the 6 Earth modules that are
substituted (2) or derived (4), the git blob id of the Earth source last reconciled.
`tests/mars/upstream.test.ts` (part of `npm run test:mars`) hashes the current file (`git hash-object`),
fails naming every module whose source changed, and prints the diff from the recorded blob (or the file's
recent history when that blob is not in the clone). It also fails if a substituted module is not recorded. `scripts/mars/app/reconcile.mjs` maintains the record:

```
node scripts/mars/app/reconcile.mjs --check [--rev <rev>]          # what changed (at the working tree or at <rev>)
node scripts/mars/app/reconcile.mjs --record src/ui/cellPanel.ts ... # after porting: re-record (app-relative paths)
node scripts/mars/app/reconcile.mjs --sync                         # add/drop entries after changing MARS_SUBSTITUTES
```

After an Earth change to a flagged module: port what applies to Mars (substituted copy: apply the change
unless it is Earth-only; derived module: port fixes to the Mars counterpart), re-record the module, then run
`npm run test:all`, both builds and both registry validations.
