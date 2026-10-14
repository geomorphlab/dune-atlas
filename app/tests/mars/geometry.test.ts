// Mars geometry: snapping on the 2° contract grid, planet-aware distances (patched Earth modules),
// the body-aware scale bar and the Esri geographic -> Web-Mercator tile plan.
import { describe, expect, it } from "vitest";
import { cellBounds, cellFeature, cellFromIndex, snapToCell } from "../../src/cell/snap";
import { MARS_GRID, EXAMPLE_CELL } from "../../src/bodies/mars/body";
import { metersPerPixel } from "../../src/layerconfig";
import { scaleBar } from "../../src/export/mapExport";
import { roundScale, scaleFor, sphereDistance } from "../../src/bodies/mars/map/scale";
import { extraLevels, planTile, RES0, sourceUrl } from "../../src/bodies/mars/map/esri";
import { clampPmtilesBasemaps, pmtilesArchive, resolvePmtilesTiles } from "../../src/bodies/mars/map/basemaps";
import { loadRegistry } from "../../src/registry/load";
import { M } from "../../src/cell/marsphysics";

describe("snap on the Mars grid (rows 89 -> -89, columns -179 -> 179, 2° centres)", () => {
  it("corner cells and the tour cell", () => {
    expect(cellFromIndex(0, 0, MARS_GRID)).toMatchObject({ lat: 89, lon: -179, id: 0 });
    expect(cellFromIndex(89, 179, MARS_GRID)).toMatchObject({ lat: -89, lon: 179, id: 89 * 180 + 179 });
    const c = snapToCell(EXAMPLE_CELL.lon, EXAMPLE_CELL.lat, MARS_GRID)!;
    expect([c.iy, c.ix, c.lat, c.lon]).toEqual([40, 123, 9, 67]);
  });
  it("cell edges at even degrees; longitude wraps; latitude clamps; the grid is global", () => {
    expect(snapToCell(-180, 0, MARS_GRID)!.ix).toBe(0);      // -180 belongs to the cell centred at -179
    expect(snapToCell(179.99, 0, MARS_GRID)!.ix).toBe(179);
    expect(snapToCell(181, 0, MARS_GRID)!.ix).toBe(0);       // wraps
    expect(snapToCell(0, 90, MARS_GRID)!.iy).toBe(0);
    expect(snapToCell(0, -90, MARS_GRID)!.iy).toBe(89);
    expect(snapToCell(66.01, 8.01, MARS_GRID)).toMatchObject({ lat: 9, lon: 67 });
    expect(snapToCell(65.99, 7.99, MARS_GRID)).toMatchObject({ lat: 7, lon: 65 });
    expect(cellBounds(cellFromIndex(0, 0, MARS_GRID), MARS_GRID)[0]).toEqual([-180, 88]);
    expect(cellFeature(cellFromIndex(40, 179, MARS_GRID), MARS_GRID).features).toHaveLength(1); // edge at +180, no split
    expect(cellFeature(cellFromIndex(0, 179, MARS_GRID), MARS_GRID).features).toHaveLength(0);  // 88–90 N: globe layers only
  });
});

describe("planet-aware distances (Mars body profile)", () => {
  it("Web-Mercator ground resolution uses R_MARS", () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo((2 * Math.PI * M.R_MARS) / 512, 6);
    expect(metersPerPixel(60, 3)).toBeCloseTo((2 * Math.PI * M.R_MARS * 0.5) / (512 * 8), 6);
  });
  it("map-export scale bar uses R_MARS", () => {
    const s = scaleBar({ lat: 0, zoom: 5 }, 120)!;
    const mpp = (2 * Math.PI * M.R_MARS) / (512 * 32);
    expect(s.px * mpp).toBeCloseTo(Number(s.label.replace(/ km$/, "")) * 1000, 3);
  });
  it("scale-bar control: haversine on the Mars sphere, MapLibre rounding", () => {
    expect(sphereDistance(0, 0, 1, 0, M.R_MARS)).toBeCloseTo((Math.PI / 180) * M.R_MARS, 6);
    expect(sphereDistance(10, 45, 10, 46, 1)).toBeCloseTo(Math.PI / 180, 12);
    expect([roundScale(7.3), roundScale(260), roundScale(1999), roundScale(0.42)]).toEqual([5, 200, 1000, 0.4]);
    const s = scaleFor(120, 59160);
    expect(s.label).toBe("50 km");
    expect(s.width).toBeCloseTo((120 * 50) / 59.16, 6);
  });
});

describe("Esri geographic tiles -> Web-Mercator plan", () => {
  it("level z-1 has the Mercator longitude resolution and the same column boundaries", () => {
    for (const [z, x, y] of [[3, 5, 3], [6, 44, 30], [9, 300, 250]] as const) {
      const p = planTile(z, x, y, 12);
      expect(p.level).toBe(z - 1 + extraLevels(((Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / 2 ** z)))) * 180) / Math.PI));
      if (p.level === z - 1) { expect(p.c0).toBe(p.c1); expect(p.sx).toBeCloseTo(0, 6); expect(p.sw).toBeCloseTo(512, 6); }
    }
  });
  it("rows map monotonically from the north to the south edge of the tile; level capped by the service depth", () => {
    const p = planTile(4, 9, 5, 7);
    const res = RES0 / 2 ** p.level;
    expect(p.rows[0]).toBeGreaterThan((90 - p.north) / res - p.r0 * 512 - 1);
    for (let j = 1; j < 512; j++) expect(p.rows[j]).toBeGreaterThan(p.rows[j - 1]);
    expect(p.rows[511]).toBeLessThan((90 - p.south) / res - p.r0 * 512);
    expect(planTile(14, 9000, 7000, 7).level).toBe(7);
    expect(planTile(0, 0, 0, 7)).toMatchObject({ level: 0, c0: 0, c1: 1, r0: 0, r1: 0 }); // the 2 x 1 level-0 tiles
  });
  it("source requests per output tile stay small (<= 2 columns x 3 rows at mid latitudes)", () => {
    for (let z = 2; z <= 10; z++) for (const lat of [0, 30, 60]) {
      const n = 2 ** z, y = Math.floor(((1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2) * n);
      const p = planTile(z, Math.floor(n / 3), y, 17);
      expect((p.c1 - p.c0 + 1) * (p.r1 - p.r0 + 1), `z${z} lat${lat}`).toBeLessThanOrEqual(6);
    }
    expect(sourceUrl("CTX", 7, 1, 2)).toBe("https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/7/1/2");
  });
  it("relative pmtiles basemap tiles resolve against the data base", () => {
    expect(resolvePmtilesTiles(["pmtiles://dune-atlas/mars/v1/basemaps/x.pmtiles/{z}/{x}/{y}"], "http://127.0.0.1:8787/")).toEqual(["pmtiles://http://127.0.0.1:8787/dune-atlas/mars/v1/basemaps/x.pmtiles/{z}/{x}/{y}"]);
    expect(resolvePmtilesTiles(["pmtiles://https://a.b/x.pmtiles/{z}/{x}/{y}", "https://t/{z}"], "http://h")).toEqual(["pmtiles://https://a.b/x.pmtiles/{z}/{x}/{y}", "https://t/{z}"]);
  });
});

describe("pmtiles basemap depth (dev subset overzoom)", () => {
  it("a shallower archive lowers the source maxzoom (z0-5 dev subset -> 5); the production depth 8 is the upper bound", async () => {
    const reg = loadRegistry().registry;
    const h = reg.basemaps.find((b) => b.id === "hrsc-mola-hillshade")!;
    expect(h.maxzoom).toBe(8);
    expect(h.attribution).toContain("MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)");
    expect(h.attribution).toMatch(/hillshade tiles released under <a [^>]+>CC BY-SA 3\.0 IGO<\/a> \(derived from HRSC CC BY-SA 3\.0 IGO and MOLA CC0\)/);
    const tile = "pmtiles://http://data.local/dune-atlas/mars/v1/basemaps/hrsc-mola-terrarium.pmtiles/{z}/{x}/{y}";
    expect(pmtilesArchive(tile)).toBe("http://data.local/dune-atlas/mars/v1/basemaps/hrsc-mola-terrarium.pmtiles");
    const added: string[] = [];
    const proto = { get: () => undefined, add: (p: { source: { getKey: () => string } }) => { added.push(p.source.getKey()); } };
    for (const [depth, want] of [[5, 5], [8, 8], [10, 8]] as const) {
      const b = [{ ...h, tiles: [tile], maxzoom: 8 }];
      const changed: string[] = [];
      await clampPmtilesBasemaps(b, proto as never, (x) => changed.push(x.id), (u) => ({ source: { getKey: () => u }, getHeader: async () => ({ maxZoom: depth }) }) as never);
      expect(b[0].maxzoom, `archive z0-${depth}`).toBe(want);
      expect(changed.length).toBe(depth < 8 ? 1 : 0);
    }
    expect(added[0]).toBe(pmtilesArchive(tile));
  });
});
