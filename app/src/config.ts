// Build-time configuration (Vite env vars; see docs/architecture.md).
const env = import.meta.env ?? ({} as ImportMetaEnv);

export const CONFIG = {
  /** Data base URL override; default comes from registry.dataBase. */
  dataBase: (env.VITE_DATA_BASE as string | undefined) || undefined,
  /** Cell store path relative to the data base. */
  /** default cell store path ('{dataset}' = selected dataset prefix); a dataset's `cellStore` overrides */
  cellStorePath: (env.VITE_CELL_STORE as string | undefined) || "{dataset}/cells.zarr",
  /** per-cell auxiliary sidecar (qsdiv, aridity cell means); a dataset's `cellAuxStore` overrides */
  cellAuxPath: (env.VITE_CELL_AUX_STORE as string | undefined) || "{dataset}/cells-aux.zarr",
  /** Use `Range: bytes=-N` for shard indexes (one request) instead of HEAD + range (two). */
  useSuffixRequest: (env.VITE_SUFFIX_RANGE as string | undefined) !== "0",
  windRoseSectors: 128,
  fluxRoseSectors: 128,
  siteUrl: "https://map.geomorphlab.org/",
  initialView: { lon: 15, lat: 15, zoom: 1.6 },
};
