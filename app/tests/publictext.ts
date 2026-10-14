// Collect every user-facing string of the site and the downloads (keyed), for the public-text
// denylist test and the text audit.
import fs from "node:fs";
import path from "node:path";
import { NAN_WORD, siteDeny } from "./denylist";
import { loadRegistry } from "../src/registry/load";
import { Store, type AppState } from "../src/store";
import { renderLayerPanel } from "../src/ui/layerPanel";
import { legendHtml } from "../src/ui/legend";
import { CellPanel } from "../src/ui/cellPanel";
import type { CellData, CellStore } from "../src/cell/cellstore";
import { cellNetcdf, csvColumns, metadataJson, readmeText } from "../src/cell/export";
import { citationFile } from "../src/cell/downloads";
import { makeCell, FIELD_VARS } from "./helpers";
import { readNc } from "./ncreader";
import * as HELP from "../src/ui/helpText";
import { mapStripItems } from "../src/export/mapExport";
import { plotStripItems } from "../src/export/plotExport";
import { datasetInfo } from "../src/cell/datasetinfo";

const textOf = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; return (d.textContent ?? "").replace(/\s+/g, " ").trim(); };

export function sampleCell(): CellData {
  const hist = new Uint32Array(128 * 128); hist[40 * 128 + 70] = 100; hist[90 * 128 + 10] = 50; hist[60 * 128 + 100] = 30;
  const fields = new Float32Array(FIELD_VARS.length * 64).fill(0.3);
  const c = makeCell({ iy: 1145, ix: 1952, lat: -24.5, lon: 15.2, hist, fields });
  c.aux = {
    series: { qsdiv: Float32Array.from({ length: 64 }, (_, k) => -1e-4 + k * 3e-6) },
    scalars: { ai_mean: 0.05, ai_valid_frac: 1, ai_sat_frac: 0.1 },
    attrs: {},
  };
  return c;
}

/** key -> text of every user-facing string (site + downloads). */
/** The root attrs of the ERA5 v2 cell store (tests/fixtures; with free-text entries such as
 *  dataset.land_cells). Passed to the panels and downloads so that any store-attr text shown or
 *  exported is checked too (and caught by the sentinel test in publictext.test.ts). */
export const ERA5_V2_STORE_ATTRS = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/era5-v2-cells-attrs.json"), "utf8")) as Record<string, unknown>;

export async function collectPublicText(auxAttrs: Record<string, Record<string, unknown>> = {}, storeAttrs: Record<string, unknown> = ERA5_V2_STORE_ATTRS, o: { markDatasetDescriptions?: string } = {}): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const { registry: reg } = loadRegistry();
  // the generated dataset descriptions are not shown (the selector uses app text); the sentinel test marks them
  if (o.markDatasetDescriptions) for (const d of reg.datasets ?? []) d.description = `${o.markDatasetDescriptions} ${d.description ?? ""}`;
  out["threshold.label"] = reg.threshold.label ?? "";
  for (const g of reg.groups) { out[`group.${g.id}.title`] = g.title; if (g.description) out[`group.${g.id}.description`] = g.description; }
  for (const l of reg.layers) {
    out[`layer.${l.id}.title`] = l.title;
    if (l.description) out[`layer.${l.id}.description`] = l.description;
    if (l.units) out[`layer.${l.id}.units`] = l.units;
    if (l.display?.legendNote) out[`layer.${l.id}.legendNote`] = l.display.legendNote;
    for (const [k, v] of Object.entries(l.attribution ?? {})) if (k === "changes" || k === "source") out[`layer.${l.id}.attribution.${k}`] = v as string;
    out[`legend.${l.id}`] = textOf(legendHtml(l));
  }
  for (const d of reg.datasets ?? []) out[`dataset.${d.id}.title`] = d.title;
  // layer panel (all popovers, About, threshold help)
  document.body.innerHTML = '<aside id="layer-panel"></aside><aside id="cell-panel" hidden></aside>';
  const state: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14,
    layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: true, opacity: 1 }])), order: reg.layers.map((l) => l.id), dataset: reg.datasets?.[0]?.id ?? "", cell: null, embed: false };
  const store = new Store(state);
  const lp = document.getElementById("layer-panel")!;
  renderLayerPanel(lp, reg, store);
  lp.querySelectorAll(".info-popover").forEach((e, k) => { out[`popover.${k}.${e.closest(".layer-item")?.getAttribute("data-layer")}`] = (e.textContent ?? "").replace(/\s+/g, " ").trim(); });
  out["panel.about"] = (lp.querySelector(".about")?.textContent ?? "").replace(/\s+/g, " ").trim();
  out["panel.pinned"] = (lp.querySelector(".pinned")?.textContent ?? "").replace(/\s+/g, " ").trim();
  lp.querySelectorAll("[title]").forEach((e, k) => { out[`panel.title.${k}`] = e.getAttribute("title") ?? ""; });
  lp.querySelectorAll("[aria-label]").forEach((e, k) => { out[`panel.aria.${k}`] = e.getAttribute("aria-label") ?? ""; });
  for (const b of reg.basemaps) { out[`basemap.${b.id}.title`] = b.title; if (b.attribution) out[`basemap.${b.id}.attribution`] = textOf(b.attribution); }
  lp.querySelectorAll("#dataset-select option").forEach((e) => { out[`panel.dataset-option.${(e as HTMLOptionElement).value}`] = e.getAttribute("title") ?? ""; });
  lp.querySelectorAll(".help").forEach((e, k) => { out[`panel.help.${k}`] = (e.textContent ?? "").trim(); });
  // cell panel
  const cp = document.getElementById("cell-panel")!;
  const cell = sampleCell();
  for (const [v, a] of Object.entries(auxAttrs)) cell.aux!.attrs[v] = a;
  const p = new CellPanel(cp, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {} });
  await p.show({ query: async () => cell, attrs: storeAttrs, fieldVars: FIELD_VARS } as unknown as CellStore, cell.iy, cell.ix);
  cp.querySelectorAll(".caption, .help, h3, summary, th, .fig-legend li, label").forEach((e, k) => { out[`cell.${e.tagName.toLowerCase()}.${k}`] = (e.textContent ?? "").replace(/\s+/g, " ").trim(); });
  cp.querySelectorAll("[title]").forEach((e, k) => { out[`cell.title.${k}`] = e.getAttribute("title") ?? ""; });
  // the non-land message of each dataset
  for (const ds of ["era5-land", "era5"] as const) {
    document.body.insertAdjacentHTML("beforeend", `<aside id="cell-panel-${ds}" hidden></aside>`);
    const root = document.getElementById(`cell-panel-${ds}`)!;
    const sea = makeCell({ iy: 458, ix: 770, lat: -24.5, lon: 12.5, hist: new Uint32Array(128 * 128), fields: new Float32Array(FIELD_VARS.length * 64).fill(NaN), hasData: false, dune: false });
    const pn = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, exportMeta: () => ({ datasetId: ds, datasetTitle: ds, dataVersion: "v", permalink: "x" }) });
    await pn.show({ query: async () => sea, attrs: storeAttrs, fieldVars: FIELD_VARS } as unknown as CellStore, sea.iy, sea.ix);
    out[`cell.nonland.${ds}`] = (root.querySelector(".empty-state")?.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  // downloads of both datasets, with the store attrs the panel passes on
  const flat = (o: unknown, pre: string) => {
    if (typeof o === "string") { out[pre] = o; return; }
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) flat(v, `${pre}.${k}`);
  };
  for (const ds of ["era5-land", "era5"] as const) {
    const sfx = ds === "era5-land" ? "" : `.${ds}`;
    const meta = { datasetId: ds, datasetTitle: ds === "era5" ? "ERA5 0.25°, 1950–2024" : "ERA5-Land 1950–2024 (0.1°)", dataVersion: ds === "era5" ? "v2" : "v1", permalink: "https://map.geomorphlab.org/?cell=1145,1952", generated: new Date(0), storeAttrs: storeAttrs as never };
    const r = readNc(cellNetcdf(cell, meta));
    for (const [k, v] of Object.entries(r.gatts)) if (typeof v === "string" && k !== "history") out[`nc${sfx}.global.${k}`] = v;
    for (const [n, v] of Object.entries(r.vars)) for (const [k, a] of Object.entries(v.attrs)) if (typeof a === "string") out[`nc${sfx}.${n}.${k}`] = a;
    const md = JSON.parse(metadataJson(cell, meta));
    delete md.generated; delete md.permalink;
    flat(md, `metadata${sfx}`);
    readmeText(cell, meta).split("\n").forEach((l, k) => { if (l.trim()) out[`readme${sfx}.${String(k).padStart(3, "0")}`] = l; });
    for (const [f, cols] of Object.entries(csvColumns(cell, storeAttrs as never))) for (const c of cols) out[`csv${sfx}.${f}.${c.name}`] = `${c.units} | ${c.longName}`;
  }
  citationFile(cell).split("\n").forEach((l, k) => { if (l.trim()) out[`citation.${k}`] = l; });
  // help panel, tour, share and export text (src/ui/helpText.ts)
  for (const [k, v] of Object.entries(HELP)) {
    if (typeof v === "string") out[`help.${k}`] = v;
    else if (Array.isArray(v)) v.forEach((e, i) => { for (const [f, t] of Object.entries(e)) if (typeof t === "string") out[`help.${k}.${i}.${f}`] = t; });
    else if (v && typeof v === "object") for (const [f, t] of Object.entries(v)) if (typeof t === "string") out[`help.${k}.${f}`] = t;
  }
  // image-export strips (map with every layer; a panel plot of each dataset)
  const strip = (items: ReturnType<typeof mapStripItems>, pre: string) => items.forEach((it, i) => {
    if ("text" in it) out[`${pre}.${i}`] = it.text;
    if (it.kind === "colorbar") out[`${pre}.${i}`] = `${it.title} | ${it.detail}`;
    if (it.kind === "swatches") it.items.forEach((x, j) => { out[`${pre}.${i}.${j}`] = x.label; });
    if (it.kind === "mapkeys") out[`${pre}.${i}`] = `${it.northNote ?? ""} ${it.scaleNote ?? ""}`;
  });
  for (const ds of ["era5-land", "era5"]) {
    strip(mapStripItems({ reg, width: 1000, includeBasemap: true, shareLink: "https://map.geomorphlab.org/#v=AQ", date: new Date(0), view: { lon: 15, lat: -24, zoom: 1, bearing: 0, pitch: 0, proj: "globe" },
      state: { ...state, dataset: ds, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: true, opacity: 1 }])) } }), `export.map.${ds}`);
    strip(plotStripItems({ key: "flux-rose", title: "Sand flux rose", svg: () => "", legend: [], caption: "", thresholdDependent: true },
      { cell: { lat: -24.5, lon: 15.2, iy: 1, ix: 2 }, dataset: datasetInfo(ds), ut: 0.15, shareLink: "x", date: new Date(0) }), `export.plot.${ds}`);
  }
  return out;
}

/** Terms that must not appear in public text (tests/denylist.ts). */
export const DENY = { test: (t: string) => siteDeny().test(t) || NAN_WORD.test(t) };
/** Allowed: citation lines (Paper / Data labels and titles), the panel subtitle, the AI notice. */
export function allowed(key: string, text: string): boolean {
  if (key.startsWith("citation.") || /^metadata\.citation\./.test(key) || key === "nc.global.references") return true;
  if (/^(Paper|Data)( \(|:)/.test(text.trim())) return true;
  return false;
}
/** Strip allowed fragments (citation sentences, subtitle) from a text before the check. */
export function strip(text: string): string {
  return text
    .replace(/Interactive maps for Gunn \(2026\)[^.]*\./g, "")
    .replace(/(Paper|Data|Data \([^)]*\)|Dune map and code): [^\n]*?(https:\/\/doi\.org\/|doi:)\S+( \([^)]*\))?/g, "");
}
