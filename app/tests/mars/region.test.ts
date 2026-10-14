// Mars region export: the 2° grid across 0° E (bounds -180..180 east-positive; 0-360 input gives the same box), hourly series in the file (lat, lon, hour),
// the dune fraction, the grain-diameter axis d, east longitudes in the title.
import { describe, expect, it } from "vitest";
import { boxCells, boxText, regionNetcdf, type RegionMeta } from "../../src/core/export/region";
import { MARS_GRID } from "../../src/bodies/mars/body";
import { M } from "../../src/bodies/mars/marsphysics";
import { readNc } from "../ncreader";
import type { CellData } from "../../src/core/cell/cellstore";

const NH = 6;
function cell(iy: number, ix: number): CellData {
  const vars = ["dpm", "rdpa"], n = 64;
  const fields = Float32Array.from({ length: vars.length * n }, (_, k) => iy * 100 + ix + k / 1000);
  const ser = (o: number) => Float32Array.from({ length: NH }, (_, k) => o + k);
  return { iy, ix, lat: MARS_GRID.lat0 + MARS_GRID.dlat * iy, lon: MARS_GRID.lon0 + MARS_GRID.dlon * ix, id: 0, hist: new Uint32Array(0), fields, fieldVars: vars,
    bins: { umCentres: [], uaCentres: [], umEdges: [], uaEdges: [] }, utValues: M.D_VALUES_UM, grid: MARS_GRID, dune: true, hasData: true, totalHours: NH,
    series: { u: ser(1), v: ser(2), T: ser(200), rho: ser(0.01), z: ser(1.5) }, ls: ser(0), sol: ser(0), duneFrac: 0.25 } as unknown as CellData;
}
const meta = (box: { west: number; east: number; south: number; north: number }): RegionMeta => ({ datasetId: "fv3-beta1", datasetTitle: "MCMC FV3", dataVersion: "v2", permalink: "https://map.geomorphlab.org/mars/", box, body: "mars",
  axis: { name: "d", units: "um", longName: "median grain diameter", values: M.D_VALUES_UM } });

describe("Mars region export", () => {
  it("a box across 0° E (east bounds 350 to 10) on the 2° grid", () => {
    const c = boxCells({ west: 350, east: 10, south: 0, north: 4 }, MARS_GRID);
    expect(c.lons).toEqual([-9, -7, -5, -3, -1, 1, 3, 5, 7, 9]);
    expect(c.lats).toEqual([3, 1]);
    expect(boxText({ west: 350, east: 10, south: 0, north: 4 })).toBe("0.00° N to 4.00° N, 10.00° W to 10.00° E");
    expect(boxCells({ west: -10, east: 10, south: 0, north: 4 }, MARS_GRID)).toEqual(c);
  });
  it("hourly series (lat, lon, hour), dune fraction, the d axis", () => {
    const box = { west: 350, east: 354, south: 0, north: 4 };
    const g = boxCells(box, MARS_GRID);
    const cells = g.iys.flatMap((iy) => g.ixs.map((ix) => cell(iy, ix)));
    const r = readNc(regionNetcdf(cells, g, MARS_GRID, { fields: ["dpm"], wind: true, aux: [], dune: true, allThresholds: true, current: 29 }, meta(box)));
    expect(r.dims.map((d) => [d.name, d.size])).toEqual([["lat", 2], ["lon", 2], ["nv", 2], ["d", 64], ["hour", NH]]);
    expect(r.vars.u.dims).toEqual(["lat", "lon", "hour"]);
    expect((r.vars.T.data as number[]).slice(0, 3)).toEqual([200, 201, 202]);
    expect((r.vars.dune_fraction.data as number[])[0]).toBeCloseTo(0.25, 6);
    expect((r.vars.d.data as number[])[29]).toBe(200);
    expect(r.vars.dpm.dims).toEqual(["d", "lat", "lon"]);
    expect(String(r.vars.lat.attrs.long_name)).toContain("planetocentric");
    expect(String(r.gatts.title)).toContain("10.00° W to 6.00° W");
    expect(String(r.gatts.references)).toContain("NASA Ames");
  });
});
