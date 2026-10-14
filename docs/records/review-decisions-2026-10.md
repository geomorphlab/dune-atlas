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
| L8 | Dunes only should show the data; 0.25° mask footprint | partly done | `d247c65` | Dune map drawn as outlines with Dunes only. Footprint comparison deferred. |
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
