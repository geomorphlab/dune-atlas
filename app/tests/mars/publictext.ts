// Collect every user-facing string of the Mars site and its downloads (keyed), like
// tests/publictext.ts for Earth: for the user-text checks (tests/usertext.ts) and the text audit
// (TEXT_DUMP=<file> writes the collection).
import { loadRegistry } from "../../src/core/registry/load";
import { Store, type AppState } from "../../src/core/store";
import { renderLayerPanel } from "../../src/core/ui/layerPanel";
import { legendHtml } from "../../src/core/ui/legend";
import { CellPanel } from "../../src/core/ui/cellPanel";
import type { MarsCellStore } from "../../src/bodies/mars/cell/cellstore";
import { cellNetcdf, csvColumns, metadataJson, readmeText } from "../../src/bodies/mars/cell/export";
import * as HELP from "../../src/core/ui/helpText";
import { mapStripItems } from "../../src/core/export/mapExport";
import { plotStripItems } from "../../src/core/export/plotExport";
import { datasetInfo } from "../../src/core/cell/datasetinfo";
import { readNc } from "../ncreader";
import { FIELD_VARS, makeMarsCell } from "./helpers";

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const textOf = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; return norm(d.textContent); };

export async function collectMarsPublicText(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const { registry: reg } = loadRegistry();
  out["threshold.label"] = reg.threshold.label ?? "";
  for (const g of reg.groups) { out[`group.${g.id}.title`] = g.title; if (g.description) out[`group.${g.id}.description`] = g.description; }
  for (const l of reg.layers) {
    out[`layer.${l.id}.title`] = l.title;
    if (l.description) out[`layer.${l.id}.description`] = l.description;
    if (l.units) out[`layer.${l.id}.units`] = l.units;
    if (l.display?.legendNote) out[`layer.${l.id}.legendNote`] = l.display.legendNote;
    for (const [k, v] of Object.entries(l.attribution ?? {})) if (typeof v === "string") out[`layer.${l.id}.attribution.${k}`] = v;
    out[`legend.${l.id}`] = textOf(legendHtml(l));
  }
  for (const b of reg.basemaps) { out[`basemap.${b.id}.title`] = b.title; if (b.attribution) out[`basemap.${b.id}.attribution`] = textOf(b.attribution); }
  for (const d of reg.datasets ?? []) out[`dataset.${d.id}.title`] = d.title;
  // layer panel (embed mode: the pill too), popovers, About, slider block
  document.body.innerHTML = '<div id="app"><aside id="layer-panel"></aside></div><aside id="cell-panel" hidden></aside>';
  const state: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 29,
    layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: true, opacity: 1 }])), order: reg.layers.map((l) => l.id), dataset: reg.datasets?.[0]?.id ?? "", cell: null, embed: true };
  const store = new Store(state);
  const lp = document.getElementById("layer-panel")!;
  renderLayerPanel(lp, reg, store, { fullScreenUrl: () => "https://map.geomorphlab.org/mars/" });
  out["embed.bar"] = norm(document.querySelector(".embed-bar")?.textContent);
  out["panel.header"] = norm(lp.querySelector(".atlas-header")?.textContent);
  lp.querySelectorAll(".info-popover").forEach((e, k) => { out[`popover.${k}.${e.closest(".layer-item")?.getAttribute("data-layer") ?? e.closest("[data-basemap]")?.getAttribute("data-basemap") ?? e.id}`] = norm(e.textContent); });
  out["panel.about"] = norm(lp.querySelector(".about")?.textContent);
  out["panel.pinned"] = norm(lp.querySelector(".pinned")?.textContent);
  document.querySelectorAll("#app [title]").forEach((e, k) => { out[`panel.title.${k}`] = e.getAttribute("title") ?? ""; });
  document.querySelectorAll("#app [aria-label]").forEach((e, k) => { out[`panel.aria.${k}`] = e.getAttribute("aria-label") ?? ""; });
  lp.querySelectorAll(".help, .legend-note, .caption").forEach((e, k) => { out[`panel.help.${k}`] = norm(e.textContent); });
  // cell panel
  const cp = document.getElementById("cell-panel")!;
  const cell = makeMarsCell(0);
  const meta = { datasetId: "fv3-beta1", datasetTitle: reg.datasets![0].title, dataVersion: "v1", permalink: "https://map.geomorphlab.org/mars/?cell=40,123", generated: new Date(0) };
  const p = new CellPanel(cp, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {}, threshold: { def: reg.threshold, store }, exportMeta: () => meta, shareLink: () => "x" });
  await p.show({ query: async () => cell, attrs: { grid: cell.grid, field_vars: FIELD_VARS }, grid: cell.grid } as unknown as MarsCellStore as never, cell.iy, cell.ix);
  cp.querySelectorAll(".caption, .help, h2, h3, summary, th, td, .fig-legend li, label, button, .empty-state, p").forEach((e, k) => { const t = norm(e.textContent); if (t) out[`cell.${e.tagName.toLowerCase()}.${k}`] = t; });
  cp.querySelectorAll("[title]").forEach((e, k) => { out[`cell.title.${k}`] = e.getAttribute("title") ?? ""; });
  cp.querySelectorAll("[aria-label]").forEach((e, k) => { out[`cell.aria.${k}`] = e.getAttribute("aria-label") ?? ""; });
  // downloads
  const flat = (o: unknown, pre: string) => {
    if (typeof o === "string") { out[pre] = o; return; }
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) flat(v, `${pre}.${k}`);
  };
  const r = readNc(cellNetcdf(cell, meta));
  for (const [k, v] of Object.entries(r.gatts)) if (typeof v === "string" && k !== "history") out[`nc.global.${k}`] = v;
  for (const [n, v] of Object.entries(r.vars)) for (const [k, a] of Object.entries(v.attrs)) if (typeof a === "string") out[`nc.${n}.${k}`] = a;
  const md = JSON.parse(metadataJson(cell, meta)); delete md.generated; delete md.permalink;
  flat(md, "metadata");
  readmeText(cell, meta).split("\n").forEach((l, k) => { if (l.trim()) out[`readme.${String(k).padStart(3, "0")}`] = l; });
  for (const [f, cols] of Object.entries(csvColumns(cell))) for (const c of cols) out[`csv.${f}.${c.name}`] = `${c.units} | ${c.longName}`;
  // help, tour, share and export text
  for (const [k, v] of Object.entries(HELP)) {
    if (typeof v === "string") out[`help.${k}`] = v;
    else if (Array.isArray(v)) v.forEach((e, i) => { for (const [f, t] of Object.entries(e)) if (typeof t === "string") out[`help.${k}.${i}.${f}`] = t; });
    else if (v && typeof v === "object") for (const [f, t] of Object.entries(v)) if (typeof t === "string") out[`help.${k}.${f}`] = t;
  }
  const strip = (items: ReturnType<typeof mapStripItems>, pre: string) => items.forEach((it, i) => {
    if ("text" in it) out[`${pre}.${i}`] = it.text;
    if (it.kind === "colorbar") out[`${pre}.${i}`] = `${it.title} | ${it.detail}`;
    if (it.kind === "swatches") it.items.forEach((x, j) => { out[`${pre}.${i}.${j}`] = x.label; });
    if (it.kind === "mapkeys") out[`${pre}.${i}`] = `${it.northNote ?? ""} ${it.scaleNote ?? ""}`;
  });
  strip(mapStripItems({ reg, width: 1000, includeBasemap: true, shareLink: "https://map.geomorphlab.org/mars/#v=AQ", date: new Date(0), view: { lon: 67, lat: 9, zoom: 4, bearing: 0, pitch: 0, proj: "globe" },
    state: { ...state, dunesOnly: true } }), "export.map");
  strip(plotStripItems({ key: "flux-rose", title: "Sand flux rose", svg: () => "", legend: [], caption: "", thresholdDependent: true },
    { cell: { lat: 9, lon: 67, iy: 40, ix: 123 }, dataset: datasetInfo("fv3-beta1"), ut: 200, shareLink: "x", date: new Date(0) }), "export.plot");
  return out;
}
