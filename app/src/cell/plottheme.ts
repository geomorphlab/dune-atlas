// Colours of the panel plots (wind / flux roses, modes vs threshold, qsdiv vs threshold). DARK is
// the on-screen theme (dark panel); LIGHT is used for image exports (transparent background, dark
// text, legible on white).
export interface PlotTheme {
  name: "dark" | "light";
  /** text (labels, compass letters, axis ticks) */
  text: string;
  grid: string;
  gridStrong: string;
  zero: string;
  label: string;
  ring: string;
  /** outline drawn behind ring labels / around markers to separate them from the plot */
  halo: string;
  /** current-threshold ring / line */
  current: string;
  currentLine: string;
  markerStroke: string;
  /** font sizes (CSS px): compass letters, ring / radius tick labels, axis titles and tick labels */
  fs: { compass: number; ring: number; axis: number; tick: number };
  /** line-width multiplier (grid, markers, current threshold) */
  lw: number;
}

export const DARK_THEME: PlotTheme = {
  name: "dark", text: "currentColor", grid: "#56606b", gridStrong: "#7a8590", zero: "#9aa5b1", label: "#aab4bf", ring: "#c3ccd5",
  halo: "#11161c", current: "#ffd166", currentLine: "#f1f3f5", markerStroke: "#11161c",
  fs: { compass: 11, ring: 9, axis: 10, tick: 10 }, lw: 1,
};

export const LIGHT_THEME: PlotTheme = {
  name: "light", text: "#1d2329", grid: "#c2c8cf", gridStrong: "#8d969f", zero: "#5f6973", label: "#47515b", ring: "#2f3740",
  halo: "#ffffff", current: "#b7791f", currentLine: "#2f3740", markerStroke: "#ffffff",
  // exports: >= 14 pt at the physical size (1 CSS px = 1/96 in)
  fs: { compass: 20, ring: 18.7, axis: 18.7, tick: 18.7 }, lw: 1.7,
};

/** On-screen series / arrow colours that are too light on white, and their light-theme versions. */
const LIGHT_SERIES: Record<string, string> = { "#f1f3f5": "#2f3740", "#69db7c": "#2b8a3e", "#ffd166": "#b7791f" };
export const seriesColor = (c: string, t: PlotTheme) => (t.name === "light" ? LIGHT_SERIES[c.toLowerCase()] ?? c : c);
