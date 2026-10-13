// Snap map coordinates to a regular lon/lat grid of cell centres (pixel registration:
// centre lat = lat0 + dlat * iy, lon = lon0 + dlon * ix; cell edges at centre +/- d/2).
// The grid comes from the cell store root attrs `grid` (ERA5-Land 0.1 deg 1801 x 3600,
// ERA5 0.25 deg 721 x 1440, ...); ERA5_LAND_GRID is only the fallback before the store opens.
// Rows 0 and ny-1 may be polar cells (centres at +/-90, half-height in latitude).

export interface Grid { lat0: number; dlat: number; lon0: number; dlon: number; ny: number; nx: number }
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

/** Nearest cell centre to (lng, lat). Longitude wraps across the antimeridian for global grids;
 *  latitude clamps to the first/last row. Returns null for non-finite input or points outside a
 *  regional grid. */
export function snapToCell(lng: number, lat: number, g: Grid = ERA5_LAND_GRID): CellRef | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
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

/** Selected-cell highlight as GeoJSON. A cell that straddles the antimeridian is split into the
 *  parts west and east of ±180 (both within ±180, so the globe and Mercator draw both halves):
 *  the fill is a MultiPolygon (`part: "fill"`) and the outline a MultiLineString without the
 *  seam edge (`part: "outline"`). Other cells: one Polygon (fill and outline). */
export function cellFeature(c: CellRef, g: Grid = ERA5_LAND_GRID): GeoJSON.FeatureCollection {
  const ring = cellBounds(c, g);
  const [w, s] = ring[0], [e, n] = ring[2];
  if (w >= -180 && e <= 180) return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }] };
  // the overhang beyond -180 (or +180) is drawn on the other side
  const [a0, a1, b0, b1] = w < -180 ? [-180, e, w + 360, 180] : [w, 180, -180, e - 360];
  const box = (x0: number, x1: number): [number, number][] => [[x0, s], [x1, s], [x1, n], [x0, n], [x0, s]];
  // outline: every edge except the one on the seam (x = ±180)
  const east: [number, number][] = [[a0, s], [a1, s], [a1, n], [a0, n]]; // part starting at the seam -180 (west edge on the seam)
  const west: [number, number][] = [[b1, n], [b0, n], [b0, s], [b1, s]]; // part ending at the seam +180 (east edge on the seam)
  const outline = w < -180 ? [east, west] : [[[a1, s], [a0, s], [a0, n], [a1, n]] as [number, number][], [[b0, n], [b1, n], [b1, s], [b0, s]] as [number, number][]];
  return {
    type: "FeatureCollection", features: [
      { type: "Feature", properties: { part: "fill" }, geometry: { type: "MultiPolygon", coordinates: [[box(a0, a1)], [box(b0, b1)]] } },
      { type: "Feature", properties: { part: "outline" }, geometry: { type: "MultiLineString", coordinates: outline } },
    ],
  };
}
