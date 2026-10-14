// Read one Mars cell from the web cell store (cells.zarr, zarr v3, sharded 16x16 cells, inner
// chunk = 1 cell; data contract in docs/guide/mars.md):
//   series [90, 180, 5, 16032] float32  u, v (m/s, toward east/north), T (K), rho (kg m^-3), z (m, lowest-level height) per hour
//   fields [90, 180, 23, 64]   float32  (order: root attrs field_vars; last axis = grain-size index)
//   dunes  [90, 180] float32 overlap fraction; dune [90, 180] uint8 (fraction > 0)
//   ls, sol [16032] float32
// The returned cell is a CellData (so fieldValue / nUt / modeDefined work unchanged) plus the
// hourly series; `hist` is empty and `utValues` holds the grain diameters d (µm).
import * as zarr from "zarrita";
import { CachingStore, CellAuxStore, type CellAux, type CellData } from "../../../core/cell/cellstore";
import { harmonizeAux } from "../../../core/cell/auxinfo";
import { cellFromIndex, type Grid } from "../../../core/cell/snap";
import { DEFAULT_BINS, type Bins } from "../../../core/cell/flux";
import { M } from "../marsphysics";
import { MARS_GRID } from "../body";

type Readable = zarr.AsyncReadable | zarr.Readable;

export interface MarsCellStoreAttrs {
  grid: Grid & { cell_registration?: string };
  body?: string;
  dataset?: { id: string; name: string; resolution_deg: number; n_hours: number; source?: string; citation?: string };
  field_vars: string[];
  field_units?: Record<string, string>;
  field_long_names?: Record<string, string>;
  d_values_um: number[];
  d_default_index: number;
  series_vars: string[];
  series_units?: Record<string, string>;
  constants?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface MarsSeries { u: Float32Array; v: Float32Array; T: Float32Array; rho: Float32Array; z: Float32Array }

export interface MarsCellData extends CellData {
  body: "mars";
  series: MarsSeries;
  /** areocentric solar longitude (deg, 0-360) and sol of every hour */
  ls: Float32Array;
  sol: Float32Array;
  /** dune overlap fraction of the cell (0-1) */
  duneFrac: number;
  /** grain diameters of the fields' last axis (µm) */
  dValuesUm: number[];
}

/** direction bins of the rose computation: the Earth 128 bins (edges -pi..pi, toward, CCW from east) */
export const MARS_BINS: Bins = { umCentres: [], uaCentres: DEFAULT_BINS.uaCentres, umEdges: [], uaEdges: DEFAULT_BINS.uaEdges };

export class MarsCellStore {
  readonly attrs: MarsCellStoreAttrs;
  #series: zarr.Array<"float32", Readable>;
  #fields: zarr.Array<"float32", Readable>;
  #dunes: zarr.Array<zarr.DataType, Readable>;
  #dune: zarr.Array<zarr.DataType, Readable> | null;
  #time: Promise<{ ls: Float32Array; sol: Float32Array }>;
  #aux: Promise<CellAuxStore[]> = Promise.resolve([]);

  private constructor(attrs: MarsCellStoreAttrs, series: zarr.Array<"float32", Readable>, fields: zarr.Array<"float32", Readable>, dunes: zarr.Array<zarr.DataType, Readable>, dune: zarr.Array<zarr.DataType, Readable> | null, time: Promise<{ ls: Float32Array; sol: Float32Array }>) {
    this.attrs = attrs;
    this.#series = series;
    this.#fields = fields;
    this.#dunes = dunes;
    this.#dune = dune;
    this.#time = time;
  }

  static async open(src: string | Readable, opts: { useSuffixRequest?: boolean; aux?: string | Readable | (string | Readable)[] } = {}): Promise<MarsCellStore> {
    const base = typeof src === "string" ? new zarr.FetchStore(src, { useSuffixRequest: opts.useSuffixRequest ?? true }) : src;
    const root = zarr.root(new CachingStore(base));
    const group = await zarr.open(root, { kind: "group" });
    const [series, fields, dunes, dune] = await Promise.all([
      zarr.open(root.resolve("series"), { kind: "array" }),
      zarr.open(root.resolve("fields"), { kind: "array" }),
      zarr.open(root.resolve("dunes"), { kind: "array" }),
      zarr.open(root.resolve("dune"), { kind: "array" }).catch(() => null),
    ]);
    if (!series.is("float32")) throw new Error(`cells.zarr/series: expected float32, got ${series.dtype}`);
    if (!fields.is("float32")) throw new Error(`cells.zarr/fields: expected float32, got ${fields.dtype}`);
    const attrs = group.attrs as unknown as MarsCellStoreAttrs;
    if (!Array.isArray(attrs.field_vars) || attrs.field_vars.length !== fields.shape[2])
      throw new Error("cells.zarr: root attrs field_vars missing or inconsistent with fields shape");
    const sv = attrs.series_vars ?? M.SERIES_VARS;
    if (series.shape[2] !== 5 || sv.join(",") !== "u,v,T,rho,z") throw new Error(`cells.zarr/series: expected (lat, lon, 5 [u, v, T, rho, z], hour), got ${series.shape} ${sv}`);
    const vec = async (name: string) => {
      try { const a = await zarr.open(root.resolve(name), { kind: "array" }); return Float32Array.from((await zarr.get(a, [null])).data as ArrayLike<number>); }
      catch { return new Float32Array(series.shape[3]).fill(NaN); }
    };
    const time = Promise.all([vec("ls"), vec("sol")]).then(([ls, sol]) => ({ ls, sol }));
    const cs = new MarsCellStore(attrs, series, fields, dunes, dune, time);
    const auxSrcs = opts.aux === undefined ? [] : Array.isArray(opts.aux) ? opts.aux : [opts.aux];
    cs.#aux = Promise.all(auxSrcs.map((s) => CellAuxStore.open(s, opts).then((a) => {
      const g = (a.attrs as { grid?: Grid }).grid;
      if (g && (g.ny !== cs.grid.ny || g.nx !== cs.grid.nx || g.lat0 !== cs.grid.lat0 || g.lon0 !== cs.grid.lon0)) throw new Error("sidecar grid differs from cells.zarr");
      return a;
    }).catch((e) => { console.warn(`[dune-atlas] per-cell sidecar ${typeof s === "string" ? s : ""} not available:`, e); return null; })))
      .then((xs) => xs.filter((x): x is CellAuxStore => x !== null));
    return cs;
  }

  auxStores(): Promise<CellAuxStore[]> { return this.#aux; }
  get fieldVars(): string[] { return this.attrs.field_vars; }
  get nHours(): number { return this.#series.shape[3]; }

  /** grid from root attrs `grid` (fallback: the data-contract Mars grid) */
  get grid(): Grid {
    const g = this.attrs.grid;
    return g && [g.lat0, g.dlat, g.lon0, g.dlon, g.ny, g.nx].every(Number.isFinite) ? { lat0: g.lat0, dlat: g.dlat, lon0: g.lon0, dlon: g.dlon, ny: g.ny, nx: g.nx } : MARS_GRID;
  }
  get bins(): Bins { return MARS_BINS; }
  /** grain diameters (µm) of the fields' last axis */
  get utValues(): number[] {
    return Array.isArray(this.attrs.d_values_um) && this.attrs.d_values_um.length ? this.attrs.d_values_um : M.D_VALUES_UM;
  }

  async query(iy: number, ix: number): Promise<MarsCellData> {
    const ref = cellFromIndex(iy, ix, this.grid);
    const [s, f, d, d1, time, aux] = await Promise.all([
      zarr.get(this.#series, [iy, ix, null, null]),
      zarr.get(this.#fields, [iy, ix, null, null]),
      zarr.get(this.#dunes, [iy, ix]),
      this.#dune ? zarr.get(this.#dune, [iy, ix]) : Promise.resolve(null),
      this.#time,
      this.#aux.then(async (stores) => {
        if (!stores.length) return undefined;
        const parts = await Promise.all(stores.map((a) => a.query(iy, ix).catch((e) => { console.warn("[dune-atlas] per-cell sidecar read failed:", e); return undefined; })));
        const ok = parts.filter((p): p is CellAux => !!p);
        if (!ok.length) return undefined;
        const out: CellAux = { series: {}, scalars: {}, attrs: {} };
        for (const p of [...ok].reverse()) { Object.assign(out.series, p.series); Object.assign(out.scalars, p.scalars); Object.assign(out.attrs, p.attrs); }
        return harmonizeAux(out);
      }),
    ]);
    const sd = s.data as Float32Array, n = this.nHours;
    const series: MarsSeries = { u: sd.subarray(0, n), v: sd.subarray(n, 2 * n), T: sd.subarray(2 * n, 3 * n), rho: sd.subarray(3 * n, 4 * n), z: sd.subarray(4 * n, 5 * n) };
    const fields = f.data as Float32Array;
    const frac = Number(d);
    let valid = 0;
    for (let k = 0; k < n; k++) if (Number.isFinite(series.u[k]) && Number.isFinite(series.v[k]) && series.T[k] > 0 && series.rho[k] > 0 && series.z[k] > 0) valid++;
    const dune = d1 !== null ? Number(d1) === 1 : frac > 0;
    return {
      ...ref, body: "mars", hist: new Uint32Array(0), fields, fieldVars: this.attrs.field_vars, bins: MARS_BINS, utValues: this.utValues, grid: this.grid,
      dune, duneFrac: Number.isFinite(frac) ? frac : 0, hasData: valid > 0, totalHours: valid, series, ls: time.ls, sol: time.sol, dValuesUm: this.utValues,
      ...(aux ? { aux } : {}),
    };
  }
}
