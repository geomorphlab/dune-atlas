// Exercise the browser cell-query path (src/cell/*) in node against a local store using range
// reads (same get/getRange contract as zarrita's FetchStore). Writes the panel SVGs and the
// downloads for inspection.
//   npm run check-cell-query -- ../staging/fixture [outdir] [lon lat]
import fs from "node:fs";
import path from "node:path";
import { CellStore } from "../src/cell/cellstore";
import { snapToCell } from "../src/cell/snap";
import { analyseCell, EXCESS_CLASSES, EXCESS_COLORS, FLUX_MODES, MODE_KEYS, MODE_STYLE, ROSE_ARROW_KEYS } from "../src/cell/analysis";
import { roseSvg, SPEED_COLORS } from "../src/cell/roses";
import { modesPlotSvg } from "../src/cell/modesplot";
import { citationFile } from "../src/cell/downloads";
import { cellNetcdf, csvBundle, exportBaseName } from "../src/cell/export";
import { dpRdpRdd } from "../src/cell/flux";
import { C, WITHHELD } from "../src/util/constants";

const args = process.argv.slice(2).filter((a) => a !== "--");
const base = path.resolve(args[0] ?? "../staging/fixture");
const out = path.resolve(args[1] ?? "../staging/check-cell-query");
const lon = Number(args[2] ?? 15.2), lat = Number(args[3] ?? -24.5);
fs.mkdirSync(out, { recursive: true });

let reqs = 0, bytes = 0;
class RangeFileStore {
  constructor(private root: string) {}
  async get(key: string) {
    const p = this.root + key;
    if (!fs.existsSync(p)) return undefined;
    reqs++;
    const b = fs.readFileSync(p);
    bytes += b.length;
    return new Uint8Array(b);
  }
  async getRange(key: string, range: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + key;
    if (!fs.existsSync(p)) return undefined;
    const size = fs.statSync(p).size;
    const [off, len] = "suffixLength" in range ? [size - range.suffixLength, range.suffixLength] : [range.offset, range.length];
    const fd = fs.openSync(p, "r");
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, off);
    fs.closeSync(fd);
    reqs++;
    bytes += len;
    return new Uint8Array(buf);
  }
}

// per-cell sidecars present in the fixture (cells-aux.zarr, cells-aux-<name>.zarr), in registry order
const auxDirs = ["cells-aux.zarr", "cells-aux-veg.zarr"].map((d) => path.join(base, d)).filter((d) => fs.existsSync(d));
const store = await CellStore.open(new RangeFileStore(path.join(base, "cells.zarr")), { aux: auxDirs.map((d) => new RangeFileStore(d)) });
const openReqs = reqs, openBytes = bytes;
const ref = snapToCell(lon, lat)!;
const t0 = performance.now();
const cell = await store.query(ref.iy, ref.ix);
const t1 = performance.now();
const firstReqs = reqs - openReqs, firstBytes = bytes - openBytes;
const r1 = reqs, b1 = bytes;
await store.query(ref.iy, ref.ix + (ref.ix % 16 === 15 ? -1 : 1)); // neighbour in the same 16x16 shard
const sameShardReqs = reqs - r1, sameShardBytes = bytes - b1;
const ocean = await store.query(1100, 1904); // 20.0 S, 10.4 E: Atlantic
const results: Record<string, unknown> = {
  cell: { iy: cell.iy, ix: cell.ix, lat: cell.lat, lon: cell.lon, id: cell.id, dune: cell.dune, hasData: cell.hasData, totalHours: cell.totalHours },
  field_vars: { n: store.fieldVars.length, withheld_present: store.fieldVars.filter((v) => WITHHELD.has(v)) },
  ocean: { iy: ocean.iy, ix: ocean.ix, hasData: ocean.hasData, totalHours: ocean.totalHours },
  open: { requests: openReqs, kB: Math.round(openBytes / 1024) },
  firstQuery: { requests: firstReqs, kB: +(firstBytes / 1024).toFixed(1), ms: Math.round(t1 - t0) },
  sameShardQuery: { requests: sameShardReqs, kB: +(sameShardBytes / 1024).toFixed(1) },
};
for (const ut of [5, 14, 40]) {
  const v = analyseCell(cell, ut);
  const total = v.fluxSectors.reduce((a, b) => a + b, 0);
  // DP/RDP/RDD from the histogram vs the cell-store fields shown in the panel
  const twr = dpRdpRdd(cell.hist, C.UT_VALUES[ut]);
  const tw = twr.dp * C.S2Y;
  const maxSector = v.fluxSectors.indexOf(Math.max(...v.fluxSectors));
  results[`ut${ut}`] = {
    ut_m_s: +v.ut.toFixed(2),
    petal_total_m2_yr: +total.toPrecision(6),
    petal_total_matches_histogram_dp: Math.abs(total - tw) <= 1e-9 * Math.max(1, tw),
    stored_dp_m2_yr: +v.drift.dp.toPrecision(6),
    petal_total_vs_stored_dp_rel: +(total / v.drift.dp - 1).toExponential(2),
    stored_rdp_m2_yr: +v.drift.rdp.toPrecision(6),
    computed_rdp_vs_stored_rel: +((twr.rdp * C.S2Y) / v.drift.rdp - 1).toExponential(2),
    stored_rdp_over_dp: +v.drift.ratio.toPrecision(4),
    stored_rdd_bearing: +v.drift.rddBearing.toFixed(2),
    largest_petal_toward_deg: maxSector * (360 / v.fluxSectors.length),
    petal_pct_sum: +v.fluxSectorsPct.reduce((a, b) => a + b, 0).toFixed(9),
    modes: Object.fromEntries(MODE_KEYS.map((k) => [k, +v.modes[k].toFixed(1)])),
  };
}
const exportMeta = { datasetId: "era5-land", datasetTitle: "ERA5-Land 1950–2024 (0.1°)", dataVersion: "v1", permalink: `https://map.geomorphlab.org/?cell=${cell.iy},${cell.ix}`, storeAttrs: store.attrs, generated: new Date("2026-01-01T00:00:00Z") };
const nc = cellNetcdf(cell, exportMeta), zip = await csvBundle(cell, exportMeta);
const exportBase = exportBaseName(cell, exportMeta.datasetId);
results.aux = cell.aux ? { ai_mean: cell.aux.scalars.ai_mean, ai_valid_frac: cell.aux.scalars.ai_valid_frac, ai_sat_frac: cell.aux.scalars.ai_sat_frac, qsdiv_ut14_m_per_kyr: cell.aux.series.qsdiv?.[14] * 1000, tot_cov_mean: cell.aux.scalars.tot_cov_mean, tot_cov_valid_frac: cell.aux.scalars.tot_cov_valid_frac } : null;
results.exports = { base: exportBase, nc_bytes: nc.length, zip_bytes: zip.length, published_fields: cell.fieldVars.filter((v) => !WITHHELD.has(v)).length };

const v = analyseCell(cell, 14, { windSectors: 16, fluxSectors: 32 });
const s = MODE_STYLE;
const dash = (k: (typeof MODE_KEYS)[number]) => ("dash" in s[k] ? (s[k] as { dash: string }).dash : undefined);
fs.writeFileSync(path.join(out, "wind_rose.svg"), roseSvg({ id: "w", values: v.windRose.freq, colors: SPEED_COLORS, title: "Wind rose", desc: "", ringFormat: (x) => `${x}%`, axisLabel: "% of hours" }));
for (const fm of FLUX_MODES) {
  const vm = analyseCell(cell, 14, { windSectors: 16, fluxSectors: 32, fluxMode: fm.id });
  fs.writeFileSync(path.join(out, `flux_rose_${fm.id}.svg`), roseSvg({ id: `f-${fm.id}`, values: vm.fluxStackPct, colors: EXCESS_COLORS, title: `Sand flux rose: ${fm.label}`, desc: "", ringFormat: (x) => `${Number(x.toPrecision(2))}%`, axisLabel: `% of ${fm.totalText}`,
    arrows: ROSE_ARROW_KEYS.map((k) => ({ bearing: vm.modes[k], color: s[k].color, label: k, axis: k === "ab", dash: dash(k) })) }));
  (results[`rose_${fm.id}_ut14`] = { total_m2_yr: +vm.fluxTotal.toPrecision(6), pct_sum: +vm.fluxSectorsPct.reduce((p, q) => p + q, 0).toFixed(9), largest_petal_toward_deg: vm.fluxSectors.indexOf(Math.max(...vm.fluxSectors)) * (360 / vm.fluxSectors.length),
    excess_class_pct: EXCESS_CLASSES.map((_, k) => +vm.fluxStackPct.reduce((a, r) => a + r[k], 0).toFixed(3)),
    stack_vs_sector_max_rel_err: Math.max(...vm.fluxStack.map((r, i) => Math.abs(r.reduce((a, b) => a + b, 0) - vm.fluxSectors[i]) / (vm.fluxSectors[i] || 1))) });
}
fs.writeFileSync(path.join(out, "check.json"), JSON.stringify(results, null, 1));
fs.writeFileSync(path.join(out, "modes.svg"), modesPlotSvg({ x: C.UT_VALUES, currentIndex: 14, series: MODE_KEYS.map((k) => ({ label: k, color: s[k].color, dash: dash(k), values: v.modeSeries[k], axis: k === "ab", width: k === "ao" ? 2.8 : undefined })) }));
fs.writeFileSync(path.join(out, `${exportBase}.nc`), nc);
fs.writeFileSync(path.join(out, `${exportBase}.zip`), zip);
fs.writeFileSync(path.join(out, "citation.txt"), citationFile(cell));
fs.writeFileSync(path.join(out, "check.json"), JSON.stringify(results, null, 1));
console.log(JSON.stringify(results, null, 1));
