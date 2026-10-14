// Dump every layer's info-popover content (registry fields + rendered infoHtml text) for the info-text
// audit (docs/info-text-audit.md). Run from app/:
//   npx vite-node ../scripts/mars/app/info_audit.ts -- out-earth.json            (Earth: ERA5-Land and ERA5)
//   VITE_BODY=mars npx vite-node ../scripts/mars/app/info_audit.ts -- out-mars.json
import fs from "node:fs";
import { Window } from "happy-dom";
const w = new Window();
Object.assign(globalThis, { window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node });
const { loadRegistry } = await import("../../../app/src/registry/load");
const { applyDatasetLayers } = await import("../../../app/src/registry/merge");
const { infoHtml } = await import("../../../app/src/ui/layerPanel");
const out: unknown[] = [];
const reg0 = loadRegistry().registry;
const datasets = reg0.datasets?.length ? reg0.datasets.map((d) => d.id) : [undefined];
for (const ds of datasets) {
  const reg = loadRegistry().registry;
  if (ds && ds !== reg.defaultDataset) applyDatasetLayers(reg, ds);
  for (const l of reg.layers) {
    const html = infoHtml(l, ds);
    const div = w.document.createElement("div"); div.innerHTML = html;
    out.push({ dataset: ds ?? null, id: l.id, group: l.group, type: l.type, title: l.title, titleTex: l.titleTex ?? null, units: l.units ?? null,
      thresholdAware: l.thresholdAware ?? null, description: l.description ?? null, citation: l.citation ?? null, attribution: l.attribution ?? null,
      invert: !!(l as { invertSource?: unknown }).invertSource, html, text: div.textContent });
  }
  for (const b of reg.basemaps) out.push({ dataset: ds ?? null, id: `basemap:${b.id}`, title: b.title, attribution: b.attribution ?? null, info: "none (radio only)" });
  for (const g of reg.groups) out.push({ dataset: ds ?? null, id: `group:${g.id}`, title: g.title, description: g.description ?? null });
}
fs.writeFileSync(process.argv.at(-1)!, JSON.stringify(out, null, 1));
console.log(out.length);
