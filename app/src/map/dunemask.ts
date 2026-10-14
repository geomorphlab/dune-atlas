// 'Dunes only' (PI round 5 item 6, both builds): wind-derived map layers restricted to the cells with dunes.
// The mask is the dataset's own per-cell dune flag, already published in its cell store (no new data):
//   Earth  {dataset}/cells.zarr/dunes  uint8 (1801 x 3600 ERA5-Land, 721 x 1440 ERA5): 1 = the cell overlaps
//          at least one 0.1° dune cell of the dune map (DATASET_INFO.dunesRule)
//   Mars   {dataset}/cells.zarr/dune   uint8 (90 x 180; `dunes` = overlap fraction as fallback): 1 = the 2° cell
//          overlaps a dune polygon (2,749 cells)
// read once per cell store (value > 0 = dunes). The cell grid is the field pyramids' level 0; coarser
// levels (exact 2x block means, trimmed: rows floor(ny/f)) get the block reduction "any dune cell in the
// f x f block", so a coarse pixel is shown where it contains dunes.
import * as zarr from "zarrita";
import type { Grid as VecGrid } from "./vectors";

export interface CellGridGeo { lat0: number; lon0: number; dlat: number; dlon: number; ny: number; nx: number }
export interface DuneMask { ny: number; nx: number; data: Uint8Array; grid: CellGridGeo; count: number }
export type DuneMaskProvider = () => Promise<DuneMask | null>;

/** wind-derived layer: every field computed from the wind data depends on the threshold slider (u*,th /
 *  d); external data (dunes, aridity, vegetation, elevation, Mars rho_mean) do not. `windDerived` in the
 *  registry overrides the rule. */
export function isWindDerived(l: { type: string; thresholdAware?: boolean; windDerived?: boolean }): boolean {
  return l.windDerived ?? (l.type === "zarr-field" && !!l.thresholdAware);
}

const CACHE = new Map<string, Promise<DuneMask | null>>();

/** 0/1 mask from any numeric array (value > 0 and finite = dunes) */
export function toMask(values: ArrayLike<number | bigint>): { data: Uint8Array; count: number } {
  const data = new Uint8Array(values.length);
  let count = 0;
  for (let i = 0; i < values.length; i++) { const v = Number(values[i]); if (v > 0 && Number.isFinite(v)) { data[i] = 1; count++; } }
  return { data, count };
}

/** Load (once per URL) the dune mask of a cell store: array `dune`, else `dunes`; grid from the root attrs. */
export function loadDuneMask(cellStoreUrl: string, store?: zarr.AsyncReadable): Promise<DuneMask | null> {
  let p = CACHE.get(cellStoreUrl);
  if (!p) {
    p = (async () => {
      const root = zarr.root(store ?? new zarr.FetchStore(cellStoreUrl));
      const grp = await zarr.open.v3(root, { kind: "group" });
      const g = (grp.attrs as { grid?: CellGridGeo }).grid;
      let arr: zarr.Array<zarr.DataType, zarr.AsyncReadable>;
      try { arr = await zarr.open.v3(root.resolve("dune"), { kind: "array" }); } catch { arr = await zarr.open.v3(root.resolve("dunes"), { kind: "array" }); }
      const [ny, nx] = arr.shape;
      const v = (await zarr.get(arr)) as { data: ArrayLike<number> };
      const m = toMask(v.data);
      const grid = g ?? { lat0: 90, dlat: -180 / (ny - 1), lon0: -180, dlon: 360 / nx, ny, nx };
      if (grid.ny !== ny || grid.nx !== nx) throw new Error(`dune mask ${cellStoreUrl}: shape ${ny}x${nx} != grid ${grid.ny}x${grid.nx}`);
      return { ny, nx, data: m.data, grid, count: m.count };
    })().catch((e) => { console.warn(`[dune-atlas] dune mask ${cellStoreUrl} not available; 'Dunes only' shows all cells`, e); return null; });
    CACHE.set(cellStoreUrl, p);
  }
  return p;
}

const LEVELS = new WeakMap<DuneMask, Map<number, Uint8Array>>();
/** Mask of the pyramid level with block factor f (rows floor(ny/f), columns floor(nx/f)): 1 where any cell
 *  of the f x f block has dunes. f = 1: the mask itself. */
export function maskAtFactor(m: DuneMask, f: number): { ny: number; nx: number; data: Uint8Array } {
  const ny = Math.floor(m.ny / f), nx = Math.floor(m.nx / f);
  if (f === 1) return { ny, nx, data: m.data };
  let c = LEVELS.get(m);
  if (!c) LEVELS.set(m, (c = new Map()));
  let d = c.get(f);
  if (!d) {
    d = new Uint8Array(ny * nx);
    for (let y = 0; y < ny * f; y++) for (let x = 0; x < nx * f; x++) if (m.data[y * m.nx + x]) d[Math.floor(y / f) * nx + Math.floor(x / f)] = 1;
    c.set(f, d);
  }
  return { ny, nx, data: d };
}

/** Block factor of a pyramid level of shape [.., ny, nx] relative to the mask (null if not a block level). */
export function levelFactor(m: DuneMask, shape: readonly number[]): number | null {
  const ny = shape[shape.length - 2], nx = shape[shape.length - 1];
  const f = Math.round(m.nx / nx);
  return f >= 1 && Math.floor(m.nx / f) === nx && Math.floor(m.ny / f) === ny ? f : null;
}

/** The level-f mask as a vectors.ts Grid (cell centres), for applyMask on arrows / streamlines. */
export function maskGrid(m: DuneMask, f: number): VecGrid {
  const L = maskAtFactor(m, f), g = m.grid;
  return { data: Float32Array.from(L.data), nx: L.nx, ny: L.ny, lon0: g.lon0 + ((f - 1) / 2) * g.dlon, lat0: g.lat0 + ((f - 1) / 2) * g.dlat, dlon: g.dlon * f, dlat: g.dlat * f };
}

/** test hook */
export const _clearDuneMaskCache = () => CACHE.clear();
