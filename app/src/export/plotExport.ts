// Export of the cell-panel plots (wind rose, flux rose, modes vs threshold, qsdiv vs threshold) as
// SVG or PNG: re-rendered in the LIGHT theme with a transparent background and the on-screen
// settings, with an information strip below. Composition and names are pure (tested).
import { exportPlotTheme, LIGHT_THEME, type PlotTheme } from "../cell/plottheme";
import type { DatasetInfo } from "../cell/datasetinfo";
import { C3S_NOTICE, C3S_NOTICE_ERA5, ERA5_DOI, ERA5_PAPER_DOI, ERA5LAND_DOI, ERA5LAND_PAPER_DOI, PAPER_DOI } from "../cell/citation";
import { texToPlain } from "../util/plaintext";
import { stripSvg, STRIP_COLORS, STRIP_FONT, STRIP_PAD, STRIP_UNITS, type StripItem } from "./strip";
import { isoDate, svgToImage } from "./mapExport";
import { blobWithDpi, EXPORT_DPI, PLOT_EXPORT_WIDTH } from "./png";
import type { MathRenderer } from "./texsvg";
import { utTex } from "./labels";

export type PlotKey = "wind-rose" | "flux-rose" | "modes" | "qsdiv";
export const PLOT_KEYS: PlotKey[] = ["wind-rose", "flux-rose", "modes", "qsdiv"];

export interface PlotExportSpec {
  key: PlotKey;
  title: string;
  /** the plot SVG with the given theme and the on-screen settings */
  svg: (theme: PlotTheme) => string;
  /** legend entries (swatches) and other keys */
  legend: StripItem[];
  /** on-screen caption as plain text */
  caption: string;
  thresholdDependent: boolean;
}
export interface PlotExportContext {
  cell: { lat: number; lon: number; iy: number; ix: number };
  dataset: DatasetInfo;
  ut: number;
  shareLink: string;
  date: Date;
}

const fmtLat = (v: number) => `${Math.abs(v).toFixed(2)}° ${v < 0 ? "S" : "N"}`;
const fmtLon = (v: number) => `${Math.abs(v).toFixed(2)}° ${v < 0 ? "W" : "E"}`;

/** dune-atlas_<plot>_<dataset>_<lat>_<lon>[_ut<u*,th>].<ext> (u*,th for threshold-dependent plots) */
export function plotFilename(key: PlotKey, datasetId: string, cell: { lat: number; lon: number }, ut: number | null, ext: "png" | "svg"): string {
  const n = (v: number) => String(Number(v.toFixed(2)));
  return `dune-atlas_${key}_${datasetId}_${n(cell.lat)}_${n(cell.lon)}${ut === null ? "" : `_ut${ut.toFixed(2)}`}.${ext}`;
}

export function windSourceText(datasetId: string): string {
  return datasetId === "era5"
    ? `Wind: ERA5 hourly 10 m wind 1950–2024 (Hersbach et al. 2020, doi:${ERA5_PAPER_DOI}; data doi:${ERA5_DOI}); statistics computed for the Dune Atlas with the method of Gunn (2026). ${C3S_NOTICE_ERA5}`
    : `Wind: ERA5-Land hourly 10 m wind 1950–2024 (Muñoz-Sabater et al. 2021, doi:${ERA5LAND_PAPER_DOI}; data doi:${ERA5LAND_DOI}); statistics from Gunn (2026). ${C3S_NOTICE}`;
}

/** legends first (directly below the plot), then the descriptive text */
export function plotStripItems(spec: PlotExportSpec, c: PlotExportContext): StripItem[] {
  const d = c.dataset;
  return [
    ...spec.legend,
    { kind: "heading", text: spec.title },
    { kind: "text", text: `Cell centre ${fmtLat(c.cell.lat)}, ${fmtLon(c.cell.lon)} · ${d.name} ${d.resolution}, ${d.period}${spec.thresholdDependent ? ` · threshold friction velocity ${utTex(c.ut)}` : ""}` },
    ...(spec.caption ? [{ kind: "text", text: spec.caption } as StripItem] : []),
    { kind: "text", text: `Data: Gunn, A. (2026) The distribution of Earth's wind-blown sand dunes. Nature Communications, doi:${PAPER_DOI}. ${windSourceText(d.id)}` },
    { kind: "text", text: `View: ${c.shareLink}`, muted: true },
    { kind: "text", text: `Exported ${isoDate(c.date)} from the Dune Atlas (map.geomorphlab.org).`, muted: true },
  ];
}

const attr = (svg: string, a: string) => Number(new RegExp(`<svg[^>]*\\s${a}="([\\d.]+)"`).exec(svg)?.[1] ?? NaN);
/** plot width as a fraction of the image width: wide plots fill it, square ones (roses) less */
export const plotFraction = (pw: number, ph: number) => (pw / ph >= 1.3 ? 0.96 : 0.66);

/** The plot (light theme, centred, nothing above or beside it) with the strip below; transparent
 *  background. Laid out STRIP_UNITS wide; all text relative to the image width W: plot labels and
 *  the strip's text 0.018 W, headings 0.024 W. `pxWidth` sets the width / height attributes (PNG
 *  pixel size; the SVG has the same proportions). */
export function composePlotSvg(spec: PlotExportSpec, c: PlotExportContext, pxWidth = PLOT_EXPORT_WIDTH, math: MathRenderer | null = null): { svg: string; width: number; height: number; plotHeight: number; pxWidth: number; pxHeight: number } {
  const U = STRIP_UNITS;
  const probe = spec.svg(LIGHT_THEME);
  const pw0 = attr(probe, "width"), ph0 = attr(probe, "height");
  const pwA = Number.isFinite(pw0) ? pw0 : 400, phA = Number.isFinite(ph0) ? ph0 : 300;
  const k = (plotFraction(pwA, phA) * U) / pwA; // strip units per plot unit
  const plot = spec.svg({ ...exportPlotTheme(k, { units: U }), math });
  const pw1 = attr(plot, "width"), ph1 = attr(plot, "height");
  const pw = Number.isFinite(pw1) ? pw1 : pwA, ph = Number.isFinite(ph1) ? ph1 : phA;
  const dw = pw * k, dh = ph * k, top = STRIP_PAD.top;
  const strip = stripSvg(plotStripItems(spec, c), { math });
  const plotHeight = top + dh;
  const H = plotHeight + strip.height;
  const inner = plot.replace(/^<svg ([^>]*?)\swidth="[\d.]+"([^>]*?)\sheight="[\d.]+"/, (_m, a, b) => `<svg x="${f3((U - dw) / 2)}" y="${f3(top)}" ${a} width="${f3(dw)}"${b} height="${f3(dh)}"`);
  const st = strip.svg.replace(/^<svg ([^>]*?)\swidth="[\d.]+" height="[\d.]+"/, (_m, a) => `<svg x="0" y="${f3(plotHeight)}" ${a} width="${U}" height="${strip.height}"`);
  const pxHeight = (H * pxWidth) / U;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f3(pxWidth)}" height="${f3(pxHeight)}" viewBox="0 0 ${U} ${f3(H)}" font-family="${STRIP_FONT}" color="${STRIP_COLORS.text}" style="color:${STRIP_COLORS.text}">${inner}${st}</svg>`;
  return { svg, width: U, height: H, plotHeight, pxWidth, pxHeight };
}
const f3 = (v: number) => (Math.round(v * 1000) / 1000).toString();

/** plain text of an element rendered with KaTeX (the TeX annotation instead of the glyphs) */
/** text of an element rendered with KaTeX, the formulas kept as TeX ($...$, for the export) */
export function katexTex(el: Element): string {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll(".katex, .tex-fallback").forEach((k) => {
    const tex = k.getAttribute("data-tex") ?? k.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? "";
    k.replaceWith(document.createTextNode(tex ? `$${tex.trim()}$` : (k.textContent ?? "")));
  });
  return (c.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function katexPlain(el: Element): string {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll(".katex").forEach((k) => {
    const tex = k.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? k.textContent ?? "";
    k.replaceWith(document.createTextNode(texToPlain(`$${tex}$`)));
  });
  return (c.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** SVG (width/height attributes = the pixel size) -> PNG of that size, pHYs = `dpi` (browser) */
export async function svgToPngBlob(svg: string, pxWidth: number, pxHeight: number, dpi = EXPORT_DPI): Promise<Blob> {
  const img = await svgToImage(svg);
  const cv = document.createElement("canvas");
  cv.width = Math.round(pxWidth); cv.height = Math.round(pxHeight);
  cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
  const blob = await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
  return blobWithDpi(blob, dpi);
}
