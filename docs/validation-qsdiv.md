# Validation: flux divergence (`qsdiv`) and native aridity (2026-10-13)

## 1. Flux divergence ∇·q_s (Gunn (2026), Methods M6) — `pipeline/src/dune_atlas_pipeline/qsdiv.py`

div q = 1/(R cos φ) [∂(q cos θ)/∂λ + ∂(q sin θ cos φ)/∂φ], q = `rdpm`, θ = `rdpa`, R = 6371 km, × S2Y → m/yr.
Stencil: `numpy.gradient` (= xarray `.differentiate`), 2nd-order central differences in the interior, 1st-order
one-sided at the latitude ends, periodic in longitude; exact float64 grid coordinates (90 − 0.1 i, −180 + 0.1 j).
Unit tests (`pipeline/tests/test_new_layers.py`): analytic fields, uniform eastward flux → 0, gap propagation.

### Atlas field (all 64 thresholds)
Inputs: `qsat_view.open_qsat` `rdpm`/`rdpa`. Pole rows have no value (cos φ = 0).
- Land cells 2,212,863; finite 2,149,618; **no value for 63,245 = 3,600 on the −90° row** (Antarctic land,
  cos φ = 0) **+ 59,645 coastal cells** (a 4-neighbour is ocean, so a central difference needs a missing value).
  No other land cell is empty; no ocean cell is finite; the pattern is identical for all 64 thresholds (cells with
  RDP = 0 give 0).
- Dune cells: 106,540, finite 105,125 (1,414 coastal + 1 cell without wind data).

Dune-cell statistics at u*,th = 0.15 m/s (m/kyr): median −0.0165, 60.1 % negative, p2 −0.303, p98 +0.302,
p98 of |div| 0.400.

By threshold (dune cells): median / fraction negative / p98|div| = −0.0016 / 58.9 % / 0.035 (0.01 m/s),
−0.0089 / 59.0 % / 0.199 (0.06), −0.0165 / 60.1 % / 0.400 (0.15), −0.0058 / 63.1 % / 0.255 (0.31), 0.0 /
37.0 % / 0.0025 (0.64 m/s; most cells have no transport).

**Display:** PiYG (negative = deposition = pink), symmetric clim **±0.3 m/kyr** (dune p2/p98 at 0.15 m/s; 4.1 %
of dune cells lie outside it). The log-scale option gives a symmetric-log scale for this layer.

### Store
`fields/qsdiv.zarr`: `fields.build_field_pyramid` (topozarr layout as the 23 qsat fields, dims (ut=64, y, x),
5 levels 3600 → 225 px, count-weighted coastal-safe means, 12-bit mantissa rounding: max relative error
1.22×10⁻⁴), units **m/yr** (`display_scale` 1000 → m/kyr in attrs and registry). 576 objects, 326.2 MB.

## 2. Aridity index at native 30″ — `pipeline/src/dune_atlas_pipeline/aridity.py`

### Encoding of `ai_v31_yr.tif` (UInt16, no declared nodata), all 777,600,000 pixels
Cross-checked against `et0_v31_yr.tif` (nodata 65535):

| pixels | count | decision |
|---|---|---|
| ET0 nodata (all have AI = 0; ocean / outside land) | 555,472,356 | no data |
| AI > 0 with ET0 nodata | 0 | — |
| ET0 = 0 (polar ice: Svalbard, Canadian Arctic, Greenland), AI = 0 | 88,054 | no data (AI = P/0 undefined) |
| ET0 = 0, AI = 65535 | 32,141 | no data (undefined) |
| AI = 0, ET0 > 0 (eastern Sahara, Libyan desert, Atacama) | 234,618 | **0.0** (hyper-arid; smallest positive value is 3, none at 1–2) |
| AI = 65535, ET0 > 0 (high latitude / mountains, median ET0 15 mm/yr) | 1,170,922 | **6.5535 = "AI ≥ 6.5535"** (UInt16 saturation: ~30 px per value in 60000–65534, then 1.2 M at 65535) |
| valid | 222,007,449 | |

### Pyramid `fields/aridity.zarr`
2-D (y, x) arrays, no u*,th dimension. 9 levels with factors 1, 2, 4, 8, 16, 30, 60, 120, 240 (common divisors
of 18000 and 43200 near powers of two, so every level spans exactly −180…180, 90…−60; widths 43200 → 180 px).
Each level is a count-weighted mean of the valid native pixels. Inner chunks 512 × 512 (1 MB raw), shards 4096 × 4096,
blosc zstd-5 shuffle, all-NaN chunks absent. 12-bit mantissa rounding: max relative error 1.216×10⁻⁴, max
absolute 4.9×10⁻⁴ (at 6.55), zeros preserved. **154 objects, 365.0 MB.**

### Per-cell means (ERA5-Land 0.1°) — `aridity.cell_means` / `wind_grid_means`
Footprint = centre ± 0.05° (lat 90 − 0.1 i, lon −180 + 0.1 j, periodic): exactly 12 × 12 pixels, equal weights
(no cos-lat weighting within a cell; generic fractional-overlap weights for other grids, e.g. ERA5 0.25° =
30 × 30 px). 300 random cells checked against a direct block mean: 0 mismatches. Land cells 2,212,863: finite
`ai_mean` 1,541,858; NaN 671,005 (668,672 south of 60° S, outside the source; 2,333 small islands / ice with
no valid pixel).


## 3. cells-aux.zarr
`qsdiv` (1801, 3600, 64) shard 16×16×64 / inner 1×1×64, plus `ai_mean`, `ai_valid_frac`, `ai_sat_frac`
(1801, 3600) in plain 64 × 64 chunks; land cells only. Local read-back of every array equals the source arrays
bit-for-bit. 12,320 objects (qsdiv 10,084 shards + metadata; ai_mean 659, ai_sat_frac 659, ai_valid_frac 913
chunks — valid_frac = 0 is a value on Antarctic land), 583.7 MB. Public read-back: see `docs/STATUS.md`.
