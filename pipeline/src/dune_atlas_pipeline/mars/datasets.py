"""Mars wind datasets of the pipeline: grid, sampling, store prefix and every dataset-specific text written into the
stores and registry fragments (cells.py, pyramids.py, sidecars.py, native_grid.py).

The active dataset is chosen when the modules are imported, by the environment variable DUNE_ATLAS_MARS_DATASET
(default `fv3-beta1`), so the FV3 commands, stores and tests are unchanged:

    DUNE_ATLAS_MARS_DATASET=macda-v2-my30 python -m dune_atlas_pipeline.mars.cells build --source ... --dunefrac ...

`fv3-beta1` is defined here (its texts are those of the published v2 stores). Every other dataset is a JSON spec in
mars/dataset_specs/<id>.json with the same keys (`MarsDataset` fields); its per-hour series come from a contract
source store (`reader = "contract"`, see cells.read_contract) written by the dataset's extraction script.
Grids are cell-centred, rows north to south (dlat < 0), columns west to east from lon0; they need not be square
or reach the poles.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

ENV = "DUNE_ATLAS_MARS_DATASET"
DEFAULT = "fv3-beta1"
SPECS = Path(__file__).with_name("dataset_specs")
REPO = Path(__file__).resolve().parents[4]


def grid_axes(g: dict) -> tuple[np.ndarray, np.ndarray]:
    """Cell-centre latitudes and longitudes (float64) of a grid dict."""
    return (g["lat0"] + g["dlat"] * np.arange(g["ny"], dtype="f8"),
            g["lon0"] + g["dlon"] * np.arange(g["nx"], dtype="f8"))


@dataclass(frozen=True)
class MarsDataset:
    id: str
    name: str                      # long name (store attrs dataset.name)
    resolution_text: str           # e.g. "2°", "5°", "6° × 5.14°"
    grid: dict                     # lat0, dlat, lon0, dlon, ny, nx, cell_registration
    samples_per_sol: int           # 24 hourly, 12 two-hourly
    n_samples: int | None          # length of the series (None until the source has been extracted)
    prefix: str                    # data-server prefix of the dataset's stores
    reader: str                    # "fv3" (FV3 NetCDF) or "contract" (contract source store)
    source: str                    # data URL
    citation: str                  # citation of the wind data (store attrs dataset.citation)
    licence: str                   # licence row of everything derived from the winds (registry attribution)
    license_spdx: str              # `license` attribute of the cell store and pyramids
    winds_phrase: str              # "winds: ..." part of the atlas-field citation
    gcm_citation: str              # citation of the dataset's own variables (rho_mean)
    store_title: str               # cells.zarr title
    series_note: str
    ls_definition: str
    sol_definition: str
    pyramid_source: str            # `source` of the field pyramids
    qsdiv_grid_text: str           # "on the 2° grid (periodic in longitude, one-sided at the ±89° rows)"
    rho_description: str           # cells-aux rho_mean description
    cell_text: str                 # "the 2° cell" (elev_mean description)
    registry_dir: str              # repo-relative folder of the generated registry fragments
    meta_json: str                 # repo-relative qsat_field_metadata.json written by sidecars
    transport_law: str = ("Pähtz, T. & Durán, O. (2023) Scaling laws for planetary sediment transport from DEM-RANS "
                          "numerical simulations. J. Fluid Mech. 963, A20. doi:10.1017/jfm.2023.343 (eqs. 3.2, 3.20, "
                          "5.1; two typo corrections, docs/reference/mars-spec.md)")
    fields_method: str = ("23 sand-flux fields at 64 median grain diameters from the hourly lowest-level winds, "
                          "time-averaged over the Mars year (one sample per hour), per-hour threshold and flux "
                          "(Pähtz & Durán 2023) with the crest-mode methods outlined in Gunn (2026) Nat Commun "
                          "doi:10.1038/s41467-026-75466-y")
    notes: dict = field(default_factory=dict)

    # ------------------------------------------------------------------ grid helpers
    @property
    def ny(self) -> int:
        return int(self.grid["ny"])

    @property
    def nx(self) -> int:
        return int(self.grid["nx"])

    def axes(self) -> tuple[np.ndarray, np.ndarray]:
        """Cell-centre latitudes (north to south) and longitudes (float64)."""
        return grid_axes(self.grid)

    def edges(self) -> tuple[float, float, float, float]:
        """(x0, y0, dx, dy) of the pixel grid: west edge, north edge, column width, row height (dy < 0)."""
        g = self.grid
        return (g["lon0"] - g["dlon"] / 2, g["lat0"] - g["dlat"] / 2, float(g["dlon"]), float(g["dlat"]))

    def dataset_attrs(self) -> dict:
        """The `dataset` attribute of cells.zarr (FV3: the published dict, key for key)."""
        return {"id": self.id, "name": self.name, "resolution_deg": self.notes.get("resolution_deg", self.resolution_text),
                "n_hours": self.n_samples, "source": self.source, "citation": self.citation,
                "transport_law": self.transport_law, "fields_method": self.fields_method,
                **({"samples_per_sol": self.samples_per_sol} if self.id != "fv3-beta1" else {})}


# ---------------------------------------------------------------------------------------------- FV3 (published)
_FV3_CITATION = ("NASA Ames Mars Climate Modeling Center (2023). FV3-based Mars Global Climate Model, Beta Output "
                 "Release 1: c48 reference simulation, sixth simulated year, regridded to 2° x 2°, hourly "
                 "(03340.atmos_daily.nc). https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/. Model "
                 "physics: Haberle, R.M. et al. (2019) Documentation of the NASA/Ames Legacy Mars Global Climate "
                 "Model: Simulations of the present seasonal water cycle. Icarus 333, 130-164. "
                 "doi:10.1016/j.icarus.2019.03.026")

FV3 = MarsDataset(
    id="fv3-beta1",
    name="MCMC FV3 Mars GCM, beta release 1 (2°, hourly, one Mars year)",
    resolution_text="2°",
    grid={"lat0": 89, "dlat": -2, "lon0": -179, "dlon": 2, "ny": 90, "nx": 180, "cell_registration": "centre"},
    samples_per_sol=24, n_samples=16032,
    prefix="dune-atlas/mars/v2/datasets/fv3-beta1",
    reader="fv3",
    source="https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/",
    citation=_FV3_CITATION,
    licence="NASA Ames MCMC output; no licence stated (NASA open data)",
    license_spdx="CC-BY-4.0",
    winds_phrase=("MCMC FV3-based Mars GCM Beta Output Release 1, one Mars year of hourly lowest-level winds (NASA "
                  "Ames Mars Climate Modeling Center (2023), https://data.nas.nasa.gov/legacygcm/fv3betaout1/"
                  "fv3betaout1/; model physics: Haberle, R. M. et al. (2019). Icarus 333, 130–164. "
                  "doi:10.1016/j.icarus.2019.03.026)"),
    gcm_citation=("NASA Ames Mars Climate Modeling Center (2023). MCMC FV3-based Mars GCM Beta Output Release 1. "
                  "https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/; model physics: Haberle, R. M. et al. "
                  "(2019). Icarus 333, 130–164. doi:10.1016/j.icarus.2019.03.026"),
    store_title=("dune-atlas Mars cell store: MCMC FV3 GCM beta release 1 hourly lowest-level winds, air state "
                 "and sand-flux fields at 64 grain sizes"),
    series_note=("u, v = ucomp_bot, vcomp_bot, the wind at that hour's lowest-level height z; T = temp_bot; "
                 "rho = p/(R T) with p the mid pressure of the lowest layer; z = (R T/g) ln(p_lo/p) with p_lo = "
                 "ak[-1] + bk[-1] ps; float32 with mantissas rounded to series_keepbits (|error| <= 0.005 m/s, "
                 "0.02 K, 0.05 % rho, 1 mm z). Fields are computed from the unrounded values."),
    ls_definition="areocentric solar longitude, FV3 areo modulo 360 (deg)",
    sol_definition="FV3 time (sols since the start of the simulation), one sample per hour",
    pyramid_source=("Fields computed for the Mars dune atlas from the MCMC FV3-based Mars GCM Beta Output Release 1 "
                    "hourly lowest-level winds, temperature and air density (NASA Ames Mars Climate Modeling Center "
                    "2023; model physics Haberle et al. 2019, Icarus 333, 130-164, doi:10.1016/j.icarus.2019.03.026), "
                    "with the per-hour threshold and transport rate of Pähtz & Durán (2023) J. Fluid Mech. 963, A20, "
                    "doi:10.1017/jfm.2023.343, and the crest-mode methods outlined in Gunn, A. (2026) The "
                    "distribution of Earth's wind-blown sand dunes. Nature Communications. "
                    "doi:10.1038/s41467-026-75466-y"),
    qsdiv_grid_text="on the 2° grid (periodic in longitude, one-sided at the ±89° rows)",
    rho_description=("Mean over the 16,032 hours of the Mars year of the lowest-layer air density rho_f = p/(R T) "
                     "(p = mid pressure of the lowest FV3 layer, T = temp_bot, R = 191.8 J kg-1 K-1)."),
    cell_text="the 2° cell",
    registry_dir="registry/mars/generated",
    meta_json="registry/mars/qsat_field_metadata.json",
    notes={"resolution_deg": 2},
)


# ---------------------------------------------------------------------------------------------- registry
def _from_spec(path: Path) -> MarsDataset:
    d = json.loads(path.read_text())
    d.pop("$comment", None)
    ds = MarsDataset(**d)
    assert ds.id == path.stem, (ds.id, path.name)
    g = ds.grid
    assert g["dlat"] < 0 and g["dlon"] > 0 and g.get("cell_registration") == "centre", g
    assert ds.reader in ("fv3", "contract") and ds.samples_per_sol in (12, 24), ds
    return ds


def all_datasets() -> dict[str, MarsDataset]:
    out = {FV3.id: FV3}
    for p in sorted(SPECS.glob("*.json")):
        ds = _from_spec(p)
        out[ds.id] = ds
    return out


def get(dataset_id: str) -> MarsDataset:
    ds = all_datasets()
    if dataset_id not in ds:
        raise KeyError(f"unknown Mars dataset {dataset_id!r}; known: {sorted(ds)}")
    return ds[dataset_id]


def active() -> MarsDataset:
    """The dataset selected by DUNE_ATLAS_MARS_DATASET (default fv3-beta1)."""
    return get(os.environ.get(ENV, DEFAULT))
