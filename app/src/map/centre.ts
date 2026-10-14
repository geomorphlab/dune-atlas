// 'Centre map on this cell' (cell panel header button; PI round 6 item 3, both builds).
// Eases the map (600 ms; an instant jump with prefers-reduced-motion) to the selected cell's centre, keeping
// the projection, bearing and pitch and the current zoom - unless the cell would be smaller than MIN_CELL_PX
// on screen, then just enough zoom to show it. On the globe the centre is the cell centre itself (also for
// polar cells); on the flat map the latitude is clamped to the Web-Mercator limit.
import type { Map as MlMap } from "maplibre-gl";

export const MIN_CELL_PX = 24;
export const CENTRE_MS = 600;
export const MERCATOR_LAT = 85.0511287798066;
const TILE = 512; // MapLibre's world size at zoom 0 (px)

/** screen size (px) of the smaller side of a cell of `cellDeg` at zoom z at the map centre: the east-west
 *  side, cellDeg * 512 * 2^z / 360 (Mercator: at every latitude; globe: MapLibre matches the Mercator scale
 *  at the centre latitude, where the east-west side is the shorter one) */
export const cellPx = (cellDeg: number, zoom: number) => (cellDeg * TILE * 2 ** zoom) / 360;
/** the zoom at which the cell is MIN_CELL_PX wide */
export const zoomForCell = (cellDeg: number) => Math.log2((MIN_CELL_PX * 360) / (cellDeg * TILE));

export interface CentreTarget { center: [number, number]; zoom: number; duration: number }

/** target of the move (pure; tested) */
export function centreTarget(cell: { lon: number; lat: number }, cellDeg: number, view: { zoom: number; projection: "globe" | "mercator"; maxZoom?: number }, reducedMotion: boolean): CentreTarget {
  const lat = view.projection === "globe" ? Math.max(-90, Math.min(90, cell.lat)) : Math.max(-MERCATOR_LAT, Math.min(MERCATOR_LAT, cell.lat));
  const zoom = cellPx(cellDeg, view.zoom) < MIN_CELL_PX ? Math.min(view.maxZoom ?? 24, zoomForCell(cellDeg)) : view.zoom;
  return { center: [cell.lon, lat], zoom, duration: reducedMotion ? 0 : CENTRE_MS };
}

export const prefersReducedMotion = () => !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** move the map; bearing, pitch and projection are left as they are */
export function centreOnCell(map: MlMap, cell: { lon: number; lat: number }, cellDeg: number, reducedMotion = prefersReducedMotion()): CentreTarget {
  const proj = map.getProjection?.()?.type === "globe" ? "globe" : "mercator";
  const t = centreTarget(cell, cellDeg, { zoom: map.getZoom(), projection: proj, maxZoom: map.getMaxZoom?.() }, reducedMotion);
  if (reducedMotion) map.jumpTo({ center: t.center, zoom: t.zoom });
  else map.easeTo({ center: t.center, zoom: t.zoom, duration: t.duration, essential: false });
  return t;
}

/** crosshair icon (18 px, currentColor, stroke 1.6 as the other tool icons) */
export const CENTRE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg>`;
