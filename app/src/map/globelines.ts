// Lines (streamlines, arrows) drawn on the GLOBE by a MapLibre custom layer: each vertex is
// placed on the sphere by MapLibre's own globe projection (`projectTile` of the shader prelude,
// unclamped Mercator in, exact inverse to the sphere), so lines reach and cross the poles - a
// GeoJSON line layer is cut at the Web-Mercator limit (±85.05°). Segments are extruded to the
// line width in screen space (2 triangles each), antialiased over 1 px. The flat map keeps the
// GeoJSON line layer. The mesh builder is pure (tested); the WebGL part runs in the browser.
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MlMap } from "maplibre-gl";

/** latitude limit for the Mercator coordinate passed to the globe projection (the inverse is
 *  exact: lat 89.9999° is 11 m from the pole) */
export const POLE_LAT = 89.9999;
const D2R = Math.PI / 180;
/** unclamped normalised Web-Mercator coordinates (x in [0, 1) per world, y = 0 at 85.05° N) */
export function mercatorXY(lon: number, lat: number): [number, number] {
  const p = Math.max(-POLE_LAT, Math.min(POLE_LAT, lat)) * D2R;
  return [(lon + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + p / 2)) / Math.PI) / 2];
}

export interface LineMesh {
  /** per vertex: this end (Mercator x, y), the other end (x, y), side (±1), end (+1 start / -1 end), alpha */
  data: Float32Array;
  index: Uint32Array;
  vertices: number;
}
export const MESH_STRIDE = 7;

/** Quads of all segments of lon/lat polylines (non-finite points break a line); `alpha` per line. */
export function lineMesh(lines: [number, number][][], alpha?: number[]): LineMesh {
  let nSeg = 0;
  for (const l of lines) for (let k = 1; k < l.length; k++) if ([...l[k - 1], ...l[k]].every(Number.isFinite)) nSeg++;
  const data = new Float32Array(nSeg * 4 * MESH_STRIDE), index = new Uint32Array(nSeg * 6);
  let v = 0, t = 0;
  lines.forEach((l, li) => { const al = alpha?.[li] ?? 1; for (let k = 1; k < l.length; k++) {
    const a = l[k - 1], b = l[k];
    if (![...a, ...b].every(Number.isFinite)) continue;
    const A = mercatorXY(a[0], a[1]), B = mercatorXY(b[0], b[1]);
    const base = v;
    for (const [P, Q, end] of [[A, B, 1], [B, A, -1]] as const) for (const side of [-1, 1]) {
      data.set([P[0], P[1], Q[0], Q[1], side, end, al], v * MESH_STRIDE);
      v++;
    }
    index.set([base, base + 1, base + 2, base + 1, base + 3, base + 2], t);
    t += 6;
  } });
  return { data, index, vertices: v };
}

const VS = (prelude: string, define: string) => `#version 300 es
${prelude}
${define}
in vec2 a_pos;
in vec2 a_other;
in float a_side;
in float a_end;
in float a_alpha;
uniform vec2 u_viewport;   // drawing buffer px
uniform float u_halfwidth; // px
out float v_dist;
out float v_alpha;
void main() {
  v_alpha = a_alpha;
  vec4 p = projectTile(a_pos);
  vec4 q = projectTile(a_other);
  vec2 sp = p.xy / p.w * u_viewport * 0.5;
  vec2 sq = q.xy / q.w * u_viewport * 0.5;
  vec2 d = (sq - sp) * a_end;
  float L = length(d);
  d = L > 1e-6 ? d / L : vec2(1.0, 0.0);
  vec2 n = vec2(-d.y, d.x);
  float w = u_halfwidth + 1.0;
  sp += n * a_side * w;
  v_dist = a_side * w;
  gl_Position = vec4(sp / (u_viewport * 0.5) * p.w, p.z, p.w);
}`;
const FS = `#version 300 es
precision highp float;
uniform vec4 u_color;      // premultiplied
uniform float u_halfwidth;
in float v_dist;
in float v_alpha;
out vec4 fragColor;
void main() {
  float a = clamp(u_halfwidth + 0.5 - abs(v_dist), 0.0, 1.0) * v_alpha;
  fragColor = u_color * a;
}`;

const hex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const v = m ? parseInt(m[1], 16) : 0xffffff;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** Custom layer drawing polylines on the globe (only while the map is in globe projection). */
export class GlobeLinesLayer implements CustomLayerInterface {
  readonly type = "custom" as const;
  readonly renderingMode = "2d" as const;
  #map: MlMap | null = null;
  #gl: WebGL2RenderingContext | null = null;
  #programs = new Map<string, { prog: WebGLProgram; loc: Record<string, WebGLUniformLocation | null>; attr: Record<string, number> }>();
  #vbo: WebGLBuffer | null = null;
  #ibo: WebGLBuffer | null = null;
  #mesh: LineMesh = { data: new Float32Array(0), index: new Uint32Array(0), vertices: 0 };
  #dirty = false;
  constructor(readonly id: string, public color: string, public opacity: number, public width: number) {}

  setLines(lines: [number, number][][], alpha?: number[]) { this.#mesh = lineMesh(lines, alpha); this.#dirty = true; this.#map?.triggerRepaint(); }
  setStyle(o: { color?: string; opacity?: number; width?: number }) {
    if (o.color !== undefined) this.color = o.color;
    if (o.opacity !== undefined) this.opacity = o.opacity;
    if (o.width !== undefined) this.width = o.width;
    this.#map?.triggerRepaint();
  }
  get segmentCount() { return this.#mesh.index.length / 6; }

  onAdd(map: MlMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.#map = map;
    this.#gl = gl as WebGL2RenderingContext;
    this.#vbo = gl.createBuffer();
    this.#ibo = gl.createBuffer();
    this.#dirty = true;
  }
  onRemove(_map: MlMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    if (this.#vbo) gl.deleteBuffer(this.#vbo);
    if (this.#ibo) gl.deleteBuffer(this.#ibo);
    for (const p of this.#programs.values()) gl.deleteProgram(p.prog);
    this.#programs.clear();
    this.#map = null;
    this.#gl = null;
  }

  #program(gl: WebGL2RenderingContext, sd: CustomRenderMethodInput["shaderData"]) {
    let p = this.#programs.get(sd.variantName);
    if (p) return p;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`globe lines shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS(sd.vertexShaderPrelude, sd.define)));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`globe lines program: ${gl.getProgramInfoLog(prog)}`);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const loc = Object.fromEntries(["u_projection_matrix", "u_projection_fallback_matrix", "u_projection_tile_mercator_coords", "u_projection_clipping_plane", "u_projection_transition", "u_viewport", "u_halfwidth", "u_color"].map((n) => [n, u(n)]));
    const attr = Object.fromEntries(["a_pos", "a_other", "a_side", "a_end", "a_alpha"].map((n) => [n, gl.getAttribLocation(prog, n)]));
    p = { prog, loc, attr };
    this.#programs.set(sd.variantName, p);
    return p;
  }

  render(glIn: WebGLRenderingContext | WebGL2RenderingContext, opts: CustomRenderMethodInput) {
    const gl = glIn as WebGL2RenderingContext, map = this.#map;
    if (!map || map.getProjection?.()?.type !== "globe" || !this.#mesh.index.length || this.opacity <= 0) return;
    const pd = opts.defaultProjectionData;
    const { prog, loc, attr } = this.#program(gl, opts.shaderData);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#ibo);
    if (this.#dirty) {
      gl.bufferData(gl.ARRAY_BUFFER, this.#mesh.data, gl.STATIC_DRAW);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.#mesh.index, gl.STATIC_DRAW);
      this.#dirty = false;
    }
    const F = 4, S = MESH_STRIDE * F;
    const bind = (n: string, size: number, off: number) => { const a = attr[n]; if (a < 0) return; gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, size, gl.FLOAT, false, S, off * F); };
    bind("a_pos", 2, 0); bind("a_other", 2, 2); bind("a_side", 1, 4); bind("a_end", 1, 5); bind("a_alpha", 1, 6);
    gl.uniformMatrix4fv(loc.u_projection_matrix, false, pd.mainMatrix as Float32Array);
    gl.uniformMatrix4fv(loc.u_projection_fallback_matrix, false, pd.fallbackMatrix as Float32Array);
    gl.uniform4f(loc.u_projection_tile_mercator_coords, ...(pd.tileMercatorCoords as [number, number, number, number]));
    gl.uniform4f(loc.u_projection_clipping_plane, ...(pd.clippingPlane as [number, number, number, number]));
    gl.uniform1f(loc.u_projection_transition, pd.projectionTransition);
    gl.uniform2f(loc.u_viewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(loc.u_halfwidth, (this.width * (map.getPixelRatio?.() ?? 1)) / 2);
    const [r, g, b] = hex(this.color), a = Math.max(0, Math.min(1, this.opacity));
    gl.uniform4f(loc.u_color, r * a, g * a, b * a, a);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawElements(gl.TRIANGLES, this.#mesh.index.length, gl.UNSIGNED_INT, 0);
    for (const n of ["a_pos", "a_other", "a_side", "a_end", "a_alpha"]) if (attr[n] >= 0) gl.disableVertexAttribArray(attr[n]);
  }
}
