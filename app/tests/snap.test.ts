import { describe, expect, it } from "vitest";
import { cellBounds, cellFromIndex, snapToCell, wrapLon, type Grid } from "../src/cell/snap";

describe("snapToCell", () => {
  it("rounds to the nearest 0.1-degree cell centre", () => {
    const c = snapToCell(15.23, -24.47)!;
    expect([c.lat, c.lon]).toEqual([-24.5, 15.2]);
    expect([c.iy, c.ix]).toEqual([1145, 1952]);
    expect(c.id).toBe(1145 * 3600 + 1952);
  });
  it("matches the decode-reference cell (1100, 1950) = (-20.0, 15.0)", () => {
    const c = snapToCell(15.0, -20.0)!;
    expect([c.iy, c.ix]).toEqual([1100, 1950]);
  });
  it("cell edges: values just inside either side of an edge go to the right cell", () => {
    expect(snapToCell(0.0499, 0)!.ix).toBe(1800);
    expect(snapToCell(0.0501, 0)!.ix).toBe(1801);
    expect(snapToCell(0, 0.0499)!.iy).toBe(900);
    expect(snapToCell(0, 0.0501)!.iy).toBe(899);
  });
  it("antimeridian: 179.96E and -179.96 both go to column 0 (centre -180)", () => {
    expect(snapToCell(179.96, 10)!.ix).toBe(0);
    expect(snapToCell(-179.96, 10)!.ix).toBe(0);
    expect(snapToCell(180, 10)!.ix).toBe(0);
    expect(snapToCell(179.94, 10)!.ix).toBe(3599);
    expect(snapToCell(179.94, 10)!.lon).toBe(179.9);
    expect(snapToCell(-179.94, 10)!.ix).toBe(1);
  });
  it("wraps longitudes from repeated worlds (mercator)", () => {
    expect(snapToCell(15.2 + 360, 0)!.ix).toBe(snapToCell(15.2, 0)!.ix);
    expect(snapToCell(15.2 - 720, 0)!.ix).toBe(snapToCell(15.2, 0)!.ix);
    expect(wrapLon(540)).toBe(-180);
    expect(wrapLon(-180)).toBe(-180);
  });
  it("poles: rows 0 and 1800, clamped beyond +/-90", () => {
    expect(snapToCell(0, 90)!.iy).toBe(0);
    expect(snapToCell(0, 89.96)!.iy).toBe(0);
    expect(snapToCell(0, 89.94)!.iy).toBe(1);
    expect(snapToCell(0, -90)!.iy).toBe(1800);
    expect(snapToCell(0, -91)!.iy).toBe(1800);
    expect(snapToCell(0, -90)!.lat).toBe(-90);
  });
  it("non-finite input -> null", () => {
    expect(snapToCell(NaN, 0)).toBeNull();
  });
  it("bounds clip at the poles", () => {
    const b = cellBounds(cellFromIndex(0, 0));
    expect(Math.max(...b.map((p) => p[1]))).toBe(90);
    expect(Math.min(...b.map((p) => p[0]))).toBeCloseTo(-180.05);
  });
  it("rejects out-of-range indices", () => {
    expect(() => cellFromIndex(1801, 0)).toThrow();
    expect(() => cellFromIndex(0, 3600)).toThrow();
  });
  it("round trip index -> centre -> index for the whole grid edge set", () => {
    for (const [iy, ix] of [[0, 0], [1800, 3599], [900, 1800], [1, 3599], [1799, 1]]) {
      const c = cellFromIndex(iy, ix);
      const s = snapToCell(c.lon, c.lat)!;
      expect([s.iy, s.ix]).toEqual([iy, ix]);
    }
  });
});

describe("grid-agnostic snapping (synthetic ERA5 0.25 deg grid)", () => {
  const G: Grid = { lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 };
  const G0: Grid = { ...G, lon0: 0 }; // ERA5 native longitudes 0..359.75
  it("snaps to 0.25 deg centres with ids iy * 1440 + ix", () => {
    const c = snapToCell(15.2, -24.5, G)!;
    expect([c.lat, c.lon]).toEqual([-24.5, 15.25]);
    expect([c.iy, c.ix]).toEqual([458, 781]);
    expect(c.id).toBe(458 * 1440 + 781);
  });
  it("wraps the antimeridian and handles lon0 = 0", () => {
    expect(snapToCell(179.9, 0, G)!.ix).toBe(0);
    expect(snapToCell(-179.9, 0, G)!.ix).toBe(0);
    const a = snapToCell(-10, 5, G0)!;
    expect(a.ix).toBe(1400); // 350 deg east of 0
    expect(a.lon).toBe(-10);
    expect(snapToCell(0.12, 5, G0)!.ix).toBe(0);
    expect(snapToCell(359.9, 5, G0)!.ix).toBe(0);
  });
  it("poles clamp to rows 0 and 720; bounds use the 0.25 deg spacing", () => {
    expect(snapToCell(0, 90, G)!.iy).toBe(0);
    expect(snapToCell(0, -90, G)!.iy).toBe(720);
    const b = cellBounds(cellFromIndex(458, 781, G), G);
    expect(b[1][0] - b[0][0]).toBeCloseTo(0.25, 9);
    expect(b[2][1] - b[1][1]).toBeCloseTo(0.25, 9);
  });
  it("regional grids return null outside", () => {
    const R: Grid = { lat0: 0, dlat: -0.1, lon0: 10, dlon: 0.1, ny: 100, nx: 100 };
    expect(snapToCell(5, -5, R)).toBeNull();
    expect(snapToCell(12, -5, R)!.ix).toBe(20);
  });
});
