// Mars wind dataset (MCMC FV3 beta release 1: 2°, hourly, one Mars year) as described in the panel
// and the downloads. Shared functions: cell/datasetinfo.ts.
import type { DatasetInfo } from "../../core/cell/datasetinfo";

export const LAND_RULE = "every cell (Mars has no land mask: all 16,200 cells carry wind data)";
export const DUNES_RULE = "the cell overlaps at least one dune polygon of the merged dune map (USGS Mars Global Digital Dune Database and Fenton 2020)";

export const DATASET_INFO: Record<string, DatasetInfo> = {
  "fv3-beta1": {
    id: "fv3-beta1", name: "MCMC FV3", resolution: "2°", resDeg: 2, period: "one Mars year (6th simulated year, 668 sols)", nHours: 16032,
    landRule: LAND_RULE, landThreshold: 0, nonLandReason: "", // no land mask: every cell has data
    dunesRule: DUNES_RULE, fieldsFrom: "atlas",
    sourceTitle: "Winds (MCMC FV3 Mars GCM, beta release 1)",
    sourceHtml: "hourly lowest-level winds, temperature and surface pressure of the NASA Ames Mars Climate Modeling Center FV3-based Mars Global Climate Model (c48 reference simulation, 6th simulated year), regridded to 2° × 2° (a cell is about 120 km across at the equator, larger than most dune fields): 16,032 hourly samples, one Mars year. The map draws each cell as one square, so a field that changes strongly from cell to cell, as DP often does at low latitudes, looks blocky. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature (1.5–3.2 m over all cells and hours; 1.6–3.0 m in 98 % of the hours of dune cells; the cell panel gives the range of the selected cell), and the friction velocity u* comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (2023, eq. 2.2) under constant stress at that height (no roughness length).",
  },
};
