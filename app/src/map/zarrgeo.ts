// Georeferencing of the GeoZarr field stores for zarr-layer. zarr-layer 0.4.3 infers bounds from
// cell-centre coordinates and then SNAPS a ~360° extent to [-180, 180] (_loadSpatialMetadata),
// shifting a [-180.05, 179.95] grid 0.05° east; its tiled path additionally forces global
// extents to ±90 (normalizeGlobalExtent). We therefore always pass explicit cell-EDGE bounds read
// from the store metadata. With explicit bounds the untiled path (our multiscales 'layout'
// stores) uses them verbatim: xyLimits = bounds, and UntiledMode.getRegionBounds maps pixel p of
// a level of width W linearly to xMin + p / W * (xMax - xMin) (no normalisation).

export interface StoreGeo {
  /** cell-edge bbox [west, south, east, north] (deg) of the finest level */
  bounds: [number, number, number, number];
  /** row 0 is the southernmost row */
  latIsAscending: boolean;
  /** finest-level shape [ny, nx] */
  shape: [number, number];
}

type Attrs = Record<string, unknown>;

/** Edge bbox from root attrs: the finest multiscales.layout level's `spatial:transform`
 *  ([dx, 0, x0, 0, dy, y0], x0/y0 = outer edges, pixel registration) and `spatial:shape`, else
 *  the root `spatial:transform` + `spatial:shape`, else `spatial:bbox`. Null if none. */
export function storeGeoFromAttrs(attrs: Attrs | undefined): StoreGeo | null {
  if (!attrs) return null;
  const ms = attrs.multiscales as { layout?: Attrs[] } | undefined;
  const cands: { t: number[]; s: number[] }[] = [];
  for (const l of ms?.layout ?? []) {
    const t = l["spatial:transform"], s = l["spatial:shape"];
    if (Array.isArray(t) && t.length >= 6 && Array.isArray(s) && s.length >= 2) cands.push({ t: t as number[], s: s as number[] });
  }
  if (!cands.length && Array.isArray(attrs["spatial:transform"]) && Array.isArray(attrs["spatial:shape"])) {
    cands.push({ t: attrs["spatial:transform"] as number[], s: attrs["spatial:shape"] as number[] });
  }
  if (cands.length) {
    cands.sort((a, b) => Math.abs(a.t[0]) - Math.abs(b.t[0]));
    const { t, s } = cands[0];
    const [dx, , x0, , dy, y0] = t;
    const [ny, nx] = s;
    const xa = x0, xb = x0 + nx * dx, ya = y0, yb = y0 + ny * dy;
    return { bounds: [Math.min(xa, xb), Math.min(ya, yb), Math.max(xa, xb), Math.max(ya, yb)], latIsAscending: dy > 0, shape: [ny, nx] };
  }
  const bb = attrs["spatial:bbox"];
  if (Array.isArray(bb) && bb.length === 4 && bb.every((v) => Number.isFinite(v))) {
    const [w, s, e, n] = bb as number[];
    return { bounds: [w, s, e, n], latIsAscending: false, shape: [0, 0] };
  }
  return null;
}

/** Root attrs of a zarr v3 store (`<url>/zarr.json`). */
export async function fetchRootAttrs(url: string, fetchFn: typeof fetch = fetch): Promise<Attrs | undefined> {
  const r = await fetchFn(`${url.replace(/\/$/, "")}/zarr.json`);
  if (!r.ok) throw new Error(`${url}/zarr.json: HTTP ${r.status}`);
  return ((await r.json()) as { attributes?: Attrs }).attributes;
}

/** Centre (lon, lat) of pixel (row i, column j) of a level of shape [ny, nx] as zarr-layer's
 *  untiled renderer places it with explicit `bounds` (UntiledMode.getRegionBounds: linear in
 *  pixel index between the bounds; row 0 at the north edge when latIsAscending is false). */
export function rendererPixelCentre(g: StoreGeo, i: number, j: number, shape: [number, number] = g.shape): [number, number] {
  const [w, s, e, n] = g.bounds;
  const [ny, nx] = shape;
  const lon = w + ((j + 0.5) / nx) * (e - w);
  const lat = g.latIsAscending ? s + ((i + 0.5) / ny) * (n - s) : n - ((i + 0.5) / ny) * (n - s);
  return [lon, lat];
}
