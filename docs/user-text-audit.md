# User-facing text audit (App track, round 7, PI 2026-10-14)

Scope: every string a visitor of either atlas can read: header, panel texts, slider texts, layer ⓘ
popovers, basemap ⓘ, About, Help, tour, cell-panel captions / notes / empty, loading and error states,
legends, export strips, tooltips and accessible names, and the download README / NetCDF / metadata /
CSV texts. Rule: write for a scientist visiting the site (what it shows, how to read it, where the data
come from); keep scientific content and citations; remove implementation, failure handling, internal
names, store keys, build / tiling details and PI / agent decisions; fix stale text.

## Method

1. Inventory. `tests/publictext.ts` (Earth, existing) and the new `tests/mars/publictext.ts` (Mars)
   render the real panels (happy-dom) and the real downloads and collect every string with a key;
   `TEXT_DUMP=<file>` writes them. Earth 2,069 strings, Mars 1,749; 1,444 distinct texts (179,016
   characters). Both collectors now also collect accessible names (`aria-label`) and the basemap
   attributions; the Mars one also the embed pill.
2. Strings outside the collectors (toolbar, tour engine, `main.ts`, coordinates, map modules, export
   code): string literals extracted from the source and read. Console messages (`[dune-atlas] …`,
   shader logs) are not visitor-facing and were left alone.
3. Review. Each distinct text was read by a reviewer model with the rule above (flags only) and by a
   term scan (tiles, zoom levels, zarr, browser, respond, fallback, PI, docs/, log law, z0, 199 µm, …);
   every flag and hit was then checked by hand against the source. False positives (test inputs such as
   the 1970 export date and the `x` share link of the collector, legend tick labels joined without
   spaces by `textContent`, the dataset name "beta release 1") were dropped.
4. Guard. `tests/usertextlib.ts` (`DEV_PHRASES`) fails the Earth (`tests/usertext.test.ts`) and Mars
   (`tests/mars/publictext.test.ts`) suites if any such phrase returns; machine-readable download keys
   (file lists, CSV column names, citation ids) are exempt; a self-test shows the check is not vacuous.

## Changes (applied)

| # | Build | Location (source) | Old | New | Reason |
|---|---|---|---|---|---|
| 1 | Earth | Cell panel, sand-flux rose caption (`src/ui/cellPanel.ts`) | "… Σspeed n·q / Σall n from the wind histogram, computed in your browser." | "… Σspeed n·q / Σall n from the wind histogram." | where the code runs |
| 2 | Mars | Cell panel, sand-flux rose caption (`src/mars/ui/cellPanel.ts`) | "… from d and that hour's air density and temperature, computed in your browser." | "… from d and that hour's air density and temperature." | where the code runs |
| 3 | both | Cell panel, loading state | "Loading ERA5-Land cell 1145, 1952…" (grid row, column) | "Loading ERA5-Land data for this cell…" (Mars: "Loading MCMC FV3 data for this cell…") | grid indices are internal |
| 4 | both | Cell panel, load error | "Could not load this cell: ⟨error message⟩" | "The data for this cell could not be loaded. Click the cell again to retry." (the error message is kept as the tooltip, for reports) | developer error text; tells the visitor what to do |
| 5 | both | Map export strip, view line (`src/export/mapExport.ts` `PROJECTION_TEXT`) | "Globe (MapLibre globe)" | "Globe (perspective view)" | software name |
| 6 | Earth | Dune fields ⓘ, invert note (`src/ui/layerPanel.ts` `INVERT_NOTE`) | "Invert colours land WITHOUT mapped dunes. Vector tiles end at ±85.05° latitude, so interior Antarctica south of 85°S is not coloured." | "Invert: colour the land WITHOUT mapped dunes instead of the dunes. Latitudes beyond ±85.05° (interior Antarctica) are not coloured." | tiling detail; "Invert colours land" read as a noun phrase |
| 7 | Mars | Dune fields ⓘ, invert note (`src/mars/patches.json`) | "Invert colours areas WITHOUT mapped dunes." | "Invert: colour the areas WITHOUT mapped dunes instead of the dunes." | grammar (as 6) |
| 8 | Earth | Dune fields ⓘ, description (`registry/generated/dunes.yaml`, hand-written) | "Dune presence (layers.nc \`dunes\`) dissolved into 1,428 dune fields of 8-connected 0.1° cells; polygon edges follow grid-cell boundaries exactly (tiles z0–10, overzoomed beyond). Area is the sum of spherical cell areas." | "The 0.1° dune cells of the dune map grouped into 1,428 dune fields of 8-connected cells; polygon edges follow the grid-cell boundaries exactly. Area is the sum of spherical cell areas." | file / variable name, tile zooms |
| 9 | Earth | Aridity ⓘ, Changes (`pipeline/…/aridity.py` → `registry/generated/x_extra_fields.yaml`, `registry/datasets/era5/x_extra_fields.yaml`) | "…; coarser zoom levels are means of the valid native pixels; values rounded to a relative precision of 1.2e-4 for compression." | "…; zoomed-out map views show means of the valid native pixels; values rounded to a relative precision of 1.2e-4." | tiling and storage reason (the rounding itself is a real change and stays) |
| 10 | Earth | Vegetation ⓘ, Changes (`pipeline/…/vegetation.py` → `registry/generated/x_vegetation.yaml`; the sidecar re-phrasing in `vegetation.py` follows) | "…; coarser zoom levels are means of the valid 0.1° cells; values rounded to a relative precision of 1.2e-4 for compression." | "…; zoomed-out map views show means of the valid 0.1° cells; values rounded to a relative precision of 1.2e-4." | as 9 |
| 11 | Mars | Elevation ⓘ, Changes (`pipeline/…/mars/terrain.py` → `registry/mars/generated/x_elevation.yaml`) | "…, rounded to 1 m; coarser zoom levels are means (≤ 0.5 m rounding)." | "…, rounded to 1 m; zoomed-out map views show means (≤ 0.5 m rounding)." | tiling |
| 12 | Earth | Basemap ⓘ, OpenFreeMap dark and Positron, Source (`registry/layers.yaml`) | "OpenFreeMap vector tiles of OpenStreetMap data (OpenMapTiles schema), dark style" (Positron alike) | "OpenFreeMap, from OpenStreetMap data (OpenMapTiles schema), dark style" | tiling |
| 13 | Earth | same, Resolution (×2) | "Vector tiles to zoom 14, drawn sharp at any zoom" | "Vector map, sharp at every zoom (street-level detail)" | zoom level as a unit |
| 14 | Earth | Basemap ⓘ, Esri World Imagery, Resolution | "15 m worldwide, 1 m or finer in many regions; tiles to zoom 19" | "15 m worldwide, 1 m or finer in many regions" | zoom level |
| 15 | Earth | Basemap ⓘ, hillshade, description | "Shaded relief computed in the browser from terrain tiles (elevations encoded as Terrarium RGB)." | "Shaded relief of an open global elevation model (Mapterhorn)." | where the code runs; tile encoding |
| 16 | Earth | same, Source / Resolution | "Mapterhorn open terrain tiles: …" / "About 30 m worldwide (zoom 12), finer in some countries" | "Mapterhorn open elevation data: …" / "About 30 m worldwide, finer in some countries" | tiling |
| 17 | Earth | Basemap ⓘ, OpenTopoMap, Resolution | "Raster tiles to zoom 17" | "About 1.2 m per pixel at the equator at the closest zoom" (256 px tiles, z17) | zoom level → ground resolution |
| 18 | Mars | Basemap ⓘ, MOLA–HRSC shaded relief, description (`registry/mars/layers.yaml`) | "Shaded relief computed in the browser from the MOLA–HRSC blended elevation model (Terrarium tiles built for the atlas)." | "Shaded relief of the MOLA–HRSC blended elevation model." | where the code runs; build detail |
| 19 | Mars | same, Resolution | "200 m DEM; tiles to zoom 8 (about 160 m per pixel at the equator)" | "200 m DEM, shown at up to about 160 m per pixel at the equator" | zoom level |
| 20 | Mars | Basemap ⓘ, OpenPlanetaryMap, Resolution | "Raster tiles to zoom 9" | "About 160 m per pixel at the equator at the closest zoom" (256 px tiles, z9, R = 3389.5 km) | zoom level → ground resolution |
| 21 | Mars | Basemap ⓘ, Esri CTX, description | "Global greyscale mosaic of Context Camera (CTX) images of Mars Reconnaissance Orbiter, reprojected to the web map in the browser." | "Global greyscale mosaic of Context Camera (CTX) images of Mars Reconnaissance Orbiter." | implementation |
| 22 | Mars | Basemap ⓘ, Esri HiRISE, description | "HiRISE images of Mars Reconnaissance Orbiter where HiRISE has imaged; elsewhere the map background shows." | "HiRISE images of Mars Reconnaissance Orbiter, where HiRISE has imaged (a small part of the surface); elsewhere the map is dark." | how to read the map, not the mechanism |
| 23 | Mars | Basemap ⓘ, Esri MColorDEM, Resolution | "200 m DEM; service to about 160 m per pixel" | "200 m DEM, shown at up to about 160 m per pixel" | service wording |
| 24 | Mars | Help, Basemaps (`src/mars/ui/helpText.ts`) | "… (Fergason, Hare & Laura 2018), served with the atlas; its tiles are released under CC BY-SA 3.0 IGO … Esri's Mars imagery services: … HiRISE (down to about 25 cm per pixel, only where HiRISE has imaged), … Esri's services are tiled in latitude and longitude and are reprojected in your browser. Where a service has no data (most of the planet for HiRISE) or does not respond, the dark map background shows. …" | "… (Fergason, Hare & Laura 2018), released under CC BY-SA 3.0 IGO … Esri's Mars imagery: … HiRISE (down to about 25 cm per pixel), … HiRISE covers only the small part of the surface it has imaged; elsewhere the map is dark. …" | the PI's example: implementation and failure handling |
| 25 | both | Tour, example-cell fallback (`helpText.ts` ×2) | "The example cell could not be loaded just now (are you offline?). Click any (land) cell on the map to open its panel." | "The example cell could not be loaded. Click any (land) cell on the map to open its panel." | guesswork about the failure |
| 26 | both | Layer Display menu, accessible name (`src/ui/layerPanel.ts`) | "Render ⟨layer⟩ as" | "Display ⟨layer⟩ as" | matches the visible "Display" label |
| 27 | Earth | NetCDF, `ut` comment (`src/cell/export.ts`) | "linspace(0.01, 0.64, 64), exactly 2 decimals" | "64 values from 0.01 to 0.64 m s-1 in steps of 0.01 m s-1" | code expression |
| 28 | Earth | NetCDF / metadata, `qsdiv` source (`src/cell/auxinfo.ts`) | "Derived by dune-atlas from rdpm and rdpa of Gunn (2026) …" | "Computed for the Dune Atlas from rdpm and rdpa of Gunn (2026) …" | repository name |
| 29 | Mars | Download README, Physics (`src/mars/cell/export.ts`) | "Physics (docs/mars-spec.md), all from Pähtz & Durán (2023) …" | "Physics, all from Pähtz & Durán (2023) …" | internal document path |
| 30 | both | Slider block, description line (`src/ui/threshold.ts`; Mars patch) | Earth: "Drives every threshold-dependent map layer and the cell panel (0.01 m/s–0.64 m/s; default 0.15 m/s)." Mars: "Drives every grain-size-dependent map layer and the cell panel (50 µm–1000 µm, 64 log-spaced steps; default 200 µm). The threshold u*,th is computed for every hour from d and the hour's air density and temperature (Pähtz & Durán 2023)." | both: "Applies to the map layers and the cell panel." The range, steps, default and (Mars) the per-hour threshold are in the slider's new ⓘ | item 2 (one short line, details in ⓘ) |
| 31 | Earth | Slider, default link | "default 0.15" | "default 0.15 m/s" | same form as Mars ("default 200 µm") |
| 32 | both | Wind dataset options | "ERA5-Land 0.1°, 1950–2024", "ERA5 0.25°, 1950–2024", "MCMC FV3" | "ERA5-Land 0.1°", "ERA5 0.25°", "MCMC FV3 2°"; the tooltip (option and selector) carries period and land rule | item 2 (fits the embed panel) |
| 33 | both | Panel header (embed) | "Open full screen ↗" in the header | pill on the map "Open full screen ↗" + note "Best viewed full screen" | item 2 |
| 34 | both | Map export strip | — | "Dunes only: wind-derived layers shown in cells with dunes." while Dunes only is on and a wind-derived layer is shown | item 1 |

## For the Terrain track (not edited here: `registry/mars/generated/dunes.yaml`, `pipeline/…/mars/dunes.py`)

| # | Field | Old | New |
|---|---|---|---|
| T1 | `layers[dunes].attribution.changes` (dunes.py `"changes"`) | "Merged into one polygon layer by the PI; made valid, exterior rings counter-clockwise, coordinates rounded to 1e-6°; id 1 = largest field." | "MGD3 and Fenton (2020) merged into one polygon layer; invalid geometries repaired; coordinates rounded to 1e-6°." |
| T2 | `layers[dunes].attribution.url` | "https://pubs.usgs.gov/publication/ofr20181164" | PI decision (P3 below); no change proposed until decided |

`tests/usertextlib.ts` `PENDING_OTHER_TRACK` holds the T1 old string so the Mars user-text check passes
until the rebuilt fragment lands; remove it then (the Mars test also accepts the new text).

## For a PI decision (not changed)

| # | Build | Location | Text | Question |
|---|---|---|---|---|
| P1 | Mars | Help, Wind dataset | "… more Mars wind datasets may be added later." | Keep the forward-looking sentence, or drop it? |
| P2 | both | About, first paragraph; NetCDF `comment` | "This page was created with assistance from Claude AI. I have reviewed …" | The PI's own notice; kept verbatim. Change only on request. |
| P3 | Mars | Dune fields ⓘ, Link | pubs.usgs.gov/publication/ofr20181164 | This is Gullikson et al. (2018) *MGD3 — Composition, stability, and thermal inertia* (USGS OFR 2018-1164), which is not in the ⓘ's citation list (Hayward 2007, 2010, 2012, 2014; Fenton 2020). Add it to the citations, or point the link at a cited record (e.g. doi:10.3133/ofr20121259 or doi:10.1016/j.icarus.2013.04.011)? The "Data DOI" (10.3133/ofr20121259) covers MC-30 only. |
| P4 | Earth | About, Dune map | "dune-mask-rev1.tif from the Supplementary Code record (Zenodo, MIT)" | A public file name of the Zenodo record; kept (helps reproduce). Drop the file name? |

## Reviewed and kept

* Scientific "how to read" notes that name a display convention: "such values are shown as ±60,000"
  (ratio layers), "No data at coasts …", the colour-scale saturation notes, "(log scale)".
* Licences and legal statements, including "Hillshade tiles CC BY-SA 3.0 IGO" (the licensed product)
  and "Esri service under the Esri Master License Agreement / Terms of Use".
* Dataset names containing "beta" (MCMC FV3 Mars GCM beta release 1 / Beta Output Release 1).
* Download texts for data users: NetCDF variable names, CSV column names, grid row / column of the cell
  in the README, file lists in metadata.json, "accessed via the NCI Australia replica".
* "Export failed: ⟨message⟩" in the export popover (rare; the message is the useful part).
* Downloads build their source notes from app constants (`src/cell/auxinfo.ts`), not from store
  attributes, so items 9–10 need no data rebuild for the downloads.

## Resolved (PI, 2026-10-14)

* T1 applied: dunes `changes` = "MGD3 and Fenton (2020) merged into one polygon layer; invalid geometries repaired; coordinates rounded to 1e-6°." (`PENDING_OTHER_TRACK` emptied).
* P3 / T2: the dune ⓘ Link is the USGS MGD3 page, https://www.usgs.gov/centers/astrogeology-science-center/science/mars-global-digital-dune-database.
* P1: "more Mars wind datasets may be added later" dropped from the Mars Help.
* P2: the AI-assistance notice stays verbatim. P4: `dune-mask-rev1.tif` stays in the Earth About.
