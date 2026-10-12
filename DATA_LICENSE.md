# Data licence

Code in this repository is MIT-licensed (see LICENSE). Data products served by the
atlas are derived from:

- Gunn (2026) *The distribution of Earth's wind-blown sand dunes*, Nature Communications,
  doi:10.1038/s41467-026-75466-y.
- Wind histograms and sand-flux (qsat) parameter fields: Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes - Supplementary Data. Zenodo.
  doi:10.5281/zenodo.20046812 (CC BY 4.0).
- Dune map (dune-mask-rev1.tif): Gunn, A. (2026). geomorphlab/dune-world: The distribution of Earth's wind-blown sand dunes - Supplementary Code (v1.0.0). Zenodo.
  doi:10.5281/zenodo.20054674 (MIT).
- ERA5-Land hourly reanalysis (Copernicus Climate Change Service), doi:10.24381/cds.e2161bac.
  Contains modified Copernicus Climate Change Service information 2026.
- Aridity index layer (`fields/aridity.zarr`, `cells-aux.zarr/ai_*`): Global Aridity Index and Potential
  Evapotranspiration (ET0) Database v3.1, Zomer & Trabucco, Figshare, doi:10.6084/m9.figshare.7504448.v7
  (CC BY 4.0); Zomer, R.J., Xu, J. & Trabucco, A. (2022) Sci. Data 9, 409, doi:10.1038/s41597-022-01493-1.
  Resampled/derived (no-data handling, multiscale means, 0.1° cell means): see docs/sources.md.

Derived web-optimised stores are redistributed under CC BY 4.0 with the attribution above.
Basemap tiles are subject to their providers' terms (attribution shown on the map).
