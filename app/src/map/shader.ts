// Custom fragment shader bodies for @carbonplan/zarr-layer (customFrag). The raw band value is
// available as a GLSL float named after the (sanitised) variable; `clim`, `opacity` and the
// `colormap` sampler are provided by zarr-layer.
import type { LayerDisplay } from "../registry/types";

/** Same rule zarr-layer uses for band identifiers. */
export function glslName(s: string): string {
  const t = s.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(t) ? `_${t}` : t;
}

/** GLSL expression converting the raw value to display units. */
export function displayExpr(variable: string, d: LayerDisplay | undefined): string {
  const x = glslName(variable);
  switch (d?.transform ?? "none") {
    case "scale":
      return `(${x} * ${glslFloat(d?.scale ?? 1)})`;
    case "rad-to-bearing": // math angle (CCW from E, toward) -> compass bearing [0, 360)
      return `mod(90.0 - degrees(${x}), 360.0)`;
    case "rad-to-axis":
      return `mod(90.0 - degrees(${x}), 180.0)`;
    default:
      return x;
  }
}

export function glslFloat(v: number): string {
  const s = String(v);
  return /[.eE]/.test(s) ? s : `${s}.0`;
}

/** Returns a customFrag body, or undefined if the default zarr-layer shader suffices. */
/** symlog uniforms: linear threshold c and centring flag (updated with setUniforms when the
 *  colour limits / colormap change, so no shader rebuild is needed) */
export const SYMLOG_UNIFORMS = ["u_linthresh", "u_centred"] as const;
export function symlogUniforms(e: { linthresh: number; centred: boolean }): Record<string, number> {
  return { u_linthresh: e.linthresh, u_centred: e.centred ? 1 : 0 };
}

/** Returns a customFrag body, or undefined if the default zarr-layer shader suffices.
 *  `colourScale` ("log" | "symlog") overrides d.log; the mapping matches layerconfig.scaleNorm. */
export function fragmentFor(variable: string, d: (LayerDisplay & { colourScale?: "linear" | "log" | "symlog" }) | undefined): string | undefined {
  const transform = d?.transform ?? "none";
  const scale = d?.colourScale ?? (d?.log ? "log" : "linear");
  if (transform === "none" && scale === "linear") return undefined;
  const v = displayExpr(variable, d);
  // symlog f(x) = sign(x) log(1 + |x| / c): the log10 factor cancels in the ratios
  const sl = (x: string) => `(sign(${x}) * log(1.0 + abs(${x}) / u_linthresh))`;
  const pre = scale === "symlog"
    ? `
  float f_v = ${sl("val")};
  float f_lo = ${sl("clim.x")};
  float f_hi = ${sl("clim.y")};`
    : "";
  const norm = scale === "log"
    ? `(log(max(val, clim.x)) - log(clim.x)) / (log(clim.y) - log(clim.x))`
    : scale === "symlog"
      ? `u_centred > 0.5 ? (val >= 0.0 ? 0.5 + 0.5 * f_v / f_hi : 0.5 - 0.5 * f_v / f_lo) : (f_v - f_lo) / (f_hi - f_lo)`
      : `(val - clim.x) / (clim.y - clim.x)`;
  return `
  float val = ${v};${pre}
  float norm = ${norm};
  vec4 c = texture(colormap, vec2(clamp(norm, 0.0, 1.0), 0.5));
  fragColor = vec4(c.rgb, opacity);
  fragColor.rgb *= fragColor.a;
`;
}
