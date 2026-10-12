"""Physical and grid constants, copied verbatim from
geomorphlab/dune-world `dune-world-era5land-rev0.ipynb` (cells 4, 6, 12, 14).

These are the single source of truth for the pipeline AND are exported to
app/src/generated/constants.json so the browser's flux computation is identical.
"""
import numpy as np

__all__ = ["Z", "Z0", "KAPPA", "BETA", "DASPECT", "G", "RHO_S", "RHO_F",
           "FLUXCONSTANT", "FLUXK", "S2Y", "UM_EDGES", "UA_EDGES", "UM_CENTRES",
           "UA_CENTRES", "UT_VALUES", "UT_DEFAULT_INDEX", "N_HOURS", "QSAT_VARS",
           "WITHHELD_VARS"]

Z = 10.0            # wind height (m)
Z0 = 1e-3           # roughness length (m)
KAPPA = 0.41        # von Karman constant
BETA = 6.0          # crest speed-up coefficient
DASPECT = 0.8 / 6   # dune aspect ratio
G = 9.8
RHO_S = 2650.0
RHO_F = 1.2
FLUXCONSTANT = 5 / 0.6
FLUXK = FLUXCONSTANT / G * RHO_F / RHO_S
S2Y = 60 * 60 * 24 * 365.25

# Histogram bins (cell 6): 128 speed bins 0-20 m/s, 128 direction bins -pi..pi.
# Direction is arctan2(v10, u10): direction the wind blows TOWARD, CCW from east.
UM_EDGES = np.linspace(0, 20, 2**7 + 1)
UA_EDGES = np.linspace(-np.pi, np.pi, 2**7 + 1)
UM_CENTRES = 0.5 * (UM_EDGES[1:] + UM_EDGES[:-1])
UA_CENTRES = 0.5 * (UA_EDGES[1:] + UA_EDGES[:-1])

# Threshold friction velocities (cell 12): 64 values 0.01-0.64 m/s.
UT_VALUES = np.linspace(0.01, 0.64, 2**6)
UT_DEFAULT_INDEX = 14      # u*,th = 0.15 m/s, the default threshold
N_HOURS = 657455           # hourly samples 1950-2024. Hours with |U10| > 20 m/s fall outside the
                           # bins, so a cell's histogram sums to <= N_HOURS (deficit up to ~4 %).
                           # Always normalise by hist.sum(), never by N_HOURS.

# All 23 qsat_params variables, in the fixed order used by the pipeline.
QSAT_VARS = ["ab", "ae", "at", "ao", "rdpa", "dpm", "rdpm", "qnlb", "qncb", "qalb", "qacb",
             "qnle", "qale", "qace", "qha_rdp_dp", "sige_sigh", "qhab_nl_nc", "qhab_ac_nc",
             "qhne_ac_nl", "ufm", "uft", "qhbf", "qhef"]

# Variables withheld from the atlas (none). Add names here to withhold a variable (the cell-store
# `fields` array and field pyramids must then be rebuilt as a new data version).
WITHHELD_VARS: tuple = ()
