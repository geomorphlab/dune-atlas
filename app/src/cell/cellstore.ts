// Read one ERA5-Land cell from the web cell store (`cells.zarr`, zarr v3, sharded 16x16 cells;
// see docs/storage-layout.md):
//   hist   [1801, 3600, 128 um, 128 ua] uint32   (inner chunk = one cell)
//   fields [1801, 3600, 23 var, 64 ut]  float32  (order in root attrs field_vars)
//   dunes  [1801, 3600] uint8 (canonical mask, layers.nc `dunes`)
// Ocean / no-data shards are absent and read as fill values (0 / NaN).
import { harmonizeAux } from "./auxinfo";
import * as zarr from "zarrita";
import { cellFromIndex, ERA5_LAND_GRID, type CellRef, type Grid } from "./snap";
import { binsFromEdges, DEFAULT_BINS, type Bins } from "./flux";
import { C } from "../util/constants";

export interface CellStoreAttrs {
  title?: string;
  source?: string;
  license?: string;
  grid: { lat0: number; dlat: number; lon0: number; dlon: number; ny: number; nx: number };
  um_edges: number[];
  ua_edges: number[];
  ua_convention?: string;
  ut_values: number[];
  ut_default_index: number;
  field_vars: string[];
  field_units: Record<string, string>;
  field_long_names: Record<string, string>;
  n_hours: number;
}

export interface CellData extends CellRef {
  /** 128 x 128 counts, index um * 128 + ua */
  hist: Uint32Array;
  /** 23 x 64 values in source units, index var * 64 + ut */
  fields: Float32Array;
  fieldVars: string[];
  /** histogram bin centres (from attrs um_edges / ua_edges) */
  bins: Bins;
  /** threshold values u*,th (m/s) of the `fields` ut axis (attrs ut_values) */
  utValues: number[];
  /** the store's grid (attrs grid) */
  grid: Grid;
  dune: boolean;
  /** false for ocean / outside the land mask (empty histogram and all-NaN fields) */
  hasData: boolean;
  totalHours: number;
  /** per-cell auxiliary variables (cells-aux.zarr sidecar), if available */
  aux?: CellAux;
}

/** Values of one cell from cells-aux.zarr: threshold series (ut) and scalars, with array attrs. */
export interface CellAux {
  series: Record<string, Float32Array>;
  scalars: Record<string, number>;
  attrs: Record<string, Record<string, unknown>>;
}

/** Reader for the cells-aux.zarr sidecar (same grid as cells.zarr; one array per variable:
 *  (lat, lon, ut) threshold series sharded like cells.zarr/fields, or (lat, lon) scalars in plain
 *  chunks). Absent chunks / shards (ocean) read as NaN. */
export class CellAuxStore {
  private constructor(readonly attrs: Record<string, unknown>, private arrays: Map<string, zarr.Array<zarr.DataType, Readable>>) {}

  static async open(src: string | Readable, opts: { useSuffixRequest?: boolean } = {}): Promise<CellAuxStore> {
    const base = typeof src === "string" ? new zarr.FetchStore(src, { useSuffixRequest: opts.useSuffixRequest ?? true }) : src;
    const root = zarr.root(new CachingStore(base));
    const group = await zarr.open(root, { kind: "group" });
    const vars = (group.attrs as { variables?: string[] }).variables ?? [];
    const arrays = new Map<string, zarr.Array<zarr.DataType, Readable>>();
    await Promise.all(vars.map(async (v) => { arrays.set(v, await zarr.open(root.resolve(v), { kind: "array" })); }));
    return new CellAuxStore(group.attrs as Record<string, unknown>, arrays);
  }

  get variables(): string[] { return [...this.arrays.keys()]; }

  async query(iy: number, ix: number): Promise<CellAux> {
    const out: CellAux = { series: {}, scalars: {}, attrs: {} };
    await Promise.all([...this.arrays].map(async ([v, a]) => {
      out.attrs[v] = a.attrs as Record<string, unknown>;
      if (a.shape.length === 3) {
        const r = await zarr.get(a, [iy, ix, null]);
        out.series[v] = Float32Array.from((r as { data: ArrayLike<number> }).data);
      } else {
        const r = await zarr.get(a, [iy, ix]);
        out.scalars[v] = Number(r);
      }
    }));
    return out;
  }
}

type Readable = zarr.AsyncReadable | zarr.Readable;

/** Wraps a store and memoises shard-index suffix reads (one per shard), metadata and dunes
 *  chunks, so repeated clicks inside a 16x16 shard cost two chunk range reads. */
export class CachingStore implements zarr.AsyncReadable {
  #inner: Readable;
  #cache = new Map<string, Promise<Uint8Array | undefined>>();
  #max: number;
  constructor(inner: Readable, maxEntries = 256) {
    this.#inner = inner;
    this.#max = maxEntries;
  }
  #remember(k: string, p: Promise<Uint8Array | undefined>) {
    if (this.#cache.size >= this.#max) this.#cache.delete(this.#cache.keys().next().value!);
    this.#cache.set(k, p);
    p.catch(() => this.#cache.delete(k));
    return p;
  }
  /** Whole-object reads: metadata and the small unsharded dunes chunks (sharded hist/fields
   *  are always read through getRange). */
  get(key: zarr.AbsolutePath, opts?: unknown) {
    const k = `get:${key}`;
    return this.#cache.get(k) ?? this.#remember(k, Promise.resolve(this.#inner.get(key, opts as never)));
  }
  getRange(key: zarr.AbsolutePath, range: zarr.RangeQuery, opts?: unknown) {
    const inner = this.#inner as zarr.AsyncReadable;
    if (!inner.getRange) throw new Error("store does not support range reads");
    if ("suffixLength" in range) {
      const k = `sfx:${key}:${range.suffixLength}`;
      return this.#cache.get(k) ?? this.#remember(k, Promise.resolve(inner.getRange(key, range, opts as never)));
    }
    return Promise.resolve(inner.getRange(key, range, opts as never));
  }
}

export class CellStore {
  readonly attrs: CellStoreAttrs;
  #hist: zarr.Array<"uint32", Readable>;
  #fields: zarr.Array<"float32", Readable>;
  #dunes: zarr.Array<"uint8", Readable>;

  #aux: Promise<CellAuxStore[]> = Promise.resolve([]);
  private constructor(attrs: CellStoreAttrs, hist: zarr.Array<"uint32", Readable>, fields: zarr.Array<"float32", Readable>, dunes: zarr.Array<"uint8", Readable>) {
    this.attrs = attrs;
    this.#hist = hist;
    this.#fields = fields;
    this.#dunes = dunes;
  }

  /** Open from a URL (FetchStore) or any zarrita-compatible store. */
  /** `opts.aux`: optional per-cell sidecars (cells-aux.zarr, cells-aux-<name>.zarr; URL or store,
   *  or a list); their variables are merged into `cell.aux`. A sidecar that cannot be opened only
   *  drops its own values (console.warn). */
  static async open(src: string | Readable, opts: { useSuffixRequest?: boolean; aux?: string | Readable | (string | Readable)[] } = {}): Promise<CellStore> {
    const base = typeof src === "string" ? new zarr.FetchStore(src, { useSuffixRequest: opts.useSuffixRequest ?? true }) : src;
    const store = new CachingStore(base);
    const root = zarr.root(store);
    const group = await zarr.open(root, { kind: "group" });
    const [hist, fields, dunes] = await Promise.all([
      zarr.open(root.resolve("hist"), { kind: "array" }),
      zarr.open(root.resolve("fields"), { kind: "array" }),
      zarr.open(root.resolve("dunes"), { kind: "array" }),
    ]);
    if (!hist.is("uint32")) throw new Error(`cells.zarr/hist: expected uint32, got ${hist.dtype}`);
    if (!fields.is("float32")) throw new Error(`cells.zarr/fields: expected float32, got ${fields.dtype}`);
    if (!dunes.is("uint8")) throw new Error(`cells.zarr/dunes: expected uint8, got ${dunes.dtype}`);
    const attrs = group.attrs as unknown as CellStoreAttrs;
    if (!Array.isArray(attrs.field_vars) || attrs.field_vars.length !== fields.shape[2])
      throw new Error("cells.zarr: root attrs field_vars missing or inconsistent with fields shape");
    const cs = new CellStore(attrs, hist, fields, dunes);
    const auxSrcs = opts.aux === undefined ? [] : Array.isArray(opts.aux) ? opts.aux : [opts.aux];
    cs.#aux = Promise.all(auxSrcs.map((s) => CellAuxStore.open(s, opts).then((a) => {
      const g = (a.attrs as { grid?: Grid }).grid;
      if (g && (g.ny !== cs.grid.ny || g.nx !== cs.grid.nx || g.lat0 !== cs.grid.lat0 || g.lon0 !== cs.grid.lon0)) throw new Error("sidecar grid differs from cells.zarr");
      return a;
    }).catch((e) => { console.warn(`[dune-atlas] per-cell sidecar ${typeof s === "string" ? s : ""} not available:`, e); return null; })))
      .then((xs) => xs.filter((x): x is CellAuxStore => x !== null));
    return cs;
  }

  /** the per-cell sidecars that could be opened (in configuration order) */
  auxStores(): Promise<CellAuxStore[]> { return this.#aux; }

  get fieldVars(): string[] {
    return this.attrs.field_vars;
  }

  /** Grid from root attrs `grid` (fallback: ERA5-Land 0.1 deg). */
  get grid(): Grid {
    const g = this.attrs.grid;
    return g && [g.lat0, g.dlat, g.lon0, g.dlon, g.ny, g.nx].every(Number.isFinite) ? { lat0: g.lat0, dlat: g.dlat, lon0: g.lon0, dlon: g.dlon, ny: g.ny, nx: g.nx } : ERA5_LAND_GRID;
  }

  /** Bin centres from root attrs um_edges / ua_edges (fallback: pipeline constants). */
  get bins(): Bins {
    return (this.#bins ??= Array.isArray(this.attrs.um_edges) && Array.isArray(this.attrs.ua_edges) ? binsFromEdges(this.attrs.um_edges, this.attrs.ua_edges) : DEFAULT_BINS);
  }
  #bins: Bins | undefined;

  get utValues(): number[] {
    return Array.isArray(this.attrs.ut_values) && this.attrs.ut_values.length ? this.attrs.ut_values : C.UT_VALUES;
  }

  async query(iy: number, ix: number): Promise<CellData> {
    const ref = cellFromIndex(iy, ix, this.grid);
    const [h, f, d, aux] = await Promise.all([
      zarr.get(this.#hist, [iy, ix, null, null]),
      zarr.get(this.#fields, [iy, ix, null, null]),
      zarr.get(this.#dunes, [iy, ix]),
      this.#aux.then(async (stores) => {
        if (!stores.length) return undefined;
        const parts = await Promise.all(stores.map((a) => a.query(iy, ix).catch((e) => { console.warn("[dune-atlas] per-cell sidecar read failed:", e); return undefined; })));
        const ok = parts.filter((p): p is CellAux => !!p);
        if (!ok.length) return undefined;
        // first store wins for a variable name present in several
        const out: CellAux = { series: {}, scalars: {}, attrs: {} };
        for (const p of [...ok].reverse()) { Object.assign(out.series, p.series); Object.assign(out.scalars, p.scalars); Object.assign(out.attrs, p.attrs); }
        return harmonizeAux(out);
      }),
    ]);
    const hist = h.data as Uint32Array;
    const fields = f.data as Float32Array;
    let total = 0;
    for (let i = 0; i < hist.length; i++) total += hist[i];
    const anyField = fields.some((v) => Number.isFinite(v));
    return { ...ref, hist, fields, fieldVars: this.attrs.field_vars, bins: this.bins, utValues: this.utValues, grid: this.grid, dune: Number(d) === 1, hasData: total > 0 || anyField, totalHours: total, ...(aux ? { aux } : {}) };
  }
}

/** Value of field `v` at threshold index `k` (source units), NaN if missing. */
export function fieldValue(cell: CellData, v: string, k: number): number {
  const i = cell.fieldVars.indexOf(v);
  if (i < 0) return NaN;
  return cell.fields[i * nUt(cell) + k];
}

/** Series of field `v` over all 64 thresholds. */
export function fieldSeries(cell: CellData, v: string): Float32Array {
  const i = cell.fieldVars.indexOf(v);
  const n = nUt(cell);
  if (i < 0) return new Float32Array(n).fill(NaN);
  return cell.fields.subarray(i * n, i * n + n);
}

/** Number of thresholds per field in this cell's vector. */
export function nUt(cell: Pick<CellData, "fields" | "fieldVars">): number {
  return cell.fields.length / Math.max(1, cell.fieldVars.length);
}
