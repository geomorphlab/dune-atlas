// Selected-cell highlight in both projections (both builds; PI round 5 item 7).
//  * Flat map (Mercator): the GeoJSON fill + line layers (map/overlays.ts) with the cell clipped at ±85.05°
//    (cell/snap.ts cellFeature, FLAT_LAT; no vertex on the Mercator edge).
//  * Globe: the GeoJSON layers are hidden (MapLibre clips them at 85.0511° and extends fill triangles on the
//    top/bottom tile edge to the pole: a grey wedge) and the cell is drawn from its TRUE bounds by two globe
//    custom layers - a fill (map/globefill.ts) and the outline (map/globelines.ts GlobeLinesLayer) - with the
//    same colours, width and drawing order. A cell touching a pole has no edge there: its outline is the
//    other latitude circle plus the two meridian edges.
import type { Map as MlMap } from "maplibre-gl";
import { GlobeFillLayer } from "./globefill";
import { GlobeLinesLayer } from "./globelines";

export const SELECTED_CELL_GLOBE_FILL = "selected-cell-globe-fill";
export const SELECTED_CELL_GLOBE_LINE = "selected-cell-globe-line";
/** highlight style (the GeoJSON layers and the globe layers) */
export const SELECTION_STYLE = { fill: "#ffffff", fillOpacity: 0.12, line: "#ff4d6d", lineWidth: 2 } as const;

/** Globe geometry of a cell from its bounds [w, s, e, n] (RFC 7946 bbox; w > e across the antimeridian):
 *  fill triangles (lon, lat, ...) on a grid of at most `step` degrees (the sphere's curvature) and the
 *  outline polylines (edges at a pole omitted). */
export function globeCellGeometry(bbox: ArrayLike<number>, step = 0.25): { triangles: number[]; lines: [number, number][][] } {
  const w = bbox[0];
  let e = bbox[2];
  if (e < w) e += 360;
  const s = Math.max(-90, bbox[1]), n = Math.min(90, bbox[3]);
  if (!(e > w) || !(n > s)) return { triangles: [], lines: [] };
  const seg = (a: number, b: number) => { const k = Math.max(1, Math.ceil(Math.abs(b - a) / step - 1e-9)); return Array.from({ length: k + 1 }, (_, i) => a + ((b - a) * i) / k); };
  const xs = seg(w, e), ys = seg(s, n);
  const triangles: number[] = [];
  for (let j = 1; j < ys.length; j++) for (let i = 1; i < xs.length; i++) {
    const [x0, x1, y0, y1] = [xs[i - 1], xs[i], ys[j - 1], ys[j]];
    triangles.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
  }
  const atS = s <= -90 + 1e-9, atN = n >= 90 - 1e-9;
  // ring: south (w->e), east (s->n), north (e->w), west (n->s); edges on a pole are dropped
  const edges: ([number, number][] | null)[] = [
    atS ? null : xs.map((x) => [x, s] as [number, number]),
    ys.map((y) => [e, y] as [number, number]),
    atN ? null : [...xs].reverse().map((x) => [x, n] as [number, number]),
    [...ys].reverse().map((y) => [w, y] as [number, number]),
  ];
  const gap = edges.findIndex((x) => x === null);
  const order = gap < 0 ? [0, 1, 2, 3] : [1, 2, 3, 4].map((k) => (gap + k) % 4);
  const lines: [number, number][][] = [];
  let cur: [number, number][] | null = null;
  for (const k of order) {
    const ed = edges[k];
    if (!ed) { cur = null; continue; }
    if (!cur) { cur = [...ed]; lines.push(cur); } else cur.push(...ed.slice(1));
  }
  return { triangles, lines };
}

/** Add (once per style) / update the globe highlight layers directly above `afterIds` (the GeoJSON
 *  highlight layers), and show either the globe layers or the GeoJSON layers by the map's projection. */
export function syncGlobeSelection(map: MlMap, bbox: ArrayLike<number> | null | undefined, geojsonIds: string[], before?: string) {
  if (!map.getLayer(SELECTED_CELL_GLOBE_FILL)) map.addLayer(new GlobeFillLayer(SELECTED_CELL_GLOBE_FILL, SELECTION_STYLE.fill, SELECTION_STYLE.fillOpacity), before);
  if (!map.getLayer(SELECTED_CELL_GLOBE_LINE)) map.addLayer(new GlobeLinesLayer(SELECTED_CELL_GLOBE_LINE, SELECTION_STYLE.line, 1, SELECTION_STYLE.lineWidth), before);
  const impl = <T>(id: string) => (map.getLayer(id) as unknown as { implementation?: T } | undefined)?.implementation;
  const g = bbox ? globeCellGeometry(bbox) : { triangles: [], lines: [] };
  impl<GlobeFillLayer>(SELECTED_CELL_GLOBE_FILL)?.setTriangles(g.triangles);
  impl<GlobeLinesLayer>(SELECTED_CELL_GLOBE_LINE)?.setLines(g.lines);
  selectionProjection(map, geojsonIds);
  if (!LISTENING.has(map)) {
    LISTENING.add(map);
    map.on("projectiontransition", () => selectionProjection(map, geojsonIds));
  }
}
const LISTENING = new WeakSet<MlMap>();

/** GeoJSON highlight layers only in the flat map; the globe layers draw only on the globe (their render). */
export function selectionProjection(map: MlMap, geojsonIds: string[]) {
  const globe = map.getProjection?.()?.type === "globe";
  for (const id of geojsonIds) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", globe ? "none" : "visible");
}
