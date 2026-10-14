// Layer panel generated from the merged registry. Layout (top to bottom):
//   header (title, collapse toggle, dataset selector if > 1 dataset) | u*,th control (pinned,
//   outside the scroll area) | scrolling body: 'Active layers' = the visible layers in drawing
//   order (drag or move up/down; top = drawn on top; opacity slider; × to hide), groups ->
//   layers (toggle, info, display controls, legend), basemap radio + globe toggle, About & citation.
import { richHtml } from "../util/richtext";
import type { BasemapDef, LayerAttribution, LayerDef, Registry } from "../registry/types";
import type { Store, AppState } from "../store";
import { h, nextId } from "./dom";
import { legendHtml } from "./legend";
import { thresholdControl } from "./threshold";
import { escapeHtml } from "../util/format";
import { BODY_NAME } from "../body";
import { DATASET_INFO, datasetInfo, datasetTooltip } from "../cell/datasetinfo";
import { fieldInfo } from "../cell/fieldinfo";
import { isDatasetDependent } from "../registry/merge";
import { mathHtml } from "../util/math";
import { AI_NOTICE, citationHtml, citationSources, fieldsCitation, fieldsLicence } from "../cell/citation";
import { canLog, COLORMAP_GROUPS, DEFAULT_SPACING_KM, effectiveDisplay, isDirectional, SPACING_KM_STEPS, vectorColors, type RenderMode } from "../layerconfig";

/** screen-reader names of the spacing steps (finest to coarsest); no units, as on screen */
export const SPACING_STEP_NAMES = ["finest", "finer", "fine", "medium", "coarse", "coarser", "coarsest"];
import { COLORMAPS } from "../util/colormaps";

export { AI_NOTICE } from "../cell/citation";
const AUTHOR_EMAIL = "a.gunn@monash.edu";
/** 'Data sources' list in About (what each product is and where it comes from). */
export const DATA_SOURCES_HTML = `<h4>Data sources</h4><ul class="sources">
  <li><strong>Wind histograms and sand-flux fields (ERA5-Land 0.1°)</strong>: ERA5-Land 1950–2024 hourly 10 m winds (0.1°) and the qsat parameters of Gunn (2026), Supplementary Data (Zenodo, CC BY 4.0). Drift potentials (DP, RDP, RDD, RDP/DP) and crest fluxes are averages over the hourly record.</li>
  <li><strong>Wind histograms and sand-flux fields (ERA5 0.25°)</strong>: ERA5 1950–2024 hourly 10 m winds on the 0.25° grid (Hersbach et al. 2020; Copernicus Climate Change Service, accessed via the NCI Australia replica); the histograms and the 23 sand-flux fields are computed for the atlas with the method of Gunn (2026). Cells with an ERA5 land–sea mask fraction above 0 (any land in the cell) carry wind data; a 0.25° cell counts as a dune cell where it overlaps a mapped 0.1° dune cell. Choose the dataset with the Wind dataset selector; the dune map, aridity and vegetation layers are the same for both.</li>
  <li><strong>Dune map</strong>: dune-mask-rev1.tif from the Supplementary Code record (Zenodo, MIT), vectorised into dune fields.</li>
  <li><strong>Saturated flux divergence</strong> ${mathHtml("$\\nabla\\cdot\\vec{q}_s$")}: divergence of the resultant drift potential vector (magnitude RDP, direction RDD) on the sphere, following Gunn (2026), Methods M6, computed with central differences on the 0.1° grid. Negative values (convergence) imply deposition; no data at coasts.</li>
  <li><strong>Aridity index</strong>: Global Aridity Index v3.1 (Global-AI_PET v3.1; Zomer, Xu &amp; Trabucco 2022), 1970–2000, native 30″ grid, CC BY 4.0; ocean and Antarctica (south of 60° S) have no data, values ≥ 6.5535 are at the top of the source range. The click panel shows the 0.1° cell mean.</li>
  <li><strong>Vegetation cover</strong>: CSIRO MODIS Fractional Cover v3.1 (Guerschman et al. 2015; Guerschman &amp; Hill 2018), total vegetation cover (photosynthetic + non-photosynthetic vegetation), mean of the monthly 500 m values 2001–2025 on the 0.1° grid, CC BY 4.0 © 2008–2019 CSIRO, hosted by NCI; the vegetation product of GEOGLAM RAPP. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full time series at GEOGLAM RAPP</a>. The click panel shows the cell mean and the number of valid months.</li>
</ul>`;
/** About: how to cite the map fields of every wind dataset (one format with the info popovers and the downloads). */
export function fieldsCitationHtml(): string {
  return `<h4>Citing the map fields</h4><ul class="sources">${Object.values(DATASET_INFO).map((d) => `<li><strong>${escapeHtml(`${d.name} ${d.resolution}`)}</strong>: ${richHtml(fieldsCitation(d.id))}. Licence: ${escapeHtml(fieldsLicence(d.id))}.</li>`).join("")}</ul>`;
}
export const INVERT_NOTE = "Invert colours land WITHOUT mapped dunes. Vector tiles end at ±85.05° latitude, so interior Antarctica south of 85°S is not coloured.";

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : "");
/** Rows of the structured attribution (registry `attribution`), in the fixed order Source, Citation,
 *  Data DOI, Licence, Link, Changes (docs/info-text-audit.md). */
function attributionRows(a: LayerAttribution): string {
  const row = (k: string, v: string | undefined, html?: string) => (v ? `<dt>${k}</dt><dd>${html ?? richHtml(v)}</dd>` : "");
  const url = a.url ? safeUrl(a.url) : "";
  const doi = a.doi?.replace(/^doi:/i, "").replace(/^https?:\/\/doi\.org\//i, "");
  return `${row("Source", a.source)}${row("Citation", a.citation)}${row("Data DOI", doi, doi ? `<a href="https://doi.org/${escapeHtml(doi)}" target="_blank" rel="noopener">doi:${escapeHtml(doi)}</a>` : "")}${row("Licence", a.licence)}${row("Link", url, url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url.replace(/^https?:\/\//, "").slice(0, 60))}${url.length > 68 ? "…" : ""}</a>` : "")}${row("Changes", a.changes)}`;
}
/** Structured attribution (registry `attribution`): source, citation, licence, link, DOI, changes. */
export function attributionHtml(a: LayerAttribution | undefined): string {
  return a ? `<dl class="attribution">${attributionRows(a)}</dl>` : "";
}

/** Sentences that repeat a fact row of the info popover (units, display convention, slider dependence).
 *  Since round 4 (PI 2026-10-14) the generators no longer emit them; this is a render-time fallback for
 *  texts not yet regenerated (stale registries, layers owned by other tracks) so each fact is stated once. */
const REPEATED_FACTS: RegExp[] = [
  /\s*Shown(?: in [^ ]+)? at the selected (?:threshold friction velocity u\*,th|median grain diameter d) \(default [^)]*\)\./g,
  /\s*Converted from m²\/s to m²\/yr\./g,
  /\s*Displayed as the compass bearing \(degrees clockwise from north\) toward which sand\/crests move\./g,
  /\s*Independent of the (?:wind dataset and of u\*,th|grain diameter d(?: and of the wind dataset)?)\./g,
];
export const infoDefinition = (text: string) => REPEATED_FACTS.reduce((t, re) => t.replace(re, ""), text).trim();

/** Units row: display units, with the direction / axis convention and fractions spelled out. */
export function infoUnits(l: LayerDef): string {
  const tr = (l.display as { transform?: string } | undefined)?.transform;
  if (tr === "rad-to-bearing") return "° (compass bearing, clockwise from north, toward which sand moves)";
  if (tr === "rad-to-axis") return "° (crest axis, 0–180°)";
  if (l.units === "dimensionless") return fieldInfo(l.id).kind === "fraction" ? "fraction (0–1)" : "dimensionless";
  return l.units ? escapeHtml(l.units) : "";
}

/** Info popover body of a layer, one structure for every layer of both builds (docs/info-text-audit.md):
 *  definition, invert note (dune layer), then one list: Units, Wind data, Slider (map fields), Source,
 *  Citation, Data DOI, Licence, Link, Changes (attribution; or the citation alone). */
export function infoHtml(l: LayerDef, datasetId?: string): string {
  const thr = l.type === "zarr-field"
    ? (l.thresholdAware ? `<p class="help">Updates with the ${mathHtml("$u_{*,th}$")} control.</p>` : `<p class="help">Threshold-independent: not affected by the ${mathHtml("$u_{*,th}$")} control.</p>`)
    : "";
  const row = (k: string, html: string) => (html ? `<dt>${k}</dt><dd>${html}</dd>` : "");
  let facts = "";
  if (l.type === "zarr-field") {
    const ds = datasetInfo(datasetId);
    facts = row("Units", infoUnits(l))
      + row("Wind data", isDatasetDependent(l.source) ? escapeHtml(`${ds.name} ${ds.resolution}, ${ds.period}`) : "not used (the same for every wind dataset)")
      + row("Slider", thr.replace(/^<p class="help">|<\/p>$/g, ""));
  }
  const sources = l.attribution ? attributionRows(l.attribution) : l.citation ? row("Citation", richHtml(l.citation)) : "";
  const def = l.description ? infoDefinition(l.description) : "";
  return `${def ? `<p class="info-def">${richHtml(def, mathHtml)}</p>` : ""}${l.invertSource ? `<p class="help">${escapeHtml(INVERT_NOTE)}</p>` : ""}${facts || sources ? `<dl class="attribution info-facts">${facts}${sources}</dl>` : ""}`;
}

/** Info popover of a basemap, the layer structure (docs/info-text-audit.md): definition, then Source,
 *  Resolution, Licence, Link. The credits also stay in the map attribution. */
export function basemapInfoHtml(b: BasemapDef): string {
  const i = b.info ?? {};
  const row = (k: string, html: string) => (html ? `<dt>${k}</dt><dd>${html}</dd>` : "");
  const url = i.url ? safeUrl(i.url) : "";
  const rows = row("Source", i.source ? richHtml(i.source) : "") + row("Resolution", i.resolution ? escapeHtml(i.resolution) : "")
    + row("Coverage", i.coverage ? richHtml(i.coverage) : "")
    + row("Licence", i.licence ? richHtml(i.licence) : "")
    + row("Link", url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 60))}${url.length > 68 ? "…" : ""}</a>` : "");
  return `${i.description ? `<p class="info-def">${richHtml(i.description, mathHtml)}</p>` : ""}${rows ? `<dl class="attribution info-facts">${rows}</dl>` : ""}`;
}

/** 'Dunes only' (PI round 5): one UI-wide switch, in the URL / share link; restricts every wind-derived map
 *  layer to the dataset's dune cells (map/dunemask.ts). Non-wind layers and the cell panel are unchanged. */
export const DUNES_ONLY_HELP = "Draw the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in cells with dunes; the other layers and the cell panel are unchanged.";
export function dunesOnlyToggle(store: Store): HTMLElement {
  const cb = h("input", { type: "checkbox", id: "dunes-only", "aria-describedby": "dunes-only-help" }) as HTMLInputElement;
  cb.checked = !!store.state.dunesOnly;
  cb.addEventListener("change", () => store.set({ dunesOnly: cb.checked }));
  store.subscribe((st, ch) => { if (ch.has("dunesOnly")) cb.checked = !!st.dunesOnly; });
  return h("label", { class: "inline dunes-only-row", for: "dunes-only", title: DUNES_ONLY_HELP }, cb, " Dunes only",
    h("span", { id: "dunes-only-help", class: "visually-hidden" }, DUNES_ONLY_HELP));
}

/** ⓘ button + popover pair (layers and basemaps) */
function infoToggle(title: string, html: string, idBase: string): { button: HTMLButtonElement; pop: HTMLElement } {
  const infoId = nextId(`info-${idBase}`);
  const button = h("button", { type: "button", class: "info-button", "aria-expanded": "false", "aria-controls": infoId, "aria-label": `About ${title}` }, "i") as HTMLButtonElement;
  const pop = h("div", { id: infoId, class: "info-popover", hidden: true, role: "note", html });
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    pop.hidden = !open;
  });
  return { button, pop };
}

function layerItem(l: LayerDef, store: Store): HTMLElement {
  const cid = nextId(`lyr-${l.id}`);
  const st0 = store.state.layers[l.id] ?? { visible: false, opacity: l.opacity ?? 1 };
  const cb = h("input", { type: "checkbox", id: cid, checked: st0.visible }) as HTMLInputElement;
  const infoId = nextId(`info-${l.id}`);
  const info = h("button", { type: "button", class: "info-button", "aria-expanded": "false", "aria-controls": infoId, "aria-label": `About ${l.title}` }, "i");
  const pop = h("div", { id: infoId, class: "info-popover", hidden: true, role: "note",
    html: infoHtml(l, store.state.dataset) });
  info.addEventListener("click", () => {
    const open = info.getAttribute("aria-expanded") !== "true";
    info.setAttribute("aria-expanded", String(open));
    pop.hidden = !open;
  });
  const controls = h("div", { class: "layer-controls", hidden: !st0.visible });
  const legend = h("div", { class: "legend-wrap", hidden: !st0.visible });
  cb.addEventListener("change", () => {
    store.setLayer(l.id, { visible: cb.checked });
    if (cb.checked) store.moveLayer(l.id, 0); // re-ticked layers go on top of the drawing order
  });
  const refreshers: ((s: AppState) => void)[] = [];

  if (l.type === "zarr-field") {
    const disp = h("details", { class: "display-opts" }, h("summary", {}, "Display"));
    // render mode (directional fields)
    if (isDirectional(l)) {
      const mode = h("select", { "aria-label": `Render ${l.title} as` },
        h("option", { value: "colormap" }, "colour map"), h("option", { value: "arrows" }, "arrows"), h("option", { value: "streamlines" }, "streamlines")) as HTMLSelectElement;
      mode.addEventListener("change", () => store.setLayerConfig(l.id, { mode: mode.value === "colormap" ? undefined : (mode.value as RenderMode) }));
      const vc = h("input", { type: "color", "aria-label": `Arrow / streamline colour for ${l.title}` }) as HTMLInputElement;
      vc.addEventListener("change", () => store.setLayerConfig(l.id, { vecColor: vc.value }));
      const vcRow = h("label", { class: "inline" }, "Line colour ", vc);
      // spacing: the km step is the only state (store / URL); the screen px conversion is internal
      // to the map adapter and never written back here. No numeric readout (the on-screen spacing
      // depends on the zoom): endpoint labels Finer (left, denser lines) / Coarser (right).
      const ds = h("input", { type: "range", min: 0, max: SPACING_KM_STEPS.length - 1, step: 1, "aria-label": `Line spacing for ${l.title}, finer to coarser` }) as HTMLInputElement;
      const valueText = () => `${SPACING_STEP_NAMES[Number(ds.value)] ?? ""}`;
      const kmAt = () => SPACING_KM_STEPS[Number(ds.value)];
      ds.addEventListener("input", () => ds.setAttribute("aria-valuetext", valueText()));
      ds.addEventListener("change", () => store.setLayerConfig(l.id, { spacingKm: kmAt() === DEFAULT_SPACING_KM ? undefined : kmAt() }));
      const dsRow = h("label", { class: "inline spacing", title: "Spacing between arrows / streamlines: left finer (denser lines), right coarser" }, "Spacing ",
        h("span", { class: "spacing-end", "aria-hidden": "true" }, "Finer"), ds, h("span", { class: "spacing-end", "aria-hidden": "true" }, "Coarser"));
      disp.append(h("label", { class: "inline" }, "Show as ", mode), vcRow, dsRow);
      refreshers.push((s) => {
        const e = effectiveDisplay(l, s.layers[l.id]?.cfg);
        mode.value = e.mode;
        vc.value = e.vecColor;
        vcRow.hidden = e.mode === "colormap";
        dsRow.hidden = e.mode === "colormap";
        if (document.activeElement !== ds) { ds.value = String(SPACING_KM_STEPS.indexOf(e.spacingKm)); ds.setAttribute("aria-valuetext", valueText()); }
        cmapBox.hidden = e.mode !== "colormap";
      });
    }
    // colormap, reverse, clim, log
    const sel = h("select", { "aria-label": `Colour map for ${l.title}` }) as HTMLSelectElement;
    for (const g of COLORMAP_GROUPS) {
      const og = h("optgroup", { label: g.label });
      for (const n of g.names) if (COLORMAPS[n]) og.append(h("option", { value: n }, n));
      sel.append(og);
    }
    sel.addEventListener("change", () => store.setLayerConfig(l.id, { colormap: sel.value === l.display?.colormap ? undefined : sel.value }));
    const rev = h("input", { type: "checkbox", "aria-label": `Reverse colour map for ${l.title}` }) as HTMLInputElement;
    rev.addEventListener("change", () => store.setLayerConfig(l.id, { reverse: rev.checked || undefined }));
    const lo = h("input", { type: "number", step: "any", class: "clim", "aria-label": `Colour scale minimum for ${l.title}` }) as HTMLInputElement;
    const hi = h("input", { type: "number", step: "any", class: "clim", "aria-label": `Colour scale maximum for ${l.title}` }) as HTMLInputElement;
    const climMsg = h("span", { class: "help", role: "status" });
    const setClim = () => {
      const a = Number(lo.value), b = Number(hi.value);
      if (!(Number.isFinite(a) && Number.isFinite(b) && b > a)) { climMsg.textContent = "min must be < max"; return; }
      climMsg.textContent = "";
      const d = l.display?.clim;
      store.setLayerConfig(l.id, { clim: d && d[0] === a && d[1] === b ? undefined : [a, b] });
    };
    lo.addEventListener("change", setClim);
    hi.addEventListener("change", setClim);
    const reset = h("button", { type: "button", class: "link-button" }, "reset");
    reset.addEventListener("click", () => store.setLayerConfig(l.id, { clim: undefined, log: undefined, colormap: undefined, reverse: undefined }));
    const cmapBox = h("div", { class: "cmap-box" },
      h("label", { class: "inline" }, "Colours ", sel), h("label", { class: "inline" }, rev, " reversed"),
      h("div", { class: "clim-row" }, h("label", { class: "inline" }, "min ", lo), h("label", { class: "inline" }, "max ", hi), reset, climMsg));
    if (canLog(l)) {
      const lg = h("input", { type: "checkbox", "aria-label": `Logarithmic colour scale for ${l.title}` }) as HTMLInputElement;
      const lgHint = h("span", { class: "hint log-hint" });
      const lgRow = h("label", { class: "inline" }, lg, " log scale ", lgHint);
      lg.addEventListener("change", () => store.setLayerConfig(l.id, { log: lg.checked === !!l.display?.log ? undefined : lg.checked }));
      cmapBox.append(lgRow);
      refreshers.push((s) => {
        const e = effectiveDisplay(l, s.layers[l.id]?.cfg);
        const [a, b] = e.clim;
        const ok = a > 0 || (a < 0 && b > 0);
        lg.checked = e.log;
        lg.disabled = !ok;
        lgRow.title = !ok ? "Log scale needs min > 0, or min < 0 < max (symmetric log)"
          : a < 0 ? "Limits span zero: symmetric log scale, linear close to zero" : "";
        lgHint.textContent = e.scale === "symlog" ? `symlog, linear within ±${Number(e.linthresh.toPrecision(3))}` : "";
      });
    }
    disp.append(cmapBox);
    refreshers.push((s) => {
      const e = effectiveDisplay(l, s.layers[l.id]?.cfg);
      sel.value = e.colormap;
      rev.checked = e.reverse;
      if (document.activeElement !== lo) lo.value = String(Number(e.clim[0].toPrecision(6)));
      if (document.activeElement !== hi) hi.value = String(Number(e.clim[1].toPrecision(6)));
    });
    controls.append(disp);
  } else if (l.type === "pmtiles-vector" || l.type === "geojson-points") {
    const fc = h("input", { type: "color", "aria-label": `Fill colour for ${l.title}` }) as HTMLInputElement;
    fc.addEventListener("input", () => store.setLayerConfig(l.id, { fill: fc.value }));
    const box = h("div", { class: "vec-box" }, h("label", { class: "inline" }, "Fill ", fc));
    if (l.invertSource) {
      const inv = h("input", { type: "checkbox", "aria-label": `Invert: colour land without dunes` }) as HTMLInputElement;
      inv.addEventListener("change", () => store.setLayerConfig(l.id, { invert: inv.checked || undefined }));
      box.append(h("label", { class: "inline", title: INVERT_NOTE }, inv, " invert (land without dunes)"));
      refreshers.push((s) => { inv.checked = vectorColors(l, s.layers[l.id]?.cfg).invert; });
    }
    refreshers.push((s) => {
      const c = vectorColors(l, s.layers[l.id]?.cfg);
      fc.value = c.fill;
    });
    controls.append(box);
  }

  const refresh = (s: AppState) => {
    const ls = s.layers[l.id];
    if (!ls) return;
    cb.checked = ls.visible;
    controls.hidden = !ls.visible || controls.childElementCount === 0;
    legend.hidden = !ls.visible;
    legend.innerHTML = legendHtml(l, ls.cfg);
    for (const r of refreshers) r(s);
  };
  const item = h("li", { class: "layer-item", "data-layer": l.id },
    h("div", { class: "layer-row" }, cb, h("label", { for: cid, html: l.titleTex ? mathHtml(l.titleTex) : escapeHtml(l.title) }), info),
    controls, legend, pop);
  refresh(store.state);
  store.subscribe((s, ch) => {
    // a dataset switch changes the layer's definition in place (colour limits, citation)
    if (ch.has("dataset")) pop.innerHTML = infoHtml(l, store.state.dataset);
    if (ch.has("layers") || ch.has("dataset")) refresh(s);
  });
  return item;
}

/** "Active layers": the visible layers, top of the list = drawn on top. Each row: drag handle,
 *  stacking number, title, opacity slider, move up/down (keyboard), × (hides the layer = unticks
 *  it). Rows are rebuilt only when the list of visible layers or their order changes, so an
 *  opacity drag is never interrupted. Basemap is always below, basemap labels and the selected
 *  cell always above. */
function orderList(reg: Registry, store: Store): HTMLElement {
  const ol = h("ol", { class: "order-list", "aria-label": "Active layers, drawing order (top is drawn on top)" });
  const title = (id: string) => reg.layers.find((l) => l.id === id)?.title ?? id;
  const visibleIds = (s: AppState) => s.order.filter((id) => s.layers[id]?.visible);
  let dragId: string | null = null;
  let shown = "";
  const row = (id: string): HTMLElement => {
    const l = reg.layers.find((x) => x.id === id);
    const ids = () => visibleIds(store.state);
    const up = h("button", { type: "button", class: "move", "aria-label": `Move ${title(id)} up` }, "▲");
    const down = h("button", { type: "button", class: "move", "aria-label": `Move ${title(id)} down` }, "▼");
    up.addEventListener("click", () => { const v = ids(), k = v.indexOf(id); if (k > 0) { store.moveLayer(id, store.state.order.indexOf(v[k - 1])); focusMove(id, "up"); } });
    down.addEventListener("click", () => { const v = ids(), k = v.indexOf(id); if (k >= 0 && k < v.length - 1) { store.moveLayer(id, store.state.order.indexOf(v[k + 1])); focusMove(id, "down"); } });
    // × hides the layer (same state as unticking it in the layer list)
    const rm = h("button", { type: "button", class: "remove", "aria-label": `Remove ${title(id)} from the map`, title: "Remove (untick layer)" }, "×");
    rm.addEventListener("click", () => {
      store.setLayer(id, { visible: false });
      (ol.querySelector(".order-item .remove") as HTMLButtonElement | null)?.focus();
    });
    const op = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: store.state.layers[id]?.opacity ?? 1, class: "opacity", "aria-label": `Opacity of ${title(id)}`, title: "Opacity", draggable: "false" }) as HTMLInputElement;
    op.addEventListener("input", () => store.setLayer(id, { opacity: Number(op.value) }));
    // a slider drag must not start a row drag
    op.addEventListener("pointerdown", () => { li.draggable = false; });
    op.addEventListener("pointerup", () => { li.draggable = true; });
    const li = h("li", { class: "order-item", draggable: "true", "data-layer": id },
      h("span", { class: "drag-handle", "aria-hidden": "true", title: "Drag to reorder" }, "⠿"),
      h("span", { class: "order-num" }, ""),
      h("span", { class: "order-title", html: l?.titleTex ? mathHtml(l.titleTex) : escapeHtml(title(id)) }), op, up, down, rm);
    li.addEventListener("dragstart", (e) => { dragId = id; li.classList.add("dragging"); e.dataTransfer?.setData("text/plain", id); if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"; });
    li.addEventListener("dragend", () => { dragId = null; li.classList.remove("dragging"); });
    li.addEventListener("dragover", (e) => { if (dragId && dragId !== id) { e.preventDefault(); li.classList.add("drop-target"); } });
    li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("drop-target");
      const from = dragId ?? e.dataTransfer?.getData("text/plain");
      if (from && from !== id) store.moveLayer(from, store.state.order.indexOf(id));
    });
    return li;
  };
  const rows = new Map<string, HTMLElement>();
  const render = (s: AppState) => {
    const ids = visibleIds(s);
    const key = ids.join("|");
    if (key !== shown) {
      for (const id of [...rows.keys()]) if (!ids.includes(id)) rows.delete(id);
      for (const id of ids) if (!rows.has(id)) rows.set(id, row(id));
      const focused = document.activeElement;
      ol.replaceChildren(...ids.map((id) => rows.get(id)!));
      if (focused instanceof HTMLElement && ol.contains(focused)) focused.focus();
      shown = key;
    }
    ids.forEach((id, k) => {
      const li = rows.get(id)!;
      li.querySelector(".order-num")!.textContent = String(k + 1);
      const [up, down] = li.querySelectorAll<HTMLButtonElement>(".move");
      up.disabled = k === 0;
      down.disabled = k === ids.length - 1;
      const op = li.querySelector<HTMLInputElement>("input.opacity")!;
      if (document.activeElement !== op) op.value = String(s.layers[id]?.opacity ?? 1);
    });
    wrap.hidden = ids.length === 0;
  };
  const focusMove = (id: string, dir: "up" | "down") => {
    const b = ol.querySelector(`.order-item[data-layer="${id}"] .move:nth-of-type(${dir === "up" ? 1 : 2})`) as HTMLButtonElement | null;
    (b && !b.disabled ? b : (ol.querySelector(`.order-item[data-layer="${id}"] .move:not([disabled])`) as HTMLButtonElement | null))?.focus();
  };
  const wrap = h("details", { class: "order", open: true }, h("summary", {}, "Active layers"), ol);
  render(store.state);
  store.subscribe((s, ch) => { if (ch.has("order") || ch.has("layers")) render(s); });
  return wrap;
}

/** open / collapse the layer list (the Layers button does the same) */
export function setLayerPanelOpen(root: HTMLElement, open: boolean) {
  root.querySelector(".panel-toggle")?.setAttribute("aria-expanded", String(open));
  root.classList.toggle("collapsed", !open);
}
export const layerPanelOpen = (root: HTMLElement) => !root.classList.contains("collapsed");

/** the header subtitle, identical in both atlases (the Gunn (2026) citation is in About) */
export const SUBTITLE_HTML = `Interactive explorer for aeolian geomorphology<br>Developed by the <a href="https://www.geomorphlab.org/" target="_blank" rel="noopener">Monash Geomorphology Lab</a>`;

export function renderLayerPanel(root: HTMLElement, reg: Registry, store: Store, opts: { fullScreenUrl?: () => string; initialOpen?: boolean } = {}) {
  root.replaceChildren();
  const toggle = h("button", { type: "button", class: "panel-toggle", "aria-expanded": "true", "aria-controls": "layer-panel-body", title: "Show / hide layers" }, "Layers");
  const body = h("div", { id: "layer-panel-body", class: "panel-body" });
  toggle.addEventListener("click", () => setLayerPanelOpen(root, toggle.getAttribute("aria-expanded") !== "true"));
  if (opts.initialOpen === false || (opts.initialOpen === undefined && (store.state.embed || globalThis.matchMedia?.("(max-width: 720px)").matches))) {
    toggle.setAttribute("aria-expanded", "false");
    root.classList.add("collapsed");
  }
  const header = h("header", { class: "atlas-header" },
    h("div", { class: "title-row" }, h("h1", {}, "Dune Atlas", " ", h("span", { class: "body-name" }, BODY_NAME)), toggle),
    h("p", { class: "subtitle", html: SUBTITLE_HTML }));
  if (opts.fullScreenUrl) {
    const a = h("a", { class: "fullscreen-link", href: opts.fullScreenUrl(), target: "_blank", rel: "noopener" }, "Open full screen ↗");
    store.subscribe(() => { a.href = opts.fullScreenUrl!(); });
    header.append(a);
  }
  const datasets = reg.datasets ?? [];
  if (datasets.length >= 1) { // shown with a single dataset too (Mars: MCMC FV3)
    const sel = h("select", { id: "dataset-select", "aria-label": "Wind dataset" }, ...datasets.map((d) => h("option", { value: d.id, title: datasetTooltip(d.id) || d.title }, d.title))) as HTMLSelectElement;
    sel.value = store.state.dataset;
    sel.addEventListener("change", () => store.set({ dataset: sel.value }));
    store.subscribe((s, ch) => { if (ch.has("dataset")) sel.value = s.dataset; });
    header.append(h("label", { class: "inline dataset-row", for: "dataset-select" }, "Wind dataset ", sel));
  }
  header.append(dunesOnlyToggle(store));
  // pinned: never scrolls away, stays visible even when the layer list is collapsed
  const pinned = h("div", { class: "pinned" }, thresholdControl(reg.threshold, store));
  body.append(orderList(reg, store));

  for (const g of reg.groups) {
    const layers = reg.layers.filter((l) => l.group === g.id);
    if (!layers.length) continue;
    const det = h("details", { class: "layer-group", open: !g.collapsed }, h("summary", {}, g.title));
    if (g.description) det.append(h("p", { class: "help", html: mathHtml(g.description) }));
    const ul = h("ul", { class: "layer-list" });
    for (const l of layers) ul.append(layerItem(l, store));
    det.append(ul);
    body.append(det);
  }

  const fs = h("fieldset", { class: "basemaps" }, h("legend", {}, "Basemap"));
  for (const b of reg.basemaps) {
    const id = nextId(`bm-${b.id}`);
    const r = h("input", { type: "radio", name: "basemap", id, value: b.id, checked: store.state.basemap === b.id }) as HTMLInputElement;
    r.addEventListener("change", () => { if (r.checked) store.set({ basemap: b.id }); });
    store.subscribe((s, ch) => { if (ch.has("basemap")) r.checked = s.basemap === b.id; });
    if (b.info) {
      const t = infoToggle(b.title, basemapInfoHtml(b), `bm-${b.id}`);
      fs.append(h("div", { class: "radio-row basemap-row", "data-basemap": b.id }, r, h("label", { for: id }, b.title), t.button), t.pop);
    } else fs.append(h("div", { class: "radio-row", "data-basemap": b.id }, r, h("label", { for: id }, b.title)));
  }
  const globe = h("input", { type: "checkbox", id: "opt-globe", checked: store.state.projection === "globe" }) as HTMLInputElement;
  globe.addEventListener("change", () => store.set({ projection: globe.checked ? "globe" : "mercator" }));
  store.subscribe((s, ch) => { if (ch.has("projection")) globe.checked = s.projection === "globe"; });
  fs.append(h("div", { class: "radio-row" }, globe, h("label", { for: "opt-globe" }, "Globe view")));
  body.append(fs);

  const notice = AI_NOTICE.replace(AUTHOR_EMAIL, `<a href="mailto:${AUTHOR_EMAIL}">${AUTHOR_EMAIL}</a>`);
  body.append(h("details", { class: "about" }, h("summary", {}, "About, data sources & citation"),
    h("div", { html: `<p class="ai-notice">${notice}</p>
      <p>Click any land cell to see its 1950–2024 wind rose (ERA5-Land 0.1° or ERA5 0.25°, chosen with the Wind dataset selector), the sand-flux rose at the selected threshold, dune-orientation modes and all wind-regime parameters.</p>
      ${DATA_SOURCES_HTML}
      ${fieldsCitationHtml()}
      ${citationHtml(citationSources(["era5", "aridity", "vegetation"]))}
      <p class="help">Contains modified Copernicus Climate Change Service information. Basemap credits are shown in the map attribution.</p>` })));
  root.append(header, pinned, body);
}
