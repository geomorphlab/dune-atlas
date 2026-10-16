// Layer panel generated from the merged registry. Layout (top to bottom):
//   header (title, collapse toggle, dataset selector if > 1 dataset) | u*,th control (pinned,
//   outside the scroll area) | scrolling body: 'Active layers' = the visible layers in drawing
//   order (drag or move up/down; top = drawn on top; opacity slider; × to hide), groups ->
//   layers (toggle, info, display controls, legend), basemap radio + globe toggle, About & citation.
import { LANG, t as ui, tr, trc, trcf } from "../../i18n";
import { texToText } from "../util/tex";
import { SUBTITLE_EN } from "../../i18n/subtitle";
import { basemapKey, groupKey, layerKey, layerTitleText } from "../../i18n/keys";
const SR = "Screen-reader labels and tooltips";
/** a layer's name in screen-reader labels: the plain English title, or the translated one */
const ariaTitle = (l: LayerDef | undefined, fallback = "") => (!l ? fallback : LANG === "en" ? l.title : texToText(layerTitleText(l)));
import { richHtml } from "../util/richtext";
import type { BasemapDef, LayerAttribution, LayerDef, Registry } from "../registry/types";
import type { Store, AppState } from "../store";
import { h, nextId } from "./dom";
import { legendHtml } from "./legend";
import { thresholdControl } from "./threshold";
import { ABOUT_CREDITS_NOTE_HTML, ABOUT_INTRO_HTML, DATA_SOURCES_ITEMS_HTML, DATASET_INFO_TEXT } from "./helpText";
import { embedBar } from "./embed";
import { escapeHtml } from "../util/format";
import { BODY_NAME } from "../body";
import { sharedKey, visitFlags, visitSet } from "../visit";
import { DATASET_INFO, datasetFacts, datasetInfo, datasetSourceItem, datasetTooltip } from "../cell/datasetinfo";
import { fieldInfo } from "../cell/fieldinfo";
import { isDatasetDependent } from "../registry/merge";
import { mathHtml } from "../util/math";
import { markNoTranslate, noTranslateHtml, protectHtml, protectText } from "../util/notranslate";
import { aboutSourceIds, AI_NOTICE, citationHtml, citationSources, fieldsCitation, fieldsLicence } from "../cell/citation";
import { loadPlaces, placesAvailable, placesNoteHtml, PLACE_TEXT } from "../search/places";
import { conceptLinkHtml } from "./concepts";
import { bulkGuideHtml, wireBulkGuide } from "./bulkguide";
import { PROFILE } from "@body/profile";
import { canLog, COLORMAP_GROUPS, DEFAULT_SPACING_KM, effectiveDisplay, isDirectional, SPACING_KM_STEPS, vectorColors, type RenderMode } from "../layerconfig";

/** screen-reader names of the spacing steps (finest to coarsest); no units, as on screen */
export const SPACING_STEP_NAMES = ["finest", "finer", "fine", "medium", "coarse", "coarser", "coarsest"];
import { COLORMAPS } from "../util/colormaps";

export { AI_NOTICE } from "../cell/citation";
/** named places of the search box: the dune layer's ⓘ carries the naming note while the named search is shown */
const PLACES = loadPlaces();
const AUTHOR_EMAIL = "a.gunn@monash.edu";
/** 'Data sources' list in About (what each product is and where it comes from). The wind-dataset items and every
 *  dataset fact in the general items come from the dataset table (cell/datasetinfo.ts); sand-flux and divergence
 *  items are written directly here. */
export const DATA_SOURCES_HTML = `<h4>Data sources</h4><ul class="sources">
  ${Object.values(DATASET_INFO).map(datasetSourceItem).join("\n  ")}
  ${DATA_SOURCES_ITEMS_HTML}${placesAvailable(PLACES) ? `\n  <li class="places-note"><strong>${PLACE_TEXT.aboutItem}</strong>: ${placesNoteHtml(PLACES)}</li>` : ""}
</ul>`;
/** About: "Earth and Mars: methods and data" (identical in both atlases) */
export const COMPARE_HTML = `<div class="earth-mars"><h4>Earth and Mars: methods and data</h4>
<p>Both atlases compute the same quantities with the methods outlined in Gunn (2026): the time-averaged saturated sand flux over a flat bed fully covered by loose sand (DP), its resultant (RDP, RDD, RDP/DP), crest fluxes, dune-orientation modes and flux divergence. Both report fluxes as volumes of packed sand (packing fraction 0.6, pore space included) per metre width per Earth year of 365.25 days (m²/yr), and both show wind roses as the direction the wind blows from and sand roses as the direction sand moves toward. They differ in four ways.</p>
<ul class="sources">
  <li><strong>Control</strong>: on Earth the slider sets one threshold friction velocity u*,th for the whole record (default 0.15 m/s); on Mars it sets the median grain diameter d (default 200 µm), and the threshold is computed for each time step of the wind record from d and that step's air density and temperature.</li>
  <li><strong>Transport law and wind profile</strong>: Earth uses the transport law of Martin &amp; Kok (2017), with u* from the 10 m wind and a roughness length of 1 mm; Mars uses the transport law of Pähtz &amp; Durán (2023), with u* from the wind at the lowest level of the wind dataset (its height above the surface differs between datasets) and a smooth-wall profile without a roughness length.</li>
  <li><strong>Winds and grid</strong>: Earth uses decades of hourly reanalysis winds (e.g., ERA5-Land, 0.1° grid, 1950–2024); Mars uses one Mars year (668 sols, about 1.9 Earth years) of winds from a climate-model simulation or a reanalysis (e.g., MCMC FV3, 2° grid, about 120 km at the equator), with no year-to-year variation.</li>
  <li><strong>Downloads</strong>: Earth cells provide a wind histogram and the fields against threshold (wind_histogram.csv, fields_by_threshold.csv); Mars cells provide the wind and air series and the fields against grain diameter (wind_series.csv, fields_by_grain_size.csv).</li>
</ul>
<p>On both planets, DP, RDP/DP, RDD and the mode directions depend on the threshold or grain-diameter setting.</p></div>`;
/** About: how to cite the map fields of every wind dataset (one format with the info popovers and the downloads). */
export function fieldsCitationHtml(): string {
  return `<h4 id="cite-fields" tabindex="-1">Citing the map fields</h4><ul class="sources">${Object.values(DATASET_INFO).map((d) => `<li><strong>${protectText(`${d.name} ${d.resolution}`)}</strong>: ${noTranslateHtml(richHtml(fieldsCitation(d.id)))}. Licence: ${noTranslateHtml(escapeHtml(fieldsLicence(d.id)))}.</li>`).join("")}</ul>`;
}
export const INVERT_NOTE = PROFILE.invert.note;

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : "");
/** Rows of the structured attribution (registry `attribution`), in the fixed order Source, Citation,
 *  Data DOI, Licence, Link, Changes. */
function attributionRows(a: LayerAttribution): string {
  const row = (k: string, v: string | undefined, html?: string, keep = false) => (v ? `<dt>${k}</dt><dd${keep ? ' translate="no"' : ""}>${html ?? richHtml(v)}</dd>` : "");
  const url = a.url ? safeUrl(a.url) : "";
  const doi = a.doi?.replace(/^doi:/i, "").replace(/^https?:\/\/doi\.org\//i, "");
  return `${row("Source", a.source)}${row("Citation", a.citation, undefined, true)}${row("Data DOI", doi, doi ? `<a href="https://doi.org/${escapeHtml(doi)}" target="_blank" rel="noopener">doi:${escapeHtml(doi)}</a>` : "", true)}${row("Licence", a.licence)}${row("Link", url, url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url.replace(/^https?:\/\//, "").slice(0, 60))}${url.length > 68 ? "…" : ""}</a>` : "", true)}${row("Changes", a.changes)}`;
}
/** Structured attribution (registry `attribution`): source, citation, licence, link, DOI, changes. */
export function attributionHtml(a: LayerAttribution | undefined): string {
  return a ? `<dl class="attribution">${attributionRows(a)}</dl>` : "";
}

/** Sentences that repeat a fact row of the info popover (units, display convention, slider dependence).
 *  The generators no longer emit them; this is a render-time fallback for
 *  texts not yet regenerated (stale registries, layers generated separately) so each fact is stated once. */
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

/** Info popover body of a layer, one structure for every layer of both builds:
 *  definition, invert note (dune layer), then one list: Units, Wind data, Slider (map fields), Source,
 *  Citation, Data DOI, Licence, Link, Changes (attribution; or the citation alone). */
export function infoHtml(l: LayerDef, datasetId?: string): string {
  const thr = l.type === "zarr-field"
    ? (l.thresholdAware ? PROFILE.control.dependentNoteHtml() : PROFILE.control.independentNoteHtml())
    : "";
  const row = (k: string, html: string) => (html ? `<dt>${k}</dt><dd>${html}</dd>` : "");
  let facts = "";
  if (l.type === "zarr-field") {
    const ds = datasetInfo(datasetId);
    facts = row("Units", infoUnits(l))
      + row("Wind data", isDatasetDependent(l.source) ? escapeHtml(`${ds.name} ${ds.resolution}, ${ds.period}`) : "not used (the same for every wind dataset)")
      + row("Slider", thr.replace(/^<p class="help">|<\/p>$/g, ""));
  }
  // the citation shared by the dataset's map fields is shown once, in About ("Citing the map fields"); the
  // popover links there instead of repeating it (one citation block per panel; other sources stay in full)
  const sources = sharesFieldsCitation(l, datasetId) ? row("Citation", SHARED_CITATION_LINK)
    : l.attribution ? attributionRows(l.attribution) : l.citation ? row("Citation", noTranslateHtml(richHtml(l.citation))) : "";
  const def = l.description ? infoDefinition(l.description) : "";
  const note = l.group === "dunes" && (l.type === "pmtiles-vector" || l.type === "geojson-points") ? placesNoteHtml(PLACES) : "";   // the dune map (map/overlays isDuneMap)
  const naming = note ? `<p class="help places-note">${note}</p>` : "";
  return `${def ? `<p class="info-def">${richHtml(def, mathHtml)}</p>` : ""}${conceptLinkHtml(l.id)}${l.invertSource ? `<p class="help">${escapeHtml(INVERT_NOTE)}</p>` : ""}${naming}${facts || sources ? `<dl class="attribution info-facts">${facts}${sources}</dl>` : ""}`;
}

/** a layer whose attribution is exactly the map-field citation and licence of the dataset (About lists it) */
export function sharesFieldsCitation(l: LayerDef, datasetId?: string): boolean {
  const a = l.attribution;
  if (!a || !datasetId) return false;
  const keys = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  return keys.every((k) => k === "citation" || k === "licence") && a.citation === fieldsCitation(datasetId) && (a.licence ?? "") === fieldsLicence(datasetId);
}
export const SHARED_CITATION_TEXT = "Citing the map fields (in About)";
const SHARED_CITATION_LINK = `<button type="button" class="link-button" data-about="cite-fields">${SHARED_CITATION_TEXT}</button>`;

/** shown under the basemap choices while an imagery basemap is selected */
export const IMAGERY_HINT = "To see the imagery under the colour layers, lower their opacity in Active layers.";

/** Info popover of a basemap, the layer structure: definition, then Source,
 *  Resolution, Licence, Link. The credits also stay in the map attribution. */
export function basemapInfoHtml(b: BasemapDef): string {
  const i = b.info ?? {};
  const row = (k: string, html: string) => (html ? `<dt>${k}</dt><dd>${html}</dd>` : "");
  const url = i.url ? safeUrl(i.url) : "";
  const rows = row("Source", i.source ? richHtml(i.source) : "") + row("Resolution", i.resolution ? protectText(i.resolution) : "")
    + row("Coverage", i.coverage ? richHtml(i.coverage) : "")
    + row("Licence", i.licence ? richHtml(i.licence) : "")
    + row("Link", url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" translate="no">${escapeHtml(url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 60))}${url.length > 68 ? "…" : ""}</a>` : "");
  return `${i.description ? `<p class="info-def">${richHtml(i.description, mathHtml)}</p>` : ""}${rows ? `<dl class="attribution info-facts">${rows}</dl>` : ""}`;
}

/** About: how use is counted (approved wording, October 2026; scripts/body-html.ts webAnalytics) */
export const PRIVACY_NOTE = "To understand how the atlas is used, we count page visits and downloads by country, with Cloudflare Web Analytics and a small counter of our own. No cookies are set and no IP addresses are kept.";

/** 'Dunes only': one UI-wide switch, in the URL / share link; restricts every wind-derived map
 *  layer to the dataset's dune cells (map/dunemask.ts). Non-wind layers and the cell panel are unchanged. */
export const DUNES_ONLY_HELP = "Draw the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in cells with dunes; the other layers and the cell panel are unchanged.";
/** ⓘ of Dunes only: what the switch does and how the dune map is drawn while it is on */
export const DUNES_ONLY_INFO_HTML = `<p class="info-def">Dunes only draws the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in the cells of the selected wind dataset that contain mapped dunes.</p>
<p>The other layers, the cell panel and the downloads are unchanged.</p>
<p>Switching it on sets the dune map's opacity slider to 50 %, so the colours of the dune cells show through it; the slider can be moved as usual.</p>`;
/** opacity the dune map is set to when Dunes only is switched on (the user can change it afterwards) */
export const DUNES_ONLY_OPACITY = 0.5;
/** the dune map: vector polygons (or points) of the dunes group (= map/overlays.ts isDuneMap) */
const isDuneMapDef = (l: LayerDef) => l.group === "dunes" && (l.type === "pmtiles-vector" || l.type === "geojson-points");
export function dunesOnlyToggle(store: Store, reg?: Registry): HTMLElement {
  const cb = h("input", { type: "checkbox", id: "dunes-only", "aria-describedby": "dunes-only-help" }) as HTMLInputElement;
  cb.checked = !!store.state.dunesOnly;
  cb.addEventListener("change", () => {
    if (!cb.checked || !reg) { store.set({ dunesOnly: cb.checked }); return; }
    // switching on: the dune map's opacity slider goes to 50 % (one state change with the switch)
    const layers = { ...store.state.layers };
    for (const l of reg.layers.filter(isDuneMapDef)) layers[l.id] = { ...(layers[l.id] ?? { visible: false, opacity: 1 }), opacity: DUNES_ONLY_OPACITY };
    store.set({ dunesOnly: true, layers });
  });
  store.subscribe((st, ch) => { if (ch.has("dunesOnly")) cb.checked = !!st.dunesOnly; });
  const label = h("label", { class: "inline dunes-only-row", for: "dunes-only", title: DUNES_ONLY_HELP }, cb, ui("panel.dunesOnly"),
    h("span", { id: "dunes-only-help", class: "visually-hidden" }, DUNES_ONLY_HELP));
  // one line with its ⓘ, the popover wrapping below (as the Wind dataset line)
  const t = infoToggle("Dunes only", DUNES_ONLY_INFO_HTML, "dunes-only");
  return h("div", { class: "dunes-only-line" }, label, t.button, t.pop);
}

/** 'Names' (Dune Fields group): the dune-field name labels (map/placelabels.ts), a row laid out as the layer
 *  rows (tick box, name, ⓘ with what it does and the naming note); not a map layer (no opacity, not in
 *  Active layers); remembered per body, in the link */
export function namesToggle(store: Store): HTMLElement {
  const cb = h("input", { type: "checkbox", id: "show-names", "aria-label": trcf("Show {title}", { title: trc(PLACE_TEXT.aboutItem) }, SR), "data-i18n-attrs": "no", "aria-describedby": "show-names-help" }) as HTMLInputElement;
  cb.checked = !!store.state.names;
  cb.addEventListener("change", () => store.set({ names: cb.checked }));
  store.subscribe((st, ch) => { if (ch.has("names")) cb.checked = !!st.names; });
  const label = h("label", { for: "show-names", title: PLACE_TEXT.toggleHelp }, ui("panel.names"),
    h("span", { id: "show-names-help", class: "visually-hidden" }, PLACE_TEXT.toggleHelp));
  // the ⓘ: what the labels do, then the naming note (the same text as the mask's ⓘ, About and the search results)
  const t = infoToggle(PLACE_TEXT.aboutItem, `<p class="info-def">${escapeHtml(PLACE_TEXT.toggleHelp)}</p><p class="help places-note">${placesNoteHtml(PLACES)}</p>`, "names");
  return h("li", { class: "layer-item names-item" }, h("div", { class: "layer-row" }, cb, label, t.button), t.pop);
}

/** ⓘ button + popover pair (layers and basemaps) */
function infoToggle(title: string, html: string, idBase: string): { button: HTMLButtonElement; pop: HTMLElement } {
  const infoId = nextId(`info-${idBase}`);
  // translate="no": the letter "i" is the info symbol (a translator turned it into the pronoun: "je", "我")
  const button = h("button", { type: "button", class: "info-button notranslate", translate: "no", "aria-expanded": "false", "aria-controls": infoId, "aria-label": trcf("About {title}", { title: trc(title) }, SR), "data-i18n-attrs": "no" }, "i") as HTMLButtonElement;
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
  // an explicit accessible name: a label of KaTeX alone was read as "on"
  const cb = h("input", { type: "checkbox", id: cid, checked: st0.visible, "aria-label": trcf("Show {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
  const infoId = nextId(`info-${l.id}`);
  const info = h("button", { type: "button", class: "info-button notranslate", translate: "no", "aria-expanded": "false", "aria-controls": infoId, "aria-label": trcf("About {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }, "i");
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
    const disp = h("details", { class: "display-opts" }, h("summary", {}, ui("panel.display")));
    // render mode (directional fields)
    if (isDirectional(l)) {
      const mode = h("select", { "aria-label": trcf("Display {title} as", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" },
        h("option", { value: "colormap" }, "colour map"), h("option", { value: "arrows" }, "arrows"), h("option", { value: "streamlines" }, "streamlines")) as HTMLSelectElement;
      mode.addEventListener("change", () => store.setLayerConfig(l.id, { mode: mode.value === "colormap" ? undefined : (mode.value as RenderMode) }));
      const vc = h("input", { type: "color", "aria-label": trcf("Arrow / streamline colour for {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
      vc.addEventListener("change", () => store.setLayerConfig(l.id, { vecColor: vc.value }));
      const vcRow = h("label", { class: "inline" }, "Line colour ", vc);
      // spacing: the km step is the only state (store / URL); the screen px conversion is internal
      // to the map adapter and never written back here. No numeric readout (the on-screen spacing
      // depends on the zoom): endpoint labels Finer (left, denser lines) / Coarser (right).
      const ds = h("input", { type: "range", min: 0, max: SPACING_KM_STEPS.length - 1, step: 1, "aria-label": trcf("Line spacing for {title}, finer to coarser", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
      const valueText = () => `${SPACING_STEP_NAMES[Number(ds.value)] ?? ""}`;
      const kmAt = () => SPACING_KM_STEPS[Number(ds.value)];
      ds.addEventListener("input", () => ds.setAttribute("aria-valuetext", valueText()));
      ds.addEventListener("change", () => store.setLayerConfig(l.id, { spacingKm: kmAt() === DEFAULT_SPACING_KM ? undefined : kmAt() }));
      const dsRow = h("label", { class: "inline spacing", title: "Spacing between arrows / streamlines: left finer (denser lines), right coarser" }, "Spacing ",
        h("span", { class: "spacing-end", "aria-hidden": "true" }, ui("panel.finer")), ds, h("span", { class: "spacing-end", "aria-hidden": "true" }, ui("panel.coarser")));
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
    const sel = h("select", { "aria-label": trcf("Colour map for {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLSelectElement;
    for (const g of COLORMAP_GROUPS) {
      const og = h("optgroup", { label: g.label });
      for (const n of g.names) if (COLORMAPS[n]) og.append(h("option", { value: n, translate: "no" }, n));   // colour map names
      sel.append(og);
    }
    sel.addEventListener("change", () => store.setLayerConfig(l.id, { colormap: sel.value === l.display?.colormap ? undefined : sel.value }));
    const rev = h("input", { type: "checkbox", "aria-label": trcf("Reverse colour map for {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
    rev.addEventListener("change", () => store.setLayerConfig(l.id, { reverse: rev.checked || undefined }));
    const lo = h("input", { type: "number", step: "any", class: "clim", "aria-label": trcf("Colour scale minimum for {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
    const hi = h("input", { type: "number", step: "any", class: "clim", "aria-label": trcf("Colour scale maximum for {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
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
      const lg = h("input", { type: "checkbox", "aria-label": trcf("Logarithmic colour scale for {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
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
    const fc = h("input", { type: "color", "aria-label": trcf("Fill colour for {title}", { title: ariaTitle(l) }, SR), "data-i18n-attrs": "no" }) as HTMLInputElement;
    fc.addEventListener("input", () => store.setLayerConfig(l.id, { fill: fc.value }));
    const box = h("div", { class: "vec-box" }, h("label", { class: "inline" }, "Fill ", fc));
    if (l.invertSource) {
      const inv = h("input", { type: "checkbox", "aria-label": PROFILE.invert.toggleAria }) as HTMLInputElement;
      inv.addEventListener("change", () => store.setLayerConfig(l.id, { invert: inv.checked || undefined }));
      box.append(h("label", { class: "inline", title: INVERT_NOTE }, inv, PROFILE.invert.toggleLabel));
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
    legend.innerHTML = protectHtml(legendHtml(l, ls.cfg));
    for (const r of refreshers) r(s);
  };
  const item = h("li", { class: "layer-item", "data-layer": l.id },
    h("div", { class: "layer-row" }, cb, h("label", { for: cid, html: l.shortTitle ? escapeHtml(tr(layerKey(l.id, "short"), l.shortTitle)) : mathHtml(layerTitleText(l)) }), info),
    controls, legend, pop);
  refresh(store.state);
  store.subscribe((s, ch) => {
    // a dataset switch changes the layer's definition in place (colour limits, citation)
    if (ch.has("dataset")) pop.innerHTML = protectHtml(infoHtml(l, store.state.dataset));
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
    const up = h("button", { type: "button", class: "move", "aria-label": trcf("Move {title} up", { title: ariaTitle(reg.layers.find((x) => x.id === id), title(id)) }, SR), "data-i18n-attrs": "no" }, "▲");
    const down = h("button", { type: "button", class: "move", "aria-label": trcf("Move {title} down", { title: ariaTitle(reg.layers.find((x) => x.id === id), title(id)) }, SR), "data-i18n-attrs": "no" }, "▼");
    up.addEventListener("click", () => { const v = ids(), k = v.indexOf(id); if (k > 0) { store.moveLayer(id, store.state.order.indexOf(v[k - 1])); focusMove(id, "up"); } });
    down.addEventListener("click", () => { const v = ids(), k = v.indexOf(id); if (k >= 0 && k < v.length - 1) { store.moveLayer(id, store.state.order.indexOf(v[k + 1])); focusMove(id, "down"); } });
    // × hides the layer (same state as unticking it in the layer list)
    const rm = h("button", { type: "button", class: "remove", "aria-label": trcf("Remove {title} from the map", { title: ariaTitle(reg.layers.find((x) => x.id === id), title(id)) }, SR), "data-i18n-attrs": "no", title: "Remove (untick layer)" }, "×");
    rm.addEventListener("click", () => {
      store.setLayer(id, { visible: false });
      (ol.querySelector(".order-item .remove") as HTMLButtonElement | null)?.focus();
    });
    const op = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: store.state.layers[id]?.opacity ?? 1, class: "opacity", "aria-label": trcf("Opacity of {title}", { title: ariaTitle(reg.layers.find((x) => x.id === id), title(id)) }, SR), "data-i18n-attrs": "no", title: "Opacity", draggable: "false" }) as HTMLInputElement;
    op.addEventListener("input", () => store.setLayer(id, { opacity: Number(op.value) }));
    // a slider drag must not start a row drag
    op.addEventListener("pointerdown", () => { li.draggable = false; });
    op.addEventListener("pointerup", () => { li.draggable = true; });
    const li = h("li", { class: "order-item", draggable: "true", "data-layer": id },
      h("span", { class: "drag-handle", "aria-hidden": "true", title: "Drag to reorder" }, "⠿"),
      h("span", { class: "order-num" }, ""),
      h("span", { class: "order-title", html: l ? mathHtml(layerTitleText(l)) : escapeHtml(title(id)) }), op, up, down, rm);
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
  const wrap = h("details", { class: "order", open: panelGroupOpen("active", true) }, h("summary", {}, ui("panel.active")), ol);
  rememberPanelGroup(wrap, "active");
  render(store.state);
  store.subscribe((s, ch) => { if (ch.has("order") || ch.has("layers")) render(s); });
  return wrap;
}

/** open / collapse the layer list (the Layers button does the same) */
/** Open / closed layer-panel groups (the registry groups and "active", the drawing-order list): the registry's
 *  default (`collapsed`), or the visitor's choice earlier in this visit, for both atlases (core/visit.ts), as the
 *  cell panel's sections and table groups. */
export const LAYER_GROUPS_KEY = sharedKey("layerPanel.groups");
export const panelGroupOpen = (id: string, def: boolean) => visitFlags(LAYER_GROUPS_KEY)[id] ?? def;
function rememberPanelGroup(det: HTMLDetailsElement, id: string) {
  det.addEventListener("toggle", () => visitSet(LAYER_GROUPS_KEY, JSON.stringify({ ...visitFlags(LAYER_GROUPS_KEY), [id]: det.open })));
}
export function setLayerPanelOpen(root: HTMLElement, open: boolean) {
  root.querySelector(".panel-toggle")?.setAttribute("aria-expanded", String(open));
  root.classList.toggle("collapsed", !open);
}
export const layerPanelOpen = (root: HTMLElement) => !root.classList.contains("collapsed");

/** Wind dataset option text: reanalysis / model name and grid ("ERA5-Land 0.1°", "MCMC FV3 2°") */
export function datasetOptionLabel(id: string, fallback: string): string {
  const d = DATASET_INFO[id];
  return d ? d.optionLabel ?? `${d.name} ${d.resolution}` : fallback;
}

/** the header subtitle, identical in both atlases (the Gunn (2026) citation is in About) */
export const SUBTITLE_HTML = SUBTITLE_EN;

export function renderLayerPanel(root: HTMLElement, reg: Registry, store: Store, opts: { fullScreenUrl?: () => string; initialOpen?: boolean; search?: HTMLElement } = {}) {
  root.replaceChildren();
  const toggle = h("button", { type: "button", class: "panel-toggle", "aria-expanded": "true", "aria-controls": "layer-panel-body", title: ui("header.layersTitle") }, ui("header.layers"));
  const body = h("div", { id: "layer-panel-body", class: "panel-body" });
  toggle.addEventListener("click", () => setLayerPanelOpen(root, toggle.getAttribute("aria-expanded") !== "true"));
  if (opts.initialOpen === false || (opts.initialOpen === undefined && (store.state.embed || globalThis.matchMedia?.("(max-width: 720px)").matches))) {
    toggle.setAttribute("aria-expanded", "false");
    root.classList.add("collapsed");
  }
  const header = h("header", { class: "atlas-header" },
    h("div", { class: "title-row" }, markNoTranslate(h("h1", {}, "Dune Atlas", " ", h("span", { class: "body-name" }, BODY_NAME))), toggle),
    h("p", { class: "subtitle", html: ui("header.subtitle") }));
  if (opts.search) header.append(opts.search);   // search box (ui/search.ts): stays visible with the list collapsed
  if (opts.fullScreenUrl) { // embed: a pill on the map above the panel, not in the header
    root.parentElement?.querySelector(":scope > .embed-bar")?.remove();
    root.before(embedBar(opts.fullScreenUrl, store));
  }
  const datasets = reg.datasets ?? [];
  if (datasets.length >= 1) { // shown with a single dataset too (Mars: MCMC FV3)
    // short option text (name and grid) that fits the narrow embed panel; the tooltip has the details
    const sel = h("select", { id: "dataset-select", "aria-label": "Wind dataset" }, ...datasets.map((d) => h("option", { value: d.id, title: datasetTooltip(d.id) || d.title, translate: "no" }, datasetOptionLabel(d.id, d.title)))) as HTMLSelectElement;
    sel.value = store.state.dataset;
    const tip = () => { sel.title = datasetTooltip(sel.value) || ""; };
    tip();
    sel.addEventListener("change", () => store.set({ dataset: sel.value }));
    store.subscribe((s, ch) => { if (ch.has("dataset")) { sel.value = s.dataset; tip(); } });
    // one line in both builds; with an ⓘ (what the datasets are and how they differ) where
    // DATASET_INFO_TEXT is set (Earth), its popover wrapping below the line
    const line = h("div", { class: "dataset-line" }, h("label", { class: "inline dataset-row", for: "dataset-select" }, "Wind dataset ", sel));
    if (DATASET_INFO_TEXT) {
      const t = infoToggle("Wind dataset", `<p>${mathHtml(DATASET_INFO_TEXT)}</p>${conceptLinkHtml("@dataset")}`, "dataset");
      line.append(t.button, t.pop);
    }
    header.append(line);
  }
  header.append(dunesOnlyToggle(store, reg));
  // pinned: never scrolls away, stays visible even when the layer list is collapsed
  const pinned = h("div", { class: "pinned" }, thresholdControl(reg.threshold, store));
  body.append(orderList(reg, store));

  for (const g of reg.groups) {
    const layers = reg.layers.filter((l) => l.group === g.id);
    if (!layers.length) continue;
    const det = h("details", { class: "layer-group", open: panelGroupOpen(g.id, !g.collapsed) }, h("summary", {}, tr(groupKey(g.id), g.title)));
    rememberPanelGroup(det, g.id);
    if (g.description) det.append(h("p", { class: "help", html: mathHtml(tr(groupKey(g.id, "desc"), g.description)) }));
    const ul = h("ul", { class: "layer-list" });
    for (const l of layers) ul.append(layerItem(l, store));
    // the name labels: a row of the Dune Fields group, where the body's place list is enabled
    if (g.id === "dunes" && placesAvailable(PLACES)) ul.append(namesToggle(store));
    det.append(ul);
    body.append(det);
  }

  const fs = h("fieldset", { class: "basemaps" }, h("legend", {}, ui("basemap.legend")));
  for (const b of reg.basemaps) {
    const id = nextId(`bm-${b.id}`);
    const r = h("input", { type: "radio", name: "basemap", id, value: b.id, checked: store.state.basemap === b.id }) as HTMLInputElement;
    r.addEventListener("change", () => { if (r.checked) store.set({ basemap: b.id }); });
    store.subscribe((s, ch) => { if (ch.has("basemap")) r.checked = s.basemap === b.id; });
    if (b.info) {
      const t = infoToggle(b.title, basemapInfoHtml(b), `bm-${b.id}`);
      fs.append(h("div", { class: "radio-row basemap-row", "data-basemap": b.id }, r, h("label", { for: id }, tr(basemapKey(b.id), b.title.trim())), t.button), t.pop);
    } else fs.append(h("div", { class: "radio-row", "data-basemap": b.id }, r, h("label", { for: id }, tr(basemapKey(b.id), b.title.trim()))));
  }
  const globe = h("input", { type: "checkbox", id: "opt-globe", checked: store.state.projection === "globe" }) as HTMLInputElement;
  globe.addEventListener("change", () => store.set({ projection: globe.checked ? "globe" : "mercator" }));
  store.subscribe((s, ch) => { if (ch.has("projection")) globe.checked = s.projection === "globe"; });
  fs.append(h("div", { class: "radio-row" }, globe, h("label", { for: "opt-globe" }, "Globe view")));
  // imagery basemaps lie under opaque colour layers: say how to see them (opacity is not changed)
  const hint = h("p", { class: "help basemap-hint", role: "status" }, IMAGERY_HINT);
  const showHint = () => { hint.hidden = !reg.basemaps.find((b) => b.id === store.state.basemap)?.imagery; };
  showHint();
  store.subscribe((_s, ch) => { if (ch.has("basemap")) showHint(); });
  fs.append(hint);
  body.append(fs);

  // "Get the whole grid" for the selected wind dataset (ui/bulkguide.ts), re-rendered on a dataset switch
  const bulk = h("div", { class: "bulk-wrap", html: bulkGuideHtml(store.state.dataset, "about-bulk") });
  store.subscribe((s, ch) => { if (ch.has("dataset")) bulk.innerHTML = protectHtml(bulkGuideHtml(s.dataset, "about-bulk")); });
  wireBulkGuide(bulk);
  const notice = AI_NOTICE.replace(AUTHOR_EMAIL, `<a href="mailto:${AUTHOR_EMAIL}">${AUTHOR_EMAIL}</a>`);
  body.append(h("details", { class: "about" }, h("summary", {}, tr("help.aboutLink", "About, data sources & citation")),
    h("div", { html: `<p class="ai-notice">${notice}</p>
      ${ABOUT_INTRO_HTML}
      ${DATA_SOURCES_HTML}
      ${COMPARE_HTML}
      ${fieldsCitationHtml()}
      ${citationHtml(citationSources(aboutSourceIds()))}
      ${ABOUT_CREDITS_NOTE_HTML}
      <p class="help privacy-note">${PRIVACY_NOTE}</p>` }), bulk));
  root.append(header, pinned, body);
  // links to a section of About (data-about = element id), e.g. the shared map-field citation of the ⓘ popovers
  root.addEventListener("click", (e) => {
    const b = (e.target as Element | null)?.closest?.("[data-about]") as HTMLElement | null;
    if (!b) return;
    e.preventDefault();
    const about = root.querySelector("details.about") as HTMLDetailsElement | null;
    const target = root.querySelector(`#${CSS.escape(b.dataset.about!)}`) as HTMLElement | null;
    if (!about || !target) return;
    about.open = true;
    target.scrollIntoView?.({ block: "start" });
    target.focus?.();
  });
}
