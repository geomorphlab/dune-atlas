// @vitest-environment happy-dom
// 'Centre map on this cell', Earth: 0.1° ERA5-Land cells.
import { describe, it, vi } from "vitest";
import { CellPanel } from "../src/ui/cellPanel";
import type { CellStore } from "../src/cell/cellstore";
import { makeCell, FIELD_VARS } from "./helpers";
import { checkCentre, checkHeaderButton } from "./centrelib";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });

describe("centre map on the cell (Earth)", () => {
  it("easeTo the cell centre (zoom kept / raised to show a 0.1° cell), reduced motion jumps, polar cell in both projections", () => {
    checkCentre(0.1, { lon: 15.2, lat: -24.5 }, { lon: 40, lat: 89.9 });
  });
  it("header button next to the coordinate title", async () => {
    await checkHeaderButton(async (onCentre) => {
      document.body.innerHTML = '<aside id="cell-panel"></aside>';
      const root = document.getElementById("cell-panel")!;
      const c = makeCell({ iy: 1145, ix: 1952, lat: -24.5, lon: 15.2, hist: new Uint32Array(16384), fields: new Float32Array(FIELD_VARS.length * 64), hasData: false });
      const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, onCentre });
      await p.show({ query: async () => c, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, c.iy, c.ix);
      return { root, lon: c.lon, lat: c.lat };
    });
  });
});
