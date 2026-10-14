// Render the Mars cell-panel figures of one cell (wind rose, flux rose, modes, flux divergence) with
// the app's own SVG renderers in the dark on-screen theme, side by side, to PNG (resvg). For previews
// where no browser is available. Needs the Mars build (module substitutions / patches):
//   VITE_BODY=mars npx vite-node scripts/mars-panel-preview.ts -- <dataset dir> <out.png> [lon lat dIndex]
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { MarsCellStore } from "../src/mars/cell/cellstore";
import { analyseMarsCell } from "../src/mars/cell/analysis";
import { snapToCell } from "../src/cell/snap";
import { roseSvg, SPEED_COLORS } from "../src/cell/roses";
import { modesPlotSvg } from "../src/cell/modesplot";
import { linePlotSvg } from "../src/cell/lineplot";
import { DARK_THEME, seriesColor } from "../src/cell/plottheme";
import { EXCESS_COLORS, MODE_KEYS, MODE_STYLE, ROSE_ARROW_KEYS } from "../src/cell/analysis";
import { speedClassLabels } from "../src/mars/cell/marsflux";

class RangeFileStore {
  constructor(private root: string) {}
  async get(key: string) { const p = this.root + key; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
  async getRange(key: string, r: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + key;
    if (!fs.existsSync(p)) return undefined;
    const size = fs.statSync(p).size;
    const [off, len] = "suffixLength" in r ? [size - r.suffixLength, r.suffixLength] : [r.offset, r.length];
    const fd = fs.openSync(p, "r"); const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd);
    return new Uint8Array(b);
  }
}

const args = process.argv.slice(2).filter((a) => a !== "--");
const [ds, out, lon = "67", lat = "9", di = "29"] = args;
const store = await MarsCellStore.open(new RangeFileStore(path.join(ds, "cells.zarr")), { aux: new RangeFileStore(path.join(ds, "cells-aux.zarr")) });
const c = snapToCell(Number(lon), Number(lat), store.grid)!;
const cell = await store.query(c.iy, c.ix);
const k = Number(di);
const v = analyseMarsCell(cell, k, { windSectors: 16, fluxSectors: 32 });
const S = 300, T = DARK_THEME;
const wind = roseSvg({ id: "w", values: v.windRose.freq, colors: SPEED_COLORS, title: "Wind rose", desc: "", ringFormat: (x) => `${x}%`, axisLabel: "% of hours", size: S, uaCentres: cell.bins.uaCentres });
const arrows = ROSE_ARROW_KEYS.map((m) => ({ bearing: v.modes[m], color: MODE_STYLE[m].color, label: m, axis: m === "ab", dash: "dash" in MODE_STYLE[m] ? (MODE_STYLE[m] as { dash: string }).dash : undefined }));
const flux = roseSvg({ id: "f", values: v.fluxStackPct, colors: EXCESS_COLORS, title: "Flux rose", desc: "", ringFormat: (x) => `${Number(x.toPrecision(2))}%`, arrows, axisLabel: "% of total flux", size: S, uaCentres: cell.bins.uaCentres });
const modes = modesPlotSvg({ x: v.utValues.map(Math.log10), currentIndex: k, size: S, theme: T, series: MODE_KEYS.map((m) => ({ label: MODE_STYLE[m].label, color: seriesColor(MODE_STYLE[m].color, T), values: v.modeSeries[m], axis: m === "ab" })) });
const q = Array.from(cell.aux?.series.qsdiv ?? [], (x) => x * 1000);
const line = linePlotSvg({ x: v.utValues.map(Math.log10), y: q, currentIndex: k, xLabel: "d (µm, log scale)", yLabel: "m/kyr", title: "qsdiv", width: S, theme: T });
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const W = 4 * S + 50, H = S + 70;
const txt = (x: number, y: number, s: string, size = 13) => `<text x="${x}" y="${y}" font-size="${size}" fill="#e6e9ee" font-family="Helvetica, Arial, sans-serif">${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;
const lineH = Number(/height="(\d+)"/.exec(line)?.[1] ?? 170);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#141a21"/>
${txt(10, 20, `Mars Dune Atlas cell panel (${process.env.PREVIEW_LABEL ?? "FIXTURE data"}): ${cell.lat}° N, ${cell.lon}° E, d = ${v.dUm} µm; median u*,th = ${v.stats.utMedian.toFixed(3)} m/s; DP = ${v.drift.dp.toPrecision(3)} m²/yr; speed classes ${speedClassLabels().join(", ")} m/s`)}
<g transform="translate(10,40)">${inner(wind)}</g><g transform="translate(${S + 20},40)">${inner(flux)}</g><g transform="translate(${2 * S + 30},40)">${inner(modes)}</g><g transform="translate(${3 * S + 40},${40 + (S - lineH) / 2})">${inner(line)}</g>
${txt(10, H - 10, "Wind rose (from; lowest level, z ≈ 2 m) · sand-flux rose (toward, flat bed, excess-shear classes) · modes vs d (log radius) · flux divergence vs d", 12)}</svg>`;
fs.writeFileSync(out.replace(/\.png$/, ".svg"), svg);
fs.writeFileSync(out, new Resvg(svg, { fitTo: { mode: "width", value: 2 * W }, font: { loadSystemFonts: true } }).render().asPng());
console.log(JSON.stringify({ cell: [cell.iy, cell.ix, cell.lat, cell.lon], dUm: v.dUm, dp: v.drift.dp, fluxTotal: v.fluxTotal, utMedian: v.stats.utMedian, fracAbove: v.stats.fracAbove, hours: cell.totalHours }));
