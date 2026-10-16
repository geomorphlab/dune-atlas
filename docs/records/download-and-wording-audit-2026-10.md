# Audit of the downloads and of dataset-specific wording (16 October 2026)

Two checks before the next release, with MERRA-2 and JRA-3Q coming later.

## 1. Downloads

Every file a visitor can download was produced with the app's own export code from the live stores
(ERA5, ERA5-Land, MCMC FV3, EMARS, MACDA; 9 Earth and 6 Mars cells per dataset, including coastal, ocean,
polar and antimeridian cells, and 2–3 regions per dataset) and read back with Python (netCDF4, xarray,
cfchecker). Values: every NetCDF equals the store bit for bit, every CSV equals its NetCDF, region cells
equal the cell downloads, rose_16_sectors.csv and (Earth) DP / RDP / RDD recompute from the files. The CF
checker reported no errors. Fixed in this change:

| finding | fix |
|---|---|
| Region `lat_bnds` beyond ±90° for rows centred on a pole | edges clipped at ±90° (cell and region files) |
| One blanket licence "CC BY 4.0" in every file, contradicting DATA_LICENSE.md (FV3, MACDA, dune map) | `license` states the licence of the wind dataset's products (registry `credits.fieldsLicence`), says that other variables carry their own, and links DATA_LICENSE.md; dune flag and fraction carry their licence |
| Dataset notice under the key `copernicus_notice`, also for the MACDA OGL notice; missing from cell NetCDF and Mars metadata.json | `data_notice` in every NetCDF and metadata.json, both atlases |
| ERA5 flux divergence cited the ERA5-Land data record | source per dataset (paper record or computed by the atlas) |
| MACDA files and texts said "hourly", "that hour's threshold", "% of hours" (MACDA samples every two Mars hours) | wording by sample / time step in the app, the exports and the pipeline texts; MACDA, EMARS and FV3 registry fragments regenerated |
| Mars series rounding (series_keepbits) not stated; flux_rose recomputed from them differs slightly from the fields | the store's rounding note on u, v, T, rho, z, in README and metadata.json; flux_rose comment says so |
| d-axis comment gave a rule that is wrong at k = 29 (200 µm) | exceptions listed from the values |
| Per-cell NetCDF without cell bounds, creation date, geospatial extent or time coverage | `lat_bnds` / `lon_bnds`, `geospatial_*`, `date_created`, Earth `time_coverage_*` (from the dataset period) |
| Region geospatial bounds were the drawn box, not the cells | extent of the cells; the box in `selection_box` |
| Region files less documented than cell files | speed/direction bin bounds, the U10 > 20 m/s caveat, axis symbol and comment, `description_latex`, Mars `planet` and `transport_law` |
| Titles printed "-24.5° N" | "24.50° S" |
| README / metadata.json named NetCDF variables that do not exist | `um_bin_bnds[:, 0]` etc.; rose_16 columns marked "not in the NetCDF" |
| Spacing-based guess of the dataset in the CSV column texts | the dataset id is passed |
| `source` held only the dataset title | how the file was produced; the title in `dataset_title` |
| Mars cell files named `dune-atlas_*`, Mars region titled "Dune Atlas" | `mars-dune-atlas_*`, "Mars Dune Atlas" |
| Two wordings of the grid registration; Mars NetCDF without `ua_bin_bearing_from`; unrounded u*,th in region files; latitudes rounded to 6 decimals; metadata keys differing between atlases (`hours` / `total_hours_binned`, `cells` / `land_cells`) | one registration text; bearing added; ut to 2 decimals; exact grid values (12 significant digits); `n_samples`, `cells_with_data` |
| Bounds variables with units; `rose_mode` without units | as CF recommends |

Left as they are: the `hour` dimension name of the Mars series (documented as the sample index); the
Tibesti sentence in the Mars σE/σH description (it is where the criterion comes from); the optional ACDD
attributes `summary`, `keywords`, `creator_*`, `product_version`.

## 2. Wording

Generic text (shown whatever dataset is selected) no longer names or assumes one dataset:
the Wind dataset ⓘ on both atlases is built from the registry (`info.kind`, `info.note`); the selector
tooltip from `info.landShort`; the map attribution and About note from `credits.mapNotice`; the no-data
panel from `info.landRule` and lists every other dataset; the Mars help, tour, About and the shared
"Earth and Mars" comparison speak of time steps, the lowest level of the wind dataset and "a climate-model
simulation or a reanalysis"; README, CITATION.cff keywords and the guides list EMARS and MACDA. Dataset
names stay where the text is about that dataset (registry entries, citations, examples marked "e.g.").

## Open (PI)

* Concepts (`docs/concepts/concepts-earth-mars.md`, approved text): "The two ERA5 wind datasets" (Earth)
  will need a new title when a third Earth dataset is added; "for every hour" in the Mars entries is not
  right for MACDA.
* GitHub repository description and topics.
* Before MERRA-2 / JRA-3Q: the licence of JRA-3Q-derived products (source CC BY-NC-SA 4.0); how the app
  handles JRA-3Q's Gaussian latitudes (draw with a fitted regular grid, max offset 0.005°, exact latitudes
  in the files; or full Gaussian support); non-square MERRA-2 cells (0.5° × 0.625°) in the texts that use one
  cell size; the pipeline's dataset registry (provider, sampling, notice) and CLI choices.
