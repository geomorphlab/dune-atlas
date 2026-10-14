// Shared by tests/selection.test.ts and tests/mars/selection.test.ts (selected-cell highlight at the poles,
// PI round 5 item 7): the flat-map source (clipped, no vertex on the Mercator edge) and the globe geometry
// (true bounds; outline without an edge at a pole) of polar cells, and the layer switch by projection.
import { expect } from "vitest";
import { cellFeature, cellFromIndex, FLAT_LAT, type Grid } from "../src/cell/snap";
import { globeCellGeometry, SELECTED_CELL_GLOBE_FILL, SELECTED_CELL_GLOBE_LINE } from "../src/map/selection";
import { ensureSelectedCellLayers, SELECTED_CELL_BOTTOM, SELECTED_CELL_LINE } from "../src/map/overlays";
import type { GlobeFillLayer } from "../src/map/globefill";
import type { GlobeLinesLayer } from "../src/map/globelines";

export const MERC = 85.0511287798066;
const coords = (fc: GeoJSON.FeatureCollection): number[][] => fc.features.flatMap((f) => (JSON.stringify(f.geometry).match(/-?\d+(\.\d+)?(e-?\d+)?,-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map((p) => p.split(",").map(Number)));
const rowAt = (g: Grid, lat: number) => Math.round((lat - g.lat0) / g.dlat);

/** checks for the cell whose centre is nearest `lat` (and a column near `lon`) */
export function checkPolarCell(g: Grid, lat: number, lon = 30) {
  const c = cellFromIndex(rowAt(g, lat), Math.round((lon - g.lon0) / g.dlon), g);
  const fc = cellFeature(c, g);
  const [w, s, e, n] = fc.bbox!;
  // true bounds in the bbox (also beyond the Mercator limit)
  expect(n - s).toBeCloseTo(Math.min(90, c.lat + Math.abs(g.dlat) / 2) - Math.max(-90, c.lat - Math.abs(g.dlat) / 2), 9);
  // flat source: every vertex strictly inside the Mercator limit (none on the tile edge)
  for (const [, y] of coords(fc)) { expect(Math.abs(y)).toBeLessThanOrEqual(FLAT_LAT); expect(Math.abs(y)).toBeLessThan(MERC - 1e-4); }
  const poleward = Math.min(Math.abs(s), Math.abs(n)) >= FLAT_LAT;
  if (poleward) expect(fc.features).toHaveLength(0);       // nothing in the flat map (no wedge, no sliver)
  else expect(fc.features.length).toBeGreaterThan(0);
  // flat outline never runs along the clip latitude (the clipped edge is not drawn)
  for (const f of fc.features.filter((x) => x.properties?.part === "outline")) for (const l of (f.geometry as GeoJSON.MultiLineString).coordinates)
    for (let i = 1; i < l.length; i++) expect(l[i][1] === l[i - 1][1] && Math.abs(l[i][1]) === FLAT_LAT).toBe(false);
  // globe: fill from the true bounds, covering the cell's spherical area; outline without an edge at a pole
  const geo = globeCellGeometry(fc.bbox!);
  const lats = geo.triangles.filter((_, i) => i % 2 === 1);
  expect(Math.min(...lats)).toBeCloseTo(s, 9); expect(Math.max(...lats)).toBeCloseTo(n, 9);
  const D = Math.PI / 180;
  let area = 0;
  for (let t = 0; t < geo.triangles.length; t += 12) {   // two triangles per lon/lat quad
    const [x0, y0, x1, , , y1] = geo.triangles.slice(t, t + 6);
    area += (x1 - x0) * D * (Math.sin(y1 * D) - Math.sin(y0 * D));
  }
  expect(area).toBeCloseTo(((((e - w) % 360) + 360) % 360 || 360) * D * (Math.sin(n * D) - Math.sin(s * D)), 9);
  const pts = geo.lines.flat();
  const atPole = Math.abs(n) >= 90 || Math.abs(s) >= 90;
  const horizontal = (y: number) => geo.lines.some((l) => l.some((p, i) => i > 0 && p[1] === y && l[i - 1][1] === y));
  if (atPole) {
    expect(geo.lines).toHaveLength(1);                       // meridian, latitude circle, meridian
    expect(horizontal(n >= 90 ? 90 : -90)).toBe(false);
    expect(horizontal(n >= 90 ? s : n)).toBe(true);
  } else {
    expect(geo.lines).toHaveLength(1);
    expect(pts[0]).toEqual(pts[pts.length - 1]);             // closed ring
    expect(horizontal(s) && horizontal(n)).toBe(true);
  }
  return { c, fc, geo };
}

/** fake map: GeoJSON layers hidden on the globe, shown in Mercator; globe layers fed with the geometry */
export function checkProjectionSwitch(g: Grid, lat: number) {
  const layers: { id: string; impl?: unknown; layout: Record<string, unknown> }[] = [];
  const handlers: Record<string, (() => void)[]> = {};
  let projection = "globe";
  let data: unknown = null;
  const map = {
    getSource: (id: string) => (id === "selected-cell" && data !== null ? { setData: (d: unknown) => { data = d; } } : undefined),
    addSource: () => { data = { type: "FeatureCollection", features: [] }; },
    getLayer: (id: string) => { const l = layers.find((x) => x.id === id); return l ? { id, implementation: l.impl } : undefined; },
    addLayer: (l: { id: string }) => { layers.push({ id: l.id, impl: "render" in l ? l : undefined, layout: {} }); },
    getStyle: () => ({ layers: layers.map((l) => ({ id: l.id, type: "fill" })) }),
    setLayoutProperty: (id: string, k: string, v: unknown) => { layers.find((x) => x.id === id)!.layout[k] = v; },
    getProjection: () => ({ type: projection }),
    on: (e: string, f: () => void) => { (handlers[e] ??= []).push(f); },
    triggerRepaint: () => {},
  };
  const c = cellFromIndex(rowAt(g, lat), 10, g);
  ensureSelectedCellLayers(map as never, cellFeature(c, g));
  expect(layers.map((l) => l.id)).toEqual([SELECTED_CELL_BOTTOM, SELECTED_CELL_LINE, SELECTED_CELL_GLOBE_FILL, SELECTED_CELL_GLOBE_LINE]);
  const vis = (id: string) => layers.find((x) => x.id === id)!.layout.visibility;
  expect([vis(SELECTED_CELL_BOTTOM), vis(SELECTED_CELL_LINE)]).toEqual(["none", "none"]);   // globe: GeoJSON hidden
  expect((layers[2].impl as GlobeFillLayer).triangleCount).toBeGreaterThan(0);
  expect((layers[3].impl as GlobeLinesLayer).segmentCount).toBeGreaterThan(0);
  projection = "mercator"; handlers.projectiontransition.forEach((f) => f());
  expect([vis(SELECTED_CELL_BOTTOM), vis(SELECTED_CELL_LINE)]).toEqual(["visible", "visible"]);
  projection = "globe"; handlers.projectiontransition.forEach((f) => f());
  expect(vis(SELECTED_CELL_BOTTOM)).toBe("none");
  // deselect: both emptied
  ensureSelectedCellLayers(map as never, null);
  expect((layers[2].impl as GlobeFillLayer).triangleCount).toBe(0);
  expect((data as GeoJSON.FeatureCollection).features).toHaveLength(0);
}
