// Mars body constants for the app (build with VITE_BODY=mars; see docs/mars-app.md). Physical
// constants come from src/generated/constants-mars.json (pipeline mars/constants.py) via
// cell/marsphysics.ts; nothing here duplicates the physics.
import { M } from "../cell/marsphysics";
import type { Grid } from "../cell/snap";

export const BODY = "mars" as const;
/** mean radius (m): distances, scale bar, flux divergence (docs/mars-spec.md section 4) */
export const R_MARS = M.R_MARS;
/** 2 pi R (m): the Web-Mercator "world circumference" of a Mars map */
export const MARS_CIRCUMFERENCE_M = 2 * Math.PI * M.R_MARS;

/** cells.zarr grid (data contract): north-up rows 89 -> -89, columns -179 -> 179, 2° centres */
export const MARS_GRID: Grid = { lat0: 89, dlat: -2, lon0: -179, dlon: 2, ny: 90, nx: 180 };

export const DATASET_ID = "fv3-beta1";
export const N_HOURS = 16032;
/** hourly samples per sol in the FV3 output (time step 1/24 sol) */
export const HOURS_PER_SOL = 24;
export const N_SOLS = N_HOURS / HOURS_PER_SOL; // 668
export const RECORD_TEXT = "16,032 hourly samples (one Mars year, 668 sols; the 6th simulated year)";

/** grain diameters of the slider (µm) */
export const D_VALUES_UM: number[] = M.D_VALUES_UM;
export const D_DEFAULT_INDEX: number = M.D_DEFAULT_INDEX;

/** Tour example cell: Nili Patera dune field (9° N, 67° E). */
export const EXAMPLE_CELL = { lon: 67, lat: 9 };
export const SITE_TITLE = "Mars Dune Atlas";
/** the GCM lowest-level wind height varies per hour (series variable z, ~1.6-3 m) */
export const WIND_HEIGHT_TEXT = "lowest model level (z ≈ 1.6–3 m)";
