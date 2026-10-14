# Mars Dune Atlas — integration validation and status (2026-10-14)

Branch `mars` of the Mars checkout (`dune-atlas-mars`), not pushed, not merged into `main`. Nothing is
uploaded and nothing is deployed; the live Earth site is untouched. This report covers the integration of
the three build tracks and the Earth sync. The component reports are:

| Component | Report | Summary |
|---|---|---|
| Specification (inputs, physics, constants, stores) | [mars-spec.md](mars-spec.md) | Pähtz & Durán (2023) eqs 5.1 + 3.2 with the Kn correction and two typo corrections; u* from the eq. 2.2 smooth-wall profile at each hour's lowest-level height |
| Wind data (FV3 beta 1 → cells.zarr, 23 fields × 64 grain sizes, cells-aux) | [validation-mars-fields.md](validation-mars-fields.md) | qsat engine equal to the Earth code to 8.6e-12; v0 (log law, z₀ = 1 mm) vs v1 (eq. 2.2) comparison |
| Terrain (MOLA–HRSC hillshade, elevation, dunes) | [validation-mars-terrain.md](validation-mars-terrain.md) | terrarium PMTiles z0–8 read back ≤ 0.5 m; 3,514 dune polygons; 2,749 dune cells |
| App (body switch, Mars UI, basemaps, sync) | [mars-app.md](mars-app.md) | `VITE_BODY=mars` build; Earth dist byte-identical; Esri OnMars basemaps; drift guard |

## 1. Integration

* Track commits (all on `mars`, each track committing only its own paths): Phase 1 physics 6a7480e,
  1f3a77f, 5b92eff; Wind d1ad7ae, 326b9d4, 08990cb, 4296d75, 39b1329, 70e8537; Terrain 465a1cd, 40f3a1b,
  5ebfc90, 278cf07; App e4f1e58, 38046ae, e6c9e74, e0149aa.
* Earth sync: `earth/main` at 704538b (4 Earth commits since the branch point 0a5bb7d: edcbb50, c6a2cd3,
  d527912, 704538b) merged in 91ae0d4 without conflicts. The drift guard flagged 5 modules, reconciled in
  3398820 (details in [mars-app.md §6](mars-app.md)):

| Module | Kind | Earth change | Mars action |
|---|---|---|---|
| `cell/datasetinfo.ts` | substituted | `landThreshold`, `nonLandReason`, `LAND_RULE_ERA5` (edcbb50) | fields set (0, ""), Earth-only constant aliased for the export set |
| `ui/cellPanel.ts` | substituted | non-land message uses the new fields | none (no land mask on Mars); re-recorded |
| `ui/helpText.ts` | substituted | spacing slider Finer / Coarser (704538b) | sentence ported |
| `ui/layerPanel.ts` | patched | ERA5 source line reworded (edcbb50); tooltips (c6a2cd3) | `find` text of the Data sources patch updated; tooltip change shared |
| `map/adapters.ts` | patched | globe arrows/streamlines (d527912) | radius patch still applies; globe sampling uses great-circle degrees and the patched `viewMetersPerPixel` (R_MARS); re-recorded |

  The updated zarr-layer patch from Earth needs `npm ci` after the merge.
* Second sync: `earth/main` b180fef (bottom-left controls as one flex row: scale bar, then cursor
  coordinates; attribution width) merged in 1897a2a. Only `style.css` and a test changed; no recorded
  module changed. The Mars scale bar (`BodyScaleControl`) carries the same `maplibregl-ctrl-scale` class and
  the shared `CoordsControl` the `atlas-coords` class, so the new layout applies to Mars unchanged. After the
  merge: Earth 458 passed, Earth dist byte-identical, Mars 46/46, devroot store 2/2, registries OK,
  `build:mars` OK, smoke 31/31.
* The lowest-level height text now reads z ≈ 1.6–3 m (dune cells, v1 store: p1/p50/p99 =
  1.60/1.69/2.98 m), replacing 1.6–2.4 m in the Data sources text, `WIND_HEIGHT_TEXT` and the spec.

## 2. Test matrix (after the first merge, 3398820; repeated after 1897a2a with the same results, Earth 458 passed)

| Check | Result |
|---|---|
| Earth `npx vitest run` | 457 passed, 21 skipped, 0 failed (the 2 earlier `era5.test.ts` failures are fixed upstream in edcbb50) |
| Earth `vite build` vs a pure `earth/main` build (`git archive`) | `diff -r` empty (byte-identical, 6.7 MB) |
| Mars `npm run test:mars` | 7 files, 46 passed (incl. drift guard, patch applicability, export set, Esri failure handling) |
| Mars cell store on the devroot store (`MARS_STORE_ROOT`) and on the fixture | 2/2 each |
| `tsc` (app + node configs) | clean |
| `validate-registry`, `validate-registry:mars` | OK |
| `build:mars` | OK |
| Pipeline `pytest` (`DUNE_ATLAS_DRIFT` = Earth `qsat_drift.zarr`) | 102 passed, 34 skipped |
| Drift guard `reconcile.mjs --check` | all 27 recorded modules match (recorded at 91ae0d4) |

## 3. Local preview (headless)

`scripts/mars/app/preview_smoke.mjs` fetches what the app fetches: every registry source (26 Zarr field and
store sources, including levels and chunk presence), `cells.zarr` and `cells-aux.zarr` metadata, a byte-range
read, both PMTiles archives (header plus the Nili Patera tile at every zoom) and, in HTTP mode, the built
Mars app and its assets. Run against `staging/mars/devroot` in file mode (the sandbox forbids local
sockets): 31 checks, 0 failures. `cells.zarr` attrs: series `u, v, T, rho, z`, u* by eq. 2.2. Dune PMTiles
z0–10 (MVT); hillshade z0–5 in the dev subset (z0–8 on Gadi; the app clamps to the archive's maxzoom and
overzooms).

The rendered cell panel from the devroot store (Nili Patera, 9° N 67° E, d = 199 µm: median u*,th =
0.350 m/s, DP = 1.45 m²/yr) is in the App report.

**Not yet done: the browser check.** No browser runs in the sandbox. On a desktop:

```
python scripts/serve_data.py staging/mars/devroot --port 8787
cd app && VITE_DATA_BASE=http://127.0.0.1:8787 npm run dev:mars          # interactive
node scripts/mars/app/preview_smoke.mjs --data http://127.0.0.1:8787     # HTTP mode incl. CORS
node scripts/mars/app/screenshots.mjs                                     # screenshots
```

Look at: every basemap incl. the four Esri ones (HiRISE gaps show the background), the grain-size slider
(maps and panel update), the cell panel and its downloads, PNG export with an Esri basemap, the tour, and
the console (no errors besides the browser's CORS lines for HiRISE 404 tiles).

## 4. R2 upload (done 2026-10-14, create-only)

Bucket `dune-atlas-data`, prefix `dune-atlas/mars/v1/`, served at `https://data.geomorphlab.org/dune-atlas/mars/v1/`.
Every object was written with `If-None-Match: *` (no overwrite possible) after a live listing of all of
`dune-atlas/` showed no collision; ledgers in `staging/mars/r2/uploaded-new-*.json` (gitignored).

| Store | Objects | Bytes | Source of the upload |
|---|---:|---:|---|
| `datasets/fv3-beta1/cells.zarr` (eq. 2.2, d node 29 = 200 µm) | 155 | 1,949,642,890 | Gadi, 10 tars ≤ 200 MB, md5 per tar |
| `datasets/fv3-beta1/fields/` (25 pyramids) | 273 | 48,946,490 | local devroot, md5-identical to Gadi |
| `datasets/fv3-beta1/cells-aux.zarr` | 88 | 4,557,124 | local devroot, md5-identical to Gadi |
| `fields/elevation.zarr` | 97 | 366,592,415 | local devroot, md5-identical to Gadi |
| `basemaps/hrsc-mola-terrarium.pmtiles` (z0–8) | 1 | 4,947,184,858 | Gadi, 24 parts, reassembled, whole-file md5 4331eb50… |
| `basemaps/hrsc-mola-polar/` (globe cap DEM textures + index.json) | 11 | 15,335,075 | local devroot, md5-identical to Gadi |
| `dunes/{dunes,invert}.pmtiles`, `dunes/polar-caps.json` | 3 | 21,578,242 | local devroot (Terrain round 2) |
| **Total** | **628** | **7,353,837,094** | |

Verification: the listing of the prefix equals the planned set (628 keys, nothing missing or extra); every
object's ETag equals the md5 of its source (no multipart objects). Delivery through `data.geomorphlab.org`
(`preview_smoke.mjs --data https://data.geomorphlab.org --origin http://localhost:5173`): 31/31 checks,
byte ranges answered 206, CORS allows the local dev origin.

**Cloudflare and the 4.95 GB hillshade archive** (see §7 for the rule order). Objects above the Cloudflare cache size limit are not
cached (`cf-cache-status: BYPASS`). The very first range request for the archive was answered `200` with
the whole object instead of `206`; every later request (8 ranges, start/middle/end) was `206`. A PMTiles
reader rejects a `200`, so a visitor through an edge location that has not seen the file yet could fail to
load the hillshade once. Fix (owner, Cloudflare dashboard): a Cache Rule for `data.geomorphlab.org` with URI
path equal to `/dune-atlas/mars/v1/basemaps/hrsc-mola-terrarium.pmtiles` set to **Bypass cache**, placed
AFTER (below) the existing "Eligible for cache" rule (the last matching rule wins), so that range requests always go straight to R2.

## 5. Open items

1. Desktop browser check of the merged UI (§3; with `VITE_DATA_BASE=https://data.geomorphlab.org` every
   cell now has its hourly series).
2. Cloudflare bypass rule for the hillshade archive (§4).
3. Geology map layer (deferred).
4. Further wind datasets (Mars Climate Database, OpenMARS, EMARS): the Wind dataset selector is shown
   with one dataset (MCMC FV3) and takes more entries.
5. HiRISE has no imagery poleward of ±65.24° (Esri source; documented in mars-app.md §5a and the
   basemap ⓘ).
6. The Gadi terrarium PMTiles internal metadata says "HRSC-MOLA" (built before the naming decision; the
   uploaded object is immutable; not shown in the app).
7. Repeat the Earth sync (mars-app.md §6) immediately before the merge into `main`.

## 6. Notes

* The Mars content is kept in Mars-only documents (this file, mars-spec.md, mars-app.md and the two
  component reports) rather than in sections of the shared Earth documents (STATUS.md, sources.md,
  storage-layout.md). Those files change on `earth/main`, and Mars sections in them would conflict at
  every sync. Pointers can be added at the merge into `main`.

## 7. Before merge and go-live (checklist, status 2026-10-14)

Deployment: `.github/workflows/deploy.yml` (on the `mars` branch) builds Earth at `/` and Mars at `/mars/`
(`VITE_BODY=mars VITE_BASE=/mars/ VITE_DATA_BASE=https://data.geomorphlab.org`), runs both test suites and
both registry validations, and publishes one GitHub Pages site. It runs on pushes to `main` of
`geomorphlab/dune-atlas`. `app/scripts/test-ci.sh` reproduces the CI steps locally (passes at HEAD).

Done (PI decisions 2026-10-14): one UI for both planets (header "Dune Atlas" + grey body name, two-line
subtitle, planet toggle under the camera button, tour step, per-body storage keys); `/mars/` on
`map.geomorphlab.org`; default d = 200 µm; Wind dataset selector and invert layer on Mars; "Related data"
groups; dark basemap removed; info-button structure, texts, licence rows and citation format (audit in
docs/info-text-audit.md); hillshade tiles CC BY-SA 3.0 IGO; Esri licence fields re-read; Gadi paths may
stay public; no caveat about crater-scale winds in About; blank cells at extreme d accepted; polar dune
wedges fixed with polar parts drawn on the globe; globe polar caps for the basemaps; R2 upload verified.

**Live since 2026-10-14** (PI go-ahead): `mars` merged into Earth `main` as 5e0ac44 (no conflicts; no Earth
commits after b180fef); CI gate on a clean export of the merged tree passed (Earth 478 passed / 22 skipped;
Mars 74 passed / 5 skipped; both builds). Published as the squashed `public` commit d018427 (tree equal to
`main`), pushed to `geomorphlab/dune-atlas` `main`; Actions run 38528075599 build + deploy succeeded.
`https://map.geomorphlab.org/` (Dune Atlas) and `https://map.geomorphlab.org/mars/` (Mars Dune Atlas) answer
200; `preview_smoke.mjs --data https://data.geomorphlab.org --preview https://map.geomorphlab.org/mars
--origin https://map.geomorphlab.org`: 33/33. Clean-up list executed (Gadi: live cells.zarr re-verified by
md5 after the deletions; local items moved to the Trash).

Remaining:
1. Cloudflare: the hillshade bypass rule must come AFTER the "Eligible for cache" rule (Cache Rules: the
   last matching rule wins). Test: a range request with a fresh query string must return 206, not 200.
2. Science sanity (PI): at d = 200 µm across dune cells, hourly median u*,th = 0.300 m/s (median over
   dune-cell hours), median DP 2.79 m²/yr, 26% of hours above threshold (mean over dune cells); at the
   Nili Patera cell alone the hourly median u*,th is 0.35 m/s. Directions (RDD, dune-orientation modes) vs
   mapped dune orientations and migration directions.
3. Browser pass of both live atlases (planet toggle, polar caps and highlight, Dunes only, CSV in Excel);
   Google Site link if wanted. Rollback: redeploy the previous Pages build or revert the merge; the R2
   objects do not affect Earth.
