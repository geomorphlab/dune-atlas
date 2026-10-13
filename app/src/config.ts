// Build-time configuration (Vite env vars; see docs/architecture.md).
const env = import.meta.env ?? ({} as ImportMetaEnv);

export const CONFIG = {
  /** Data base URL override; default comes from registry.dataBase. */
  dataBase: (env.VITE_DATA_BASE as string | undefined) || undefined,
  /** Cell store path relative to the data base. */
  /** default cell store path ('{dataset}' = selected dataset prefix); a dataset's `cellStore` overrides */
  cellStorePath: (env.VITE_CELL_STORE as string | undefined) || "{dataset}/cells.zarr",
  /** per-cell sidecars (cells-aux.zarr: qsdiv, aridity; cells-aux-<name>.zarr: later sets), used
   *  when the dataset declares no `cellAuxStores`; VITE_CELL_AUX_STORES = comma-separated list */
  cellAuxPaths: ((env.VITE_CELL_AUX_STORES as string | undefined) || "{dataset}/cells-aux.zarr,{dataset}/cells-aux-veg.zarr").split(",").map((x) => x.trim()).filter(Boolean),
  /** Use `Range: bytes=-N` for shard indexes (one request) instead of HEAD + range (two). */
  useSuffixRequest: (env.VITE_SUFFIX_RANGE as string | undefined) !== "0",
  windRoseSectors: 128,
  fluxRoseSectors: 128,
  siteUrl: "https://map.geomorphlab.org/",
  // the opening view (camera, dataset, layers, ...) is DEFAULT_VIEW in defaultview.ts
};
