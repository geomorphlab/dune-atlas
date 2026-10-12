// Named colormaps (256 hex stops each) generated from matplotlib by scripts/gen-colormaps.py.
import raw from "../generated/colormaps.json";

const { _comment, ...maps } = raw as Record<string, string[] | string>;
void _comment;
export const COLORMAPS = maps as Record<string, string[]>;

export function getColormap(name: string | undefined): string[] {
  const c = COLORMAPS[name ?? "viridis"];
  if (!c) throw new Error(`unknown colormap '${name}'`);
  return c;
}

/** CSS linear-gradient for a legend bar (sampled to `n` stops). */
export function cssGradient(name: string | undefined, n = 16, dir = "to right"): string {
  const c = getColormap(name);
  const stops = Array.from({ length: n }, (_, i) => c[Math.round((i / (n - 1)) * (c.length - 1))]);
  return `linear-gradient(${dir}, ${stops.join(", ")})`;
}
