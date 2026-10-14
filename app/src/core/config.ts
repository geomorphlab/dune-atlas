// Build-time configuration (Vite env vars; see docs/guide/architecture.md). Body defaults (per-cell
// sidecars, site URL): @body/config.
import { BODY_CONFIG } from "@body/config";

const env = import.meta.env ?? ({} as ImportMetaEnv);

export const CONFIG = {
  /** Data base URL override; default comes from registry.dataBase. */
  dataBase: (env.VITE_DATA_BASE as string | undefined) || undefined,
  /** default cell store path ('{dataset}' = selected dataset prefix); a dataset's `cellStore` overrides */
  cellStorePath: (env.VITE_CELL_STORE as string | undefined) || "{dataset}/cells.zarr",
  /** per-cell sidecars, used when the dataset declares no `cellAuxStores`; VITE_CELL_AUX_STORES =
   *  comma-separated list */
  cellAuxPaths: ((env.VITE_CELL_AUX_STORES as string | undefined) || BODY_CONFIG.cellAuxPaths).split(",").map((x) => x.trim()).filter(Boolean),
  /** Use `Range: bytes=-N` for shard indexes (one request) instead of HEAD + range (two). */
  useSuffixRequest: (env.VITE_SUFFIX_RANGE as string | undefined) !== "0",
  windRoseSectors: 128,
  fluxRoseSectors: 128,
  /** public URL of this atlas (texts and downloads); VITE_SITE_URL overrides */
  siteUrl: (env.VITE_SITE_URL as string | undefined) || BODY_CONFIG.siteUrl,
  // the opening view (camera, dataset, layers, ...) is DEFAULT_VIEW in defaultview.ts
};
