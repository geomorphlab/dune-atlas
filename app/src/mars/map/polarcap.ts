// Polar caps on the GLOBE (Mars): everything poleward of the Web-Mercator limit (85.0511°).
//
// Why: every tile source ends at 85.0511°. MapLibre's globe fills each cap for raster / hillshade tiles by
// stretching the top (bottom) tile row to the pole (create_tile_mesh `extendToNorthPole`; raster.vertex /
// hillshade.vertex set v_pos.y = 0 for the pole vertices), which shows as radial smearing; vector fills get no
// cap (and edges on the tile edge were extended to the pole as wedges). This module draws the caps itself, as
// MapLibre custom layers placed by MapLibre's own globe projection (`projectTile` of the shader prelude, as
// map/globelines.ts), hidden in the flat map and during the globe->Mercator transition:
//
//  * basemap cap ("basemap-polarcap", directly above the basemap layers, below every data layer):
//      - MOLA–HRSC hillshade: per-pole DEM textures (polar azimuthal-equidistant, terrarium WebP; pipeline
//        mars/terrain_polar.py) shaded in the fragment shader with MapLibre's 'standard' hillshade maths and
//        the basemap's paint (exaggeration, colours, illumination 335° anchored to the viewport) and the same
//        slope scaling as hillshade_prepare (zoom exaggeration, ±4 clamp, Mercator cos(lat) correction), so
//        it continues the tiles at 85.05°;
//      - Esri OnMars imagery: a cap image composed from the service's geographic tiles (esri.ts esriPolarCap);
//      - sources without polar data (OpenPlanetaryMap): the basemap background colour (no smear);
//  * vector fill caps ("<fill layer id>-polarcap", directly above their fill layer): the dune / invert
//    polygons poleward of 85.0511° from the source coordinates (pipeline polar-caps.json triangles), with the
//    fill layer's colour, opacity and visibility mirrored on every style change.
//
// Pure mesh / texture-coordinate / shading helpers are exported for tests (tests/mars/polarcap.test.ts).
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MlMap } from "maplibre-gl";
import type { BasemapDef } from "../../registry/types";
import { mercatorXY, POLE_LAT } from "../../map/globelines";
import { esriPolarCap, isEsriService } from "./esri";

export const MERC_LAT = 85.0511287798066;
/** polar texture radius (deg of latitude from the pole); must equal terrain_polar.RHO_DEG */
export const CAP_RHO_DEG = 90 - 84.95;
export const R_MARS_2000 = 3396190;
/** MapLibre's hillshade_prepare assumes the Earth circumference (pow(2, 28.2562) = 8 x 40075016.69 m) */
export const MAPLIBRE_CIRCUMFERENCE = 40075016.6855785;
export const CAP_SIZES = [256, 512, 1024, 2048, 4096];
const D2R = Math.PI / 180;

// ---------------------------------------------------------------------------------------------------------
// pure geometry
// ---------------------------------------------------------------------------------------------------------
/** texture coordinates (u right, v down, [0,1]) of the polar AEQD texture (terrain_polar.cap_uv) */
export function capUV(lon: number, lat: number, north: boolean): [number, number] {
  const r = (90 - Math.abs(lat)) / CAP_RHO_DEG, l = lon * D2R;
  return [0.5 + 0.5 * r * Math.sin(l), 0.5 + (north ? 0.5 : -0.5) * r * Math.cos(l)];
}
/** inverse of capUV: [lon, |lat|] */
export function capLonLat(u: number, v: number, north: boolean): [number, number] {
  const x = (u - 0.5) * 2, y = (v - 0.5) * 2 * (north ? 1 : -1);
  return [Math.atan2(x, y) / D2R, 90 - Math.hypot(x, y) * CAP_RHO_DEG];
}

export interface CapMesh { pos: Float32Array; uv: Float32Array; index: Uint32Array; vertices: number }

/** lon/lat grid of one cap from |lat| = lat0 to the pole (POLE_LAT), dLon x dLat cells; per vertex the
 *  Mercator position (unclamped, MapLibre globe input) and the polar texture coordinate. */
export function capGrid(north: boolean, lat0 = MERC_LAT, dLon = 1, dLat = 0.1): CapMesh {
  const lats: number[] = [lat0];
  for (let l = Math.ceil(lat0 / dLat) * dLat; l < POLE_LAT; l += dLat) if (l > lat0 + 1e-9) lats.push(l);
  lats.push(POLE_LAT);
  const nLon = Math.round(360 / dLon);
  const nv = lats.length * (nLon + 1);
  const pos = new Float32Array(nv * 2), uv = new Float32Array(nv * 2);
  let k = 0;
  for (const la of lats) for (let j = 0; j <= nLon; j++) {
    const lon = -180 + j * dLon, lat = north ? la : -la;
    const [mx, my] = mercatorXY(lon, lat);
    const [u, v] = capUV(lon, lat, north);
    pos[k * 2] = mx; pos[k * 2 + 1] = my; uv[k * 2] = u; uv[k * 2 + 1] = v; k++;
  }
  const index = new Uint32Array((lats.length - 1) * nLon * 6);
  let t = 0;
  for (let i = 0; i < lats.length - 1; i++) for (let j = 0; j < nLon; j++) {
    const a = i * (nLon + 1) + j, b = a + 1, c = a + nLon + 1, d = c + 1;
    index.set([a, b, c, b, d, c], t); t += 6;
  }
  return { pos, uv, index, vertices: nv };
}

/** Mercator positions of a flat [lon, lat, lon, lat, ...] triangle list (3 vertices per triangle) */
export function fillMesh(lonlat: ArrayLike<number>): CapMesh {
  const nv = Math.floor(lonlat.length / 2);
  const pos = new Float32Array(nv * 2);
  for (let k = 0; k < nv; k++) { const [x, y] = mercatorXY(lonlat[2 * k], lonlat[2 * k + 1]); pos[2 * k] = x; pos[2 * k + 1] = y; }
  const index = new Uint32Array(nv - (nv % 3));
  for (let k = 0; k < index.length; k++) index[k] = k;
  return { pos, uv: new Float32Array(nv * 2), index, vertices: nv };
}

/** spherical area (unit sphere, steradian) of lon/lat triangles: cylindrical equal-area plane (lon, sin lat) */
export function trianglesArea(lonlat: ArrayLike<number>): number {
  let s = 0;
  for (let k = 0; k + 5 < lonlat.length; k += 6) {
    const x0 = lonlat[k] * D2R, y0 = Math.sin(lonlat[k + 1] * D2R), x1 = lonlat[k + 2] * D2R, y1 = Math.sin(lonlat[k + 3] * D2R);
    const x2 = lonlat[k + 4] * D2R, y2 = Math.sin(lonlat[k + 5] * D2R);
    s += Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) / 2;
  }
  return s;
}
/** the lon/lat triangles of a CapMesh grid (tests: area of the cap) */
export function gridTriangles(north: boolean, lat0 = MERC_LAT, dLon = 1, dLat = 0.1): number[] {
  const out: number[] = [];
  const lats: number[] = [lat0];
  for (let l = Math.ceil(lat0 / dLat) * dLat; l < 90; l += dLat) if (l > lat0 + 1e-9) lats.push(l);
  lats.push(90);
  const s = north ? 1 : -1;
  for (let i = 0; i < lats.length - 1; i++) for (let lon = -180; lon < 180 - 1e-9; lon += dLon) {
    const a = [lon, s * lats[i]], b = [lon + dLon, s * lats[i]], c = [lon, s * lats[i + 1]], d = [lon + dLon, s * lats[i + 1]];
    out.push(...a, ...b, ...c, ...b, ...d, ...c);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// pure shading maths (mirrors the fragment shader; MapLibre 5 hillshade_prepare + standard_hillshade)
// ---------------------------------------------------------------------------------------------------------
export const exaggerationForZoom = (z: number) => {
  const f = z < 2 ? 0.4 : z < 4.5 ? 0.35 : 0.3;
  return z < 15 ? (z - 15) * f : 0;
};
/** MapLibre's per-pixel derivative for a true ground gradient (dz/deast, dz/dsouth in m/m) at latitude lat on a
 *  tile of zoom z: prepare = clamp(slope * cos(lat) * (2 pi R / C_maplibre) / 2^e, -4, 4); main pass / cos(lat). */
export function maplibreDeriv(gEast: number, gSouth: number, lat: number, z: number, radius = R_MARS_2000): [number, number] {
  const c = Math.cos(lat * D2R), k = (2 * Math.PI * radius) / MAPLIBRE_CIRCUMFERENCE / 2 ** exaggerationForZoom(z);
  const cl = (v: number) => Math.max(-4, Math.min(4, v * c * k));
  return [cl(gEast) / c, cl(gSouth) / c];
}
export type RGBA = [number, number, number, number];
/** MapLibre 'standard' hillshade (premultiplied colours), + background underneath (opaque) */
export function standardHillshade(deriv: [number, number], o: { exaggeration: number; azimuthRad: number; shadow: RGBA; highlight: RGBA; accent: RGBA; background?: RGBA }): RGBA {
  const azimuth = o.azimuthRad + Math.PI;
  const slope = Math.atan(0.625 * Math.hypot(deriv[0], deriv[1]));
  const aspect = deriv[0] !== 0 ? Math.atan2(deriv[1], -deriv[0]) : (Math.PI / 2) * (deriv[1] > 0 ? 1 : -1);
  const intensity = o.exaggeration, base = 1.875 - intensity * 1.75, maxValue = 0.5 * Math.PI;
  const scaledSlope = intensity !== 0.5 ? ((base ** slope - 1) / (base ** maxValue - 1)) * maxValue : slope;
  const accent = Math.cos(scaledSlope), ci = Math.max(0, Math.min(1, intensity * 2));
  const mod = (a: number, b: number) => a - b * Math.floor(a / b);
  const shade = Math.abs(mod((aspect + azimuth) / Math.PI + 0.5, 2) - 1);
  const sc: number[] = [], acc: number[] = [];
  for (let i = 0; i < 4; i++) {
    acc[i] = (1 - accent) * o.accent[i] * ci;
    sc[i] = (o.shadow[i] + (o.highlight[i] - o.shadow[i]) * shade) * Math.sin(scaledSlope) * ci;
  }
  const res: RGBA = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) res[i] = acc[i] * (1 - sc[3]) + sc[i];
  if (o.background) for (let i = 0; i < 4; i++) res[i] = res[i] + o.background[i] * (1 - res[3]);
  return res;
}
/** local east / south unit vectors in (u, v) texture space at longitude lon */
export function capFrame(lon: number, north: boolean): { east: [number, number]; south: [number, number] } {
  const s = north ? 1 : -1, l = lon * D2R;
  return { east: [Math.cos(l), -s * Math.sin(l)], south: [s * Math.sin(l), Math.cos(l)] };
}
/** cap texture pixel size (m) for an N px texture */
export const capPixelM = (N: number) => (2 * CAP_RHO_DEG * D2R * R_MARS_2000) / N;
/** texture level matching the tiles at the seam for map zoom z (512 px tiles): the coarsest N whose pixel is not
 *  larger than the Mercator tile pixel at 85.05° (2 pi R cos(lat) / (512 2^z)) */
export function capLevel(z: number, sizes = CAP_SIZES): number {
  const tilePx = (2 * Math.PI * R_MARS_2000 * Math.cos(MERC_LAT * D2R)) / (512 * 2 ** Math.max(0, Math.floor(z)));
  for (const N of sizes) if (capPixelM(N) <= tilePx * 1.0001) return N;
  return sizes[sizes.length - 1];
}
export const hexColor = (c: string, a = 1): RGBA => {
  const m = /^#?([0-9a-f]{6})$/i.exec((c ?? "").trim());
  const v = m ? parseInt(m[1], 16) : 0;
  return [(((v >> 16) & 255) / 255) * a, (((v >> 8) & 255) / 255) * a, ((v & 255) / 255) * a, a];
};

// ---------------------------------------------------------------------------------------------------------
// WebGL
// ---------------------------------------------------------------------------------------------------------
const VS = (prelude: string, define: string) => `#version 300 es
${prelude}
${define}
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main() { v_uv = a_uv; gl_Position = projectTile(a_pos); }`;

const FS_FILL = `#version 300 es
precision highp float;
uniform vec4 u_color;   // premultiplied
out vec4 fragColor;
void main() { fragColor = u_color; }`;

const FS_IMAGE = `#version 300 es
precision highp float;
uniform sampler2D u_tex; // premultiplied
uniform vec4 u_bg;
uniform float u_opacity;
in vec2 v_uv;
out vec4 fragColor;
void main() { vec4 t = texture(u_tex, v_uv); fragColor = (t + u_bg * (1.0 - t.a)) * u_opacity; }`;

const FS_HILLSHADE = `#version 300 es
precision highp float;
#define PI 3.141592653589793
uniform sampler2D u_dem;
uniform float u_texel;      // 1 / N
uniform float u_px_m;       // ground size of a texture pixel (m)
uniform float u_north;      // +1 north cap, -1 south cap
uniform float u_rho;        // texture radius (deg)
uniform float u_k;          // 2 pi R / C_maplibre / 2^exaggeration(zoom)
uniform float u_exaggeration;
uniform float u_azimuth;    // illumination direction + bearing (rad)
uniform vec4 u_shadow;
uniform vec4 u_highlight;
uniform vec4 u_accent;
uniform vec4 u_bg;
in vec2 v_uv;
out vec4 fragColor;
float elev(vec2 uv) { vec4 d = texture(u_dem, uv) * 255.0; return d.r * 256.0 + d.g + d.b / 256.0 - 32768.0; }
void main() {
  // texel-centred stencil (NEAREST sampling)
  vec2 n = vec2(1.0 / u_texel);
  vec2 c0 = (floor(v_uv * n) + 0.5) / n;
  float t = u_texel;
  float a = elev(c0 + vec2(-t, -t)), b = elev(c0 + vec2(0.0, -t)), c = elev(c0 + vec2(t, -t));
  float d = elev(c0 + vec2(-t, 0.0)),                               f = elev(c0 + vec2(t, 0.0));
  float g = elev(c0 + vec2(-t, t)),  h = elev(c0 + vec2(0.0, t)),  i = elev(c0 + vec2(t, t));
  float gu = ((c + f + f + i) - (a + d + d + g)) / (8.0 * u_px_m);   // dz/du (m/m), u right
  float gv = ((g + h + h + i) - (a + b + b + c)) / (8.0 * u_px_m);   // dz/dv (m/m), v down
  vec2 p = (v_uv - 0.5) * 2.0;
  float lon = atan(p.x, p.y * u_north);
  float lat = 90.0 - length(p) * u_rho;
  vec2 east = vec2(cos(lon), -u_north * sin(lon));
  vec2 south = vec2(u_north * sin(lon), cos(lon));
  vec2 G = vec2(gu * east.x + gv * east.y, gu * south.x + gv * south.y);
  float cl = cos(radians(lat));
  vec2 deriv = clamp(G * cl * u_k, -4.0, 4.0) / cl;
  float azimuth = u_azimuth + PI;
  float slope = atan(0.625 * length(deriv));
  float aspect = deriv.x != 0.0 ? atan(deriv.y, -deriv.x) : PI / 2.0 * (deriv.y > 0.0 ? 1.0 : -1.0);
  float intensity = u_exaggeration;
  float base = 1.875 - intensity * 1.75;
  float maxValue = 0.5 * PI;
  float scaledSlope = intensity != 0.5 ? ((pow(base, slope) - 1.0) / (pow(base, maxValue) - 1.0)) * maxValue : slope;
  float accent = cos(scaledSlope);
  vec4 accent_color = (1.0 - accent) * u_accent * clamp(intensity * 2.0, 0.0, 1.0);
  float shade = abs(mod((aspect + azimuth) / PI + 0.5, 2.0) - 1.0);
  vec4 shade_color = mix(u_shadow, u_highlight, shade) * sin(scaledSlope) * clamp(intensity * 2.0, 0.0, 1.0);
  vec4 hs = accent_color * (1.0 - shade_color.a) + shade_color;
  fragColor = hs + u_bg * (1.0 - hs.a);
}`;

type Mode = "fill" | "image" | "hillshade";
export interface HillshadePaint { exaggeration: number; shadow: string; highlight: string; accent: string; directionDeg: number; anchor: "viewport" | "map"; background: string }
interface Prog { prog: WebGLProgram; loc: Record<string, WebGLUniformLocation | null>; attr: Record<string, number> }
interface PoleState { mesh: CapMesh; vbo: WebGLBuffer | null; uvbo: WebGLBuffer | null; ibo: WebGLBuffer | null; dirty: boolean; tex: WebGLTexture | null; img: ImageBitmap | null; size: number; texDirty: boolean }

/** One globe-only cap layer (both poles). */
export class PolarCapLayer implements CustomLayerInterface {
  readonly type = "custom" as const;
  readonly renderingMode = "2d" as const;
  #map: MlMap | null = null;
  #programs = new Map<string, Prog>();
  #poles: Record<"N" | "S", PoleState>;
  color = "#a0a0a0";
  opacity = 1;
  background = "#000000";
  hillshade: HillshadePaint = { exaggeration: 0.65, shadow: "#000000", highlight: "#8d949c", accent: "#2a2f35", directionDeg: 335, anchor: "viewport", background: "#1b1f24" };
  constructor(readonly id: string, readonly mode: Mode, lat0 = MERC_LAT) {
    const mk = (north: boolean): PoleState => ({ mesh: mode === "fill" ? fillMesh([]) : capGrid(north, lat0), vbo: null, uvbo: null, ibo: null, dirty: true, tex: null, img: null, size: 0, texDirty: false });
    this.#poles = { N: mk(true), S: mk(false) };
  }
  /** fill mode: flat lon/lat triangles per pole */
  setTriangles(pole: "N" | "S", lonlat: ArrayLike<number>) { const p = this.#poles[pole]; p.mesh = fillMesh(lonlat); p.dirty = true; this.#map?.triggerRepaint(); }
  /** image / hillshade mode: the polar texture (premultiplied RGBA image, or terrarium DEM) */
  setTexture(pole: "N" | "S", img: ImageBitmap | null, size: number) { const p = this.#poles[pole]; p.img?.close?.(); p.img = img; p.size = size; p.texDirty = true; this.#map?.triggerRepaint(); }
  textureSize(pole: "N" | "S") { return this.#poles[pole].size; }
  setStyle(o: { color?: string; opacity?: number; background?: string; hillshade?: Partial<HillshadePaint> }) {
    if (o.color !== undefined) this.color = o.color;
    if (o.opacity !== undefined) this.opacity = o.opacity;
    if (o.background !== undefined) this.background = o.background;
    if (o.hillshade) this.hillshade = { ...this.hillshade, ...o.hillshade };
    this.#map?.triggerRepaint();
  }
  onAdd(map: MlMap) { this.#map = map; for (const p of Object.values(this.#poles)) { p.dirty = true; p.texDirty = !!p.img; } }
  onRemove(_m: MlMap, glIn: WebGLRenderingContext | WebGL2RenderingContext) {
    const gl = glIn as WebGL2RenderingContext;
    for (const p of Object.values(this.#poles)) {
      for (const b of [p.vbo, p.uvbo, p.ibo]) if (b) gl.deleteBuffer(b);
      if (p.tex) gl.deleteTexture(p.tex);
      p.vbo = p.uvbo = p.ibo = null; p.tex = null;
    }
    for (const p of this.#programs.values()) gl.deleteProgram(p.prog);
    this.#programs.clear();
    if (this.#empty) gl.deleteTexture(this.#empty);
    this.#empty = null;
    this.#map = null;
  }
  #empty: WebGLTexture | null = null;
  #emptyTexture(gl: WebGL2RenderingContext): WebGLTexture {
    if (this.#empty) return this.#empty;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.#empty = t;
    return t;
  }
  #program(gl: WebGL2RenderingContext, sd: CustomRenderMethodInput["shaderData"]): Prog {
    const key = `${this.mode}:${sd.variantName}`;
    let p = this.#programs.get(key);
    if (p) return p;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`polar cap shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS(sd.vertexShaderPrelude, sd.define)));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, this.mode === "fill" ? FS_FILL : this.mode === "image" ? FS_IMAGE : FS_HILLSHADE));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`polar cap program: ${gl.getProgramInfoLog(prog)}`);
    const names = ["u_projection_matrix", "u_projection_fallback_matrix", "u_projection_tile_mercator_coords", "u_projection_clipping_plane", "u_projection_transition",
      "u_color", "u_tex", "u_bg", "u_opacity", "u_dem", "u_texel", "u_px_m", "u_north", "u_rho", "u_k", "u_exaggeration", "u_azimuth", "u_shadow", "u_highlight", "u_accent"];
    const loc = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)]));
    const attr = { a_pos: gl.getAttribLocation(prog, "a_pos"), a_uv: gl.getAttribLocation(prog, "a_uv") };
    p = { prog, loc, attr };
    this.#programs.set(key, p);
    return p;
  }
  render(glIn: WebGLRenderingContext | WebGL2RenderingContext, opts: CustomRenderMethodInput) {
    const gl = glIn as WebGL2RenderingContext, map = this.#map;
    if (!map || map.getProjection?.()?.type !== "globe" || this.opacity <= 0) return;
    const pd = opts.defaultProjectionData;
    if ((pd.projectionTransition ?? 1) < 0.999) return;        // flat map or globe->Mercator transition
    const { prog, loc, attr } = this.#program(gl, opts.shaderData);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(loc.u_projection_matrix, false, pd.mainMatrix as Float32Array);
    gl.uniformMatrix4fv(loc.u_projection_fallback_matrix, false, pd.fallbackMatrix as Float32Array);
    gl.uniform4f(loc.u_projection_tile_mercator_coords, ...(pd.tileMercatorCoords as [number, number, number, number]));
    gl.uniform4f(loc.u_projection_clipping_plane, ...(pd.clippingPlane as [number, number, number, number]));
    gl.uniform1f(loc.u_projection_transition, pd.projectionTransition);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (this.mode === "fill") {
      const c = hexColor(this.color, Math.max(0, Math.min(1, this.opacity)));
      gl.uniform4f(loc.u_color, ...c);
    } else if (this.mode === "image") {
      gl.uniform4f(loc.u_bg, ...hexColor(this.background));
      gl.uniform1f(loc.u_opacity, Math.max(0, Math.min(1, this.opacity)));
      gl.uniform1i(loc.u_tex, 0);
    } else {
      const h = this.hillshade, z = map.getZoom();
      const bearing = h.anchor === "viewport" ? (map.getBearing() * Math.PI) / 180 : 0;
      gl.uniform1i(loc.u_dem, 0);
      gl.uniform1f(loc.u_rho, CAP_RHO_DEG);
      gl.uniform1f(loc.u_k, (2 * Math.PI * R_MARS_2000) / MAPLIBRE_CIRCUMFERENCE / 2 ** exaggerationForZoom(Math.floor(z)));
      gl.uniform1f(loc.u_exaggeration, h.exaggeration);
      gl.uniform1f(loc.u_azimuth, (h.directionDeg * Math.PI) / 180 + bearing);
      gl.uniform4f(loc.u_shadow, ...hexColor(h.shadow));
      gl.uniform4f(loc.u_highlight, ...hexColor(h.highlight));
      gl.uniform4f(loc.u_accent, ...hexColor(h.accent));
      gl.uniform4f(loc.u_bg, ...hexColor(h.background));
    }
    for (const [name, p] of Object.entries(this.#poles) as ["N" | "S", PoleState][]) {
      if (!p.mesh.index.length) continue;
      if (this.mode !== "fill") {
        if (p.texDirty && p.img) {
          p.tex ??= gl.createTexture();
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, p.tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.img);
          const filt = this.mode === "hillshade" ? gl.NEAREST : gl.LINEAR;
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          p.texDirty = false;
        }
        if (!p.tex && this.mode === "hillshade") continue;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, p.tex ?? this.#emptyTexture(gl));   // image not loaded yet: background only
        if (this.mode === "hillshade") {
          gl.uniform1f(loc.u_texel, 1 / p.size);
          gl.uniform1f(loc.u_px_m, capPixelM(p.size));
          gl.uniform1f(loc.u_north, name === "N" ? 1 : -1);
        }
      }
      p.vbo ??= gl.createBuffer(); p.uvbo ??= gl.createBuffer(); p.ibo ??= gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, p.vbo);
      if (p.dirty) gl.bufferData(gl.ARRAY_BUFFER, p.mesh.pos, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(attr.a_pos); gl.vertexAttribPointer(attr.a_pos, 2, gl.FLOAT, false, 8, 0);
      if (attr.a_uv >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, p.uvbo);
        if (p.dirty) gl.bufferData(gl.ARRAY_BUFFER, p.mesh.uv, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(attr.a_uv); gl.vertexAttribPointer(attr.a_uv, 2, gl.FLOAT, false, 8, 0);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.ibo);
      if (p.dirty) gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, p.mesh.index, gl.STATIC_DRAW);
      p.dirty = false;
      gl.drawElements(gl.TRIANGLES, p.mesh.index.length, gl.UNSIGNED_INT, 0);
      gl.disableVertexAttribArray(attr.a_pos);
      if (attr.a_uv >= 0) gl.disableVertexAttribArray(attr.a_uv);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// installation: one call after the map is created (src/mars/main.ts)
// ---------------------------------------------------------------------------------------------------------
/** Polar DEM textures per basemap id (data keys under the data base; pipeline mars/terrain_polar.py) */
export const POLAR_DEM: Record<string, string> = { "hrsc-mola-hillshade": "dune-atlas/mars/v1/basemaps/hrsc-mola-polar" };
export const BASEMAP_CAP_ID = "basemap-polarcap";
export interface FillCapSpec { layerId: string; url: string; part: string }
export interface PolarCapOptions {
  dataBase: string;
  basemaps: BasemapDef[];
  /** fill layers mirrored on the globe (e.g. ov-dunes-fill and ov-dunes-invert from polar-caps.json) */
  fills?: FillCapSpec[];
  fetchImage?: (url: string) => Promise<ImageBitmap>;
  fetchJson?: (url: string) => Promise<unknown>;
}
const join = (base: string, key: string) => `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
const defaultFetchImage = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return createImageBitmap(await r.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
};
const defaultFetchJson = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return r.json(); };

/** which cap a basemap gets */
export function basemapCapKind(b: BasemapDef | undefined): { mode: Mode; service?: string; dem?: string } | null {
  if (!b) return null;
  if (b.kind === "hillshade") return POLAR_DEM[b.id] ? { mode: "hillshade", dem: POLAR_DEM[b.id] } : { mode: "fill" };
  const esri = b.tiles?.map((t) => /^esri-mars:\/\/([A-Za-z0-9]+)\//.exec(t)?.[1]).find(Boolean);
  if (esri && isEsriService(esri)) return { mode: "image", service: esri };
  if (b.kind === "raster" && b.tiles?.length) return { mode: "fill" };   // no polar data: background colour
  return null;                                                           // style / background-only: nothing smeared
}

/** Keep the globe polar caps in step with the map: the basemap cap above the basemap layers (rebuilt on every
 *  basemap switch) and one cap per mirrored fill layer directly above it. Returns a disposer. */
export function installPolarCaps(map: MlMap, opts: PolarCapOptions): () => void {
  const fetchImage = opts.fetchImage ?? defaultFetchImage, fetchJson = opts.fetchJson ?? defaultFetchJson;
  const fillData = new Map<string, Promise<Record<string, number[]> | null>>();
  const demCache = new Map<string, Promise<ImageBitmap | null>>();
  let basemapLayer: PolarCapLayer | null = null, basemapKey = "";
  let busy = false, ctl = new AbortController();

  const order = () => (map.getLayersOrder?.() ?? map.getStyle().layers.map((l) => l.id));
  /** keep layer `id` directly above `afterId` (or above the topmost basemap layer when afterId is null) */
  const place = (id: string, afterId: string | null) => {
    const ids = order();
    const cur = ids.indexOf(id);
    if (cur < 0) return;
    const rest = ids.filter((x) => x !== id);
    let t = afterId ? rest.indexOf(afterId) : -1;
    if (!afterId) rest.forEach((x, i) => { if (x.startsWith("basemap")) t = i; });
    const below = t >= 0 ? rest[t] : undefined;
    if ((cur > 0 ? ids[cur - 1] : undefined) === below) return;
    map.moveLayer(id, rest[t + 1]);
  };

  const loadDem = (key: string, pole: "N" | "S", N: number) => {
    const url = join(opts.dataBase, `${key}/${pole.toLowerCase()}-${N}.webp`);
    let p = demCache.get(url);
    if (!p) { p = fetchImage(url).catch((e) => { console.warn(`[dune-atlas] polar cap ${url}`, e); return null; }); demCache.set(url, p); }
    return p;
  };
  const refreshBasemapTextures = () => {
    const L = basemapLayer;
    if (!L) return;
    const kind = basemapCapKind(currentBasemap());
    if (!kind) return;
    if (kind.mode === "hillshade" && kind.dem) {
      const N = capLevel(map.getZoom());
      for (const pole of ["N", "S"] as const) {
        if (L.textureSize(pole) === N) continue;
        void loadDem(kind.dem, pole, N).then((img) => { if (img && basemapLayer === L) L.setTexture(pole, img, N); });
      }
    } else if (kind.mode === "image" && kind.service) {
      const N = map.getZoom() >= 3 ? 1024 : 512;
      for (const pole of ["N", "S"] as const) {
        if (L.textureSize(pole) >= N) continue;
        const sig = ctl.signal;
        void esriPolarCap(kind.service, pole === "N", N, sig, CAP_RHO_DEG).then((img) => { if (img && basemapLayer === L && !sig.aborted) L.setTexture(pole, img, N); }).catch(() => {});
      }
    }
  };
  const currentBasemap = () => {
    const id = (map.getStyle()?.metadata as Record<string, unknown> | undefined)?.["atlas:basemap"] as string | undefined;
    return opts.basemaps.find((b) => b.id === id);
  };
  const syncBasemap = () => {
    const b = currentBasemap();
    const kind = basemapCapKind(b);
    const key = b && kind ? `${b.id}:${kind.mode}` : "";
    if (key !== basemapKey || (basemapLayer && !map.getLayer(BASEMAP_CAP_ID))) {
      if (map.getLayer(BASEMAP_CAP_ID)) map.removeLayer(BASEMAP_CAP_ID);
      ctl.abort(); ctl = new AbortController();
      basemapLayer = null; basemapKey = key;
      if (!kind) return;
      const lat0 = 85.0;                    // opaque basemap caps overlap the top tile row (85.0-85.05) slightly
      const L = new PolarCapLayer(BASEMAP_CAP_ID, kind.mode, lat0);
      const bgLayer = map.getLayer("basemap-background") ? (map.getPaintProperty("basemap-background", "background-color") as string) : "#0e1216";
      const bg = typeof bgLayer === "string" ? bgLayer : "#0e1216";
      L.setStyle({ color: bg, background: bg, opacity: 1 });
      if (kind.mode === "fill") { const t = gridTriangles(true, lat0); L.setTriangles("N", t); L.setTriangles("S", gridTriangles(false, lat0)); }
      if (kind.mode === "hillshade" && map.getLayer("basemap-hillshade")) {
        const g = (p: string) => map.getPaintProperty("basemap-hillshade", p);
        const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
        L.setStyle({ hillshade: { exaggeration: typeof g("hillshade-exaggeration") === "number" ? (g("hillshade-exaggeration") as number) : 0.5,
          shadow: str(g("hillshade-shadow-color"), "#000000"), highlight: str(g("hillshade-highlight-color"), "#ffffff"), accent: str(g("hillshade-accent-color"), "#000000"),
          directionDeg: typeof g("hillshade-illumination-direction") === "number" ? (g("hillshade-illumination-direction") as number) : 335,
          anchor: g("hillshade-illumination-anchor") === "map" ? "map" : "viewport", background: bg } });
      }
      const ids = order();
      let after = -1; ids.forEach((x, i) => { if (x.startsWith("basemap")) after = i; });
      map.addLayer(L, ids[after + 1]);
      basemapLayer = L;
      refreshBasemapTextures();
    } else if (basemapLayer) place(BASEMAP_CAP_ID, null);
  };
  const syncFills = () => {
    for (const f of opts.fills ?? []) {
      const capId = `${f.layerId}-polarcap`;
      const target = map.getLayer(f.layerId);
      if (!target) { if (map.getLayer(capId)) map.removeLayer(capId); continue; }
      let L = map.getLayer(capId) ? ((map.getLayer(capId) as unknown as { implementation?: PolarCapLayer }).implementation ?? null) : null;
      if (!L) {
        L = new PolarCapLayer(capId, "fill");
        const ids = order(), k = ids.indexOf(f.layerId);
        map.addLayer(L, ids[k + 1]);
        let p = fillData.get(f.url);
        if (!p) { p = fetchJson(f.url).then((d) => ((d as { layers?: Record<string, Record<string, number[]>> }).layers ?? {})[f.part] ?? null).catch((e) => { console.warn(`[dune-atlas] polar caps ${f.url}`, e); return null; }); fillData.set(f.url, p); }
        const LL = L;
        void p.then((d) => { if (d) { LL.setTriangles("N", d.N ?? []); LL.setTriangles("S", d.S ?? []); } });
      } else place(capId, f.layerId);
      const vis = map.getLayoutProperty(f.layerId, "visibility") !== "none";
      const col = map.getPaintProperty(f.layerId, "fill-color"), op = map.getPaintProperty(f.layerId, "fill-opacity");
      L.setStyle({ color: typeof col === "string" ? col : L.color, opacity: vis ? (typeof op === "number" ? op : 1) : 0 });
    }
  };
  const sync = () => {
    if (busy || !map.isStyleLoaded?.()) return;
    busy = true;
    try { syncBasemap(); syncFills(); } catch (e) { console.warn("[dune-atlas] polar caps", e); } finally { busy = false; }
  };
  const onZoom = () => refreshBasemapTextures();
  map.on("styledata", sync);
  map.on("style.load", sync);
  map.on("idle", sync);
  map.on("zoomend", onZoom);
  sync();
  return () => {
    map.off("styledata", sync); map.off("style.load", sync); map.off("idle", sync); map.off("zoomend", onZoom);
    ctl.abort();
    for (const id of [BASEMAP_CAP_ID, ...(opts.fills ?? []).map((f) => `${f.layerId}-polarcap`)]) if (map.getLayer(id)) map.removeLayer(id);
  };
}
