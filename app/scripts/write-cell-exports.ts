// Write the per-cell downloads (NetCDF + CSV bundle) for fixture cells in node, for the xarray
// read-back check (scripts/check-netcdf.py).
//   vite-node scripts/write-cell-exports.ts -- <fixture dir> <out dir> [iy,ix ...]
import fs from "node:fs";
import path from "node:path";
import { CellStore } from "../src/cell/cellstore";
import { cellNetcdf, csvBundle, exportBaseName } from "../src/cell/export";

const args = process.argv.slice(2).filter((a) => a !== "--");
const base = path.resolve(args[0] ?? "../staging/fixture");
const out = path.resolve(args[1] ?? "../staging/check-netcdf");
const cellArgs = args.slice(2);
fs.mkdirSync(out, { recursive: true });

class FileStore {
  constructor(private root: string) {}
  async get(key: string) { const p = this.root + key; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
  async getRange(key: string, r: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + key;
    if (!fs.existsSync(p)) return undefined;
    const size = fs.statSync(p).size;
    const [off, len] = "suffixLength" in r ? [size - r.suffixLength, r.suffixLength] : [r.offset, r.length];
    const fd = fs.openSync(p, "r"); const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd);
    return new Uint8Array(b);
  }
}

const auxDirs = ["cells-aux.zarr", "cells-aux-veg.zarr"].map((d) => path.join(base, d)).filter((d) => fs.existsSync(d));
const store = await CellStore.open(new FileStore(path.join(base, "cells.zarr")), { aux: auxDirs.map((d) => new FileStore(d)) });
// dataset: store attrs `dataset.id` (ERA5 stores), else ERA5-Land
const dsId = ((store.attrs as unknown as { dataset?: { id?: string } }).dataset?.id) ?? "era5-land";
const DEFAULT_CELLS: Record<string, string[]> = { "era5-land": ["1145,1952", "1174,1954", "1072,1928"], era5: ["458,781", "450,790", "470,795"] };
const TITLES: Record<string, string> = { "era5-land": "ERA5-Land 0.1°, 1950–2024", era5: "ERA5 0.25°, 1950–2024" };
const cells = (cellArgs.length ? cellArgs : DEFAULT_CELLS[dsId]).map((s) => s.split(",").map(Number) as [number, number]);
const written: Record<string, unknown>[] = [];
for (const [iy, ix] of cells) {
  const cell = await store.query(iy, ix);
  const meta = { datasetId: dsId, datasetTitle: TITLES[dsId] ?? dsId, dataVersion: "v1", permalink: `https://map.geomorphlab.org/?cell=${iy},${ix}${dsId === "era5-land" ? "" : `&dataset=${dsId}`}`, storeAttrs: store.attrs, generated: new Date("2026-01-01T00:00:00Z") };
  const b = exportBaseName(cell, meta.datasetId);
  fs.writeFileSync(path.join(out, `${b}.nc`), cellNetcdf(cell, meta));
  fs.writeFileSync(path.join(out, `${b}.zip`), await csvBundle(cell, meta));
  written.push({ iy, ix, lat: cell.lat, lon: cell.lon, nc: `${b}.nc`, zip: `${b}.zip`, dataset: dsId });
}
fs.writeFileSync(path.join(out, "cells.json"), JSON.stringify(written, null, 1));
console.log(JSON.stringify(written));
