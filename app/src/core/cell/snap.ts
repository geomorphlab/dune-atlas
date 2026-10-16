// Snap map coordinates to a regular lon/lat grid of cell centres (pixel registration:
// centre lat = lat0 + dlat * iy, lon = lon0 + dlon * ix; cell edges at centre +/- d/2).
// The grid comes from the cell store root attrs `grid` (ERA5-Land 0.1 deg 1801 x 3600,
// ERA5 0.25 deg 721 x 1440, ...); ERA5_LAND_GRID is only the fallback before the store opens.
// Rows 0 and ny-1 may be polar cells (centres at +/-90, half-height in latitude).

export interface Grid {
  lat0: number; dlat: number; lon0: number; dlon: number; ny: number; nx: number;
  /** exact row-centre latitudes where they are not regular (JRA-3Q: Gaussian latitudes; cell-store attrs
   *  grid.lat_values). lat0 + dlat * iy is then the regular grid fitted through the end rows: it places the cells on
   *  the map and defines their footprints; downloads give the exact latitude (exportmeta.rowLat). */
  latValues?: readonly number[];
}
export const ERA5_LAND_GRID: Grid = { lat0: 90, dlat: -0.1, lon0: -180, dlon: 0.1, ny: 1801, nx: 3600 };
/** @deprecated use ERA5_LAND_GRID or the store grid */
export const GRID = ERA5_LAND_GRID;

export interface CellRef {
  iy: number;
  ix: number;
  /** cell-centre latitude/longitude (degrees) */
  lat: number;
  lon: number;
  /** flat grid index iy * nx + ix */
  id: number;
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6 + 0; // +0 normalises -0

/** Wrap longitude into [-180, 180). */
export function wrapLon(lon: number): number {
  const r = (((lon + 180) % 360) + 360) % 360;
  return (r === 360 ? 0 : r) - 180;
}

/** True if the grid's columns span the full 360 deg (longitude wraps). */
export const isGlobal = (g: Grid) => Math.abs(Math.abs(g.dlon) * g.nx - 360) < 1e-6;

export function cellFromIndex(iy: number, ix: number, g: Grid = ERA5_LAND_GRID): CellRef {
  if (!Number.isInteger(iy) || !Number.isInteger(ix) || iy < 0 || iy >= g.ny || ix < 0 || ix >= g.nx)
    throw new RangeError(`cell index out of range: ${iy},${ix}`);
  return { iy, ix, lat: round6(g.lat0 + g.dlat * iy), lon: round6(wrapLon(g.lon0 + g.dlon * ix)), id: iy * g.nx + ix };
}

/** Latitudes [south, north] covered by the grid's rows (outer cell edges, clipped to ±90). Rows need not
 *  reach the poles: a grid with outer centres at ±84.86° and 5.14° rows covers ±87.43° only. */
export function gridLatRange(g: Grid): [number, number] {
  const a = g.lat0 - g.dlat / 2, b = g.lat0 + g.dlat * (g.ny - 1) + g.dlat / 2;
  return [Math.max(-90, Math.min(a, b)), Math.min(90, Math.max(a, b))];
}

/** Does the grid have a cell at latitude `lat`? Beyond a pole-reaching outer row, yes (snapToCell clamps). */
export function coversLat(g: Grid, lat: number): boolean {
  const [s, n] = gridLatRange(g), eps = 1e-9, pole = 90 - 1e-6;
  return (lat >= s - eps || s <= -pole) && (lat <= n + eps || n >= pole);
}

/** Nearest cell centre to (lng, lat). Longitude wraps across the antimeridian for global grids;
 *  latitude clamps to the first/last row where that row reaches the pole. Returns null for non-finite
 *  input, points outside a regional grid and points poleward of rows that stop short of the pole
 *  (gridLatRange). */
export function snapToCell(lng: number, lat: number, g: Grid = ERA5_LAND_GRID): CellRef | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (!coversLat(g, lat)) return null;
  let ix: number;
  if (isGlobal(g)) {
    const off = (((lng - g.lon0) % 360) + 360) % 360; // degrees east of column 0
    ix = ((Math.round(off / g.dlon) % g.nx) + g.nx) % g.nx;
  } else {
    ix = Math.round((wrapLon(lng) - g.lon0) / g.dlon);
    if (ix < 0 || ix >= g.nx) return null;
  }
  const iy = Math.min(g.ny - 1, Math.max(0, Math.round((lat - g.lat0) / g.dlat)));
  return cellFromIndex(iy, ix, g);
}

/** Cell outline polygon ring (lon/lat), latitude clipped to +/-90. Longitudes may exceed
 *  +/-180 by half a cell for the antimeridian column so the ring stays contiguous. */
export function cellBounds(c: CellRef, g: Grid = ERA5_LAND_GRID): [number, number][] {
  const hy = Math.abs(g.dlat) / 2, hx = Math.abs(g.dlon) / 2;
  const s = Math.max(-90, c.lat - hy), n = Math.min(90, c.lat + hy);
  const w = c.lon - hx, e = c.lon + hx;
  return [[w, s], [e, s], [e, n], [w, n], [w, s]];
}

/** Flat-map latitude limit of the selected-cell highlight: just inside the Web-Mercator limit (85.0511°),
 *  so no vertex lies on the world's top/bottom tile edge (MapLibre extends fill triangles on that edge to
 *  the pole on the globe: `_fillPoles`). Poleward of it the highlight is drawn by the globe layers
 *  (map/selection.ts) from the cell's true bounds (`bbox` of the collection). */
export const FLAT_LAT = 85.05;

/** Selected-cell highlight as GeoJSON for the FLAT map, with `bbox` = the true cell bounds [w, s, e, n]
 *  (RFC 7946: within ±180, w > e across the antimeridian; s/n within ±90) for the globe layers. A cell that straddles the
 *  antimeridian is split into the parts west and east of ±180 (both within ±180): the fill is a MultiPolygon
 *  (`part: "fill"`) and the outline a MultiLineString without the seam edge (`part: "outline"`). A cell
 *  beyond ±FLAT_LAT is clipped there (fill + outline without the clipped edge); a cell entirely beyond has
 *  no flat features. Other cells: one Polygon (fill and outline). */
export function cellFeature(c: CellRef, g: Grid = ERA5_LAND_GRID): GeoJSON.FeatureCollection {
  const ring = cellBounds(c, g);
  const [w, s] = ring[0], [e, n] = ring[2];
  // RFC 7946 bbox: longitudes within ±180, west > east for a cell across the antimeridian
  const wrap = (x: number) => (x < -180 ? x + 360 : x > 180 ? x - 360 : x);
  const bbox: GeoJSON.BBox = [wrap(w), s, wrap(e), n];
  const sF = Math.max(s, -FLAT_LAT), nF = Math.min(n, FLAT_LAT);
  const clipS = sF > s, clipN = nF < n, split = w < -180 || e > 180;
  if (sF >= nF) return { type: "FeatureCollection", bbox, features: [] };
  if (!split && !clipS && !clipN) return { type: "FeatureCollection", bbox, features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }] };
  // parts within ±180: [x0, x1, seam at x0, seam at x1]; the overhang beyond -180 (or +180) on the other side
  const parts: [number, number, boolean, boolean][] = !split ? [[w, e, false, false]]
    : w < -180 ? [[-180, e, true, false], [w + 360, 180, false, true]] : [[w, 180, false, true], [-180, e - 360, true, false]];
  const box = (x0: number, x1: number): [number, number][] => [[x0, sF], [x1, sF], [x1, nF], [x0, nF], [x0, sF]];
  // outline: every edge except those on the seam (x = ±180) and those clipped at ±FLAT_LAT
  const lines: [number, number][][] = [];
  for (const [x0, x1, seam0, seam1] of parts) {
    if (!clipS) lines.push([[x0, sF], [x1, sF]]);
    if (!seam1) lines.push([[x1, sF], [x1, nF]]);
    if (!clipN) lines.push([[x1, nF], [x0, nF]]);
    if (!seam0) lines.push([[x0, nF], [x0, sF]]);
  }
  return {
    type: "FeatureCollection", bbox, features: [
      { type: "Feature", properties: { part: "fill" }, geometry: parts.length === 1 ? { type: "Polygon", coordinates: [box(parts[0][0], parts[0][1])] } : { type: "MultiPolygon", coordinates: parts.map(([a, b]) => [box(a, b)]) } },
      { type: "Feature", properties: { part: "outline" }, geometry: { type: "MultiLineString", coordinates: mergeLines(lines) } },
    ],
  };
}

/** join consecutive edges that share an end point into polylines */
function mergeLines(lines: [number, number][][]): [number, number][][] {
  const out: [number, number][][] = [];
  for (const l of lines) {
    const last = out[out.length - 1], p = last?.[last.length - 1];
    if (p && p[0] === l[0][0] && p[1] === l[0][1]) last.push(...l.slice(1));
    else out.push([...l]);
  }
  return out;
}
