# Review fixes, October 2026 (Phase A, track 1: UI fixes)

Fixes to the Dune Atlas (Earth https://map.geomorphlab.org/, Mars https://map.geomorphlab.org/mars/) after two
role-play reviews of 14 October 2026:

* **U#**: user review by an emeritus aeolian geomorphologist (17 ranked suggestions);
* **L#**: learner review (17 ranked suggestions).

Both atlases share one UI (`app/src`), so every change applies to Earth and Mars unless the table says
otherwise. Commits are on branch `mars` of the working checkout and were published to `geomorphlab/dune-atlas`
(see Deployment). Explanatory physics text, search, the Concepts page, bulk-data and regional downloads, PDF
export and anything involving Zenodo were outside this track and are listed under "Not done".

**Verification limits.** No browser could run in the development sandbox (headless Chrome does not start), so
every visual change below has been checked by unit tests, DOM tests (happy-dom) and geometry calculations
only, not in a real browser. Items that most need a look in a browser are marked *(check in browser)*.

## Changes by review item

| Item | Review request (short) | Change | Commit |
|---|---|---|---|
| U5 | Key numbers in a box at the top; the long table behind "More" | Key-numbers box at the top of the cell panel (wind data and record, threshold or grain size, DP, RDP, RDD, RDP/DP; Mars also the per-hour threshold statistics). The full summary table is behind "More: full cell summary at …", closed by default, state remembered. | caf086f |
| U8, L11 | Blank gaps in captions ("DP = 31.4 m²/yr [gap] .") | Cause: each live number reserves room for its widest value, and the width was a conservative character estimate; slots also stood mid-sentence. Widths are now measured in the page font (canvas `measureText`, estimate as fallback), and every slot whose values change length ends its line (bold lead sentence, key rows, legend items), so reserved room never shows as a hole inside text. Slider sweeps over all 64 positions test both measured and estimated widths and that no slot sits mid-text. | caf086f |
| U6 | White export background; landscape map export; mark the selected cell; show progress | Plot and map PNG/SVG white by default, "Transparent background" option. Map PNG is landscape: map on the left, colour bars, keys and sources in a right-hand column (side text about 11 pt when the image fills a 16:9 slide); about 3,100 × 1,600 px at a 1370 × 900 window (was portrait, 2055 × 2657). The selected cell stays in the capture and is named in the side column. The export box shows a progress bar, stage and elapsed seconds, then "Saved: file (W × H px)". *(check in browser)* | 6ac8414 |
| U7 (part) | Simple per-cell 16-sector table in degrees | `rose_16_sectors.csv` in the CSV bundle: wind rose (FROM, % of hours) and flat-bed sand flux (TOWARD, m²/yr and %) in 16 compass sectors with centre, start and end bearings in degrees, at the panel's threshold (Mars: grain size); documented in README.txt and metadata.json. PDF export not done (out of scope). | 6ac8414 |
| L14 | Confirm downloads on the page | Every download (NetCDF, CSV bundle, citation, plot and map images) shows a status message naming the file. | 6ac8414 |
| U9 (part) | "Loading map…" message; faster first draw and planet switch | "Loading map…" indicator (status role) on the first draw and while the map redraws after a dataset, projection or basemap change; hidden when the map is idle or after 30 s. Wheel zoom faster (rate 1/250, MapLibre default 1/450). Load speed itself not changed (see Not done). *(check in browser)* | 7fdc2cc |
| U10 (part) | Satellite background looks unchanged; say "lower the colour layers" | Imagery basemaps (registry flag `imagery`: Earth Esri imagery; Mars CTX, HiRISE, MDIM) show the hint "To see the imagery under the colour layers, lower their opacity in Active layers." Opacity is not lowered automatically (the visitor's opacity settings are kept); a place-name overlay on imagery was not added. | d247c65 |
| U11 | Keep settings when switching planets and back | The planet button opens the other atlas with `resume=1`; each atlas keeps its last view per body (camera, basemap, projection, layers and opacities, threshold or grain size, cell, dataset) and reopens it. `resume=1` is removed from the address after use. | d247c65 |
| U12 (part), L5 | Larger text; plain names first; one name per quantity; fix αH | One name per quantity everywhere (layer list, legends, cell table, CSV and NetCDF long names; `registry/field_names.json` from the pipeline), name first with the symbol after. αH is "migration-mode crest orientation", an axis 0–180° perpendicular to αT, read out as "128° (axis)" without a compass word; αT and αO renamed to match. Base text 0.5 px larger on captions, help lines, legends, tables and popovers. No text-size control. | cdbbbed, 7fdc2cc |
| U14 | Citation text: "23.25° S", dataset label, threshold and dataset | Citation TXT gives the centre as "23.25° S, 15.00° E", the wind dataset and record, and the threshold (Mars: grain size); the dune-map entry is labelled as dune-mask-rev1.tif in the Supplementary Code record. README cell centre in the same form. | cdbbbed, 6ac8414 |
| U15, L16 | Tour boxes on screen; Help/Share boxes over the cell panel; tour covering its targets | Tour popover now has border-box sizing (its set width included padding and border, about 30 px too wide, so steps 8–9 ran off the right edge), a maximum height, and is placed below, above, right or left of its highlight, whichever stays on screen and off the highlight (steps 3, 8, 9). Help, Share and Export boxes move to the left of an open cell panel when there is room; on narrow screens their height stops above the bottom sheet. Step 6 still shows the example Namib cell but restores the visitor's cell afterwards (unchanged by decision). *(check in browser)* | 7fdc2cc |
| L16 | Label checkboxes for screen readers | Layer checkboxes have the accessible name "Show <layer name>" (the KaTeX-only label was read as "on"); a test checks every checkbox in the layer panel has a plain-text name. | 7fdc2cc |
| U16 (part) | How coarse is a 2° grid? | Mars About: a 2° cell is about 120 km across at the equator, larger than most dune fields. The Earth/Mars slider-difference text is part of the physics explanations (not done). | cdbbbed |
| U17, L15 | Overlapping colour-bar labels, "5e-4"; consistent DP colour scale | Colour-bar ticks in plain decimals (0.0005); a decade too close to an end label is dropped instead of stacked. Earth DP and RDP use one fixed log range, 0.01–300 m²/yr, for both wind datasets (ERA5-Land's 2nd percentile was 0.00048 m²/yr from calm cells, so the map went almost uniformly orange); Mars keeps its own range. | d247c65 |
| L6 | RDD can flip at low RDP/DP; αT need not follow RDD | Modes-vs-threshold caption says so. | cdbbbed |
| L7 | Vegetation value reads high on bare desert | Caveat in the vegetation info text and table row (total cover includes dry, non-photosynthetic vegetation); unit "% (green + dry)". | cdbbbed |
| L8 (part) | "Dunes only" hides the data under the dune fill | With "Dunes only" on, the dune map is drawn as outlines only, so the data stay visible. A comparison of the 0.25° mask footprint with the polygons was not added. | d247c65 |
| L12 | Keep the selected cell and a visible marker on basemap/projection switch; loading indicator | Selected cell: a fixed-size ring at the cell centre while the cell is smaller than 12–24 px on screen (a 0.1° cell is sub-pixel at the opening zoom, so Earth showed no marker). No code closes the cell on a basemap or projection switch; the likely cause of the lost cell was Escape (pressed to close a list or popover in the layer panel) closing the cell panel, so Escape now closes the cell only when pressed on the map or in the cell panel. Loading indicator as under U9. *(check in browser: not reproduced)* | d247c65, 7fdc2cc |
| L17 | Mars: blocky low-latitude squares; colour-key wrap; height wording | Blocky squares are the 2° grid, not a rendering fault (see Findings); Mars About explains it. Flux colour key puts its label first so "> 5" no longer wraps alone. Heights: About gives 1.5–3.2 m over all cells and hours and 1.6–3.0 m in 98 % of dune-cell hours; the caption gives the selected cell's own range. | cdbbbed |
| (About text) | Divergence grid | Earth About said the divergence is computed "on the 0.1° grid" for both datasets; `qsdiv.py` uses each dataset's own grid, so the text now says 0.1° for ERA5-Land and 0.25° for ERA5 (Mars 2°). | cdbbbed |

## PI requests (October 2026)

| Request | Change | Commit |
|---|---|---|
| "Start tour" speech bubble at the Help (?) button | Shared module `ui/tourBubble.ts`, both atlases including `?embed=1`. Shown on arrival; when the tour starts by itself (first visit), shown after it closes only if it was skipped at step 1. A click (or Enter) starts the tour; Esc or the first click anywhere else hides it for the visit. Shown on later visits until the visitor has started the tour once (reached step 2 of an automatic start, or started it from the bubble or Help), per body (`duneAtlas.tourStarted`, `duneAtlasMars.tourStarted`), then never. Placed left of the Help button, else below the control column, else not shown, so it never covers the planet button, the side panel or the cell panel. A `button` with an aria-label; no animation under prefers-reduced-motion. Tests: `tests/tourbubble.test.ts`. *(check in browser)* | 7fdc2cc |
| General "<quantity> vs threshold / grain diameter" plot with a y-axis selector | The flux-divergence plot becomes a plot of any per-threshold (Earth, x = u*,th) or per-grain-size (Mars, x = d) quantity: the 23 sand-flux fields, the flux divergence and, on Mars, the median threshold friction velocity. DP by default. Direction fields on a fixed 0–360° (axes 0–180°) axis with breaks where they wrap (one switch, `PLOT_DIRECTIONS`, excludes them); ±60,000 sentinels and gaps are left out of the autoscale and sentinels are marked; positive quantities spanning two or more decades use a log axis. Title, caption, axis label, live value and exported PNG/SVG (title, legend, file name `…_<quantity>-vs-threshold_…`) follow the choice. The choice is remembered per body and carried in share links (`?plot=`, short-link flag 32 appended after the layers; old links open with DP). Tests: `tests/qplot*.test.ts`, `tests/mars/qplot.test.ts`. | 6a3152d |
| Last x tick label clipped ("1000" shown as "100" on Mars) | `lineplot.ts` reserves a right margin for the last x tick label; Earth "0.64" and the other line plots checked; the polar plots were not clipped. | 6a3152d |

## Findings

* **Mars blocky low-latitude DP squares (L17).** Not a rendering fault. The production `fields/dpm.zarr` at the
  default grain size is byte-identical to the build output; it has a single pyramid level (90 × 180), and there
  are no repeated 2 × 2 blocks. The median cell-to-cell change |Δ ln DP| is 0.12–0.15 at |latitude| < 30°
  against 0.03–0.05 poleward of 60°: DP varies strongly from one 2° cell to the next at low latitudes, so each
  cell's square is visible.
* **Divergence grid.** `qsdiv.py` computes the divergence on each dataset's own grid; the Earth About text was
  wrong for ERA5 and now names each dataset's grid.
* **Tour did not start for some visitors.** The first-visit tour started only on the map's first "idle"
  event; if that event never comes (continuous repainting, a slow tile host) the tour never starts. It now
  also starts after 8 s. This is the probable cause; it could not be confirmed in a browser.
* **Lost selected cell (L12).** See the L12 row: no code path closes the cell on a basemap or projection
  switch; Escape scope is the probable cause.

## Not done, with reasons

| Item | Reason |
|---|---|
| U1 Search box | Out of scope for this track (separate feature). |
| U2, L2 DP vs Fryberger & Dean; transport law and u* derivation | Explanatory physics text and a Fryberger-style DP readout are out of scope for this track. |
| U3, L10 Threshold rationale, grain-size and knot equivalents, presets; which dataset to use | Explanatory text, out of scope. |
| U4 Dataset and neighbour sensitivity | Needs a comparison feature (ERA5 vs ERA5-Land, neighbouring cells) and its design; not started. |
| U7 (part) PDF export of the rose | Out of scope. |
| U9 (part) Faster first draw and planet switch | The planet switch is a full page load of the other atlas and the first draw is bound by tile and data downloads; only the loading indicator and faster wheel zoom were added. Speeding up loading needs profiling in a browser. |
| U10 (part) Automatic opacity change; place names on imagery | Kept the visitor's opacity settings (hint instead); no label overlay for the imagery basemaps in this round. |
| U12 (part) Text-size control | Text enlarged by 0.5 px instead; a control was not added. |
| U13 Make "Dunes only" more prominent | Its behaviour was improved (L8) but its place in the panel was not changed in this round. |
| U16 (part), L3 Earth vs Mars comparability note | Explanatory text, out of scope. |
| L1 Concepts / Learn page | Out of scope. |
| L4 Interpretation guides for RDP/DP, σE/σH and the Q̂ ratios | Belongs to the Concepts / glossary work (out of scope). The new quantity plot marks ±60,000 sentinels. |
| L8 (part) 0.25° mask footprint vs dune polygons | Not added in this round. |
| L9 Regional download, bulk-data guide, DOI for the ERA5 0.25° fields | Out of scope (bulk-data guide, regional export, Zenodo). |
| L13 One shared citation block instead of one per info popover | Restructuring the info popovers was not part of this round. |

## Tests

* Earth build (`npx vitest run` in `app/`): 526 passed, 23 skipped (before this track: see the commit history).
* Mars build (`VITE_BODY=mars npx vitest run`): 96 passed, including the drift guard.
* `bash app/scripts/test-ci.sh HEAD` (clean checkout of the commit, both builds): Earth 526 passed / 23 skipped,
  Mars 90 passed / 6 skipped (tests that need the working tree or local data skip there), both builds OK.
* New tests: `resume`, `dunesoutline`, `statebugs`, `naming`, `exportsU6`, `qplot`, `qplotlib`, `tourplace`,
  `tourbubble`, `a11ynames` (Earth); `mars/qplot` (Mars). The slider jitter sweeps now also run with measured
  widths.

## Deployment

* Published 14 October 2026 as `geomorphlab/dune-atlas` main d9e8860 (tree identical to branch `mars` at
  5037830); GitHub Actions run 38556701274 (build-and-deploy) succeeded. This log's deployment note followed
  in a documentation-only commit.
* Live checks after the deploy: https://map.geomorphlab.org/ and https://map.geomorphlab.org/mars/ return 200
  and serve the new bundles (they contain the Start tour bubble, the loading indicator, the quantity-plot
  setting and `rose_16_sectors.csv`); the Mars smoke check against the live site and data
  (`scripts/mars/app/preview_smoke.mjs`) passed 34 of 34 checks; the Earth data stores (ERA5-Land
  `dune-atlas/v1`, ERA5 `dune-atlas/v2/datasets/era5`) answer on https://data.geomorphlab.org/. No data
  were uploaded in this track (the fixed DP colour range is in the app registry).
* Not checked: the pages in a real browser (none available in the development sandbox).
* `tests/repotext.test.ts` (run only where the maintainer's local word list exists) reports 36 hits in files
  that predate this track (Mars physics constants and specification); this log was reworded to add none.

## Addendum: second round (PI text, text sweep, PI browser review, Mars v2 data), 14 October 2026

Commits on `mars`: `4b8a690` (code), `b78cda2` (Mars drift record), `417f7a5` (audit), `be5d161` (merge of
`mars-packing`: Mars fluxes as packed-sand volumes, q = Q/(ρp φ), φ = 0.6; data prefix
`dune-atlas/mars/v2/datasets/fv3-beta1`; Mars DP and all fluxes ×1/0.6). Published together in one deploy (below).

**PI-edited physics text** applied verbatim (only "reviewd" → "reviewed"; markup adapted) in the Earth and Mars
About, every info button of the file, the modes captions, Help and a new ⓘ beside the Wind dataset selector; αH
is now "Crest orientation, bed-instability mode (αH)" and αO "Along-crest transport direction (αO)" everywhere,
including the CSV / NetCDF long names. One deviation: the Mars divergence ⓘ omits the sentence "No data at coasts
… ±90° rows", which does not hold on Mars (for the PI to confirm). The Concepts entries are stored, not shipped:
`docs/concepts/concepts-earth-mars.md`. The packed-sand wording of the Mars About and downloads ships with the
Mars v2 data in the same deploy.

**Text sweep** (PI rules a–c): every change old → new, and 8 items left for the PI, in
`docs/user-text-audit-2.md`.

**PI browser review** (how each was verified; no browser in the development sandbox):

| # | Item | Change | Verified by |
|---|---|---|---|
| 1 | Tour step 5 showed two yellow boxes | The only accent-outlined elements during a step are the highlight and the popover border; at step 5 the popover sits directly under the Active-layers box at about the same width, and the highlight was placed before step 4's restore (closing RDD's Display, scrolling the list back) had moved the list. The popover border is now neutral and every step is re-anchored after the previous step's restore. | tour DOM tests (`tourhooks`, `tourplace`); cause by code reading — **check in a browser** |
| 2 | Cell panel order; no key-numbers box | Old order (plots, then the summary table, then downloads), no box; the threshold (Mars: grain diameter and per-hour threshold statistics) on short lines under the dune badge, each value at its line end; the table rows fold in groups as in the layer panel (Drift potential, Bedform orientation, Crest-normal/parallel fluxes, Ratios & morphology indices, Wind statistics, Related data, Cell), open state remembered per body (`duneAtlas[Mars].cellPanel.tableGroups`; crest fluxes, ratios and wind statistics closed by default, as in the layer panel). | DOM tests (section order, groups, persistence over re-renders, titles and members against both registries), slider sweeps over 64 positions (no reflow, no holes) in both builds |
| 3 | Tour step 7 / About wording tied to the present datasets | Step 7: "Switch between the wind datasets; each option names the dataset and its grid. …"; About intro and items: dataset facts from the dataset table; tour included in the sweep. | audit table; Mars public-text test |
| 4 | "This is the end of the tour." | Removed (both); the sentence before now says each atlas reopens the view you last had there. | help-doc test (docs/help-text.md regenerated) |
| 5 | Globe: raster cell short of the dune outline (22° N, 56.7° E) | Cause: zarr-layer drew each region (361 × 360 cells) as one quad split into about 1° steps; on the globe each step is a flat chord up to ~240 m below the sphere, and the texture varies linearly along it, while MapLibre subdivides vector lines finely. A cell edge inside a step is therefore drawn inward of the outline, by an amount that grows with the distance from the view centre (MapLibre's globe is a sphere below zoom 11 and blends to Mercator between 11 and 12). Fix in the zarr-layer patch: on the globe the mesh has a vertex line on every cell edge (cells ≤ 0.25°; coarser cells split into steps ≤ 0.25°; ≤ 512 lines per region side), so cell edges lie on the sphere. Mercator was already exact (one planar quad, per-fragment inverse-Mercator lookup). | geometry test with a vertical-perspective camera model (`tests/globemesh.test.ts`): the old mesh put the right / bottom edge of a cell 5.4 px (22° N), 3.3 px (45° N) and 9.1 px (70° N) inside the outline at zoom 10.5–11.9 (CSS px; double on a retina screen, consistent with the screenshot); the new mesh < 0.1 px. Pole and seam topology tests pass. Cost: up to ~260 k vertices per 0.1° region on the globe. **Check in a browser**, including frame rate on the globe at zoom 8–11. |
| 6 | Map PNG export layout | Reverted to the layout before this round (map, then the strip below across the full width); kept: white default background with the Transparent option, progress stages and the "Saved" / download messages. Removed: the side column, the selected-cell outline and its line in the export (the on-map selection ring stays, PI decision). Export box and Help no longer promise a slide shape. | strip test (full width, no text beyond the right edge, no selected-cell line); not rendered in a browser — **check an export with several layers** |
| 7 | Plot export legends | "current threshold" / "current grain diameter" → the value, "u*,th = 0.15 m/s" / "d = 200 µm". | type check, plot-export tests; not rendered |
| 8 | Colour-bar text duplicating the info | Notes removed from the aridity and vegetation colour bars (their text is in the info); the Mars elevation note moved into its info. Colour bars keep ticks, labels and the units row. | registry test: no layer in either atlas has a colour-bar note |

**Mars v2 data**: merged without conflicts; the Mars registry fragments regenerated from the merged sources are
identical to Wind's v2 files in colour limits and sources (text from this round); the Mars dev fixture now points
at the v2 layout (`staging/fixture-mars` → `staging/mars/v2/fixture-mars`).

**Deployment (second round)**: published as `public` `6adf251`; its Actions run 38566189680 failed in the
polar-raster test (the test harness exceeded the CI time limit, not a code fault). Commit `3e54bd2` sized that
test for CI (≤ 2° spacing and memoised meshes; 54 s → 11 s); republished as `public` `4bcccdb`, Actions run
38568819345 succeeded. Live checks: both pages HTTP 200; Mars smoke test (dataset v2) 34/34 passed; the Mars
bundle requests only `mars/v2/datasets` (0 references to `mars/v1/datasets`); the patched globe mesh is in the
live Earth bundle. Mars DP at d = 200 µm from the served stores, v1 → v2 (m²/yr): Nili Patera (40, 123)
1.4646 → 2.44092; Proctor (68, 105) 3.21143 → 5.35254; north polar erg (4, 151) 1.42871 → 2.38135; ratios
1.66661, 1.66672, 1.66678 = 1/0.6 within the 12-bit rounding of the stores, matching the reference values of the
data change (1.4645 → 2.4408, 3.2115 → 5.3526, 1.4288 → 2.3813).

**PI decisions on the text audit §4** (commits `41a6495`, `c9be974`; details in `docs/user-text-audit-2.md` §5):
the Baas (2026) comparison moved from the threshold ⓘ to the Wind dataset ⓘ / Help as an example, and that text
now renders the datasets, grids and period from the dataset table; the map attribution follows the selected
dataset (ERA5: atlas-computed fields, Copernicus licence), set by a new dataset-table field; "migration mode" →
"bed-instability mode" in every crest-flux name and definition (layer list, ⓘ, table, colour bars, CSV / NetCDF
long names; CSV column names unchanged, none contains the phrase); export descriptions of direction, axis and
flux fields say how the file holds the values (radians; m2 s-1). Items 2, 3, 7 kept; 6 deferred to the
refactor; 8 left until the next ERA5 data version. Tests added: `tests/datasettext.test.ts` (dataset text from
the table, Baas only there, attribution per dataset, file-unit notes) and a public-text check that no site or
download string says "migration mode". Earth 540 passed (23 skipped), Mars 97 passed.

**Deployment (§4 follow-up)**: `mars` `20e6f1d` (test-ci OK in both checkouts) published as `public` `9a451c9`;
Actions run 38573468208 succeeded. Live checks: both pages HTTP 200; Mars smoke test (dataset v2) 34/34 passed;
live bundles: "bed-instability mode" present (Earth 42, Mars 28 occurrences), "migration mode" absent, the ERA5
attribution line and the "e.g., Baas (2026)" example in the Earth bundle, the file-unit notes in both, 0 references
to `mars/v1/datasets`, the globe-mesh patch present. The remaining "migration-mode" strings in the bundles are the
bundled source metadata (Supplementary Data attributes), used only as a fallback that no field reaches; the
public-text test checks every displayed and downloaded string. This record is committed after the deploy and goes
out with the next publish.

