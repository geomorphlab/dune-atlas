"""Mars constants (docs/reference/mars-spec.md sections 2-5). Single source of truth for the Mars pipeline AND the
browser (exported to app/src/generated/constants-mars.json by app/scripts/export-constants-mars.py).
The Earth constants in dune_atlas_pipeline/constants.py are unchanged and unrelated.
"""
import numpy as np

# --- planet and air -------------------------------------------------------------------------------
G = 3.71                 # surface gravity (m s^-2)
R_MARS = 3389.5e3        # mean radius (m): distances, scale bar, flux divergence
R_AIR = 191.8            # specific gas constant of Mars air (J kg^-1 K^-1), mean molar mass 43.34 g/mol
MU0, T0_MU, S_MU = 1.370e-5, 273.0, 222.0   # Sutherland law for CO2: mu0 (Pa s), T0 (K), S (K)
K_ADIABATIC = 1.33       # adiabatic exponent (Knudsen number only)

# --- grains -------------------------------------------------------------------------------------
RHO_P = 3000.0           # grain density (kg m^-3), basaltic sand
PACKING = 0.6            # sand-bed packing fraction phi: atlas fluxes are volumes of packed sand, q = Q/(rho_p phi)
                         # (as the Earth atlas, FLUXCONSTANT = 5/0.6)

# --- near-surface wind ----------------------------------------------------------------------------
# u* from the GCM lowest-level wind at that hour's lowest-level height z (hydrostatic), through the smooth-wall
# mixing-length profile of Pahtz & Duran (2023) eq. 2.2 under constant stress (profile_table.json); there is
# no roughness length (this replaces the earlier neutral log law with z0 = 1 mm at z = 2 m).
KAPPA = 0.40             # von Karman constant (Pahtz & Duran 2023)
MIX_DAMP = 7.0           # viscous damping constant in eq. 2.2: dl/dz = kappa [1 - exp(-sqrt(u l / (7 nu)))]

# --- Pahtz & Duran (2023) J. Fluid Mech. 963:A20 ----------------------------------------------------
DSTAR_MIN = 18.0         # eq. 5.1 (experimental fit)
UPLUS_MIN = 2.3          # eq. 5.1
C1, C2 = 1.7, 12.0       # eq. 3.2 transport coefficients
KN_A, KN_B, KN_C = 2.49, 0.84, 1.74   # f_Kn = 1 + Kn [A + B exp(-C/Kn)] (Crowe et al. 2012, cited for eq. 3.20)
GA_SQRT_S_MIN = 81.0     # validity of eq. 3.2: Ga sqrt(s) > 81

# --- crest speed-up (unchanged from Earth, Gunn 2026) -------------------------------------------
BETA = 6.0
DASPECT = 0.8 / 6

# --- time -------------------------------------------------------------------------------------------
S2Y = 60 * 60 * 24 * 365.25   # flux per Earth year, as the Earth atlas

# --- slider: median grain diameter d (replaces u*,th) --------------------------------------------
# 50 ... 1000 um, log-spaced (round(50 * 20**(k/63)), steps of ~4.9 %), except that the default node
# k = 29 is exactly 200 um (geometric value 198.5, previously rounded to 199; neighbours 189 and 208)
D_DEFAULT_INDEX = 29                                                  # 200 um
D_VALUES_UM = np.round(50 * 20 ** (np.arange(64) / 63)).astype(int)
D_VALUES_UM[D_DEFAULT_INDEX] = 200
D_VALUES = D_VALUES_UM * 1e-6                                         # m
assert len(set(D_VALUES_UM.tolist())) == 64 and D_VALUES_UM[0] == 50 and D_VALUES_UM[-1] == 1000
assert (np.diff(D_VALUES_UM) > 0).all() and D_VALUES_UM[D_DEFAULT_INDEX] == 200

# per-hour series stored in cells.zarr `series` (order fixed)
SERIES_VARS = ("u", "v", "T", "rho", "z")   # z = lowest-level (layer-mid) height (m)
