# dune-atlas

**Live:** https://map.geomorphlab.org · **Data:** `https://data.geomorphlab.org/dune-atlas/v1/` (zarr v3 / GeoZarr / PMTiles, CC BY 4.0)

Interactive global atlas of aeolian sand dunes, ERA5-Land wind roses and derived
sand-flux fields, for the Geomorphology Lab (geomorphlab.org).

- **App** (`app/`): TypeScript + Vite + MapLibre GL JS. Static site → GitHub Pages at
  `map.geomorphlab.org`, embedded in the lab Google Site.
- **Pipeline** (`pipeline/`): Python package that converts research outputs into
  web-optimised, range-readable stores (zarr v3 sharded, GeoZarr multiscales, PMTiles)
  and writes matching entries into the layer registry.
- **Registry** (`registry/layers.yaml` + `registry/generated/*.yaml`): the list of map layers. Adding a
  standard layer = run a pipeline command, upload, add one YAML entry. Validated in CI
  against `registry/layers.schema.json`.
- **Data hosting**: Cloudflare R2 bucket at `data.geomorphlab.org` (no egress fees,
  HTTP range requests + CORS). Data never lives in git.

## Documentation
| doc | what |
|---|---|
| `docs/infrastructure.md` | one-off setup: Cloudflare DNS, R2 bucket/CORS/cache, GitHub Pages |
| `docs/adding-a-layer.md` | **how to add layers** (static field, threshold field, points, basemap) |
| `docs/google-sites.md` | embedding the atlas page in the Google Site |
| `docs/development.md` | local fixture, dev server, decode check |
| `docs/architecture.md` | app module map, registry contract, adding a layer *type* |
| `docs/data-audit.md` | source data facts and formulas |
| `docs/storage-layout.md` | web formats, benchmarks, sizes and cost |
| `docs/validation-{cells,fields,dunes}.md` | per-store validation reports |
| `docs/STATUS.md` | what is done, what is blocked and on whom |

Source paper: Gunn (2026) Nat. Commun., doi:10.1038/s41467-026-75466-y.
