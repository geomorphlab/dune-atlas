// Filled polygons drawn on the GLOBE by a MapLibre custom layer (shared by both builds; same projection path
// as map/globelines.ts): triangle vertices are given in lon/lat and placed by MapLibre's own globe
// projection (`projectTile`, unclamped Mercator), so a fill reaches the pole. A GeoJSON fill layer on the
// globe is cut at the Web-Mercator limit (85.0511°) and its triangles on the top/bottom tile edge are
// extended to the pole (MapLibre `_fillPoles`: a grey wedge). Used for the selected-cell highlight
// (map/selection.ts); the Mars polar dune caps use the same mechanism (src/mars/map/polarcap.ts).
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MlMap } from "maplibre-gl";
import { mercatorXY } from "./globelines";

export interface FillMesh { pos: Float32Array; vertices: number }

/** Triangle list (lon, lat, lon, lat, ... ; 3 vertices per triangle) -> unclamped Mercator positions. */
export function globeFillMesh(tri: ArrayLike<number>): FillMesh {
  const n = Math.floor(tri.length / 2), pos = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const [x, y] = mercatorXY(tri[2 * i], tri[2 * i + 1]); pos[2 * i] = x; pos[2 * i + 1] = y; }
  return { pos, vertices: n - (n % 3) };
}

const VS = (prelude: string, define: string) => `#version 300 es
${prelude}
${define}
in vec2 a_pos;
void main() { gl_Position = projectTile(a_pos); }`;
const FS = `#version 300 es
precision highp float;
uniform vec4 u_color;      // premultiplied
out vec4 fragColor;
void main() { fragColor = u_color; }`;

const hex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const v = m ? parseInt(m[1], 16) : 0xffffff;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** Custom layer filling lon/lat triangles on the globe (draws only while the map is in globe projection). */
export class GlobeFillLayer implements CustomLayerInterface {
  readonly type = "custom" as const;
  readonly renderingMode = "2d" as const;
  #map: MlMap | null = null;
  #programs = new Map<string, { prog: WebGLProgram; loc: Record<string, WebGLUniformLocation | null>; attr: number }>();
  #vbo: WebGLBuffer | null = null;
  #mesh: FillMesh = { pos: new Float32Array(0), vertices: 0 };
  #dirty = false;
  constructor(readonly id: string, public color: string, public opacity: number) {}

  setTriangles(tri: ArrayLike<number>) { this.#mesh = globeFillMesh(tri); this.#dirty = true; this.#map?.triggerRepaint(); }
  setStyle(o: { color?: string; opacity?: number }) {
    if (o.color !== undefined) this.color = o.color;
    if (o.opacity !== undefined) this.opacity = o.opacity;
    this.#map?.triggerRepaint();
  }
  get triangleCount() { return this.#mesh.vertices / 3; }

  onAdd(map: MlMap, gl: WebGLRenderingContext | WebGL2RenderingContext) { this.#map = map; this.#vbo = gl.createBuffer(); this.#dirty = true; }
  onRemove(_map: MlMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    if (this.#vbo) gl.deleteBuffer(this.#vbo);
    for (const p of this.#programs.values()) gl.deleteProgram(p.prog);
    this.#programs.clear();
    this.#map = null;
  }

  #program(gl: WebGL2RenderingContext, sd: CustomRenderMethodInput["shaderData"]) {
    let p = this.#programs.get(sd.variantName);
    if (p) return p;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`globe fill shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS(sd.vertexShaderPrelude, sd.define)));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`globe fill program: ${gl.getProgramInfoLog(prog)}`);
    const loc = Object.fromEntries(["u_projection_matrix", "u_projection_fallback_matrix", "u_projection_tile_mercator_coords", "u_projection_clipping_plane", "u_projection_transition", "u_color"].map((n) => [n, gl.getUniformLocation(prog, n)]));
    p = { prog, loc, attr: gl.getAttribLocation(prog, "a_pos") };
    this.#programs.set(sd.variantName, p);
    return p;
  }

  render(glIn: WebGLRenderingContext | WebGL2RenderingContext, opts: CustomRenderMethodInput) {
    const gl = glIn as WebGL2RenderingContext, map = this.#map;
    if (!map || map.getProjection?.()?.type !== "globe" || !this.#mesh.vertices || this.opacity <= 0) return;
    const pd = opts.defaultProjectionData;
    const { prog, loc, attr } = this.#program(gl, opts.shaderData);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vbo);
    if (this.#dirty) { gl.bufferData(gl.ARRAY_BUFFER, this.#mesh.pos, gl.STATIC_DRAW); this.#dirty = false; }
    if (attr >= 0) { gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 8, 0); }
    gl.uniformMatrix4fv(loc.u_projection_matrix, false, pd.mainMatrix as Float32Array);
    gl.uniformMatrix4fv(loc.u_projection_fallback_matrix, false, pd.fallbackMatrix as Float32Array);
    gl.uniform4f(loc.u_projection_tile_mercator_coords, ...(pd.tileMercatorCoords as [number, number, number, number]));
    gl.uniform4f(loc.u_projection_clipping_plane, ...(pd.clippingPlane as [number, number, number, number]));
    gl.uniform1f(loc.u_projection_transition, pd.projectionTransition);
    const [r, g, b] = hex(this.color), a = Math.max(0, Math.min(1, this.opacity));
    gl.uniform4f(loc.u_color, r * a, g * a, b * a, a);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, this.#mesh.vertices);
    if (attr >= 0) gl.disableVertexAttribArray(attr);
  }
}
