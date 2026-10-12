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
const cells = (args.length > 2 ? args.slice(2) : ["1145,1952", "1174,1954", "1072,1928"]).map((s) => s.split(",").map(Number) as [number, number]);
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
const written: Record<string, unknown>[] = [];
for (const [iy, ix] of cells) {
  const cell = await store.query(iy, ix);
  const meta = { datasetId: "era5-land", datasetTitle: "ERA5-Land 1950–2024 (0.1°)", dataVersion: "v1", permalink: `https://map.geomorphlab.org/?cell=${iy},${ix}`, storeAttrs: store.attrs, generated: new Date("2026-01-01T00:00:00Z") };
  const b = exportBaseName(cell, meta.datasetId);
  fs.writeFileSync(path.join(out, `${b}.nc`), cellNetcdf(cell, meta));
  fs.writeFileSync(path.join(out, `${b}.zip`), await csvBundle(cell, meta));
  written.push({ iy, ix, lat: cell.lat, lon: cell.lon, nc: `${b}.nc`, zip: `${b}.zip` });
}
fs.writeFileSync(path.join(out, "cells.json"), JSON.stringify(written, null, 1));
console.log(JSON.stringify(written));
