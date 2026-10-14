// Earth build defaults (shared configuration: config.ts).
export const BODY_CONFIG = {
  /** per-cell sidecars (cells-aux.zarr: qsdiv, aridity; cells-aux-veg.zarr: vegetation cover) */
  cellAuxPaths: "{dataset}/cells-aux.zarr,{dataset}/cells-aux-veg.zarr",
  siteUrl: "https://map.geomorphlab.org/",
};
