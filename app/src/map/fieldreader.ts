// Read a lon/lat window of one threshold slice from a GeoZarr multiscale field store
// (topozarr layout: root attrs multiscales.layout[{asset, spatial:transform, spatial:shape}],
// arrays <asset>/<variable> with dims (ut, y, x), EPSG:4326, pixel registration). Used by the
// arrows / streamlines renderer; the colour-map rendering itself is done by zarr-layer.
import * as zarr from "zarrita";
import type { Grid } from "./vectors";

interface Level { asset: string; transform: number[]; shape: [number, number] }
type Readable = zarr.AsyncReadable | zarr.Readable;

export class FieldReader {
  readonly levels: Level[];
  #arrays = new Map<string, Promise<zarr.Array<zarr.DataType, Readable>>>();
  private constructor(private root: zarr.Location<Readable>, private variable: string, levels: Level[]) {
    this.levels = levels;
  }

  static async open(src: string | Readable, variable: string, opts: { useSuffixRequest?: boolean } = {}): Promise<FieldReader> {
    const store = typeof src === "string" ? new zarr.FetchStore(src, { useSuffixRequest: opts.useSuffixRequest ?? true }) : src;
    const root = zarr.root(store);
    const g = await zarr.open(root, { kind: "group" });
    const ms = (g.attrs as { multiscales?: { layout?: Record<string, unknown>[] } }).multiscales;
    const layout = ms?.layout;
    if (!Array.isArray(layout) || !layout.length) throw new Error("not a multiscales store (no multiscales.layout)");
    const levels = layout.map((l) => ({ asset: String(l.asset), transform: l["spatial:transform"] as number[], shape: l["spatial:shape"] as [number, number] }));
    levels.sort((a, b) => Math.abs(a.transform[0]) - Math.abs(b.transform[0])); // finest first
    return new FieldReader(root, variable, levels);
  }

  /** Level whose cell size is the largest that is still <= `targetDeg` (finest if none),
   *  further coarsened so that a window of `areaDeg2` holds at most `maxCells` cells. */
  chooseLevel(targetDeg: number, areaDeg2 = 0, maxCells = 400_000): number {
    let best = 0;
    this.levels.forEach((l, i) => { if (Math.abs(l.transform[0]) <= targetDeg) best = i; });
    while (best < this.levels.length - 1 && areaDeg2 / this.levels[best].transform[0] ** 2 > maxCells) best++;
    return best;
  }

  #array(level: number) {
    const a = this.levels[level].asset;
    let p = this.#arrays.get(a);
    if (!p) {
      p = zarr.open(this.root.resolve(`${a}/${this.variable}`), { kind: "array" });
      this.#arrays.set(a, p);
    }
    return p;
  }

  /** Window [west, south, east, north] (clipped to the store) of threshold index `ut`. */
  async read(level: number, ut: number, bounds: [number, number, number, number]): Promise<Grid> {
    const L = this.levels[level];
    const [dx, , x0, , dy, y0] = L.transform; // edges; dy < 0
    const [ny, nx] = L.shape;
    let [w, s, e, n] = bounds;
    if (e - w >= 360 || e < w) { w = -180; e = 180; }
    const i0 = Math.max(0, Math.floor((w - x0) / dx) - 1), i1 = Math.min(nx, Math.ceil((e - x0) / dx) + 1);
    const j0 = Math.max(0, Math.floor((n - y0) / dy) - 1), j1 = Math.min(ny, Math.ceil((s - y0) / dy) + 1);
    if (i1 <= i0 || j1 <= j0) return { data: new Float32Array(0), nx: 0, ny: 0, lon0: 0, lat0: 0, dlon: dx, dlat: dy };
    const arr = await this.#array(level);
    const r = await zarr.get(arr, [ut, zarr.slice(j0, j1), zarr.slice(i0, i1)]);
    return { data: r.data as Float32Array, nx: i1 - i0, ny: j1 - j0, lon0: x0 + (i0 + 0.5) * dx, lat0: y0 + (j0 + 0.5) * dy, dlon: dx, dlat: dy };
  }
}
