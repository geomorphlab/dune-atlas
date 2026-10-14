// Selected-cell highlight at the poles (PI round 5 item 7), Earth grids: ERA5-Land 0.1° and ERA5 0.25°.
import { describe, it, expect } from "vitest";
import { ERA5_LAND_GRID, cellFeature, cellFromIndex } from "../src/cell/snap";
import { checkPolarCell, checkProjectionSwitch } from "./selectionlib";

const ERA5 = { lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 };
describe("selected-cell highlight at the poles (Earth)", () => {
  it("cells at 84–86° and 86–90° N/S: flat source clipped inside the Mercator limit, globe from the true bounds", () => {
    for (const g of [ERA5_LAND_GRID, ERA5]) for (const lat of [84.5, 85.0, 85.5, 86.5, 88, 89.9, 90]) for (const sgn of [1, -1]) checkPolarCell(g, sgn * lat);
  });
  it("a cell straddling 85.05° keeps a flat part below the limit; a cell across the antimeridian near the pole", () => {
    const { fc } = checkPolarCell(ERA5, 85.0);          // ERA5 cell 84.875–85.125 N
    expect(fc.features.length).toBe(2);   // clipped: fill + outline without the clipped edge
    expect(checkPolarCell(ERA5_LAND_GRID, 85.0).fc.features).toHaveLength(1);   // 84.95–85.05: below the limit, one polygon
    const c = cellFromIndex(30, 0, ERA5_LAND_GRID);  // 87 N, centred on -180
    const f = cellFeature(c, ERA5_LAND_GRID);
    expect(f.bbox![0]).toBeGreaterThan(f.bbox![2]);  // RFC 7946: west > east across the antimeridian
    expect(f.features).toHaveLength(0);
  });
  it("globe layers replace the GeoJSON layers on the globe, and the reverse in Mercator", () => {
    checkProjectionSwitch(ERA5_LAND_GRID, 89.5);
    checkProjectionSwitch(ERA5_LAND_GRID, 40);
  });
});
