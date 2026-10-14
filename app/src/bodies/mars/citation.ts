// Mars citations besides the dataset's (registry datasets[].credits / citationSources: FV3): the method,
// transport law, dune map and DEM sources (entries may have a DOI or only a URL) and the credit lines of
// image exports. Formatting and the dataset credits: core/cell/citation.ts.
import type { CitationSource } from "../../core/cell/citation";
import { PAPER_DOI } from "../../core/cell/paper";

export const PAHTZ_DURAN_DOI = "10.1017/jfm.2023.343";
export const DEM_URL = "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m";
/** exact wording used by pipeline mars/terrain.py DEM_ATTRIBUTION and registry/mars/generated/x_elevation.yaml */
export const DEM_CITATION = "Fergason, R. L, Hare, T. M., & Laura, J. (2018). HRSC and MOLA Blended Digital Elevation Model at 200m v2. Astrogeology PDS Annex, U.S. Geological Survey.";
export const DEM_LICENCE = "MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)";
/** licence of the self-built MOLA–HRSC hillshade (terrarium) tiles */
export const HILLSHADE_LICENCE = "the MOLA–HRSC hillshade tiles are released under CC BY-SA 3.0 IGO (derived from HRSC CC BY-SA 3.0 IGO and MOLA CC0)";
export const MGD3_2007_DOI = "10.1029/2007JE002943";

export const MGD3_2014_DOI = "10.1016/j.icarus.2013.04.011";
/** Fenton (2020): updated equatorial inventory and many small dune fields (< 1 km², not in MGD3); merged into the dune layer */
export const FENTON_2020_DOI = "10.1016/j.icarus.2020.114018";

export const PD23_TEXT = "Pähtz, T. & Durán, O. (2023). Scaling laws for planetary sediment transport from DEM-RANS numerical simulations. Journal of Fluid Mechanics 963, A20.";

export const BODY_CITATION_SOURCES: Record<string, CitationSource> = {
  "dune-atlas-mars": {
    id: "dune-atlas-mars", title: "Mars Dune Atlas (method)",
    entries: [
      { label: "Method (wind-regime and dune-orientation fields)", key: "method_wind_regime_and_dune_orientation_fields", text: "Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications.", doi: PAPER_DOI },
    ],
    notice: "Mars wind series, sand-flux fields and flux divergence computed for the Mars Dune Atlas from the FV3 lowest-level winds with the transport law of Pähtz & Durán (2023) and the methods outlined in Gunn (2026).",
  },
  "pahtz-duran": {
    id: "pahtz-duran", title: "Sediment transport law",
    entries: [{ label: "Paper", text: PD23_TEXT, doi: PAHTZ_DURAN_DOI }],
  },
  dunes: {
    id: "dunes", title: "Mars dune map (USGS Mars Global Digital Dune Database and Fenton 2020, merged)",
    entries: [
      { label: "Paper", text: "Hayward, R. K. et al. (2007). Mars Global Digital Dune Database and initial science results. Journal of Geophysical Research 112, E11007.", doi: MGD3_2007_DOI },
      { label: "Paper", text: "Hayward, R. K., Fenton, L. K. & Titus, T. N. (2014). Mars Global Digital Dune Database (MGD3): global dune distribution and wind pattern observations. Icarus 230, 38–46.", doi: MGD3_2014_DOI },
      { label: "Paper", text: "Fenton, L. K. (2020). Updating the global inventory of dune fields on Mars and identification of many small dune fields. Icarus 352, 114018.", doi: FENTON_2020_DOI },
    ],
  },
  dem: {
    id: "dem", title: "Topography (MOLA–HRSC blended DEM)",
    entries: [{ label: "Data", text: DEM_CITATION, doi: "", url: DEM_URL, license: DEM_LICENCE }],
  },
};
/** sources of a cell download besides the dataset ones (elevation: the DEM) */
export const CELL_SOURCE_IDS = ["dem"];


/** image exports: the data line of a plot (the wind line appended) */
export const plotDataCredit = (windText: string) => `Methods outlined in Gunn, A. (2026) Nature Communications, doi:${PAPER_DOI}; transport law: Pähtz & Durán (2023) J. Fluid Mech. 963, A20, doi:10.1017/jfm.2023.343. ${windText}`;
/** map exports: the dune-map line */
export const MAP_DUNE_CREDIT = `Dune map: USGS Mars Global Digital Dune Database (Hayward et al. 2007, 2010, 2012, 2014) and Fenton (2020), merged. Wind-regime methods outlined in Gunn, A. (2026) Nature Communications, doi:${PAPER_DOI}; transport law: Pähtz & Durán (2023) J. Fluid Mech. 963, A20, doi:10.1017/jfm.2023.343.`;
/** map exports: the credit line of an external layer, written when that layer is visible (in this order) */
export const MAP_LAYER_CREDITS: Record<string, string> = {
  elevation: "Elevation: MGS MOLA – MEX HRSC blended DEM 200 m v2 (Fergason, Hare & Laura 2018, USGS Astrogeology); MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO).",
  rho_mean: "Air density: MCMC FV3 Mars GCM beta release 1, lowest layer p/(R T), mean over the Mars year.",
};
/** About, Citation: the body's sources listed besides the datasets' (cell/citation.ts aboutSourceIds) */
export const ABOUT_SOURCE_IDS = ["dem"];
