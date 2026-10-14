// Esri's Mars imagery MapServers (astro.arcgis.com OnMars/<service>) as Web-Mercator raster tiles
// (Mars basemaps CTX1, MDIM, MColorDEM, HiRISE; registry/mars/layers.yaml). Those services are tiled
// in GEOGRAPHIC coordinates (wkid 104971, Mars 2000 sphere): origin (-180, 90), 512 px tiles, level-0
// resolution 0.3515625 deg/px (2 x 1 tiles), each level halving it; MapLibre needs Web-Mercator tiles.
// The `esri-mars://<service>/{z}/{x}/{y}` protocol synthesises a 512 px Mercator tile from the
// geographic tiles that cover it: longitude is linear in both projections, so every output row is one
// horizontally scaled strip of a source row, taken at the row's latitude (rows resampled by latitude;
// nearest source row, bilinear across columns).
//
// Level choice: Esri level z-1 has the Mercator tile's longitude resolution (and the same column
// boundaries); `extra` finer levels compensate the Mercator stretch 1/cos(lat) at high latitude.
// Source tiles are cached (LRU) and shared between output tiles; a cancelled output tile aborts
// the source requests no other pending tile waits for. Output: ImageBitmap (no re-encoding);
// sources are fetched with CORS (Access-Control-Allow-Origin: *), so the map canvas stays
// untainted and PNG export works.
//
// Failure handling (the map must never break because of a third-party service): the protocol only
// ever rejects with an AbortError for a cancelled tile (MapLibre ignores those). Every other failure -
// network error, HTTP error (4xx beyond the data or the deepest level come without CORS headers, so
// the browser reports a TypeError), a body that is not an image, an unknown service, a service whose
// tiling scheme no longer matches (checked once per service from MapServer?f=json) - yields a
// transparent tile, so the map background shows through; one console warning per service and kind.
// Sparse services (HiRISE): areas without data are transparent in the service's PNGs (tRNS) and
// HTTP 404 deeper down; a source tile that is missing or fully transparent marks its whole quadtree
// below as empty, so deeper zooms over empty areas send no requests.
import maplibregl from "maplibre-gl";

export const ESRI_BASE = "https://astro.arcgis.com/arcgis/rest/services/OnMars";
export const TILE = 512;
/** level-0 resolution (deg/px) and tile span (deg) of the OnMars services */
export const RES0 = 0.3515625;
export const SPAN0 = RES0 * TILE; // 180 deg
export const WKID = 104971;

export interface EsriService { maxLevel: number; sparse?: boolean; item: string }
/** Deepest level with data, per service (probed 2026-10-14: CTX1 12, MDIM and MColorDEM 7, HiRISE 17
 *  where it has data; levels beyond answer HTTP 400). `item`: the ArcGIS Online item (licence field). */
export const ESRI_SERVICES: Record<string, EsriService> = {
  CTX1: { maxLevel: 12, item: "30c4acfe36284b1784bf07d5d73f9e4d" },
  MDIM: { maxLevel: 7, item: "1efb16809db84f0c892b9b0662dab0c8" },
  MColorDEM: { maxLevel: 7, item: "07b33bb3067747abbebd1ce34c29816e" },
  HiRISE: { maxLevel: 17, sparse: true, item: "c1c4c750a2154842ae523c984cc14fa5" },
};
export const itemUrl = (service: string) => `https://www.arcgis.com/home/item.html?id=${ESRI_SERVICES[service].item}`;

const mercLat = (yNorm: number) => (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - 2 * yNorm)));

export interface TilePlan {
  level: number;
  /** source tile columns / rows (inclusive) */
  c0: number; c1: number; r0: number; r1: number;
  /** Mercator tile bounds (deg) */
  west: number; east: number; north: number; south: number;
  /** source mosaic px: x of the tile's west edge, its width, and the source row of every output row */
  sx: number; sw: number; rows: Float64Array;
}

/** extra Esri levels for the Mercator stretch at latitude lat: round(log2(1 / cos lat)), 0..3 */
export const extraLevels = (lat: number) => Math.max(0, Math.min(3, Math.round(Math.log2(1 / Math.max(1e-6, Math.cos((lat * Math.PI) / 180))))));

/** Pure geometry of one output tile (tested in node). */
export function planTile(z: number, x: number, y: number, maxLevel: number): TilePlan {
  const n = 2 ** z;
  const west = (x / n) * 360 - 180, east = ((x + 1) / n) * 360 - 180;
  const north = mercLat(y / n), south = mercLat((y + 1) / n);
  const latMid = mercLat((y + 0.5) / n);
  const level = Math.max(0, Math.min(maxLevel, z - 1 + extraLevels(latMid)));
  const span = SPAN0 / 2 ** level, res = span / TILE;
  const nCols = 2 * 2 ** level, nRows = 2 ** level;
  const eps = 1e-9;
  const c0 = Math.max(0, Math.floor((west + 180) / span)), c1 = Math.min(nCols - 1, Math.floor((east + 180 - eps) / span));
  const r0 = Math.max(0, Math.floor((90 - north) / span)), r1 = Math.min(nRows - 1, Math.floor((90 - south - eps) / span));
  const sx = (west + 180) / res - c0 * TILE, sw = (east - west) / res;
  const rows = new Float64Array(TILE);
  for (let j = 0; j < TILE; j++) rows[j] = (90 - mercLat((y + (j + 0.5) / TILE) / n)) / res - r0 * TILE;
  return { level, c0, c1, r0, r1, west, east, north, south, sx, sw, rows };
}

export const sourceUrl = (service: string, level: number, row: number, col: number, base = ESRI_BASE) => `${base}/${service}/MapServer/tile/${level}/${row}/${col}`;

/** Does a MapServer?f=json description still match the tiling this module assumes? (null = yes, else why not) */
export function tilingMismatch(desc: unknown, maxLevel: number): string | null {
  const d = desc as { error?: { message?: string }; tileInfo?: { rows?: number; cols?: number; origin?: { x?: number; y?: number }; spatialReference?: { wkid?: number; latestWkid?: number }; lods?: { level: number; resolution: number }[] } };
  if (!d || typeof d !== "object") return "no service description";
  if (d.error) return `service error: ${d.error.message ?? "unknown"}`;
  const t = d.tileInfo;
  if (!t) return "no tileInfo";
  if (t.rows !== TILE || t.cols !== TILE) return `tile size ${t.rows}x${t.cols}`;
  if (t.origin?.x !== -180 || t.origin?.y !== 90) return `origin ${t.origin?.x},${t.origin?.y}`;
  const wkid = t.spatialReference?.latestWkid ?? t.spatialReference?.wkid;
  if (wkid !== WKID) return `wkid ${wkid}`;
  const lods = t.lods ?? [];
  if (lods.length < maxLevel + 1) return `${lods.length} levels`;
  for (const l of lods.slice(0, maxLevel + 1)) if (Math.abs(l.resolution * 2 ** l.level / RES0 - 1) > 1e-6) return `level ${l.level} resolution ${l.resolution}`;
  return null;
}

// ---------------------------------------------------------------------------------------------
// environment (injectable for tests: node has no OffscreenCanvas / createImageBitmap)
// ---------------------------------------------------------------------------------------------
type Img = ImageBitmap;
interface Canvas2D { drawImage(...a: unknown[]): void; getImageData?(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray }; putImageData?(d: ImageData, x: number, y: number): void; clearRect?(x: number, y: number, w: number, h: number): void; createImageData?(w: number, h: number): ImageData; imageSmoothingEnabled: boolean }
interface CanvasLike { getContext(kind: "2d", opts?: unknown): Canvas2D | null; transferToImageBitmap(): Img }
export interface EsriEnv {
  fetch: typeof fetch;
  decode: (b: Blob) => Promise<Img>;
  canvas: (w: number, h: number) => CanvasLike;
  warn: (msg: string, err?: unknown) => void;
  base: string;
}
export const browserEnv = (): EsriEnv => ({
  fetch: (...a) => fetch(...a),
  decode: (b) => createImageBitmap(b),
  canvas: (w, h) => new OffscreenCanvas(w, h) as unknown as CanvasLike,
  warn: (m, e) => console.warn(`[dune-atlas] ${m}`, e ?? ""),
  base: ESRI_BASE,
});

/** a fully transparent tile: what a failed or empty basemap tile shows (the map background) */
export const emptyTile = (env: EsriEnv): Img => env.canvas(TILE, TILE).transferToImageBitmap();

// ---------------------------------------------------------------------------------------------
// per-service state: tiling check, known-empty quadtree, warnings
// ---------------------------------------------------------------------------------------------
interface ServiceState { check: Promise<boolean> | null; empty: Set<string>; warned: Set<string> }
const STATE = new Map<string, ServiceState>();
const stateOf = (s: string): ServiceState => {
  let st = STATE.get(s);
  if (!st) { st = { check: null, empty: new Set(), warned: new Set() }; STATE.set(s, st); }
  return st;
};
function warnOnce(env: EsriEnv, service: string, kind: string, msg: string, err?: unknown) {
  const st = stateOf(service);
  if (st.warned.has(kind)) return;
  st.warned.add(kind);
  env.warn(`basemap esri-mars ${service}: ${msg}`, err);
}
/** forget all per-service state and cached tiles (tests) */
export function resetEsri() { STATE.clear(); for (const e of CACHE.values()) e.ctl.abort(); CACHE.clear(); for (const k of Object.keys(ESRI_STATS) as (keyof typeof ESRI_STATS)[]) ESRI_STATS[k] = 0; }

/** Check the service's tiling once (MapServer?f=json). false = disabled (tiles would be misplaced).
 *  A description that cannot be fetched does not disable the service (its tiles fail gracefully anyway). */
function serviceUsable(service: string, env: EsriEnv): Promise<boolean> {
  const st = stateOf(service);
  st.check ??= env.fetch(`${env.base}/${service}/MapServer?f=json`, { mode: "cors" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((d) => {
      const why = tilingMismatch(d, ESRI_SERVICES[service].maxLevel);
      if (why) warnOnce(env, service, "tiling", `tiling scheme changed (${why}); basemap disabled, tiles are left empty`);
      return !why;
    }, (err) => { warnOnce(env, service, "describe", "service description not readable; continuing", err); return true; });
  return st.check;
}

const quadKey = (l: number, r: number, c: number) => `${l}/${r}/${c}`;
/** is (level, row, col) or one of its ancestors known to be empty? (level-0 grid is 2 x 1: col >> k, row >> k) */
function knownEmpty(st: ServiceState, level: number, row: number, col: number): boolean {
  if (!st.empty.size) return false;
  for (let k = 0; k <= level; k++) if (st.empty.has(quadKey(level - k, row >> k, col >> k))) return true;
  return false;
}
function fullyTransparent(img: Img, env: EsriEnv): boolean {
  const c = env.canvas(img.width, img.height), ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx?.getImageData) return false;
  ctx.drawImage(img, 0, 0);
  const a = ctx.getImageData(0, 0, img.width, img.height).data;
  for (let i = 3; i < a.length; i += 4) if (a[i] !== 0) return false;
  return true;
}

// ---------------------------------------------------------------------------------------------
// source tile cache
// ---------------------------------------------------------------------------------------------
interface Entry { p: Promise<Img | null>; ctl: AbortController; waiting: number; done: boolean }
const CACHE = new Map<string, Entry>();
const MAX_ENTRIES = 384;
/** request statistics (tests, the evaluation report) */
export const ESRI_STATS = { outputTiles: 0, sourceRequests: 0, sourceHits: 0, sourceMissing: 0, sourceSkipped: 0, emptyTiles: 0, aborted: 0, msTotal: 0 };

function acquire(service: string, level: number, row: number, col: number, env: EsriEnv): { url: string; e: Entry } {
  const url = sourceUrl(service, level, row, col, env.base);
  let e = CACHE.get(url);
  if (e) { CACHE.delete(url); CACHE.set(url, e); ESRI_STATS.sourceHits++; e.waiting++; return { url, e }; }
  const ctl = new AbortController();
  const st = stateOf(service), sparse = !!ESRI_SERVICES[service].sparse;
  const markEmpty = () => { ESRI_STATS.sourceMissing++; if (sparse) st.empty.add(quadKey(level, row, col)); return null; };
  ESRI_STATS.sourceRequests++;
  const p: Promise<Img | null> = env.fetch(url, { signal: ctl.signal, mode: "cors" })
    .then(async (r) => {
      if (!r.ok) return markEmpty();
      const img = await env.decode(await r.blob());
      if (sparse && level < ESRI_SERVICES[service].maxLevel && fullyTransparent(img, env)) { st.empty.add(quadKey(level, row, col)); img.close?.(); return null; }
      return img;
    })
    .catch((err) => {
      if (ctl.signal.aborted) throw err;
      // HTTP 4xx without CORS headers -> TypeError; not an image -> decode error
      ESRI_STATS.sourceMissing++;
      return null;
    });
  e = { p, ctl, waiting: 1, done: false };
  const entry = e;
  p.then(() => { entry.done = true; }, () => { CACHE.delete(url); });
  CACHE.set(url, e);
  while (CACHE.size > MAX_ENTRIES) {
    const [k, old] = CACHE.entries().next().value!;
    if (!old.done && old.waiting > 0) break;
    CACHE.delete(k);
    void old.p.then((b) => b?.close?.(), () => {});
  }
  return { url, e };
}
function release(url: string, e: Entry) {
  e.waiting--;
  if (e.waiting <= 0 && !e.done) { e.ctl.abort(); CACHE.delete(url); ESRI_STATS.aborted++; }
}

const abortError = () => new DOMException("aborted", "AbortError");

/** Compose the Mercator tile from the plan's source tiles. Rejects only with an AbortError (cancelled)
 *  or for a programming error; callers use esriTile(), which turns everything but aborts into empty tiles. */
export async function renderTile(service: string, z: number, x: number, y: number, signal: AbortSignal, env: EsriEnv = browserEnv()): Promise<Img> {
  const t0 = performance.now();
  const meta = ESRI_SERVICES[service];
  if (!meta) throw new Error(`unknown service ${service}`);
  const plan = planTile(z, x, y, meta.maxLevel);
  const st = stateOf(service);
  const want: { url: string; e: Entry; c: number; r: number }[] = [];
  for (let r = plan.r0; r <= plan.r1; r++) for (let c = plan.c0; c <= plan.c1; c++) {
    if (knownEmpty(st, plan.level, r, c)) { ESRI_STATS.sourceSkipped++; continue; }
    want.push({ ...acquire(service, plan.level, r, c, env), c, r });
  }
  let released = false;
  const releaseAll = () => { if (!released) { released = true; for (const w of want) release(w.url, w.e); } };
  const onAbort = () => releaseAll();
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    const imgs = await Promise.all(want.map((w) => w.e.p));
    if (signal.aborted) throw abortError();
    if (!imgs.some(Boolean)) { ESRI_STATS.emptyTiles++; return emptyTile(env); }
    const mw = (plan.c1 - plan.c0 + 1) * TILE, mh = (plan.r1 - plan.r0 + 1) * TILE;
    const mosaic = env.canvas(mw, mh);
    const mctx = mosaic.getContext("2d")!;
    imgs.forEach((im, k) => { if (im) mctx.drawImage(im, (want[k].c - plan.c0) * TILE, (want[k].r - plan.r0) * TILE); });
    const out = env.canvas(TILE, TILE);
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    for (let j = 0; j < TILE; j++) {
      const sy = Math.min(mh - 1, Math.max(0, Math.floor(plan.rows[j])));
      ctx.drawImage(mosaic, plan.sx, sy, plan.sw, 1, 0, j, TILE, 1);
    }
    ESRI_STATS.outputTiles++;
    ESRI_STATS.msTotal += performance.now() - t0;
    return out.transferToImageBitmap();
  } finally {
    signal.removeEventListener("abort", onAbort);
    releaseAll();
  }
}

/** The protocol handler: an `esri-mars://<service>/{z}/{x}/{y}` URL -> a tile image. Never rejects except
 *  with an AbortError for a cancelled tile; every failure gives a transparent tile and one warning. */
export async function esriTile(url: string, signal: AbortSignal, env: EsriEnv = browserEnv()): Promise<Img> {
  const m = /^esri-mars:\/\/([A-Za-z0-9]+)\/(\d+)\/(\d+)\/(\d+)/.exec(url);
  const service = m?.[1] ?? "?";
  try {
    if (!m) { warnOnce(env, service, "url", `bad tile url ${url}`); return emptyTile(env); }
    if (!ESRI_SERVICES[service]) { warnOnce(env, service, "unknown", "unknown service; tiles are left empty"); return emptyTile(env); }
    if (!(await serviceUsable(service, env))) return emptyTile(env);
    if (signal.aborted) throw abortError();
    return await renderTile(service, Number(m[2]), Number(m[3]), Number(m[4]), signal, env);
  } catch (err) {
    if (signal.aborted) throw err instanceof DOMException && err.name === "AbortError" ? err : abortError();
    warnOnce(env, service, "render", "tile failed; left empty", err);
    try { return emptyTile(env); } catch { throw abortError(); } // no canvas at all: MapLibre treats it as cancelled
  }
}

let registered = false;
/** Register the esri-mars:// protocol once (the Mars basemaps with esri-mars:// tiles need it). */
export function ensureEsriProtocol() {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol("esri-mars", async (params, abortController) => ({ data: await esriTile(params.url, abortController.signal) }));
}

export const isEsriService = (s: string) => Object.prototype.hasOwnProperty.call(ESRI_SERVICES, s);

// ---------------------------------------------------------------------------------------------
// polar caps (globe): the service's geographic tiles poleward of the Web-Mercator limit resampled to a polar
// azimuthal-equidistant texture (polarcap.ts capUV: centre = pole, radius rhoDeg of latitude to the edge
// middle; north: lon 0 down, south: lon 0 up, 90 E right)
// ---------------------------------------------------------------------------------------------
/** Esri level for an N px cap texture: level 4 (0.022 deg/px) for 512 px, one level per doubling */
export const capLevelFor = (N: number, maxLevel: number) => Math.max(0, Math.min(maxLevel, 4 + Math.round(Math.log2(N / 512))));

/** Source tiles (level, rows, cols) covering the cap texture of radius rhoDeg (its corners reach rho * sqrt 2). */
export function planPolarCap(north: boolean, N: number, maxLevel: number, rhoDeg: number) {
  const level = capLevelFor(N, maxLevel), span = SPAN0 / 2 ** level, res = span / TILE;
  const nRows = 2 ** level, nCols = 2 * nRows, reach = Math.min(90, rhoDeg * Math.SQRT2);
  const r0 = north ? 0 : Math.max(0, Math.floor((180 - reach) / span)), r1 = north ? Math.min(nRows - 1, Math.floor(reach / span)) : nRows - 1;
  return { level, span, res, r0, r1, c0: 0, c1: nCols - 1 };
}

/** Compose the polar cap texture (premultiplied RGBA ImageBitmap, N x N) from the service's geographic tiles;
 *  null when nothing could be fetched or the environment lacks pixel access. Areas without data stay transparent
 *  (the cap layer shows the basemap background there). */
export async function esriPolarCap(service: string, north: boolean, N: number, signal: AbortSignal, rhoDeg: number, env: EsriEnv = browserEnv()): Promise<ImageBitmap | null> {
  const meta = ESRI_SERVICES[service];
  if (!meta || !(await serviceUsable(service, env))) return null;
  const plan = planPolarCap(north, N, meta.maxLevel, rhoDeg);
  const st = stateOf(service);
  const want: { url: string; e: Entry; r: number; c: number }[] = [];
  for (let r = plan.r0; r <= plan.r1; r++) for (let c = plan.c0; c <= plan.c1; c++) {
    if (knownEmpty(st, plan.level, r, c)) continue;
    want.push({ ...acquire(service, plan.level, r, c, env), r, c });
  }
  try {
    const imgs = await Promise.all(want.map((w) => w.e.p));
    if (signal.aborted || !imgs.some(Boolean)) return null;
    const pix = new Map<string, Uint8ClampedArray>();
    const tc = env.canvas(TILE, TILE), tctx = tc.getContext("2d", { willReadFrequently: true });
    const read = tctx?.getImageData?.bind(tctx);
    if (!tctx || !read) return null;
    imgs.forEach((im, k) => {
      if (!im) return;
      tctx.clearRect?.(0, 0, TILE, TILE);
      tctx.drawImage(im, 0, 0);
      pix.set(`${want[k].r}/${want[k].c}`, read(0, 0, TILE, TILE).data.slice());
    });
    const out = env.canvas(N, N), octx = out.getContext("2d");
    const create = octx?.createImageData?.bind(octx), put = octx?.putImageData?.bind(octx);
    if (!create || !put) return null;
    const od = create(N, N), o = od.data;
    const s = north ? 1 : -1, D = Math.PI / 180;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = ((j + 0.5) / N - 0.5) * 2, y = ((i + 0.5) / N - 0.5) * 2 * s;
      const lon = Math.atan2(x, y) / D, lat = s * (90 - Math.hypot(x, y) * rhoDeg);
      const col = Math.min(Math.floor((lon + 180) / plan.res), (plan.c1 + 1) * TILE - 1), row = Math.min(Math.floor((90 - lat) / plan.res), (plan.r1 + 1) * TILE - 1);
      const tile = pix.get(`${Math.floor(row / TILE)}/${Math.floor(col / TILE)}`);
      if (!tile) continue;
      const q = ((row % TILE) * TILE + (col % TILE)) * 4, p = (i * N + j) * 4, a = tile[q + 3];
      o[p] = (tile[q] * a) / 255; o[p + 1] = (tile[q + 1] * a) / 255; o[p + 2] = (tile[q + 2] * a) / 255; o[p + 3] = a;
    }
    put(od, 0, 0);
    return out.transferToImageBitmap();
  } catch (err) {
    if (!signal.aborted) warnOnce(env, service, "polarcap", "polar cap failed; background shown", err);
    return null;
  } finally {
    for (const w of want) release(w.url, w.e);
  }
}
