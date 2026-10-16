// @vitest-environment happy-dom
// The EMARS and MACDA fixture stores (scripts/mars/app/make_fixture.py -> staging/fixture-mars; skipped when absent):
// cells.zarr on the native grids with the store's own sample count and sampling, the panel and the downloads of a
// real store, the cells at the edges (EMARS outer rows, MACDA columns either side of 180°) and the field pyramids'
// georeferencing (MACDA column 0 centred on -180°: the pyramid starts at -182.5°).
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MarsCellStore } from "../../src/bodies/mars/cell/cellstore";
import { analyseMarsCell } from "../../src/bodies/mars/cell/analysis";
import { cellNetcdf } from "../../src/bodies/mars/cell/export";
import { CellPanel } from "../../src/bodies/mars/cellPanel";
import { marsSampling } from "../../src/bodies/mars/datasets";
import { M } from "../../src/bodies/mars/marsphysics";
import { EXAMPLE_CELL } from "../../src/bodies/mars/body";
import { fieldValue } from "../../src/core/cell/cellstore";
import { datasetGrid, datasetInfo } from "../../src/core/cell/datasetinfo";
import { snapToCell } from "../../src/core/cell/snap";
import { FieldReader } from "../../src/core/map/fieldreader";
import { rendererPixelCentre, storeGeoFromAttrs } from "../../src/core/map/zarrgeo";
import { loadRegistry } from "../../src/core/registry/load";
import { Store } from "../../src/core/store";
import { readNc } from "../ncreader";
import { fixtureDataset, haveDatasetFixture, RangeFileStore } from "./helpers";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });
const reg = loadRegistry().registry;
const open = (id: string) => MarsCellStore.open(new RangeFileStore(path.join(fixtureDataset(id), "cells.zarr")), { aux: new RangeFileStore(path.join(fixtureDataset(id), "cells-aux.zarr")) });
const rootAttrs = (p: string) => (JSON.parse(fs.readFileSync(path.join(p, "zarr.json"), "utf8")) as { attributes: Record<string, unknown> }).attributes;

const CASES = [
  { id: "emars-v1-my30", sps: 24, word: "hourly", edges: [[0, 40], [33, 50]] as [number, number][], bounds: [-180, -87.42857142857143, 180, 87.42857142857143], first: [-177, 84.857142857] },
  { id: "macda-v2-my30", sps: 12, word: "two-hourly", edges: [[16, 0], [16, 71]] as [number, number][], bounds: [-182.5, -90, 177.5, 90], first: [-180, 87.5] },
];

for (const C of CASES) {
  describe.skipIf(!haveDatasetFixture(C.id))(`${C.id} fixture stores`, () => {
    it("root attrs: the registry grid, the store's own sample count and samples per sol", async () => {
      const s = await open(C.id);
      expect(s.attrs.grid).toEqual({ ...datasetGrid(C.id), cell_registration: "centre" });
      expect(s.grid).toEqual(datasetGrid(C.id));
      expect(s.datasetId).toBe(C.id);
      expect(s.samplesPerSol).toBe(C.sps);
      expect(s.attrs.dataset?.samples_per_sol).toBe(datasetInfo(C.id).series?.samplesPerSol);
      expect(s.nHours).toBe(s.attrs.dataset?.n_hours);
      expect(s.nHours).not.toBe(datasetInfo(C.id).nHours);   // the fixture's count, not the registry's nominal one
    });
    it("the tour cell: series on the dataset's sampling, flat-rose total = stored DP, aux", async () => {
      const s = await open(C.id);
      const c = snapToCell(EXAMPLE_CELL.lon, EXAMPLE_CELL.lat, s.grid)!;
      const cell = await s.query(c.iy, c.ix);
      expect(cell.hasData).toBe(true);
      expect(cell.totalHours).toBe(s.nHours);
      expect(cell.series.u.length).toBe(s.nHours);
      expect([cell.samplesPerSol, cell.datasetId]).toEqual([C.sps, C.id]);
      expect(cell.sol[1] - cell.sol[0]).toBeCloseTo(1 / C.sps, 6);
      expect(cell.sol[cell.sol.length - 1]).toBeCloseTo((s.nHours - 1) / C.sps, 3);
      expect(cell.aux?.series.qsdiv?.length).toBe(64);
      for (const k of [0, 29, 63]) {
        const v = analyseMarsCell(cell, k, { fluxSectors: 32 });
        expect(Math.abs(v.fluxTotal / (fieldValue(cell, "dpm", k) * M.S2Y) - 1), `d index ${k}`).toBeLessThan(1e-5);
      }
    });
    it("cells at the grid edges carry data (EMARS outer rows, MACDA columns either side of 180°)", async () => {
      const s = await open(C.id);
      for (const [iy, ix] of C.edges) {
        const cell = await s.query(iy, ix);
        expect(cell.hasData, `${iy},${ix}`).toBe(true);
        expect(snapToCell(cell.lon, cell.lat, s.grid)).toMatchObject({ iy, ix });
      }
    });
    it("field pyramids: cell-edge bounds and pixel centres on the cell centres", () => {
      const geo = storeGeoFromAttrs(rootAttrs(path.join(fixtureDataset(C.id), "fields", "dpm.zarr")))!;
      geo.bounds.forEach((b, k) => expect(b).toBeCloseTo(C.bounds[k], 6));
      const [lon, lat] = rendererPixelCentre(geo, 0, 0);
      expect(lon).toBeCloseTo(C.first[0], 6);
      expect(lat).toBeCloseTo(C.first[1], 6);
      const g = datasetGrid(C.id)!;
      const [lon2, lat2] = rendererPixelCentre(geo, g.ny - 1, g.nx - 1);
      expect(lon2).toBeCloseTo(g.lon0 + g.dlon * (g.nx - 1), 6);
      expect(lat2).toBeCloseTo(g.lat0 + g.dlat * (g.ny - 1), 6);
    });
    it("arrows / streamlines reader: a window across 180° joins the last and the first columns", async () => {
      const r = await FieldReader.open(new RangeFileStore(path.join(fixtureDataset(C.id), "fields", "rdpa.zarr")), "rdpa");
      const w = await r.read(0, 29, [170, -10, -170, 10]);
      const g = datasetGrid(C.id)!;
      expect(w.dlon).toBeCloseTo(g.dlon, 9);
      expect(w.nx * w.dlon).toBeGreaterThan(20);
      // centre of window column j: lon0 + j dlon (unwrapped past 180)
      const lons = Array.from({ length: w.nx }, (_, j) => w.lon0 + j * w.dlon);
      expect(lons.some((x) => Math.abs(x - 180 - (C.id.startsWith("macda") ? 0 : 3)) < 1e-6)).toBe(true);
      expect(Array.from(w.data).some(Number.isFinite)).toBe(true);
    });
    it("panel and NetCDF from the store: the dataset's sampling words and sample count", async () => {
      const s = await open(C.id);
      const c = snapToCell(EXAMPLE_CELL.lon, EXAMPLE_CELL.lat, s.grid)!;
      document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
      const root = document.getElementById("cell-panel")!;
      const meta = { datasetId: C.id, datasetTitle: reg.datasets!.find((d) => d.id === C.id)!.title, dataVersion: "v2", permalink: "https://example.org/mars/" };
      const store = new Store({ basemap: reg.basemaps[0].id, projection: "globe", utIndex: 29, layers: {}, order: [], dataset: C.id, cell: null, embed: false });
      const panel = new CellPanel(root, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {}, threshold: { def: reg.threshold, store }, exportMeta: () => meta });
      await panel.show(s, c.iy, c.ix);
      const t = (root.textContent ?? "").replace(/\s+/g, " ").replace(/\u00a0/g, " ");
      expect(t).toContain(`% of the ${s.nHours.toLocaleString("en")} ${C.word} samples`);
      expect(t).toContain(`${datasetInfo(C.id).name} lowest-level wind`);
      const nc = readNc(cellNetcdf(await s.query(c.iy, c.ix), { ...meta, storeAttrs: s.attrs as never }));
      expect(Object.fromEntries(nc.dims.map((d) => [d.name, d.size])).hour).toBe(s.nHours);
      expect(nc.gatts.samples_per_sol).toEqual([C.sps]);
      expect(String(nc.gatts.title)).toContain(`${datasetInfo(C.id).name} ${marsSampling(C.sps).adjective} lowest-level wind`);
    });
  });
}
