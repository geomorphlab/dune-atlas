// Delivery-path check of a published wind dataset: reads cells and pyramid windows over HTTP with the app's own
// readers (src/cell/cellstore.ts CellStore + sidecars, zarrita FetchStore with suffix range requests) and writes the
// decoded values as JSON for scripts/verify_era5_r2.py to compare with the local / source values.
//   cd app && NODE_USE_ENV_PROXY=1 npx vite-node ../scripts/check_era5_delivery.ts <base-url> <request.json> <out.json>
// request.json: {cells: [[iy, ix], ...], windows: [{store, level, var, ut, y0, y1, x0, x1}, ...],
//                aux: ["cells-aux.zarr", "cells-aux-veg.zarr"], concurrency: 4}
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "..", "app");
const { CellStore } = await import(path.join(app, "src", "cell", "cellstore.ts"));
const zarr = await import(path.join(app, "node_modules", "zarrita", "dist", "src", "index.js"));

const [base, reqPath, outPath] = process.argv.slice(2).filter((a) => a !== "--");
const req = JSON.parse(fs.readFileSync(reqPath, "utf8"));
const conc: number = Math.min(4, req.concurrency ?? 4);

async function pool<T, R>(items: T[], fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

const t0 = Date.now();
const cs = await CellStore.open(`${base}/cells.zarr`, { aux: (req.aux ?? []).map((a: string) => `${base}/${a}`) });
const cells = await pool(req.cells as [number, number][], async ([iy, ix]) => {
  const c = await cs.query(iy, ix);
  return { cell: [iy, ix], hist: Array.from(c.hist as Uint32Array), fields: Array.from(c.fields as Float32Array, (v: number) => (Number.isNaN(v) ? null : v)),
           dune: c.dune, totalHours: c.totalHours,
           aux: c.aux ? { scalars: Object.fromEntries(Object.entries(c.aux.scalars).map(([k, v]) => [k, Number.isNaN(v as number) ? null : v])),
                          series: Object.fromEntries(Object.entries(c.aux.series).map(([k, v]) => [k, Array.from(v as Float32Array, (x: number) => (Number.isNaN(x) ? null : x))])) } : null };
});
const windows = await pool(req.windows ?? [], async (w: { store: string; level: string; var: string; ut: number; y0: number; y1: number; x0: number; x1: number }) => {
  const root = zarr.root(new zarr.FetchStore(`${base}/${w.store}`, { useSuffixRequest: true }));
  const a = await zarr.open(root.resolve(`${w.level}/${w.var}`), { kind: "array" });
  const r = await zarr.get(a, [w.ut, zarr.slice(w.y0, w.y1), zarr.slice(w.x0, w.x1)]);
  return { ...w, shape: r.shape, data: Array.from(r.data as Float32Array, (x: number) => (Number.isNaN(x) ? null : x)) };
});
fs.writeFileSync(outPath, JSON.stringify({ base, grid: cs.grid, n_hours: cs.attrs.n_hours, seconds: (Date.now() - t0) / 1000, cells, windows }));
console.log(`cells ${cells.length}, windows ${windows.length}, ${(Date.now() - t0) / 1000} s`);
