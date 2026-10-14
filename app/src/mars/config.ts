// Build-time configuration of the Mars build (replaces config.ts): a thin wrapper - Earth's keys and env
// vars (new Earth keys reach Mars automatically), with the Mars defaults of the per-cell sidecars (one:
// cells-aux.zarr) and of the site URL.
import { CONFIG as EARTH } from "../config";

const env = import.meta.env ?? ({} as ImportMetaEnv);

export const CONFIG = {
  ...EARTH,
  /** per-cell sidecar (cells-aux.zarr: qsdiv, rho_mean, elev_mean) */
  cellAuxPaths: ((env.VITE_CELL_AUX_STORES as string | undefined) || "{dataset}/cells-aux.zarr").split(",").map((x) => x.trim()).filter(Boolean),
  /** deployment URL not decided yet (open item); used in texts only */
  siteUrl: (env.VITE_SITE_URL as string | undefined) || "https://map.geomorphlab.org/mars/",
};
