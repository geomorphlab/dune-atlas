"""Wind-dataset grids and dataset descriptions.

A wind dataset is a regular cell-centred latitude/longitude grid (latitude descending from lat0, longitude
ascending from lon0, periodic in longitude) plus the names of its two source stores (wind histograms and qsat
fields), the number of hours in its record and the metadata written into the atlas stores.

    ERA5-Land  0.1°   1801 x 3600   centres 90 - 0.1 i,  -180 + 0.1 j,  edges +-0.05
    ERA5       0.25°   721 x 1440   centres 90 - 0.25 i, -180 + 0.25 j, edges +-0.125

`Grid.from_coords` reads the grid from a source store's coordinate arrays (float32 in the sources), so the
pipeline checks the dataset description against the data instead of assuming it.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


@dataclass(frozen=True)
class Grid:
    lat0: float          # centre of row 0 (deg)
    dlat: float          # row step (deg; negative = north to south)
    lon0: float          # centre of column 0 (deg)
    dlon: float          # column step (deg)
    ny: int
    nx: int

    # ------------------------------------------------------------------ coordinates
    def lat(self) -> np.ndarray:
        """Exact float64 cell-centre latitudes lat0 + dlat * i."""
        return self.lat0 + self.dlat * np.arange(self.ny)

    def lon(self) -> np.ndarray:
        return self.lon0 + self.dlon * np.arange(self.nx)

    @property
    def shape(self) -> tuple[int, int]:
        return (self.ny, self.nx)

    @property
    def res(self) -> float:
        return abs(self.dlon)

    @property
    def label(self) -> str:
        """'0.1°', '0.25°'."""
        return f"{self.res:g}°"

    def attrs(self) -> dict:
        """The `grid` attrs of cells.zarr / cells-aux.zarr (read by the app)."""
        return {"lat0": self.lat0, "dlat": self.dlat, "lon0": self.lon0, "dlon": self.dlon,
                "ny": self.ny, "nx": self.nx, "cell_registration": "centre"}

    # ------------------------------------------------------------------ edges
    @property
    def x_edge0(self) -> float:
        """Western edge of column 0 (pixel registration), e.g. -180.05 for 0.1°."""
        return round(self.lon0 - self.dlon / 2, 9)

    @property
    def y_edge0(self) -> float:
        """Northern edge of row 0, e.g. 90.05 for 0.1° (beyond the pole: the pole row is a half cell)."""
        return round(self.lat0 - self.dlat / 2, 9)

    def transform_4326(self) -> tuple:
        """GDAL geotransform of the cell edges (EPSG:4326)."""
        return (self.dlon, 0.0, self.x_edge0, 0.0, self.dlat, self.y_edge0)

    def lat_edges(self, clip: bool = True) -> np.ndarray:
        """(ny + 1) row edges, north to south; clipped to [-90, 90] by default."""
        e = np.round(self.y_edge0 + self.dlat * np.arange(self.ny + 1), 9)
        return np.clip(e, -90.0, 90.0) if clip else e

    def lon_edges(self) -> np.ndarray:
        return np.round(self.x_edge0 + self.dlon * np.arange(self.nx + 1), 9)

    # ------------------------------------------------------------------ construction
    @classmethod
    def from_coords(cls, lat, lon, decimals: int = 6, tol: float = 1e-3) -> "Grid":
        """Grid from (possibly float32) centre coordinates: steps and origins rounded to `decimals`; every
        coordinate must lie within tol x step of the exact formula."""
        lat = np.asarray(lat, "f8"); lon = np.asarray(lon, "f8")
        ny, nx = lat.size, lon.size
        dlat = round((lat[-1] - lat[0]) / (ny - 1), decimals)
        dlon = round((lon[-1] - lon[0]) / (nx - 1), decimals)
        g = cls(lat0=round(float(lat[0]), decimals), dlat=dlat, lon0=round(float(lon[0]), decimals), dlon=dlon,
                ny=ny, nx=nx)
        assert np.abs(lat - g.lat()).max() <= tol * abs(dlat), "latitude not on a regular grid"
        assert np.abs(lon - g.lon()).max() <= tol * abs(dlon), "longitude not on a regular grid"
        return g

    @classmethod
    def from_attrs(cls, a: dict) -> "Grid":
        return cls(lat0=a["lat0"], dlat=a["dlat"], lon0=a["lon0"], dlon=a["dlon"], ny=a["ny"], nx=a["nx"])


ERA5_LAND_GRID = Grid(lat0=90.0, dlat=-0.1, lon0=-180.0, dlon=0.1, ny=1801, nx=3600)
ERA5_GRID = Grid(lat0=90.0, dlat=-0.25, lon0=-180.0, dlon=0.25, ny=721, nx=1440)


def grid_of(ds) -> Grid:
    """Grid of an xarray Dataset/DataArray with `latitude` / `longitude` coordinates."""
    return Grid.from_coords(ds["latitude"].values, ds["longitude"].values)


# ---------------------------------------------------------------------------------------------- datasets
COPERNICUS_NOTICE = ("Contains modified Copernicus Climate Change Service information ({name}, {period}). Neither the "
                     "European Commission nor ECMWF is responsible for any use that may be made of the Copernicus "
                     "information or data it contains.")


@dataclass(frozen=True)
class WindDataset:
    id: str
    name: str
    grid: Grid
    n_hours: int
    hist_store: str                 # source store names inside the data directory
    qsat_store: str
    masks_file: str                 # (land, dunes) per cell: layers.nc (ERA5-Land) / era5_cellmasks.nc (ERA5)
    land_only_source: bool          # True: the sources have values on land cells only (ERA5-Land)
    qsat_is_atlas: bool             # True: the qsat store holds the atlas field definitions directly
    period: str = "1950–2024"
    info: dict = field(default_factory=dict)   # `dataset` attrs of the atlas stores (None for ERA5-Land)
    lsm_land_above: float | None = None        # land cells = land-sea mask fraction > this (datasets with an lsm)

    @property
    def resolution(self) -> str:
        return self.grid.label


ERA5_INFO = {
    "id": "era5", "name": "ERA5", "resolution": "0.25°", "period": "1950–2024", "n_hours": 657456,
    "grid": "regular latitude/longitude, cell centres 90 − 0.25 i (i = 0…720), −180 + 0.25 j (j = 0…1439), "
            "cell edges ± 0.125°",
    "source": "ERA5 hourly 10 m u- and v-wind components on single levels, 0.25°, 1950-01-01T00 to 2024-12-31T23, "
              "accessed via the NCI Australia ERA5 replica (project rt52)",
    "citation": "Hersbach, H. et al. (2020). The ERA5 global reanalysis. Quarterly Journal of the Royal "
                "Meteorological Society 146, 1999–2049. doi:10.1002/qj.3803",
    "data_citation": "Hersbach, H. et al. (2023). ERA5 hourly data on single levels from 1940 to present. Copernicus "
                     "Climate Change Service (C3S) Climate Data Store (CDS). doi:10.24381/cds.adbb2d47",
    "doi": "10.24381/cds.adbb2d47",
    "licence": "CC BY 4.0",   # CDS licence of ERA5 since 2 July 2025 (the stores built before carry the earlier text)
    "copernicus_notice": COPERNICUS_NOTICE.format(name="ERA5", period="1950–2024"),
    "land_cells": "ERA5 land–sea mask fraction > 0 (invariant field lsm, given per cell in cells-aux.zarr)",
    "fields_method": "23 sand-flux fields at 64 threshold friction velocities from the per-cell wind histograms, "
                     "time-averaged over the hourly record (histogram-weighted means), following Gunn (2026) "
                     "Nat Commun doi:10.1038/s41467-026-75466-y",
}

DATASETS = {
    "era5-land": WindDataset(
        id="era5-land", name="ERA5-Land", grid=ERA5_LAND_GRID, n_hours=657455,
        hist_store="era5-land_1950_2024_uam10_hist.zarr", qsat_store="era5-land_1950_2024_qsat_params.zarr",
        masks_file="layers.nc", land_only_source=True, qsat_is_atlas=False),
    "era5": WindDataset(
        id="era5", name="ERA5", grid=ERA5_GRID, n_hours=657456,
        hist_store="era5_1950_2024_uam10_hist.zarr", qsat_store="era5_1950_2024_qsat_params.zarr",
        masks_file="era5_cellmasks.nc", land_only_source=False, qsat_is_atlas=True, info=ERA5_INFO,
        lsm_land_above=0.0),
}


def get_dataset(ds) -> WindDataset:
    if isinstance(ds, WindDataset):
        return ds
    return DATASETS[ds or "era5-land"]
