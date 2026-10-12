# Status — 2026-10-12 (updated)

## Done (committed, not pushed)
- Pipeline: cell store, per-variable field pyramids (coastal-safe coarsening), static-field layers,
  dune polygons + vector/raster PMTiles, CLI; 51 Python tests.
- App: MapLibre v5 shell, registry-driven layers (25 layers / 7 groups / 5 basemaps), global u*,th
  slider, click-to-cell panel (wind rose, flux rose with αT/αE/αH/RDD, modes vs u*,th, 23-field table,
  downloads), permalinks, embed mode; 179 tests; production build OK.
- Built: dune PMTiles (global, final), fixture stores, regional cell store, 5/23 global field pyramids.
- Docs: infrastructure, adding a layer, Google Sites, development, architecture, audit, storage, validation.

## Field data
The atlas reads `qsat_params` through `pipeline/.../qsat_view.py`: fields are time-averaged over the hourly record
(DP, RDP, RDD and RDP/DP from the drift store written by `scripts/drift/compute_drift.py`; qhbf/qhef as flux
fractions in [0, 1]). All 23 fields are in the atlas (`constants.WITHHELD_VARS = ()`). The values have been
checked against the wind histograms (`pipeline/tests/test_qsat_view.py`).

## Data release v1 — uploaded and verified (2026-10-13)
`https://data.geomorphlab.org/dune-atlas/v1/` (R2 bucket `dune-atlas-data`): 34,306 objects, 28.9 GB —
`cells.zarr` (10,450 land shards × {hist 13.0 GB, fields 9.5 GB} + land/dunes/metadata), 23 × `fields/<var>.zarr`
(576 objects each, 6.4 GB), `dunes/{dunes,nondune-land}.pmtiles`. Public checks: suffix/offset ranges 206, CORS for
map.geomorphlab.org and localhost:5173, edge cache HIT; 300/300 random land cells bit-identical (histograms vs
source, 23-field vectors vs qsat_view), 100/100 ocean cells empty; DP pyramid within 1.1×10⁻⁴ (12-bit
display rounding). Cloudflare: 4xx/5xx not cached (status-code TTL 400–526 → no cache).

## New layers: aridity (native 30″) + flux divergence + cells-aux — uploaded and verified (2026-10-13)
New keys only under `v1/` (live listing before: 34,306 objects; after: 47,356 = 34,306 unchanged with identical
sizes + 13,050 new, 1.27 GB; create-only `If-None-Match: *` puts):
`fields/aridity.zarr` (154 objects, 365.0 MB), `fields/qsdiv.zarr` (576, 326.2 MB), `cells-aux.zarr`
(12,320, 583.7 MB). Release total now 47,356 objects, 30.2 GB.
- **Aridity**: Global-AI v3.1 at native 30″, 2-D (y, x), 9 levels with exact edges, ocean / ET0 = 0 → NaN, genuine
  zeros kept, 65535 → 6.5535 (= AI ≥ 6.5535); log display, BrBG, clim [0.003, 6.5]. Decisions and counts:
  `aridity.py`, `docs/validation-qsdiv.md` §2; sources/licence: `docs/sources.md`.
- **qsdiv** (∇·q_s, m/yr; shown m/kyr): divergence of the RDP/RDD vector following Gunn (2026), Methods M6, 64
  thresholds. `docs/validation-qsdiv.md` §1.
- **cells-aux.zarr**: per-cell `qsdiv[ut]`, `ai_mean`, `ai_valid_frac`, `ai_sat_frac` (`cellsaux.py`).
- Public checks (https://data.geomorphlab.org): 300/300 random land cells bit-identical for all four arrays (291
  with finite qsdiv, 212 with finite AI), 30/30 ocean cells NaN; 18 random pyramid windows (levels 0, 2, coarsest;
  random ut) bit-identical to the local stores; root attrs identical; suffix range 206, CORS for
  map.geomorphlab.org and localhost:5173, repeat request edge HIT; absent (ocean) chunks 404 (not cached).
- Registry: `registry/generated/x_extra_fields.yaml` (group `climate`; layers `aridity` (climate), `qsdiv` (drift)),
  `npm run validate-registry` OK (26 layers / 8 groups). Schema gained an optional layer `attribution` object.
- **For the app agent**: (1) aridity arrays are 2-D (no `ut`); `thresholdAware: false`. (2) qsdiv wants colormap
  PiYG — add `piyg` to `app/scripts/gen-colormaps.py`, then switch `extra_layers.QSDIV_COLORMAP` (now `rdbu`).
  (3) show `layer.attribution` (source, citation, doi, licence, url, changes). (4) click panel / downloads: read
  `cells-aux.zarr` arrays (`qsdiv` is (lat, lon, ut) like `cells.zarr/fields`; scalars are plain 64×64 chunks).
  (5) group order: fixed in registry/layers.yaml (… wind, drift, climate); fragment renamed `x_extra_fields.yaml`
  so it merges after qsat_fields.yaml. Done by the app agent (2026-10-13): piyg, attribution popover, cells-aux
  panel rows + downloads, About data sources.
- **Author decisions**: qsdiv clim (±0.3 m/kyr); 65535 kept as 6.5535 (alternative:
  NaN); Global-AI licence wording (Figshare CC BY 4.0 vs the readme's "non-commercial use"), `docs/sources.md`.

## Remaining
| item | on whom | then |
|---|---|---|
| GitHub repo + Pages | done 2026-10-13: public repo `geomorphlab/dune-atlas`, Pages via Actions, custom domain set; first deploy succeeded | — |
| `map.` DNS + domain verification (§D2, D4) | **you**: Cloudflare `CNAME map → geomorphlab.github.io` (DNS only) + GitHub verified-domain TXT | I enable Enforce HTTPS once the certificate is issued |
| Google Sites page (§E) | live app | `docs/google-sites.md` |
| UI iteration | you + me | `VITE_DATA_BASE=https://data.geomorphlab.org npm run dev` |

## Next dataset: ERA5 (waiting for the Gadi path)
The atlas will offer a wind-dataset selector (ERA5-Land now; ERA5 from the student's equivalent zarrs on Gadi).
App side: `datasets` in the registry, `{dataset}` in layer sources, grid read from `cells.zarr` attrs (in progress).
Pipeline side, to do once the path and file layout are known:
- parameterise the source names (`era5-land_1950_2024_*.zarr`) and the grid (ERA5 0.25°, 721 × 1440) in `cellstore`,
  `fields.display_array` (it rebuilds the exact 0.1° coordinates), `qsat_view`, `cogs` and the CLI region defaults. Write
  `grid` attrs from the source coordinates instead of constants;
- land mask and the drift store for ERA5 (`scripts/drift/compute_drift.py` generalised) and the qhbf/qhef fractions;
- run conversion + upload next to the data (Gadi), or stream from Gadi straight to R2 (same `stream_upload`);
- the dune map stays the 0.1° product (independent of the wind dataset).

## Author questions
All resolved (2026-10-12).
