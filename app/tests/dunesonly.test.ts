// @vitest-environment happy-dom
// 'Dunes only', Earth: wind-derived layers masked to the dataset's dune cells from the
// published cells.zarr/dunes flag (map/dunemask.ts); synthetic pyramid + the ERA5 fixture when present.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry } from "../src/core/registry/load";
import { checkRealStores, checkSynthetic } from "./dunemasklib";
import { checkClassification, checkExportStrip, checkOverlayManager, checkToggleAndLinks } from "./dunesonlylib";
import { RangeFileStore } from "./mars/helpers";
import { levelFactor } from "../src/core/map/dunemask";

const reg = loadRegistry().registry;
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });
// Earth fixture (staging/ is not in git): EARTH_FIXTURE_ROOT or <repo>/staging/fixture
const FIX = process.env.EARTH_FIXTURE_ROOT ?? path.resolve(__dirname, "../../staging/fixture");
const ERA5 = path.join(FIX, "datasets/era5");
const haveEra5 = fs.existsSync(path.join(ERA5, "cells.zarr/dunes/zarr.json")) && fs.existsSync(path.join(ERA5, "fields/dpm.zarr/zarr.json"));

describe("Dunes only (Earth)", () => {
  it("wind-derived = the 24 sand-flux fields and qsdiv; dunes, aridity, vegetation unaffected", () => {
    checkClassification(reg, ["dunes", "aridity", "vegetation"]);
  });
  it("virtual store: values only in dune cells at level 0, block-any at coarser levels; vector mask grid", async () => {
    await checkSynthetic();
  });
  it("block factors of the published pyramids (fields/<var>.zarr multiscales layouts): every level is a block level", () => {
    const mk = (ny: number, nx: number) => ({ ny, nx, data: new Uint8Array(ny * nx), grid: { lat0: 90, lon0: -180, dlat: -180 / (ny - 1), dlon: 360 / nx, ny, nx }, count: 0 });
    const land = mk(1801, 3600), era5 = mk(721, 1440);
    expect([[1801, 3600], [900, 1800], [450, 900], [225, 450], [112, 225]].map(([y, x]) => levelFactor(land, [64, y, x]))).toEqual([1, 2, 4, 8, 16]);
    expect([[721, 1440], [360, 720], [180, 360], [90, 180]].map(([y, x]) => levelFactor(era5, [64, y, x]))).toEqual([1, 2, 4, 8]);
    expect(levelFactor(land, [64, 301, 600])).toBeNull();      // not a block level of the cell grid: shown unmasked
  });
  it.skipIf(!haveEra5)("ERA5 fixture: dpm at u*,th index 14 kept exactly in the cells.zarr dune cells, NaN elsewhere", async () => {
    const m = await checkRealStores(new RangeFileStore(path.join(ERA5, "cells.zarr")), new RangeFileStore(path.join(ERA5, "fields/dpm.zarr")), "dpm", 14, "era5-fixture");
    expect([m.ny, m.nx]).toEqual([721, 1440]);
    expect(m.count).toBeGreaterThan(0);
  });
  it("toggle next to the Wind dataset selector; round trip through short and long links", () => {
    checkToggleAndLinks(reg, "era5-land");
  });
  it("map export strip names Dunes only while it is on and a wind-derived layer is shown", () => {
    checkExportStrip(reg, "era5-land");
  });
  it("overlay manager: mask only for wind-derived layers while on, from the dataset's cells.zarr", () => {
    checkOverlayManager(reg, "dune-atlas/v1", /^https:\/\/data\.test\/dune-atlas\/v1\/cells\.zarr$/);
    checkOverlayManager(reg, "dune-atlas/v2/datasets/era5", /^https:\/\/data\.test\/dune-atlas\/v2\/datasets\/era5\/cells\.zarr$/);
  });
});
