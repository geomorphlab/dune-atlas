// Export of the cell-panel plots (wind rose, flux rose, modes vs threshold, qsdiv vs threshold) as
// SVG or PNG: re-rendered in the LIGHT theme with a transparent background and the on-screen
// settings, with an information strip below. Composition and names are pure (tested).
import { LIGHT_THEME, type PlotTheme } from "../cell/plottheme";
import type { DatasetInfo } from "../cell/datasetinfo";
import { C3S_NOTICE, C3S_NOTICE_ERA5, ERA5_DOI, ERA5_PAPER_DOI, ERA5LAND_DOI, ERA5LAND_PAPER_DOI, PAPER_DOI } from "../cell/citation";
import { texToPlain } from "../util/plaintext";
import { stripSvg, STRIP_COLORS, STRIP_FONT, type StripItem } from "./strip";
import { isoDate, svgToImage } from "./mapExport";

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

export function plotStripItems(spec: PlotExportSpec, c: PlotExportContext): StripItem[] {
  const d = c.dataset;
  return [
    { kind: "heading", text: spec.title },
    { kind: "text", text: `Cell centre ${fmtLat(c.cell.lat)}, ${fmtLon(c.cell.lon)} (grid row ${c.cell.iy}, column ${c.cell.ix}) · ${d.name} ${d.resolution}, ${d.period}${spec.thresholdDependent ? ` · threshold friction velocity u*,th = ${c.ut.toFixed(2)} m/s` : ""}` },
    ...spec.legend,
    ...(spec.caption ? [{ kind: "text", text: spec.caption, small: true } as StripItem] : []),
    { kind: "text", text: `Data: Gunn, A. (2026) The distribution of Earth's wind-blown sand dunes. Nature Communications, doi:${PAPER_DOI}. ${windSourceText(d.id)}`, small: true },
    { kind: "text", text: `View: ${c.shareLink}`, small: true, muted: true },
    { kind: "text", text: `Exported ${isoDate(c.date)} from the Dune Atlas (map.geomorphlab.org).`, small: true, muted: true },
  ];
}

const attr = (svg: string, a: string) => Number(new RegExp(`<svg[^>]*\\s${a}="([\\d.]+)"`).exec(svg)?.[1] ?? NaN);

/** plot (light theme, centred) above the strip; transparent background; `scale` sets the pixel
 *  size (the viewBox stays in CSS px) */
export function composePlotSvg(spec: PlotExportSpec, c: PlotExportContext, scale = 1): { svg: string; width: number; height: number } {
  const plot = spec.svg(LIGHT_THEME);
  const pw = attr(plot, "width"), ph = attr(plot, "height");
  const W = Math.max(Number.isFinite(pw) ? pw : 400, 480);
  const strip = stripSvg(plotStripItems(spec, c), W, { rule: true });
  const H = (Number.isFinite(ph) ? ph : 300) + 8 + strip.height;
  const x = (W - pw) / 2;
  const inner = plot.replace(/^<svg /, `<svg x="${x}" y="0" `);
  const st = strip.svg.replace(/^<svg /, `<svg x="0" y="${ph + 8}" `);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}" font-family="${STRIP_FONT}" color="${STRIP_COLORS.text}" style="color:${STRIP_COLORS.text}">${inner}${st}</svg>`;
  return { svg, width: W, height: H };
}

/** plain text of an element rendered with KaTeX (the TeX annotation instead of the glyphs) */
export function katexPlain(el: Element): string {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll(".katex").forEach((k) => {
    const tex = k.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? k.textContent ?? "";
    k.replaceWith(document.createTextNode(texToPlain(`$${tex}$`)));
  });
  return (c.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** SVG -> PNG (browser) */
export async function svgToPngBlob(svg: string, pxWidth: number, pxHeight: number): Promise<Blob> {
  const img = await svgToImage(svg);
  const cv = document.createElement("canvas");
  cv.width = Math.round(pxWidth); cv.height = Math.round(pxHeight);
  cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
}
