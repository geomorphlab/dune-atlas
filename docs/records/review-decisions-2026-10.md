# Review decisions, October 2026

Every suggestion of the three reviews of 14 October 2026, with its outcome and where it was done or why not:

* **U1–U17**: user review (emeritus aeolian geomorphologist);
* **L1–L17**: learner review (physical-geography student);
* **P1–P14, D1–D12**: codebase review and refactor plan (proposals and owner decisions).

Outcomes: **done**, **partly done** (the part not done is named), **deferred** (not done yet, kept open) or
**declined** (decided against, with the reason). Commits before the public pull-request model are those of the
fix log `docs/review-fixes-2026-10.md` and the text audit `docs/user-text-audit-2.md` (both at the git tag
`records-2026-10`); later changes name the pull request on `geomorphlab/dune-atlas`:

| PR | content |
|---|---|
| #1, #2 | restructuring phases 2 and 3 ([refactor-equivalence.md](refactor-equivalence.md)) |
| #3 | search box, Concepts panel, tour fixes, shared map-field citation |
| #4 | Get the whole grid guide, other-dataset line, Download a region |
| #5 | this record and the documentation of phase C |

Phase 1 of the restructuring was published directly as `6742bca` (before branch protection).

## User review (U)

| # | Suggestion | Outcome | Where | Notes |
|---|---|---|---|---|
| U1 | Search box for place names and typed coordinates (Earth and Mars), with well-known dune fields | partly done | PR #3 | Typed coordinates (decimal, DMS, N/S/E/W or signed; Mars planetocentric, east-positive) on both atlases and in embed mode; fly there and open the cell. Named places: lists, schema and matching built, shipped empty and disabled (`registry/<body>/places.yaml`, `enabled: false`) until the PI approves the Earth and Mars names; the naming note for the dune layer is drafted and hidden with them. |
| U2 | Explain how DP (m²/yr) relates to Fryberger & Dean DP; converted value or Fryberger-style option | partly done | `6adf251`; PR #3 | Explained in the DP ⓘ, About and the Concepts entry "Drift potential (DP)". A converted value is declined: the two quantities grow differently with wind speed, so there is no fixed conversion (PI text). A Fryberger-style computation is not planned. |
| U3 | Why 0.15 m/s; grain-size and knot equivalents; presets (e.g. Fryberger 12 kn) | partly done | `6adf251`; PR #3 | Rationale, the 10 m wind and knot equivalents and Fryberger's 12 kn ≈ 0.27 m/s in the threshold ⓘ and the Concepts entry "Threshold friction velocity". Presets deferred. |
| U4 | Show the dependence on the dataset and neighbouring cells | partly done | PR #4; PR #3 | The Earth cell panel gives DP, RDD and RDP/DP of every other wind dataset at the same location and threshold; the Concepts entries on RDD and on the two ERA5 datasets say when to treat results as uncertain. Neighbouring-cell values deferred. |
| U5 | Key numbers in a box at the top; the long table behind "More" | declined | `caf086f`, reverted in `6adf251` | Built, then replaced at the PI's browser review by the threshold lines under the dune badge and a summary table folded in groups. |
| U6 | White export background, landscape map export, mark the selected cell, show progress | partly done | `6ac8414`, `6adf251` | White default with a Transparent option and export progress kept. The landscape layout and the selected-cell outline in the export were reverted at the PI's browser review (PI decision). |
| U7 | 16-sector rose table in degrees; PDF export | partly done | `6ac8414` | `rose_16_sectors.csv` in the CSV bundle. PDF export deferred. |
| U8 | Blank gaps in captions | done | `caf086f` | Live-number widths measured in the page font; every varying slot ends its line. |
| U9 | Loading message; faster first draw and planet switch | partly done | `7fdc2cc` | Loading indicator and faster wheel zoom. Load speed deferred (needs profiling in a browser). |
| U10 | Satellite background hidden under the colours; place names | partly done | `d247c65` | Hint to lower the opacity. Automatic opacity change declined (the visitor's settings are kept); place names on imagery deferred. |
| U11 | Keep settings when switching planets and back | done | `d247c65` | Each atlas reopens its last view (`resume=1`). |
| U12 | Larger text or a size control; plain words before symbols | partly done | `cdbbbed`, `7fdc2cc` | One name per quantity, name before symbol, text +0.5 px. A text-size control deferred. |
| U13 | Make "Dunes only" more prominent | deferred | — | Its behaviour was improved (L8); its place was not changed. |
| U14 | Citation text: "23.25° S", dataset label, threshold and dataset | done | `cdbbbed`, `6ac8414` | |
| U15 | Tour boxes on screen; keep the visitor's cell; Help/Share off the cell panel | done | `7fdc2cc`; PR #3, #4 | Tour placement and popovers left of the cell panel; the Concepts and region popovers also narrow to stay off it. Step 6 still shows the example cell and restores the visitor's cell afterwards (kept by decision). |
| U16 | Earth/Mars slider difference; how coarse a 2° grid is | done | `cdbbbed`, `6adf251`; PR #3 | Mars About on the 2° cell; About "Earth and Mars: what can be compared"; Concepts "Grain size and threshold" (Mars). |
| U17 | Overlapping colour-bar labels; plain numbers | done | `d247c65` | |

## Learner review (L)

| # | Suggestion | Outcome | Where | Notes |
|---|---|---|---|---|
| L1 | Concepts page linked from each ⓘ, with key references | partly done | PR #3 | Concepts panel (mortarboard button) with the PI-approved entries and their references; every wind-derived layer ⓘ and the slider and dataset ⓘ link to their entry; one tour step. Small diagrams deferred. |
| L2 | DP is a volumetric flux, not Fryberger vector units; name the transport law and the u* derivation | done | `6adf251`; PR #3 | DP ⓘ, About (transport law of Martin & Kok 2017, z₀ = 1 mm), Concepts entries. |
| L3 | Earth vs Mars: what is comparable; same control on both | partly done | `6adf251` | About "Earth and Mars: what can be compared"; the Mars panel shows the per-hour threshold. A grain-size mode on Earth deferred. |
| L4 | Interpretation guides (RDP/DP classes, σE/σH, Q̂ ratios; ±60,000 = infinite) | partly done | `6adf251`, `6a3152d`; PR #3 | Classes and example values in the info texts and Concepts entries; ±60,000 sentinels marked in the quantity plot. Dune-shape sketches deferred. |
| L5 | One name per quantity; fix the αH legend | done | `cdbbbed`, `6adf251` | αH "Crest orientation, bed-instability mode", read as an axis. |
| L6 | RDD unstable at low RDP/DP; αT can differ from RDD | done | `cdbbbed`; PR #3 | Modes caption; Concepts entries RDD and αT. |
| L7 | Vegetation caveat on bare desert | done | `cdbbbed` | |
| L8 | Dunes only should show the data; 0.25° mask footprint | partly done | `d247c65`; changed 16 Oct | Dune map drawn as outlines with Dunes only (suited to ERA5-Land, when it was the only dataset). 16 Oct (PI): the dune map keeps its fill and is drawn at no more than 50 % opacity while Dunes only is on; Dunes only has an ⓘ saying what it does and this. Footprint comparison deferred. |
| L9 | Regional download or a link to the full grid with an xarray example; DOI for the ERA5 0.25° fields | partly done | PR #4 | Download a region (box drawn or typed, CF-1.8 NetCDF with README) and the Get the whole grid guide (public Zarr stores, Python example generated from the registry). A DOI for the ERA5 0.25° fields deferred (no Zenodo deposit for now); they keep the "computed for the Dune Atlas" wording. |
| L10 | Why 0.15 m/s, grain size, reanalysis bias; which dataset to use | done | `6adf251`, `41a6495`; PR #3 | Threshold and dataset ⓘ; Concepts entries on the threshold and the two ERA5 datasets (Baas 2026 as an example). |
| L11 | Caption gaps | done | `caf086f` | As U8. |
| L12 | Keep the selected cell and a marker on basemap/projection switch; loading indicator | done | `d247c65`, `7fdc2cc` | Escape scope fixed (probable cause); selection ring; loading indicator. |
| L13 | One shared citation block per panel; a short "Cite this" summary | partly done | PR #3 | The 24 map-field popovers that repeated the dataset's citation link to the one block "Citing the map fields" in About; layers with their own sources keep them in full. A separate "Cite this" summary deferred (Download & cite has Copy citation). |
| L14 | Confirm downloads on the page | done | `6ac8414` | The region download confirms itself too (PR #4). |
| L15 | Consistent DP colour scale across datasets | done | `d247c65` | |
| L16 | Popovers off the cell panel and the tour's targets; checkbox labels; larger text | done | `7fdc2cc`; PR #3, #4 | |
| L17 | Mars: blocky squares, colour-key wrap, height wording | done | `cdbbbed` | The squares are the 2° grid (explained). |

## PI requests during the reviews

| Request | Outcome | Where | Notes |
|---|---|---|---|
| "Start tour" bubble at the ? button | done | `7fdc2cc`; PR #3 | Reported as no longer appearing: its code was unchanged since deployment. It is suppressed for good in a browser where the tour has been started once (the rule of the request), which is the likely reason after the tour was checked in that browser. Also fixed: it was placed only once on arrival, so a page that opened with the cell panel (share links, the planet button's last view) left it invisible for the whole visit; it is now placed again on layout changes. Esc on it no longer closes the cell panel. |
| Tour step "Share and export": highlight both buttons | done | PR #3 | The highlight spans the share-link and camera buttons. |
| Quantity-vs-threshold plot | done | `6a3152d` | |
| Text audit 2, §4 items 1–8 | done / declined as decided | `41a6495`, `c9be974`, `ee098c3` | 1, 4, 5: done; 2, 3, 7: kept (PI); 6 (dataset credits in the registry): done in the restructuring (`ee098c3`); 8 (R2 store attribute): left until the next ERA5 data version (PI). |

## Codebase review: proposals (P)

| # | Proposal | Outcome | Where | Notes |
|---|---|---|---|---|
| P1 | Public-repo hygiene | done | `6742bca` | Private paths and process notes removed; `tests/repotext.test.ts` keeps them out. |
| P2 | CI that tests what matters | done | `6742bca` | Synthetic fixtures, pipeline tests, deploy after the tests, branch protection, 8-position sweeps on pull requests (all 64 on `main`). |
| P3 | `BodyProfile` instead of source patches | done | PR #1 (`d4ee26e`) | |
| P4 | Core + hooks instead of module substitution | partly done | PR #2 (`4baa0a5`, `9d729c8`) | One entry module with `@body/app` hooks. One cell model for both bodies deferred: five Mars counterparts stay, guarded by `counterparts.json`. |
| P5 | Symmetric per-body registry; datasets declared once | done | PR #1, #2 (`2a24608`, `ee098c3`) | |
| P6 | Retire the body plugin and drift guard | done | PR #2 (`4baa0a5`, `546bc43`) | Plugin removed; the guard narrowed to the five counterparts. |
| P7 | Pipeline core and body packages, one CLI | deferred | — | Phase 4, by decision D11. |
| P8 | Physics and constants organisation | done | `6742bca`, PR #1, #2 | Named radii, values kept (D12). |
| P9 | Scripts consolidation; one-off records retired | done | `6742bca`, `ed1fc35` | Kept at the tag `records-2026-10`. |
| P10 | Documentation restructure | done | `6742bca`, `546bc43` | `docs/{guide,reference,records}`, extending guide. |
| P11 | README, citation and licences | partly done | `6742bca`; PR #3 | Researcher-first README, `CITATION.cff`, per-product `DATA_LICENSE.md` (the deleted Mars first build noted in PR #3). Zenodo software DOI deferred; the open licence notes 1–5 of `DATA_LICENSE.md` are for the PI. |
| P12 | Generic naming of the control parameter | deferred | — | Not done in phase 3. |
| P13 | Branch and release workflow | done | PR #1–#5; `CONTRIBUTING.md` | One public `main`, pull requests, required checks, no force pushes. |
| P14 | Data-URL convention; lint and format tooling | partly done | `6742bca` | New data under `dune-atlas/<body>/<dataset>/v<N>/` (infrastructure guide, CONTRIBUTING); syntax and undefined-name lint of the Python code in CI. A formatter and an app linter deferred. |

## Codebase review: owner decisions (D)

| # | Decision | Outcome | Where | Notes |
|---|---|---|---|---|
| D1 | Branch model | done: (b) | after phases 1–3 | One public `main` with pull requests. |
| D2 | Records and audits | done: (b) and (c) | `6742bca`, `ed1fc35` | Validation reports in `docs/records/`; audits, round logs and one-off scripts at `records-2026-10`. |
| D3 | Repository layout | partly done: (b) | `6742bca`, PR #1, #2 | App, registry, docs and tools in the target layout; the pipeline layout deferred (P7). |
| D4 | Licences and citation | partly done: (b) | `6742bca` | Per-product table, `CITATION.cff` with the paper preferred, MIT kept. Zenodo software DOI deferred; notes 1–5 for the PI. |
| D5 | README | done: (b) | `6742bca` | With the site's AI-assistance notice. |
| D6 | Provenance comments | done: (b) | `6742bca` | |
| D7 | CI and deploy | done: (b); (c) declined | `6742bca` | Single multi-page build not wanted now. |
| D8 | Refactor of the live build | done: (b) | PR #1, #2 | Behind the equivalence gate, normal deploys, no preview deployments. |
| D9 | Data URLs | done: (a) | — | No data moved. The superseded Mars first build was deleted from R2 on 14 October 2026 at the PI's request. |
| D10 | Test data in CI | done: (a) | `6742bca` | Synthetic fixtures; a real-data fixture not added. |
| D11 | Scope | done: (b) | PR #1, #2 | Phases 1–3; Phase 4 later. |
| D12 | Earth-radius literals | done: (a) | `6742bca`, PR #1 | Named, values unchanged. |

## Deployment of the features (phase C)

| PR | merged as | CI run on `main` | live checks |
|---|---|---|---|
| #3 | `59fa7e1` | 38614981047 (fixtures, app, pipeline, deploy: success) | 164 deployed files byte-identical to a local build of `59fa7e1`; Mars smoke test 34/34; `/`, `/mars/` and both favicons 200 |
| #4 | `95c52e9` | 38617790468 (success) | the same checks: 164 files identical, Mars smoke 34/34, pages 200 |

Equivalence of each build with the `main` before the features (`fbccff1`, `tools/checks/equivalence.sh`): on both
atlases the registry, every data URL, the per-cell data requests and the hashes of every per-cell download
(NetCDF, CSV bundle) are identical; the differences are the intended ones (info popovers: Concept links and the
shared map-field citation; help and tour text; the slider and dataset info; in the cell-panel DOM the
other-dataset line and the Get the whole grid guide).

Not checked in a browser (none runs in the development sandbox): the search box, the Concepts panel, the
Start tour bubble, the step highlight, the region popover and box drawing on the globe and the flat map, and
the other-dataset line. They are covered by DOM tests (happy-dom), geometry tests and, for the region
NetCDF, an xarray read-back of fixture exports (`npm run check-region`).

## Decisions after the browser check (PR #6)

| decision | done |
|---|---|
| Mars named search enabled (Earth stays disabled) | `registry/mars/places.yaml`: IAU Gazetteer features whose official-diameter circle contains ≥ 10 km² of mapped dunes (from `mars-dune-features-draft.csv`), line1 = the label (craters "<name> crater"), feature type, aliases (Bagnold Dunes, north polar erg, Nili Patera dune field), lon east-positive 0–360°, radius = diameter/2 limited to 25–600 km, sources = the Gazetteer and the feature page. Every centre, diameter and approval status checked against the Gazetteer's `MARS_nomenclature_center_pts` (all within 0.005°, all "Adopted by IAU"); every feature has a dune cell of the atlas within its radius (or 90 km). Results show name and feature type, ranked by match, then mapped dune area. Mars naming note in the dune layer's ⓘ; Earth's stays hidden |
| Share and export tour step | highlights the share, camera and region-download buttons; the text names the region download (both atlases) |
| DATA_LICENSE note 1: ERA5 and ERA5-Land CC BY 4.0 | registry credits, layer licences, citation Data entries (with DOIs), About source lines, image-export wind lines, downloads (field licence, references; region NetCDF also carries the Copernicus notice); pipeline constants for future builds. Store attributes already on the data server unchanged (write-once) |
| note 2: dune map MIT | map attribution "Dune map: Gunn (2026), MIT" (both datasets) and the map-export credit line |
| note 3: aridity | no change |
| note 4: derived Mars elevation | "Derived elevation and relief tiles: CC BY-SA 3.0 IGO." in the elevation and relief-basemap ⓘ, About and per-cell downloads |
| note 5: Mars dune polygons | "MGD3 polygons: public domain (U.S. Geological Survey)"; Fenton (2020) listed as a source without a licence statement (pending the author's confirmation) |

## Dune-field name labels and the Mars longitude convention (PR #7)

| decision | done |
|---|---|
| 'Show names' labels | symbol layer from the place list (Mars; Earth hidden while its list is disabled), default off, remembered per body, in both link forms; label from 48 px feature size, 10–14 px italic text, priority by size; pale sand / dark brown by the basemap `tone` (new registry field); above data, below the selected-cell highlight and the basemap labels; label click (or search pick) zooms and opens a popup; in map exports with a source line |
| Earth preparation | fixture list with Arabic, Persian, Urdu, Chinese, Cyrillic and Tibetan names: RTL text plugin bundled and lazily registered, CJK via `localIdeographFontFamily`, Tibetan (complex shaping) in the popup only |
| Mars longitudes −180° to 180° everywhere | place list, search echo (0–360° E input converted, e.g. 354.80 → −5.20), region bounds and export titles, help text |

## Earth dune-field names and the naming notes (PR #8)

| decision | done |
|---|---|
| Earth named search and labels enabled | `registry/earth/places.yaml` generated from the approved table (274 fields, 83 with line 2) by `scripts/places/build_earth_places.py`; aliases, alternative names (with notes in the popup; Great Sand Dunes: Ute, Jicarilla Apache and Navajo (Diné) names), sub-units ('Includes', resolving to the parent) and countries searchable; review columns not shipped (one internal holding note removed from a reference) |
| Label priority | size = geometric mean of radius and the radius of the mapped dune area: Rub' al Khali, Kalahari and Taklamakan first |
| Scripts | Arabic, Persian, Urdu and Pashto (RTL plugin), Chinese (local CJK glyphs), Cyrillic on the labels; Thar's Hindi (Devanagari, complex shaping) in the popup only |
| Naming notes (verbatim) | Earth and Mars notes in the dune layer's ⓘ, beside 'Show names', in About ('Dune-field names') and under the search results ('About these names'); e-mail address and Gazetteer as links; excluded from the text sweep |

## CI speed-ups (PR #9)

| item | done |
|---|---|
| Fixture caches | Earth and Mars synthetic stores (about 150 MB each, so not committed) in separate jobs and caches, keyed by `scripts/ci/fixture_key.py` (generator, every repository module it imports, the registry files it reads, `pipeline/pyproject.toml`, Python version); built only on a miss; `push` runs on `main` only, so the `main` caches serve every pull request. No restore-keys fallback: a store from another key would be another generator's output |
| Path rules | `scripts/ci/changes.sh`: `app`, `pipeline`, and the repository text check (`text`) for changes neither covers; `gate` (always runs, passes when every job that ran passed) is the only required check; `deploy` on `main` after the gate when the app job built the site |
| Local checks | CONTRIBUTING: targeted checks of the changed area before a pull request; CI is the full gate; `scripts/test-ci.sh` only for build or CI changes |

Run times (wall clock, first job start to last job end): before, normal runs about 4 min and fixture cache
misses 9–14 min (fixtures 9.3–13.9 min alone). PR #9 (workflow change, every job, new keys): first run 11.3
min (cache miss; fixtures in parallel: Earth 7.5, Mars 3.3 min), second run 3.2 min (cache hit: fixtures
0.1 min, app 2.1, pipeline 2.9); `main` after the merge (run 38650814140) 10.1 min (one rebuild in the
`main` scope: Earth 5.9, Mars 4.2 min in parallel; app 3.3, pipeline 3.6, deploy 0.2).

## Names clean-up and label tweaks (15 October 2026)

| item | done |
|---|---|
| Earth naming rules | Line 1: one name in Latin script, no brackets (moved names become other names); an official dual name where one exists, else the name most used for the dunes; at most one landform word (local words such as Erg, Rig, Nafud, Peski, Els count); no place qualifier except to tell apart two fields of the same name; hyphens in joined names, Persian names as "Rig-e Name"; Kazakh names romanised (BGN/PCGN) on line 1 with the Cyrillic on line 2. Line 2: the non-Latin form only. Tottori Sand Dunes: 鳥取砂丘 (Japanese) |
| Earth list | 303 fields: the 29 dropped as small (with mapped dunes) re-added; the fields with no mapped dunes in reach stay out. GSC spelling "Chilsholm" shown as Chisholm Sand Hills |
| Mars names | Undae keep their IAU names; other features "<IAU name> Dune Field" (craters "<Name> Crater Dune Field"); naming note updated |
| Other names | The popup and search results leave out names that differ from the name (or from one already listed) only in a generic landform or descriptor word, case, accents, punctuation or spacing; search still finds them |
| No estimated numbers | The popup no longer shows a "Mapped dune area" (Earth radii are framing estimates, not measurements); help texts no longer say that larger fields are named first. The radius only sets the search zoom and, with the stored area, the label order |
| Labels and panel | One label size (15 px), every name a candidate at every zoom, collisions resolved on screen; layer panel 360 px with aligned tick boxes |
| Local preview | `vite.config.ts`: `/r2` proxy to the data server and, with `PREVIEW_MARS_ORIGIN`, `/mars/` forwarded to the Mars dev server, so one local address serves both atlases (dev only) |

## Second batch (15 October 2026)

| item | done |
|---|---|
| Help and Tour bubble | Shown on every page load until the first click (nothing remembered); text "Help and Tour"; the first-visit tour is unchanged |
| Dune Fields group | Group "Dune Fields" with layer rows "Mask" (layer title "Dune-field mask" where there is no group heading) and "Names" (a layer-style row; its ⓘ wraps like the others); optional `shortTitle` in the layer schema |
| Display controls | Gap restored between side-by-side controls |
| Links | 505 links checked from GitHub's runners (doi.org registration for DOIs); hand check by the PI's browser agent; fixes: OpenPlanetaryMap page moved, K'gari (UNESCO 630), Selima (no www), Ghard Abu Muharik (PI's replacement), Sinai-Negev (DOI of Roskin et al. 2011; inlowgear target), Horqin (unsupported Baidu page removed), Mallee (Pell et al. 2001), Akchar (Kocurek et al. 1991), Hunshandake (Yang et al. 2013); Warren Dunes removed (its only source did not name it) |
| Iran | From Abbasi et al. (2019, Aeolian Research; locations read from its Fig. 1), DESERT (2025) and Iran Nature (2021): 6 new fields (Rig-e Chah Jam, Hasanabad, Gonabad, Nog, Bahabad, Shor Gaz), sources added to 16, centres of Seh Qaleh Sarayan and Boshruyeh moved to the paper's fields, Rig-e Boshruyeh and Rig-e Zirkuh renamed; Persian forms read from a low-resolution legend left out until checked. Earth list: 308 fields |
| Page translation (P1) | translate="no" on formulas, info buttons, acronyms and symbols, product and provider names, licences, citations and reference lists; tests fail on any unprotected term. Curated French and Chinese (option 2 of translation-plan.md) parked until after this release; reviewers: the PI's PhD students |
| Link previews | Open Graph and Twitter card tags on both atlases: one title ("Dune Atlas · Earth & Mars"), text and 1200 × 630 image (public/og-image.png) |
| Usage | Cloudflare Web Analytics snippet (production builds only, "spa": false); About privacy line (approved wording, "kept" for the site's text rule); download counter built in workers/usage (not deployed; docs/guide/usage-counter.md); the app sends nothing until VITE_USAGE_URL is set |

## Usage counter and dashboard (PRs #14–#17, 15 October 2026)

| item | done |
|---|---|
| Counter | Worker `dune-atlas-usage` at api.geomorphlab.org (own domain, so ad blockers that block workers.dev do not stop it): `/v1/n` receives download and copy events; a nightly run (03:17 UTC) collects the three previous days of Cloudflare figures (data host requests and bytes by country, zone-wide unique visitors, Web Analytics visits by country) into D1. Deployed by the PI with `npx wrangler deploy` (CI does not deploy Workers) |
| Dashboard | Private page `/dashboard?key=<CSV key>`: totals, visits per day by planet, downloads by kind, and "By country" (Visits / Downloads / Data served) as a world map with a colour bar and the top 15 as bars; its own bar-chart icon (PR #17), distinct from the atlas's lab icon |
| Data start | Web Analytics visits from 15 October 2026 (the tag went live at 06:01 UTC); data-host figures back-filled from 12 October |
| Decisions | Defaults of the analytics proposal (one Worker, D1, zone-wide unique visitors); privacy line in About as approved; Cloudflare API token valid one year (renewal reminder October 2027, steps in docs/guide/usage-counter.md) |

## Flux rose, DP comparison and labels (PR #18, 15 October 2026)

| item | done |
|---|---|
| Petal switch | "Petals: toward / from" on the sand-flux rose (both atlases); drawing only (each petal turned 180°), nothing recalculated; the arrows (RDD, αT, αE, αO, αH) stay toward, as in Fryberger & Dean; bearings, map, modes plot and downloads stay toward; heading, caption and exported figure follow the switch; remembered per atlas |
| DP comparison | Concepts, "Drift potential (DP)" (Earth only): atlas DP and Fryberger DP for a steady wind against U₁₀ (m/s and knots), with their ratio below (log axis); own threshold slider with "map value"; readout with fixed-width values |
| Labels | Dune-field names white (was cream) on dark basemaps, outline 2.5 px, for legibility over the yellow ends of the colour maps |
| Wording | Help and Concepts sentences on the switch approved by the PI |

## Mainland China test and blocked basemaps (PR #19, 15 October 2026)

| item | done |
|---|---|
| China test | Tested by a colleague's contact in mainland China: site, data, cell panel and default basemaps load without a VPN (5–10 s to the first map); OpenTopoMap and OpenPlanetaryMap do not; HiRISE taken as working (same Esri server as the Mars basemaps that loaded) |
| Basemap notice | A closable notice when 4 tiles of the chosen basemap fail with none loaded (or its style file fails): "could not be loaded from its provider … choose another basemap"; no location detection |
| Blank-globe fix | The map redraws on every tile error (MapLibre issue #8716): switching away from a blocked basemap no longer leaves a blank globe |

## French and Simplified Chinese (PRs #20–#21, 15–16 October 2026)

| item | done |
|---|---|
| Switch | EN / FR / 中文 as its own column of square buttons below the planet button (PI's choice); reloads in the same view with `?lang=`; remembered for both atlases; never automatic; `<html lang>` set; Chinese pages use the system's CJK fonts |
| Scope | First option 2 (interface, help, tour, layer names, legends, basemaps, Concepts; PR #20), then everything on screen (PI's decision; PR #21): popovers, About, cell panel, tool panels, messages, tooltips and screen-reader labels, exported image text. Downloads, required credit lines and references stay English |
| Mechanism | Keyed strings (`tr`, `t`) plus rendered text translated on the page (`src/i18n/dom.ts`: units with formulas, names, live numbers, controls and numbers as markers, looked up by the fingerprint of the English). A translation is shown only for the exact English it was made from |
| Translations | Machine-drafted with the glossary, then a review pass for meaning and terminology (French: "calque" for map layers, "altitude", "commande"; Chinese: 临界摩阻风速, 临界值, 去向/来向); every string checked for formulas, markers, tags and protected terms. Awaiting review by the PI's PhD students (one French, one Chinese) in Word documents |
| Maintenance | English edits: `npm run i18n` collects new text and the new strings are drafted in the same working session before release; otherwise the English is shown until then (CI warns, never blocks). docs/guide/translations.md |

## Dune-field sources, Fenton licence, usage backup (PR #23, 16 October 2026)

| item | done |
|---|---|
| Name sources | The 25 names whose only source was a tourism, list or blog page: sources searched in papers (each DOI checked on CrossRef: title, authors, year, journal), Wikipedia/Wikidata and official sites. PI's decision: replace the old source, except for Bilbunya Dunes, Kharan Desert and Apure-Capanaparo Dune Field (no paper found; the old source is kept after the new one). 22 names now cite at least one paper. Weaker matches the PI may revisit: Ica Dunes (Newell & Boyd 1955, "Ica desert"), Erg Makteïr and Erg Ouarane (Camps 1985, Encyclopédie berbère entry), Trarza Erg (Nouaceur 2013, Nouakchott), Elsen Tasarkhai (two forestry studies) |
| Fenton (2020) licence | L. K. Fenton agreed by email (October 2026) to CC BY 4.0, with a citation of Fenton (2020). Shown as "MGD3 polygons: public domain (U.S. Geological Survey); Fenton (2020) dune fields: CC BY 4.0" in the layer info and About, and as the licence of the Fenton entry in the cell citations (DATA_LICENSE.md note 5) |
| Usage backup | Private repository geomorphlab/dune-atlas-usage, weekly (Mondays 04:41 UTC); first run 15 October 2026 succeeded (docs/guide/usage-counter.md §5) |

## Chinese review and icons in help text (PR #24, 16 October 2026)

| item | done |
|---|---|
| Chinese review | 36 rows from the PI's Chinese PhD student (spreadsheet DuneAtlas-CN-YL.xlsx), trusted as given: 25 strings replaced, and the corrected terms carried into 86 more strings: 阴影地形 (shaded relief), 拼接图 (mosaic), 扇区 (rose petals), 摩阻风速 (friction velocity), 风成沙丘 (aeolian dune), 床面失稳 (bed instability, incl. 床面失稳模式), 输沙通量汇／源 (flux convergence / divergence), 稳态风 (steady wind), 再分析数据集 (reanalysis), 模型 for a climate or land-surface model (模式 kept for dune-orientation modes), 轨道卫星 (orbiter), 沙丘朝向 (how dunes orient), 时间段 (hours), 合成输沙势 for RDP. Two readings kept the English content: "Petals:" as 扇区： (label colon) and "Shaded relief (Mapterhorn, 2D)" as 阴影地形（Mapterhorn，2D）. Glossary updated (docs/translations/translation-glossary.csv) |
| Icons in text | Tia's accessibility comment: the help panel and tour show the buttons' own icons instead of naming them ("mortarboard", "crosshair", "(?)", "a dashed box"), written {icon_concepts}, {icon_help}, {icon_share}, {icon_camera}, {icon_region}, {icon_planet}, {icon_centre} in the English and the translations (ui/texticons.ts); each icon is an image labelled with the button's name for screen readers; the help document writes them as [Concepts icon] etc. French and Chinese updated to match |
| Compass points in the cell panel | Directions such as "RDD …: 112° (ESE)" were translated only when that exact direction had been collected as an example. The compass point is now a variable like the number (one translation per line, i18n COMPASS_NAMES), shown in the reader's language. Names chosen by the PI: Chinese 北, 北东北, 东北, 东北东, 东, 东南东, 东南, 南东南, 南, 南西南, 西南, 西南西, 西, 西北西, 西北, 北西北; French N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSO, SO, OSO, O, ONO, NO, NNO. Exported files keep the English points |

## Opening state and remembered settings (16 October 2026)

| item | done |
|---|---|
| What a returning visitor keeps | PI's choice "Language only": a new visit opens exactly like a first visit (default view, its dataset, default panel layout). Kept between visits (localStorage): the language and the tour flag. Kept for the visit only (sessionStorage of the tab, so through reloads and planet switches): wind dataset, 'Show names', plotted quantity, petal direction, open / closed panel sections and groups, cell-panel size, each atlas's last view (planet button). Settings earlier versions kept in localStorage are removed on load (core/visit.ts) |
| Panel layout | Same rule in both panels and both atlases: layer groups as in the registry (Dune Fields, Bedform orientation, Drift potential, Related data open; Crest-normal/parallel fluxes, Ratios & morphology indices, Wind statistics folded), Active layers open, Display and About folded; cell panel: every section open, table groups folded as the layer groups. The layer panel's groups are now kept for the visit like the cell panel's (before: never remembered); layout keys shared by both atlases |
| Planet button | carries the language (`lang=`), so a page opened from a `?lang=` link stays in that language on the other planet |

## Downloads and dataset-agnostic wording (16 October 2026)

| item | done |
|---|---|
| Download audit | every download of the five wind datasets checked against the live stores: values exact; licence, notice, bounds, coverage, MACDA sampling and consistency fixes (docs/records/download-and-wording-audit-2026-10.md) |
| PI decisions | Concepts "The wind datasets" and "for each time step"; GitHub description and topics updated; JRA-3Q-derived products CC BY-NC-SA 4.0; JRA-3Q drawn on a fitted regular grid with exact latitudes in the files |
| Dataset wording | generic text names no dataset: registry `info.kind`, `info.note`, `info.landShort`, `credits.mapNotice`; Mars texts by time step / sample; French and Chinese for the 17 changed strings (to be reviewed with the student reviews) |

## Open items (16 October 2026)

| item | who | status |
|---|---|---|
| Licence of the Fenton (2020) Mars dune polygons | PI asked Lori Fenton | done: CC BY 4.0 (PR #23) |
| Persian names of the six new Iran fields | PI's Iranian colleague | pending; names not shown until confirmed |
| Student review of the French text (incl. "potentiel de dérive" vs "potentiel de transport", "barkhane" vs "barchane") | Tia via the PI | done: review of 16 October text received 21 October and applied (section below); glossary terms kept ("potentiel de dérive", "barkhane"); text added since 16 October is machine-drafted only |
| Student review of the Chinese text | Chinese PhD student via the PI | first corrections applied (PR #24); compass names chosen by the PI (PR #24) |
| Second check from mainland China (language switch, Chinese text, a cell download, a map image export) | PI's colleague | after release |
| Weak aggregator sources for a few dune-field names | agent | done: 25 names re-sourced (PR #23); five weaker matches listed above |
| Weekly backup of usage.csv to GitHub | PI | done (PR #23 records it) |
| Dataset comparison tab in the Earth cell panel (DP, RDD, RDP/DP of the other wind datasets at the same place; replaces the lines removed from above the wind rose on 17 October) | PI, agent | open |

## Opacity sliders and the opening view (PI request, 22 October 2026)

| Request | Change |
|---|---|
| Every opacity slider goes from fully transparent to fully opaque | The dune map's fill multiplied the slider by its style opacity (0.55), so the top of its slider drew at 55 %. The slider value is now the drawn opacity for the vector layers (dune map and its invert view); the style opacity was removed from the registry and the pipeline writer, and the dune map's default opacity is 0.55 (the previous look). Raster fields already drew at the slider value; RDD arrows keep their magnitude shading (0.35–1 × slider) |
| Dune names on at arrival | Both opening views have 'Show names' on |
| Shaded relief basemap at arrival, both planets | Earth opens on the Mapterhorn shaded relief (now the registry default basemap); Mars already opened on the MOLA–HRSC shaded relief |
| Opening link | Earth `#v=AUXirhW4wRLgAgIDDgMJVSACATcAB1UA` (was `AQXirhW4wRLgAgIBDgMJVSACAWQAB1UA`). Older share links that set the dune map to 100 % now draw it fully opaque (before: 55 %) |

## Mars Climate Database as a fourth Mars wind dataset (21 October 2026)

The MCD team (E. Millour, LMD) agreed to MCD-derived map layers, the cell panel and per-cell downloads including the wind series, with Forget et al. (1999) and Millour et al. (2018) cited, the MCD website linked and the MCD version stated. Record: docs/records/validation-mars-mcd.md.

| Item | Decision |
|---|---|
| Version | MCD 6.1 (installed and verified on Gadi), not 6.2 as named in the email to the MCD team: PI's choice; every text names 6.1 |
| Scenario and state | Climatology with average solar EUV (scenario 1), mean state: no day-to-day variability, so the sand fluxes are lower bounds (said in the dataset ⓘ, About, layer information and downloads) |
| Wind height | The lowest model level (about 4.5 m), u* from the Pähtz & Durán (2023) profile at each sample's height, as for FV3, EMARS and MACDA (PI's choice; the MCD team had no recommendation) |
| Time sampling | Every two Mars hours through one climatological year (8,023 samples, as MACDA), the MCD interpolating between its monthly means (PI's choice) |
| Grid | The native MCD nodes as cell centres, without the pole rows (47 × 64 cells of 5.625° × 3.75°; no cells poleward of ±88.125°); GCM-resolution fields (hireskey 0) |
| Air density | ρ = p/(R T) with the atlas constant R, as for the other datasets; MCD's own density (composition-dependent R) differs by a median of 0.4 %, up to 15 % at the polar rows in winter |
| Dataset id | `mcd-v61-clim` (registry ids allow only lower-case letters, digits and hyphens) |
| Licence | MCD terms (scientific use with citation, no commercial use without authorisation, no warranty); DATA_LICENSE.md note 10 |

## French review by Tia (21 October 2026)

Word document `Dune-Atlas-French-review_AK.docx`, built from `docs/translations/fr.md` at c437592 (16 October); 611 rows, 67 edited, no tracked changes.

| Item | Decision |
|---|---|
| Edits applied | 67 edited rows covering 88 keys: 68 applied as written; 20 whose English has changed since 16 October merged into the current text (14 automatically, 6 by hand); 12 rows of strings no longer used carried over to the strings that replaced them |
| Corrections to the edits | Spelling and agreement ("dépendent", "Se met", "6e", "qu'il a imagées", "impliquent une érosion"); "pas nécessairement" kept in the Mars concept (the English says "not necessarily"); region help "ne peut dépasser ce que votre navigateur…" (the suggested wording reversed the meaning); layers help says the Dunes only filter keeps the cells of the wind dataset that contain dunes, and keeps "calques"; "mer de sable du Namib" in the tour, while the search example keeps "Namib Sand Sea" because search matches English names |
| Consistency passes over all French text | "sable mobile" (not "meuble"); "Dunes seules" (her suggestion) for the switch and every mention of it; "par exemple" everywhere instead of "p. ex."; typographic apostrophe ’ throughout; units m²/an and m/ka in labels, legends and help |
| Kept as before | Acronyms DP, RDP, RDD, as in the formulas (PI to decide whether to translate them; Tia offered to do the rest); spaced " ;" before semicolons; "copies plus grossières" (coarser resolution) |
| Not changed | Numbers in the cell panel and in downloads keep m²/yr and m/kyr (live values and UDUNITS file attributes) |
| Suggestions for the English (open) | Mars search example: a longitude other than 354.8 (hard to read for dyslexic readers; Tia suggests −5.2); state the MOLA resolution in the Mars basemaps help; passages she highlighted without comment (Petals sentence in the cell help, "1.5 times its on-screen width" in the images help, the coordinate rules in the search help) |

## PI preview of 17 October (branch features/reanalysis: MERRA-2, JRA-3Q, icon, Dunes only)

| Report | Finding | Change |
|---|---|---|
| Wind dataset selector, MERRA-2 rectangular cells | As intended. | None. |
| Dunes only capped the dune map's opacity slider at 50 % | The cap kept the top of the slider below full opacity while Dunes only was on. | No cap: switching Dunes only on sets the dune map's slider to 50 % once; the slider then works as usual, its top fully opaque (Earth and Mars alike). Dunes only ⓘ and Help say so. |
| Text above the wind rose (threshold, wind at 10 m, the other datasets' DP/RDD/RDP/DP) | Repeated the threshold shown in the bar above and wrapped badly. | Removed from the Earth cell panel (the dune badge stays); a dataset comparison tab is an open item. The Mars panel keeps its lines (its bar shows the grain size, not u*,th). |
| Tab icon not shown in the preview | Browsers keep tab icons by address; the preview tab had cached the old one. | Icon links carry `?v=2` (raise it with every new icon; `docs/guide/icon.md`). |
| Polar modes plot: red line not smooth near the rim | A mode that turns fast between two thresholds was drawn with 8 straight pieces per step (here αT turns 77° between u*,th = 0.60 and 0.61 m/s). | Each step is sampled so that no straight piece turns by more than 1.5°. |

## PI preview of 16 October (branch features/visit-defaults)

| Report | Finding | Change |
|---|---|---|
| Wind dataset ⓘ: text box wrap | The popover was 100 % of the line wide plus its left indent, padding and border, so it ran past the right edge of the panel. | `.dataset-line > .info-popover` may shrink (`flex: 1 1 100%; min-width: 0; box-sizing: border-box`). |
| Selector tooltip "what is this?" | The hover text of the Wind dataset menu options (name, grid, period and land rule of each dataset). | None. |
| Site-wide tone | Review of all public English (staging/language-review/language-review.csv, 47 rows): advice on use ("treat as uncertain", "use as a guide", "do not apply"), judgements of datasets and methods ("not an independent estimate", "poorly defined", "approximation"), repetition and jargon. | All 47 applied: app texts, registry, pipeline definitions (fields.py, vegetation.py, mars/sidecars.py, then the registry fragments regenerated), Concepts. About heading "Earth and Mars: methods and data". The Mars grain-diameter ⓘ says "for each time step" (MACDA: every two Mars hours). |
| ERA5 ocean cell mentions ERA5-Land | The non-land message named the other datasets. | Each dataset's message names only its own land rule. |
| Download comment "This page was created …" | Downloads carried the notice written for the web page. | Downloads (NetCDF `comment`, README.txt, metadata.json `ai_notice`, region files) carry a file notice: produced by, and downloaded from, the Dune Atlas website (map.geomorphlab.org or /mars); the website and the code that produced the file were created with assistance from Claude AI. The page keeps its own notice. |
| MACDA south pole at the antimeridian | Not a rendering fault: in the MACDA data the column of cells centred on 180° has lower lowest-level winds than its neighbours near the south pole (MY30 cell store at 82.5° S: mean speed 12.2 m/s against 15.7 and 16.0 m/s either side; at 87.5° S 10.7 against 13.1 and 13.4 m/s). The same column is low in the ARCO-MACDA source arrays (three 10-sol chunks checked), and the pipeline only rolls MACDA columns, without interpolation. FV3 and EMARS are smooth across 180°. | None to the data; the PI decides whether the MACDA source text should say so. |
| Ring of a polar cell drawn at 85° | The ring is a circle layer, drawn from Web Mercator tiles, which end at 85.05°. | On the globe the ring of a cell poleward of 85° is a screen-space marker at the true cell centre (hidden on the far side of the globe, fading with zoom like the circle layer); the flat map is unchanged. |
| Region export stuck at "90 of 93" (FV3, over the antimeridian near 75° S) | Not reproduced outside the browser (the same box, 3 × 31 cells, with and without wind, 12 requests at a time, completes). A request that never returns left the export waiting, and Cancel only acted between cells. | Each cell may take at most 45 s; it is read again up to 3 times in all, then the export stops with a message naming the cell. Cancel acts at once. |

Tia's notes on the Help text (16 October):
- "The line under the box shows how the text was read" now reads "While you type coordinates, the line under the box shows the position they were read as ("Go to …")". The "Go to" of that line is now translated (Aller à, 前往).
- The Petals switch exists (flux-rose section, under "% of total / m²/yr": "Petals: toward / from"); Help now names it as "Petals: toward / from".
- Map image width: the code asks for 1.5 × the on-screen map width, kept within 1600–2400 px, and tags the PNG 300 dpi. Under check: the pixel sizes Tia got.

French and Chinese: the 47 changed entries and the new "Go to" key were machine-drafted with the glossary (npm run i18n: 0 untranslated, 0 stale). They are not yet reviewed by Tia or YL.
