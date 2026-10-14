# Info-text audit and style guide (ⓘ popovers, Earth and Mars)

PI request 2026-10-14 (round 3, addition 2, item E). Scope: the ⓘ popover of every map layer in both builds
(Earth: ERA5-Land and ERA5; Mars: MCMC FV3), plus the basemaps (no ⓘ) and the group headers. Method: the
popover content was dumped from the real registries with `scripts/mars/app/info_audit.ts` (registry fields
plus the rendered `infoHtml` text), before and after the change. Dumps: `staging/mars-app/audit/{earth,mars}_{before,after}.json`.

## 1. Audit (before the change)

Rendering (both builds, `ui/layerPanel.ts` `infoHtml`): the definition paragraph, then for the dune layer the
invert note, then for map fields a one-line slider note, then *either* a structured attribution list (Source,
Citation, Data DOI, Licence, Link, Changes) when the registry has `attribution`, *or* the `citation` string
as a plain paragraph. The registry `units` were not shown in the popover.

### 1a. Earth (ERA5-Land; ERA5 has the same layers and texts except the citation of the 24 wind-derived fields)

| layer | group | type | def. chars | units in text | slider sentence in text | slider line | source block | licence shown | symbols / other |
|---|---|---|---|---|---|---|---|---|---|
| `dunes` | dunes | pmtiles-vector | 218 | — | — | — | citation ¶ | MIT | plain title; internal names |
| `at` | orientation | zarr-field | 242 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `ae` | orientation | zarr-field | 251 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qacb` | crest-fluxes | zarr-field | 168 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `sige_sigh` | morphology | zarr-field | 144 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `uft` | wind | zarr-field | 154 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `dpm` | drift | zarr-field | 220 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `rdpm` | drift | zarr-field | 202 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `rdpa` | drift | zarr-field | 292 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qha_rdp_dp` | drift | zarr-field | 257 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `ab` | orientation | zarr-field | 149 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `ao` | orientation | zarr-field | 243 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qncb` | crest-fluxes | zarr-field | 161 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qnlb` | crest-fluxes | zarr-field | 160 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qalb` | crest-fluxes | zarr-field | 167 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qnle` | crest-fluxes | zarr-field | 161 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qale` | crest-fluxes | zarr-field | 168 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qace` | crest-fluxes | zarr-field | 169 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qhab_nl_nc` | morphology | zarr-field | 358 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qhab_ac_nc` | morphology | zarr-field | 271 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qhne_ac_nl` | morphology | zarr-field | 235 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `ufm` | wind | zarr-field | 176 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qhbf` | wind | zarr-field | 346 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qhef` | wind | zarr-field | 337 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `aridity` | climate | zarr-field | 413 | — | “Independent of …” | yes | dl: Source/Citation/DOI/Licence/Url/Changes | CC BY 4.0 | KaTeX title; ASCII maths in text |
| `qsdiv` | drift | zarr-field | 399 | “Shown in m/kyr” | — | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `vegetation` | climate | zarr-field | 707 | “% of the ground” | “Independent of …” | yes | dl: Source/Citation/DOI/Licence/Url/Changes | CC BY 4.0, © 2008–2019 CSIRO | KaTeX title; ASCII maths in text |

ERA5 (0.25°) differs only in the citation of the 24 wind-derived fields (`at` … `qsdiv`): "Fields computed for the atlas from ERA5 hourly 10 m winds (Hersbach et al. 2020; data Hersbach et al. 2023, C3S CDS, doi:10.24381/cds.adbb2d47) with the method of Gunn (2026) …" instead of "Gunn, A. (2026) … Data: doi:10.5281/zenodo.20046812".

### 1b. Mars (MCMC FV3)

| layer | group | type | def. chars | units in text | slider sentence in text | slider line | source block | licence shown | symbols / other |
|---|---|---|---|---|---|---|---|---|---|
| `dunes` | dunes | pmtiles-vector | 398 | — | — | — | dl: Source/Citation/DOI/Licence/Url/Changes | Public domain (U.S. Geological Survey) | plain title; internal names |
| `dpm` | drift | zarr-field | 223 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `rdpm` | drift | zarr-field | 190 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `rdpa` | drift | zarr-field | 280 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qha_rdp_dp` | drift | zarr-field | 245 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `at` | orientation | zarr-field | 230 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `ae` | orientation | zarr-field | 239 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qacb` | crest-fluxes | zarr-field | 156 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `uft` | wind | zarr-field | 232 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qsdiv` | drift | zarr-field | 329 | “Shown in m/kyr” | — | yes | citation ¶ | — | KaTeX title |
| `rho_mean` | environment | zarr-field | 198 | — | “Independent of …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `elevation` | environment | zarr-field | 220 | — | “Independent of …” | yes | dl: Source/Citation/Licence/Url/Changes | MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO) | KaTeX title |
| `ab` | orientation | zarr-field | 137 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `ao` | orientation | zarr-field | 231 | bearing sentence | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qncb` | crest-fluxes | zarr-field | 149 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qnlb` | crest-fluxes | zarr-field | 148 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qalb` | crest-fluxes | zarr-field | 155 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qnle` | crest-fluxes | zarr-field | 149 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qale` | crest-fluxes | zarr-field | 156 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qace` | crest-fluxes | zarr-field | 157 | “in m²/yr”, “Converted from m²/s…” | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `sige_sigh` | morphology | zarr-field | 132 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qhab_nl_nc` | morphology | zarr-field | 346 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qhab_ac_nc` | morphology | zarr-field | 259 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `qhne_ac_nl` | morphology | zarr-field | 223 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title |
| `ufm` | wind | zarr-field | 254 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qhbf` | wind | zarr-field | 424 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |
| `qhef` | wind | zarr-field | 415 | — | “Shown at the selected …” | yes | citation ¶ | — | KaTeX title; ASCII maths in text |

### 1c. Basemaps (no ⓘ; credit in the map attribution only)

Earth:

| basemap | info | credit (map attribution) |
|---|---|---|
| `openfreemap-dark` | none (radio button only) | OpenFreeMap © OpenMapTiles Data from OpenStreetMap |
| `esri-imagery` | none (radio button only) | Esri, Maxar, Earthstar Geographics, and the GIS User Community |
| `hillshade` | none (radio button only) | © Mapterhorn |
| `opentopomap` | none (radio button only) | Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA) |
| `openfreemap-light` | none (radio button only) | OpenFreeMap © OpenMapTiles Data from OpenStreetMap |

Mars:

| basemap | info | credit (map attribution) |
|---|---|---|
| `hrsc-mola-hillshade` | none (radio button only) | Relief: MGS MOLA – MEX HRSC blended DEM v2 (Fergason, Hare &amp; Laura 2018, USGS Astrogeology), MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO); hil |
| `opm-mars` | none (radio button only) | OpenPlanetaryMap / CARTO; data NASA/JPL/GSFC (MOLA), NASA/JPL/ASU (THEMIS), USGS |
| `esri-ctx1` | none (radio button only) | Global CTX Mosaic of Mars V01: NASA/JPL/MSSS/The Murray Lab · Esri |
| `esri-hirise` | none (radio button only) | HiRISE: NASA/JPL/University of Arizona/USGS · Esri |
| `esri-mdim` | none (radio button only) | Viking MDIM 2.1 colorized mosaic: USGS Astrogeology / NASA / JPL · Esri |
| `esri-mcolordem` | none (radio button only) | HRSC–MOLA colorized shaded relief: USGS Astrogeology / NASA / JPL / ESA / DLR (Fergason, Hare &amp; Laura 2018 blended DEM v2; MOLA (CC0) an |

### 1d. Group headers

Earth: `dunes` Dunes, `orientation` Bedform orientation, `crest-fluxes` Crest-normal/parallel fluxes, `morphology` Ratios & morphology indices, `wind` Wind statistics, `drift` Drift potential, `climate` Related data. Mars: `dunes` Dunes, `orientation` Bedform orientation, `crest-fluxes` Crest-normal/parallel fluxes, `morphology` Ratios & morphology indices, `wind` Wind statistics, `drift` Drift potential, `environment` Related data.
(After the rename of item B; ids unchanged.)

### 1e. Inconsistencies found

1. **Structure varies by layer.** Atlas-derived fields: definition + slider note + citation paragraph; aridity, vegetation (Earth) and dunes, elevation (Mars): definition + slider note + attribution list; Earth dunes: definition + invert note + citation paragraph. When both `attribution` and `citation` exist, the citation string (which for aridity also carries the data DOI and licence) is silently not shown.
2. **Units missing or scattered.** The popover never showed the registry `units`. Some definitions state units inline ("in m²/yr", "Shown in m/kyr", "% of the ground"), most ratios, fractions and directions do not; fractions are typed `dimensionless` in the registry but shown as "fraction (0–1)" in the cell panel.
3. **Slider dependence stated twice.** Generated definitions end with "Shown at the selected threshold friction velocity u*,th (default 0.15 m/s)." (Mars: "… median grain diameter d (default 200 µm).") and the popover adds "Updates with the u*,th control."; external layers say "Independent of the wind dataset and of u*,th." plus "Threshold-independent: not affected by the u*,th control." (Mars: "Independent of the grain diameter d." plus "Independent of the grain diameter: not affected by the d control.").
4. **Processing notes in user text**: "Converted from m²/s to m²/yr." (9 flux fields per build); "Displayed as the compass bearing (degrees clockwise from north) toward which sand/crests move." on 4 of the 5 direction fields (not `ab`, the axis), while the definition of `rdpa` says "radians CCW from east" (the source convention, not what is shown).
5. **Wind data not named.** Wind-derived fields do not say which wind dataset, resolution and period they come from (only the citation implies it); the Mars DP definition mentions "all hours of the Mars year", the other Mars fields do not.
6. **Citation formats differ**: Earth "Gunn, A. (2026) Title. Journal. doi:… Data: doi:…" (no full stop after the year, unlike the dune citation "Gunn, A. (2026). …"); ERA5 "Fields computed for the atlas from … with the method of …"; Mars "Fields: Gunn (2026) method (Nat Commun doi:…) with …; winds: …"; Mars `rho_mean` "MCMC FV3 … URL; model physics …"; Mars elevation citation repeats the licence in parentheses although the list has a Licence row.
7. **Licences**: shown for aridity, vegetation, Mars dunes, Mars elevation (attribution) and Earth dunes (inside the citation, "MIT"); not shown for the wind-derived fields (Zenodo data CC BY 4.0; ERA5 Copernicus licence; FV3 data terms) or Mars `rho_mean`.
8. **Symbols**: titles use KaTeX (`titleTex`) but generated definitions use ASCII forms ("DP = sum n q / sum n", "arg sum n q e^itheta", "T|u*,f>u*,th/T", "ρ_f = p/(R T)") and Unicode (⟨|Q⊥(αH)|⟩) side by side.
9. **Internal/technical details** in definitions: Earth dunes "(layers.nc `dunes`)", "tiles z0–10, overzoomed beyond"; Mars dunes "Tiles z0–10, overzoomed beyond; no simplification at z10", the Mars 2000 sphere radius R = 3,396,190 m for areas next to R = 3389.5 km used for distances and divergence (two radii without explanation); Mars dunes `units: Mapped dune fields` is not a unit.
10. **Naming**: "MOLA–HRSC" (layer and basemap titles) vs "HRSC–MOLA" (Esri colour relief, About) vs "MGS MOLA – MEX HRSC" (definition) for the same DEM.
11. **Length**: definitions 144–707 characters (Earth) and 132–424 (Mars) (vegetation longest; it also carries a call to action link).
12. **Dune invert view**: Earth has it, Mars did not (item H adds it).
13. **Basemaps** have no ⓘ (credit only in the map attribution); groups have one-line descriptions in a different register ("Predicted dune-crest orientations …" vs "How often and how strongly …").

## 2. Style guide (implemented in `ui/layerPanel.ts` for both builds)

**One structure, always in this order** (sections that do not apply are omitted, never reordered):

1. *Definition* (one paragraph): what the quantity is, with its symbol; the direction convention if any. No units, slider or processing sentences (they are rows below). Present tense, noun phrase or declarative sentence; no "you".
2. *Invert note* (dune layer only).
3. A single list (`dl`, label column + value column) with the rows, in order:
   * **Units** — display units: m²/yr, m/kyr, kg/m³, m, %, "dimensionless", "fraction (0–1)", "° (compass bearing, clockwise from north, toward which sand moves)" for directions, "° (crest axis, 0–180°)" for the axis. Generated by the app from the registry (`units`, `display.transform`, field kind), so it is the same everywhere.
   * **Wind data** — the wind dataset of the field ("ERA5-Land 0.1°, 1950–2024", "ERA5 0.25°, 1950–2024", "MCMC FV3 2°, one Mars year (6th simulated year, 668 sols)"), or "not used (the same for every wind dataset)" for external data. From `cell/datasetinfo.ts`.
   * **Slider** — one fixed sentence: "Updates with the u*,th control." / "Threshold-independent: not affected by the u*,th control." (Mars: grain diameter d).
   * **Source**, **Citation**, **Data DOI**, **Licence**, **Link**, **Changes** — from the registry `attribution` (rows that are empty are omitted); a layer with only a `citation` shows it as the **Citation** row.
4. Formats: DOIs as `doi:10.…` links; URLs shown without the scheme; citations as in the source (authors, year, title, journal, volume, pages, doi); licences as SPDX-like short names (CC BY 4.0, CC BY-SA 3.0 IGO, CC0, MIT, Public domain).
5. Units and symbols: SI with superscripts (m²/yr, kg/m³), "°" for angles, µm for d; symbols in KaTeX in titles; definitions carry the source TeX (`$…$`) and are rendered with KaTeX like the titles (§4.1).
6. Info vs About: the popover describes one layer (definition, units, data, slider, source/licence). About keeps the dataset-level descriptions, the method and the full citation list; neither repeats the other's long text.

## 3. What was changed

* `app/src/ui/layerPanel.ts` (shared, both builds): `infoHtml(layer, dataset)` renders the structure of §2: definition (`infoDefinition` drops the generated sentences that repeat a row: "Shown at the selected …", "Converted from m²/s to m²/yr.", the compass-bearing sentence, "Independent of …"), invert note, then one list with Units (`infoUnits`), Wind data, Slider, Source … Changes (`attributionRows`, the citation alone as a Citation row). `attributionHtml` is unchanged for other callers. Scientific content is unchanged: every dropped sentence is stated by a row.
* Group titles "Land surface" (Earth `climate`) and "Atmosphere & topography" (Mars `environment`) → "Related data" (item B; ids kept).
* Mars dunes gains the invert view (item H).

After the change every layer of both builds has one of these structures (dump of the rendered popovers):

Earth (ERA5-Land; ERA5 identical):

* definition · invert note · Citation: 1 layers (`dunes`)
* definition · Units · Wind data · Slider · Citation · Licence (round 4): 24 layers (`at`, `ae`, `qacb`, `sige_sigh`, `uft`, `dpm`, …)
* definition · Units · Wind data · Slider · Source · Citation · Data DOI · Licence · Link · Changes: 2 layers (`aridity`, `vegetation`)

Mars:

* definition · invert note · Source · Citation · Data DOI · Licence · Link · Changes: 1 layers (`dunes`)
* definition · Units · Wind data · Slider · Citation · Licence (round 4): 25 layers (`dpm`, `rdpm`, `rdpa`, `qha_rdp_dp`, `at`, `ae`, …)
* definition · Units · Wind data · Slider · Source · Citation · Licence · Link · Changes: 1 layers (`elevation`)

Tests: `tests/body.test.ts` and `tests/mars/body.test.ts` check the order of the rows; `tests/newlayers.test.ts`, `tests/vegetation.test.ts` (attribution rows, slider line) still pass; `tests/publictext.ts` sentinel run covers the new texts.

## 4. PI decisions (2026-10-14) and what was implemented (round 4)

The questions this section listed before round 4 are answered below; §1 keeps the wording found before the change.

1. **Repeated sentences and maths — at the generators.** The generators no longer write "Shown at the selected …", "Converted from m²/s to m²/yr.", the compass-bearing sentence or "Independent of …"; definitions keep the TeX of the source metadata and render with KaTeX. Earth: `pipeline/…/fields.py` (`field_definition`, `registry_fragment`), `qsdiv.py`, `aridity.py`; Mars: `pipeline/…/mars/sidecars.py` (`qsat_fragment`, `extra_fragment`, new `python -m dune_atlas_pipeline.mars.sidecars registry`). Regenerated: `registry/generated/{qsat_fields,x_extra_fields,x_vegetation}.yaml`, `registry/datasets/era5/{qsat_fields,x_extra_fields}.yaml`, `registry/mars/generated/{qsat_fields,x_extra_fields}.yaml`. The app's `infoDefinition` stays as a render-time fallback for texts not yet regenerated. No regenerated registry description now has a repeated sentence (dump of both builds).
2. **`rdpa`** — the definition reads in the displayed convention ("…, the direction sand moves, as a compass bearing (clockwise from north)"). The stored convention (radians counter-clockwise from east) stays in the data files, the downloads and `registry/mars/qsat_field_metadata.json`.
3. **Licence rows for the wind-derived fields** (new `Licence` row on all 24 Earth and 25 Mars field layers, also as `fields_license` in the NetCDF global attributes and `metadata.json`):
   * ERA5-Land fields: "CC BY 4.0 (Zenodo Supplementary Data)"
   * ERA5 fields: "Copernicus licence (Licence to use Copernicus products)"
   * MCMC FV3 fields: "NASA Ames MCMC output; no licence stated (NASA open data)"; the Mars cell-aux licence of `rho_mean` and `qsdiv` uses the same string.
4. **One citation format for the atlas-derived fields**: `Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications. doi:10.1038/s41467-026-75466-y; [data: … Zenodo doi:10.5281/zenodo.20046812 (ERA5-Land only);] [transport law: Pähtz & Durán (2023) … (Mars);] winds: <dataset reference with doi>`. One source per build: `fields_citation()` in `pipeline/…/fields.py` / `mars/sidecars.py` `CITATION`, mirrored by `fieldsCitation()` in `app/src/cell/citation.ts` / `app/src/mars/cell/citation.ts` (tests assert equality for every field layer). Used in the info popover (Citation row), About ("Citing the map fields") and the downloads (`fields_citation` global attribute, `metadata.json`, a README line).
5. **Dunes** (tile details, R, units): Terrain track (`registry/mars/generated/dunes.yaml`, `mars/dunes.py`, commit b8e3bf9). Earth dunes unchanged (no Earth dunes generator in this track).
6. **DEM name** "MOLA–HRSC" everywhere in the app, registry, tests, fixture script and `docs/mars-app.md`; the elevation layer's text is Terrain's (`x_elevation.yaml`, b8e3bf9). Validation docs and the terrarium PMTiles metadata built earlier still say "HRSC-MOLA" (Terrain).
7. **Basemap ⓘ**: every basemap (Earth 5, Mars 6) has an info button with the same structure — definition · Source · Resolution · Licence · Link (plus an optional Coverage row after Resolution: HiRISE, "HiRISE footprints between about 65° S and 65° N; no imagery at higher latitudes in this mosaic (Esri OnMars).") — from a new optional `info` block in `registry/layers.yaml` / `registry/mars/layers.yaml` (`layers.schema.json`, `BasemapDef.info`).
8. **Vegetation definition** shortened to < 500 characters (`vegetation.py` `DESCRIPTION`), link kept.

Not changed: the attributes of existing stores (`cells.zarr` licence, Mars cell-aux `rho_mean`) keep their old values until the next rebuild; the app overrides the Mars aux licence at display time.
