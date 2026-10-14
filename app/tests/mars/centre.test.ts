// @vitest-environment happy-dom
// 'Centre map on this cell', Mars: 2° cells (polar cell 88–90° N on the globe / clamped flat).
import { describe, it, vi } from "vitest";
import { CellPanel } from "../../src/bodies/mars/ui/cellPanel";
import type { MarsCellStore } from "../../src/bodies/mars/cell/cellstore";
import { makeMarsCell, FIELD_VARS } from "./helpers";
import { checkCentre, checkHeaderButton } from "../centrelib";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });

describe("centre map on the cell (Mars)", () => {
  it("easeTo the cell centre (zoom kept / raised to show a 2° cell), reduced motion jumps, polar cell in both projections", () => {
    checkCentre(2, { lon: 67, lat: 9 }, { lon: -179, lat: 89 });
  });
  it("header button next to the coordinate title", async () => {
    await checkHeaderButton(async (onCentre) => {
      document.body.innerHTML = '<aside id="cell-panel"></aside>';
      const root = document.getElementById("cell-panel")!;
      const c = makeMarsCell(0);
      const p = new CellPanel(root, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {}, onCentre });
      await p.show({ query: async () => c, attrs: { grid: c.grid, field_vars: FIELD_VARS }, grid: c.grid } as unknown as MarsCellStore, c.iy, c.ix);
      return { root, lon: c.lon, lat: c.lat };
    });
  });
});
