"""Wind-dataset grids and dataset descriptions.

A wind dataset is a regular cell-centred latitude/longitude grid (latitude descending from lat0, longitude
ascending from lon0, periodic in longitude) plus the names of its two source stores (wind histograms and qsat
fields), the number of hours in its record and the metadata written into the atlas stores.

    ERA5-Land  0.1°          1801 x 3600   centres 90 - 0.1 i,  -180 + 0.1 j,  edges +-0.05
    ERA5       0.25°          721 x 1440   centres 90 - 0.25 i, -180 + 0.25 j, edges +-0.125
    MERRA-2    0.5° x 0.625°  361 x 576    centres 90 - 0.5 i,  -180 + 0.625 j (non-square cells)
    JRA-3Q     0.375°         480 x 960    N240 Gaussian rows (lat_values); the atlas uses the regular grid fitted
                                           through the end rows (all centres within 0.0051°), -180 + 0.375 j

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
    # exact row centres where the rows are not regular (JRA-3Q Gaussian latitudes); the atlas draws and indexes the
    # cells on the regular fitted rows lat0 + dlat i, and the downloads give these exact values
    lat_values: tuple | None = None
    label_text: str | None = None     # e.g. "0.375°" for the Gaussian grid (otherwise from the steps)

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
    def square(self) -> bool:
        return abs(abs(self.dlat) - abs(self.dlon)) < 1e-12

    @property
    def label(self) -> str:
        """'0.1°', '0.25°', '0.5° × 0.625°' (non-square cells), or label_text."""
        if self.label_text:
            return self.label_text
        return f"{self.res:g}°" if self.square else f"{abs(self.dlat):g}° × {abs(self.dlon):g}°"

    def footprint_text(self) -> str:
        """The cell footprint in words: 'centre ± 0.125°' or 'centre ± 0.25° in latitude and ± 0.3125° in longitude'."""
        if self.square:
            return f"centre ± {abs(self.dlon) / 2:g}°"
        return f"centre ± {abs(self.dlat) / 2:g}° in latitude and ± {abs(self.dlon) / 2:g}° in longitude"

    def lat_exact(self) -> np.ndarray:
        """Exact row centres (lat_values if given, else the regular rows)."""
        return np.asarray(self.lat_values, "f8") if self.lat_values is not None else self.lat()

    def check_coords(self, lat, lon, tol: float = 1e-3) -> None:
        """The coordinates of a source store are this grid's (exact rows where given; tol x step)."""
        lat = np.asarray(lat, "f8"); lon = np.asarray(lon, "f8")
        assert lat.shape == (self.ny,) and lon.shape == (self.nx,), (lat.shape, lon.shape, self.shape)
        assert np.abs(lat - self.lat_exact()).max() <= tol * abs(self.dlat), "latitude not on the dataset grid"
        assert np.abs(lon - self.lon()).max() <= tol * abs(self.dlon), "longitude not on the dataset grid"

    def attrs(self) -> dict:
        """The `grid` attrs of cells.zarr / cells-aux.zarr (read by the app); `lat_values` (exact row centres) only
        for grids whose rows are not regular."""
        a = {"lat0": self.lat0, "dlat": self.dlat, "lon0": self.lon0, "dlon": self.dlon,
             "ny": self.ny, "nx": self.nx, "cell_registration": "centre"}
        if self.lat_values is not None:
            a["lat_values"] = [float(v) for v in self.lat_values]
            a["rows"] = "Gaussian latitudes (lat_values); lat0 + dlat i is the regular grid fitted through the end rows"
        return a

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


def gaussian_grid(lat_values, lon0: float, dlon: float, nx: int, label_text: str) -> Grid:
    """Grid with exact (Gaussian) row centres and the regular rows fitted through the first and last centre."""
    lv = tuple(round(float(v), 9) for v in lat_values)
    ny = len(lv)
    return Grid(lat0=lv[0], dlat=round((lv[-1] - lv[0]) / (ny - 1), 12), lon0=lon0, dlon=dlon, ny=ny, nx=nx,
                lat_values=lv, label_text=label_text)


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

    def check_grid(self, ds) -> None:
        """An xarray store's latitude / longitude are this dataset's grid (exact rows where the grid has them)."""
        self.grid.check_coords(ds["latitude"].values, ds["longitude"].values)


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

MERRA2_GRID = Grid(lat0=90.0, dlat=-0.5, lon0=-180.0, dlon=0.625, ny=361, nx=576)


def _jra3q_grid() -> Grid:
    import json
    from pathlib import Path
    lat = json.loads((Path(__file__).parent / "data" / "jra3q_gaussian_latitudes.json").read_text())["lat"]
    return gaussian_grid(lat, lon0=-180.0, dlon=0.375, nx=960, label_text="0.375°")


JRA3Q_GRID = _jra3q_grid()
REANALYSIS_PERIOD = "1980–2025"
REANALYSIS_N_HOURS = 403248

MERRA2_INFO = {
    "id": "merra2", "name": "MERRA-2", "resolution": "0.5° × 0.625°", "period": REANALYSIS_PERIOD,
    "n_hours": REANALYSIS_N_HOURS,
    "grid": "regular latitude/longitude, cell centres 90 − 0.5 i (i = 0…360), −180 + 0.625 j (j = 0…575), "
            "cell edges ± 0.25° in latitude and ± 0.3125° in longitude",
    "source": "MERRA-2 inst1_2d_asm_Nx (M2I1NXASM v5.12.4) hourly instantaneous 10 m winds U10M and V10M, "
              "0.5° × 0.625°, 1980-01-01T00 to 2025-12-31T23, from NASA GES DISC",
    "citation": "Gelaro, R. et al. (2017). The Modern-Era Retrospective Analysis for Research and Applications, "
                "Version 2 (MERRA-2). Journal of Climate 30, 5419–5454. doi:10.1175/JCLI-D-16-0758.1",
    "data_citation": "Global Modeling and Assimilation Office (GMAO) (2015). MERRA-2 inst1_2d_asm_Nx: 2d, 1-Hourly, "
                     "Instantaneous, Single-Level, Assimilation, Single-Level Diagnostics V5.12.4. Greenbelt, MD, USA, "
                     "Goddard Earth Sciences Data and Information Services Center (GES DISC). doi:10.5067/3Z173KIE2TPD",
    "doi": "10.5067/3Z173KIE2TPD",
    "licence": "NASA data, no restrictions on use; cite the dataset and Gelaro et al. (2017)",
    "notice": "",
    "fields_licence_text": "CC BY 4.0",
    "fields_license": "CC-BY-4.0",
    "lsm_long_name": "MERRA-2 land fraction (land plus land ice)",
    "lsm_description": ("MERRA-2 land fraction FRLAND + FRLANDICE (constants collection M2C0NXASM), the invariant "
                        "fraction of the cell covered by land or land ice (0–1)."),
    "lsm_source": ("Global Modeling and Assimilation Office (GMAO) (2015). MERRA-2 const_2d_asm_Nx: 2d, constants "
                   "V5.12.4. Greenbelt, MD, USA, Goddard Earth Sciences Data and Information Services Center (GES DISC). "
                   "doi:10.5067/ME5QX6Q5IGGU"),
    "lsm_doi": "10.5067/ME5QX6Q5IGGU",
    "land_cells": "MERRA-2 land fraction FRLAND + FRLANDICE > 0 (constants file M2C0NXASM, given per cell in "
                  "cells-aux.zarr)",
    "fields_method": "23 sand-flux fields at 64 threshold friction velocities from the per-cell wind histograms, "
                     "time-averaged over the hourly record (histogram-weighted means), following Gunn (2026) "
                     "Nat Commun doi:10.1038/s41467-026-75466-y",
}
JRA3Q_INFO = {
    "id": "jra3q", "name": "JRA-3Q", "resolution": "0.375°", "period": REANALYSIS_PERIOD, "n_hours": REANALYSIS_N_HOURS,
    "grid": "N240 Gaussian grid of NCAR GDEX (interpolated by NCAR from JMA's reduced N240 Gaussian grid), 480 × 960 "
            "cells: Gaussian latitudes 89.71° N to 89.71° S (lat_values), longitude −180 + 0.375 j (j = 0…959); the "
            "atlas indexes and draws the rows on the regular grid fitted through the end rows (every row centre "
            "within 0.0051° of it)",
    "source": "JRA-3Q fcst_surf ugrd10m and vgrd10m, 1-hour instantaneous forecast 10 m winds, 1980-01-01T00 to "
              "2025-12-31T23, from NSF NCAR GDEX dataset d640000",
    "citation": "Kosaka, Y. et al. (2024). The JRA-3Q Reanalysis. Journal of the Meteorological Society of Japan 102, "
                "49–109. doi:10.2151/jmsj.2024-004",
    "data_citation": "Japan Meteorological Agency, Japan (2023). Japanese Reanalysis for Three Quarters of a Century "
                     "(JRA-3Q). NSF NCAR GDEX. doi:10.5065/AVTZ-1H78",
    "doi": "10.5065/AVTZ-1H78",
    "licence": "CC BY-NC-SA 4.0 (JRA-3Q: non-commercial use, per the Japan Meteorological Agency's conditions)",
    "notice": "Contains JRA-3Q data of the Japan Meteorological Agency (1980–2025), for non-commercial use.",
    "land_cells": "JRA-3Q land cover fraction > 0 (TL479 constant land field on the Gaussian grid, given per cell in "
                  "cells-aux.zarr)",
    "fields_method": MERRA2_INFO["fields_method"],
    "fields_license": "CC-BY-NC-SA-4.0",
    "fields_licence_text": "CC BY-NC-SA 4.0 (JRA-3Q: non-commercial use)",
    "lsm_long_name": "JRA-3Q land fraction",
    "lsm_description": ("JRA-3Q land cover fraction (invariant TL479 land field, tl479_land, on the N240 Gaussian grid), "
                        "the fraction of the cell covered by land (0–1, in steps of 1/60)."),
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
    "merra2": WindDataset(
        id="merra2", name="MERRA-2", grid=MERRA2_GRID, n_hours=REANALYSIS_N_HOURS,
        hist_store="merra2_1980_2025_uam10_hist.zarr", qsat_store="merra2_1980_2025_qsat_params.zarr",
        masks_file="merra2_cellmasks.nc", land_only_source=False, qsat_is_atlas=True, period=REANALYSIS_PERIOD,
        info=MERRA2_INFO, lsm_land_above=0.0),
    "jra3q": WindDataset(
        id="jra3q", name="JRA-3Q", grid=JRA3Q_GRID, n_hours=REANALYSIS_N_HOURS,
        hist_store="jra3q_1980_2025_uam10_hist.zarr", qsat_store="jra3q_1980_2025_qsat_params.zarr",
        masks_file="jra3q_cellmasks.nc", land_only_source=False, qsat_is_atlas=True, period=REANALYSIS_PERIOD,
        info=JRA3Q_INFO, lsm_land_above=0.0),
}


def get_dataset(ds) -> WindDataset:
    if isinstance(ds, WindDataset):
        return ds
    return DATASETS[ds or "era5-land"]
