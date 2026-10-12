# Data sources and licences

Every data product the atlas serves, where it comes from, its licence, and what the pipeline changed.
Structured attribution for third-party layers is also in the registry (`attribution: {source, citation, doi,
licence, url, changes}` on the layer, optional field of `registry/layers.schema.json`) and in each store's root
attrs, so the app can show it next to the layer.

| product (R2 key under `dune-atlas/v1/`) | source | licence | changes made by dune-atlas |
|---|---|---|---|
| `cells.zarr` (`hist`, `fields`, `land`, `dunes`) | Gunn, A. (2026) *The distribution of Earth's wind-blown sand dunes*, Nat Commun, doi:10.1038/s41467-026-75466-y; Supplementary Data, Zenodo, doi:10.5281/zenodo.20046812 (ERA5-Land 1950–2024 10 m wind histograms, qsat parameters) | CC BY 4.0 | uint32/float32 casts; DP/RDP/RDD/RDP-DP and qhbf/qhef computed from the histograms and qsat parameters (`qsat_view.py`); web layout |
| `fields/<23 qsat vars>.zarr` | as above | CC BY 4.0 | as `cells.zarr`; m²/s → m²/yr; ratios clipped ±6×10⁴; multiscale means; 12-bit mantissa rounding |
| `fields/qsdiv.zarr`, `cells-aux.zarr/qsdiv` | derived here from `rdpm`/`rdpa` following Gunn (2026), Methods M6 | CC BY 4.0 (as the inputs) | new quantity; m/yr; see `docs/validation-qsdiv.md` |
| `dunes/*.pmtiles` | dune map `dune-mask-rev1.tif`: Gunn, A. (2026) geomorphlab/dune-world Supplementary Code (v1.0.0), Zenodo, doi:10.5281/zenodo.20054674 | MIT | vectorised (8-connected), tiled |
| (all wind-derived products) | ERA5-Land hourly reanalysis, Copernicus Climate Change Service, doi:10.24381/cds.e2161bac | Copernicus licence ("Contains modified Copernicus Climate Change Service information 2026") | via the Zenodo data above |
| `fields/aridity.zarr`, `cells-aux.zarr/ai_*` | **Global Aridity Index and Potential Evapotranspiration (ET0) Database v3.1** (Global-AI_PET v3.1), annual AI `ai_v31_yr.tif` (1970–2000, 30″). Paper: Zomer, R.J., Xu, J. & Trabucco, A. (2022) Version 3 of the Global Aridity Index and Potential Evapotranspiration Database. *Sci. Data* 9, 409, doi:10.1038/s41597-022-01493-1. Dataset: Zomer & Trabucco, Figshare, doi:10.6084/m9.figshare.7504448.v7 (v3.1 = Figshare version 7, published 2025-07-17; concept DOI 10.6084/m9.figshare.7504448) | CC BY 4.0 (Figshare record) — see note | integer AI×10⁴ → float32; ocean / ET0 = 0 → no data; 65535 kept as 6.5535 (AI ≥ 6.5535); multiscale means of valid pixels; 12-bit rounding (≤ 1.2×10⁻⁴ relative); per-0.1°-cell means |
| basemaps | OpenFreeMap/OpenMapTiles/OSM, Esri World Imagery, Mapterhorn, OpenTopoMap | providers' terms | none (attribution shown on the map) |

**Licence note (Global-AI v3.1) — needs the author's confirmation.** The Figshare record (API, 2026-10-13:
version 7, "Global Aridity Index and Potential Evapotranspiration (ET0) Database: Version 3.1") is licensed
**CC BY 4.0**. The readme shipped inside the download (`Global AI_ET0 v3.1 - Readme.docx`) still says the data are
"provided for non-commercial use" and that commercial use needs permission. The atlas is non-commercial, so both
readings allow it; the registry and store metadata state CC BY 4.0 (the repository licence of record) with the
citation the readme requests (Zomer, Xu & Trabucco 2022).

Version check: the local readme names v3.1 and the Figshare article URL (…/7504448) without a version suffix;
the suffix `.v7` was taken from the Figshare API (article 7504448 has versions 1–7; v5 = v3.0 cited in the 2022
paper, superseded by v3.1, which revises the net-longwave radiation term as the readme describes).

## Recommended citations (as shown in the app)
- Atlas data: Gunn (2026) Nat Commun doi:10.1038/s41467-026-75466-y; data doi:10.5281/zenodo.20046812.
- Aridity: Zomer, R.J., Xu, J. & Trabucco, A. (2022) Sci. Data 9, 409, doi:10.1038/s41597-022-01493-1; data:
  Global-AI_PET v3.1, doi:10.6084/m9.figshare.7504448.v7 (CC BY 4.0). Resampled/derived by dune-atlas.
  Shown in the aridity layer's info popover (registry `attribution`), in About → Data sources, and in the
  references of every per-cell download (NetCDF `references`, metadata.json, README, citation TXT).
- Flux divergence: computed by the atlas from RDP/RDD following Gunn (2026), Methods M6; cite the paper and
  the Supplementary Data.
