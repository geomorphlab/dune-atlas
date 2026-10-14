// @vitest-environment happy-dom
// 'Dunes only' (PI round 5 item 6), Mars: wind-derived layers masked to the 2° cells overlapping a dune
// polygon (cells.zarr/dune; 2,749 cells in the real store, MARS_STORE_ROOT), fixture and synthetic pyramid.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry } from "../../src/registry/load";
import { checkRealStores, checkSynthetic } from "../dunemasklib";
import { checkClassification, checkOverlayManager, checkToggleAndLinks } from "../dunesonlylib";
import { FIXTURE_DS, RangeFileStore, haveFixture } from "./helpers";

const reg = loadRegistry().registry;
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });
const DS = process.env.MARS_STORE_ROOT ?? FIXTURE_DS;
const have = process.env.MARS_STORE_ROOT ? fs.existsSync(path.join(DS, "cells.zarr/zarr.json")) : haveFixture;

describe("Dunes only (Mars)", () => {
  it("wind-derived = the sand-flux fields and qsdiv; dunes, elevation and rho_mean (atmospheric, not wind) unaffected", () => {
    checkClassification(reg, ["dunes", "elevation", "rho_mean"]);
  });
  it("virtual store: values only in dune cells at level 0, block-any at coarser levels; vector mask grid", async () => {
    await checkSynthetic();
  });
  it.skipIf(!have)("cell store dune flag: dpm (d index 29) and qsdiv kept exactly in the dune cells, NaN elsewhere", async () => {
    const cells = new RangeFileStore(path.join(DS, "cells.zarr"));
    for (const v of ["dpm", "qsdiv"]) {
      if (!fs.existsSync(path.join(DS, `fields/${v}.zarr/zarr.json`))) continue;
      const m = await checkRealStores(cells, new RangeFileStore(path.join(DS, `fields/${v}.zarr`)), v, 29, `${DS}-${v}`);
      expect([m.ny, m.nx]).toEqual([90, 180]);
      if (process.env.MARS_STORE_ROOT) expect(m.count).toBe(2749);   // 2° cells overlapping a dune polygon
      expect(m.finite).toBeGreaterThan(0);                              // the store holds data (not a vacuous check)
      expect(m.kept).toBeGreaterThan(0);
    }
  });
  it("toggle next to the Wind dataset selector; round trip through short and long links", () => {
    checkToggleAndLinks(reg, "fv3-beta1");
  });
  it("overlay manager: mask only for wind-derived layers while on, from the dataset's cells.zarr", () => {
    checkOverlayManager(reg, "dune-atlas/mars/v1/datasets/fv3-beta1", /^https:\/\/data\.test\/dune-atlas\/mars\/v1\/datasets\/fv3-beta1\/cells\.zarr$/);
  });
});
