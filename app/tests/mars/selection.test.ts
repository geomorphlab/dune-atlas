// Selected-cell highlight at the poles on Mars (PI round 5 item 7): 2° cells 84–86, 86–88, 88–90 N/S.
import { describe, it, expect } from "vitest";
import { MARS_GRID } from "../../src/mars/body";
import { checkPolarCell, checkProjectionSwitch } from "../selectionlib";

describe("selected-cell highlight at the poles (Mars 2° grid)", () => {
  it("cells 84–86° (flat part clipped at 85.05°) and 86–88° / 88–90° (globe only), N and S", () => {
    for (const lat of [85, 87, 89]) for (const sgn of [1, -1]) {
      const { c, fc, geo } = checkPolarCell(MARS_GRID, sgn * lat);
      expect(Math.abs(c.lat)).toBe(lat);
      if (lat === 85) expect(fc.features.length).toBe(2); else expect(fc.features).toHaveLength(0);
      expect(geo.triangles.length).toBeGreaterThan(0);
    }
  });
  it("globe layers on the globe, GeoJSON in Mercator", () => {
    checkProjectionSwitch(MARS_GRID, 89);
    checkProjectionSwitch(MARS_GRID, 85);
  });
});
