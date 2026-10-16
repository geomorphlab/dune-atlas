// Mars body constants for the app (build with VITE_BODY=mars; see docs/guide/mars.md). Physical
// constants come from src/bodies/mars/generated/constants-mars.json (pipeline mars/constants.py) via
// cell/marsphysics.ts; nothing here duplicates the physics.
import { M } from "./marsphysics";
import type { Grid } from "../../core/cell/snap";

export const BODY = "mars" as const;
/** mean radius (m): distances, scale bar, flux divergence (docs/reference/mars-spec.md section 4) */
export const R_MARS = M.R_MARS;
/** 2 pi R (m): the Web-Mercator "world circumference" of a Mars map */
export const MARS_CIRCUMFERENCE_M = 2 * Math.PI * M.R_MARS;

/** cells.zarr grid of the default dataset (MCMC FV3, data contract): north-up rows 89 -> -89, columns -179 -> 179,
 *  2° centres. The grid, sampling and length of every dataset come from its registry entry and cell store
 *  (datasets.ts). */
export const MARS_GRID: Grid = { lat0: 89, dlat: -2, lon0: -179, dlon: 2, ny: 90, nx: 180 };

/** grain diameters of the slider (µm) */
export const D_VALUES_UM: number[] = M.D_VALUES_UM;
export const D_DEFAULT_INDEX: number = M.D_DEFAULT_INDEX;

/** Tour example cell: Nili Patera dune field (9° N, 67° E). */
export const EXAMPLE_CELL = { lon: 67, lat: 9 };
export const SITE_TITLE = "Mars Dune Atlas";
