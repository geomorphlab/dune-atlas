// Write a region export (NetCDF) of a fixture store in node and the per-cell NetCDF of two of its cells, for the
// xarray read-back check (scripts/check-region-netcdf.py).
//   vite-node scripts/write-region-export.ts -- <fixture dir> <out dir> <west> <south> <east> <north>
import fs from "node:fs";
import path from "node:path";
import { CellStore } from "../src/core/cell/cellstore";
import { cellNetcdf } from "../src/core/cell/export";
import { boxCells, fetchRegion, regionNetcdf, type RegionMeta } from "../src/core/export/region";
import { isPublishedField } from "../src/core/util/constants";
import { AUX_META } from "../src/core/cell/auxinfo";

const args = process.argv.slice(2).filter((a) => a !== "--");
const base = path.resolve(args[0] ?? "../staging/fixture");
const out = path.resolve(args[1] ?? "../staging/check-region");
const [west, south, east, north] = (args.length >= 6 ? args.slice(2, 6) : ["14.8", "-25", "15.6", "-24.4"]).map(Number);
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
const dsId = ((store.attrs as unknown as { dataset?: { id?: string } }).dataset?.id) ?? "era5-land";
const box = { west, south, east, north };
const cells = boxCells(box, store.grid);
const data = await fetchRegion(store, cells, { wind: true });
const meta: RegionMeta = { datasetId: dsId, datasetTitle: dsId, dataVersion: "v1", permalink: "https://map.geomorphlab.org/", box, body: "earth",
  axis: { name: "ut", units: "m s-1", longName: "threshold friction velocity", values: store.utValues }, storeAttrs: store.attrs, generated: new Date("2026-01-01T00:00:00Z") };
const sel = { fields: store.fieldVars.filter((v) => isPublishedField(v)), wind: true, aux: Object.keys(AUX_META), dune: true, allThresholds: true, current: 14 };
fs.writeFileSync(path.join(out, "region.nc"), regionNetcdf(data, cells, store.grid, sel, meta));
fs.writeFileSync(path.join(out, "region-current.nc"), regionNetcdf(data, cells, store.grid, { ...sel, wind: false, allThresholds: false }, meta));
// two cells with data, written by the per-cell export, to compare values
const picks = data.map((c, k) => [c, k] as const).filter(([c]) => c).slice(0, 2);
const index = picks.map(([c, k]) => {
  const name = `cell_${c!.iy}_${c!.ix}.nc`;
  fs.writeFileSync(path.join(out, name), cellNetcdf(c!, { datasetId: dsId, datasetTitle: dsId, dataVersion: "v1", permalink: "x", storeAttrs: store.attrs, generated: new Date(0) }));
  return { file: name, row: Math.floor(k / cells.ixs.length), col: k % cells.ixs.length };
});
fs.writeFileSync(path.join(out, "cells.json"), JSON.stringify(index));
console.log(`region ${cells.iys.length} x ${cells.ixs.length}, ${data.filter(Boolean).length} cells with data -> ${out}`);
