// Map tools (top right, under the zoom buttons; never under the side panels): Help and tour,
// Share / copy link, Export map image. Each opens a small popover (one at a time; Esc, × or a
// click outside closes it and returns focus to its button). Below them the planet toggle, a plain
// button that opens the other atlas (Earth <-> Mars; body.ts) at its default view.
import { LANG, t, tr } from "../../i18n";
import { helpKey } from "../../i18n/keys";
import { h, nextId } from "./dom";
import { BODY, bodyName, isEmbedded, otherBody, otherBodyUrl } from "../body";
import { DOWNLOAD_EVENT } from "../cell/downloads";
import { mathHtml } from "../util/math";
import { newRegionState, regionForm, REGION_TEXT, type RegionOptions } from "./regionExport";
import { CONCEPT_EVENT, CONCEPTS, conceptBodyHtml, conceptTitleHtml } from "./concepts";
import { frybergerFigure } from "./frybergerfig";
import { C } from "../util/constants";
const C_DEFAULT_UT = () => C.UT_DEFAULT_INDEX;
import { CONCEPTS_TEXT, EXPORT_TEXT, HELP_ABOUT_LINK, HELP_BUTTON_LABEL, HELP_RESTART, HELP_SECTIONS, HELP_TITLE, SHARE_TEXT } from "./helpText";
import { TOOL_ICONS } from "./icons";
import { withIcons } from "./texticons";

export interface ToolsOptions {
  startTour: () => void;
  shareLink: () => string;
  exportMap: (o: { basemap: boolean; transparent?: boolean; onProgress?: (stage: string) => void }) => Promise<{ name: string; width: number; height: number } | void>;
  openAbout: () => void;
  /** "Download a region" (ui/regionExport.ts); the button is shown when given */
  region?: RegionOptions;
  /** open a URL (default: location.assign); tests replace it */
  navigate?: (url: string) => void;
  /** current index of the threshold slider (the Concepts figure of DP starts there) */
  utIndex?: () => number;
}

const ICONS = TOOL_ICONS;

export class Tools {
  readonly el: HTMLElement;
  #pop: HTMLElement | null = null;
  #owner: HTMLButtonElement | null = null;
  #opts: ToolsOptions;
  #closeHook: (() => void) | null = null;
  #region = newRegionState();
  #outside = (e: Event) => { if (this.#pop && !this.#pop.contains(e.target as Node) && !this.#owner?.contains(e.target as Node)) this.close(); };

  constructor(opts: ToolsOptions) {
    this.#opts = opts;
    const btn = (cls: string, label: string, icon: string, fn: (b: HTMLButtonElement) => void) => {
      const b = h("button", { type: "button", class: `tool-btn ${cls}`, "aria-label": label, title: label, "aria-haspopup": "dialog", "aria-expanded": "false", html: icon }) as HTMLButtonElement;
      b.addEventListener("click", () => (this.#owner === b ? this.close() : fn(b)));
      return b;
    };
    this.el = h("div", { class: "maplibregl-ctrl maplibregl-ctrl-group atlas-tools" },
      btn("help-btn", t("tools.help"), ICONS.help, (b) => this.openHelp(b)),
      btn("concepts-btn", t("tools.concepts"), ICONS.concepts, (b) => this.openConcepts(undefined, b)),
      btn("share-btn", t("tools.share"), ICONS.share, (b) => this.openShare(b)),
      btn("export-btn", t("tools.export"), ICONS.camera, (b) => this.openExport(b)),
      ...(opts.region ? [btn("region-btn", REGION_TEXT.button, ICONS.region, (b) => void this.openRegion(b))] : []),
      this.#planetButton());
    // "Concept" links in the ⓘ popovers (data-concept) and other callers open the panel at an entry
    globalThis.document?.addEventListener("click", (e) => {
      const b = (e.target as Element | null)?.closest?.("[data-concept]") as HTMLElement | null;
      if (b && !b.closest(".tool-pop-concepts")) { e.preventDefault(); this.openConcepts(b.dataset.concept); }
    });
    globalThis.document?.addEventListener(CONCEPT_EVENT, (e) => this.openConcepts((e as CustomEvent<{ id?: string }>).detail?.id));
    // every download confirms itself on the page
    globalThis.document?.addEventListener(DOWNLOAD_EVENT, (e) => { const n = (e as CustomEvent<{ name: string }>).detail?.name; if (n) toast(`${EXPORT_TEXT.downloaded} ${n}`, 4000); });
  }

  /** the planet toggle: "Switch to Mars" on Earth, "Switch to Earth" on Mars; carries ?embed=1 and the language */
  #planetButton(): HTMLButtonElement {
    const label = `Switch to ${bodyName(otherBody(BODY))}`;
    const b = h("button", { type: "button", class: "tool-btn planet-btn", "aria-label": label, title: label, html: ICONS.planet }) as HTMLButtonElement;
    b.addEventListener("click", () => {
      this.close();
      const url = otherBodyUrl({ embed: isEmbedded(), resume: true, lang: LANG === "en" ? undefined : LANG }); // the other atlas reopens its last view
      (this.#opts.navigate ?? ((u: string) => globalThis.location.assign(u)))(url);
    });
    return b;
  }

  get open(): string | null { return this.#pop?.dataset.kind ?? null; }

  close() {
    const hook = this.#closeHook;
    this.#closeHook = null;
    hook?.();
    if (!this.#pop) return;
    this.#pop.remove();
    this.#pop = null;
    document.removeEventListener("pointerdown", this.#outside, true);
    const b = this.#owner;
    this.#owner = null;
    b?.setAttribute("aria-expanded", "false");
    b?.focus();
  }

  #openPop(kind: string, owner: HTMLButtonElement, title: string, ...body: (Node | string)[]): HTMLElement {
    return this.#openPopWith({}, kind, owner, title, ...body);
  }
  #openPopWith(o: { fit?: boolean }, kind: string, owner: HTMLButtonElement, title: string, ...body: (Node | string)[]): HTMLElement {
    this.close();
    const tid = nextId("tool-title");
    const close = h("button", { type: "button", class: "close", "aria-label": "Close" }, "×");
    close.addEventListener("click", () => this.close());
    const pop = h("div", { class: `tool-pop tool-pop-${kind}`, role: "dialog", "aria-labelledby": tid, "data-kind": kind },
      h("header", {}, h("h2", { id: tid }, title), close), ...body);
    pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(); } });
    document.body.append(pop);
    placeToolPop(pop, owner, document, o);
    this.#pop = pop;
    this.#owner = owner;
    owner.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", this.#outside, true);
    (pop.querySelector("input, button:not(.close), a[href]") as HTMLElement | null ?? close).focus();
    return pop;
  }

  openHelp(owner = this.el.querySelector(".help-btn") as HTMLButtonElement) {
    const restart = h("button", { type: "button", class: "restart-tour" }, tr("help.restart", HELP_RESTART));
    restart.addEventListener("click", () => { this.close(); this.#opts.startTour(); });
    const about = h("button", { type: "button", class: "link-button about-link" }, tr("help.aboutLink", HELP_ABOUT_LINK));
    about.addEventListener("click", () => { this.close(); this.#opts.openAbout(); });
    const secs = HELP_SECTIONS.map((s) => h("section", { "data-help": s.id }, h("h3", { html: mathHtml(tr(helpKey(s.id, "title"), s.title)) }), h("p", { html: withIcons(mathHtml(tr(helpKey(s.id, "body"), s.body))) })));
    this.#openPop("help", owner, tr("help.title", HELP_TITLE), restart, h("div", { class: "help-sections" }, ...secs), h("p", {}, about));
  }

  /** Concepts panel: the atlas's concept entries (concepts.ts), each with its references; `id` opens and
   *  scrolls to one entry (the "Concept" links of the ⓘ popovers). Kept off an open cell panel. */
  openConcepts(id?: string, owner = this.el.querySelector(".concepts-btn") as HTMLButtonElement) {
    const items = CONCEPTS.map((c) => {
      const d = h("details", { class: "concept", id: `concept-${c.id}`, "data-concept-id": c.id, open: c.id === id },
        h("summary", { html: conceptTitleHtml(c) }), h("div", { class: "concept-body", html: conceptBodyHtml(c) })) as HTMLDetailsElement;
      // Earth: the DP entry shows how the atlas DP relates to Fryberger's DP (ui/frybergerfig.ts)
      if (BODY === "earth" && c.id === "drift-potential-dp") {
        const body = d.querySelector(".concept-body") as HTMLElement;
        body.insertBefore(frybergerFigure(() => this.#opts.utIndex?.() ?? C_DEFAULT_UT()), body.querySelector(".concept-refs"));
      }
      return d;
    });
    const pop = this.#openPopWith({ fit: true }, "concepts", owner, t("tools.concepts"), h("div", { class: "concept-list" }, ...items));
    const target = id ? items.find((d) => d.dataset.conceptId === id) : undefined;
    if (target) target.scrollIntoView?.({ block: "start" });
    ((target ?? items[0])?.querySelector("summary") as HTMLElement | null)?.focus();
    return pop;
  }

  /** "Download a region": bounds typed or drawn on the map (the popover closes while drawing and reopens with
   *  the box), parameters, range, size estimate and download. The box is shown while the popover is open. */
  async openRegion(owner = this.el.querySelector(".region-btn") as HTMLButtonElement) {
    const o = this.#opts.region;
    if (!o) return;
    const wait = h("p", { class: "help", role: "status" }, REGION_TEXT.loading);
    const pop = this.#openPopWith({ fit: true }, "region", owner, REGION_TEXT.title, wait);
    let drawing = false;
    this.#closeHook = () => { if (!drawing) o.show(null); };
    try {
      const ctx = await o.context();
      if (this.#pop !== pop) return;
      wait.replaceWith(regionForm(o, this.#region, ctx, async () => {
        drawing = true;
        this.close();
        toast(REGION_TEXT.drawHint, 4000);
        const b = await o.draw();
        drawing = false;
        if (b) this.#region.box = b;
        void this.openRegion(owner);
      }));
      (pop.querySelector("input") as HTMLElement | null)?.focus();
    } catch (e) {
      console.warn("[dune-atlas] region export: grid not available", e);
      wait.textContent = REGION_TEXT.loadFailed;
    }
  }

  openShare(owner = this.el.querySelector(".share-btn") as HTMLButtonElement) {
    const link = this.#opts.shareLink();
    const input = h("input", { type: "text", readonly: true, value: link, "aria-label": "Link to this view", class: "share-link" }) as HTMLInputElement;
    const copy = h("button", { type: "button", class: "copy-link" }, SHARE_TEXT.copy);
    copy.addEventListener("click", () => void this.copy(link));
    this.#openPop("share", owner, SHARE_TEXT.title, h("div", { class: "share-row" }, input, copy), h("p", { class: "help" }, SHARE_TEXT.note));
    input.select();
    void this.copy(link);
  }

  /** copy to the clipboard and show a short confirmation */
  async copy(text: string) {
    try { await navigator.clipboard?.writeText(text); toast(SHARE_TEXT.copied); } catch { /* the link stays selectable in the popover */ }
  }

  openExport(owner = this.el.querySelector(".export-btn") as HTMLButtonElement) {
    const bmId = nextId("exp-bm"), trId = nextId("exp-tr");
    const bm = h("input", { type: "checkbox", id: bmId, checked: true }) as HTMLInputElement;
    const tr = h("input", { type: "checkbox", id: trId }) as HTMLInputElement;
    const run = h("button", { type: "button", class: "run-export" }, EXPORT_TEXT.run) as HTMLButtonElement;
    // progress: an indeterminate bar, the current stage and the elapsed time; then a completion line
    const bar = h("progress", { class: "export-progress", "aria-label": EXPORT_TEXT.working, hidden: true }) as HTMLProgressElement;
    const status = h("p", { class: "help export-status", role: "status", "aria-live": "polite" });
    run.addEventListener("click", async () => {
      run.disabled = true; bar.hidden = false;
      const t0 = Date.now();
      let stage: string = EXPORT_TEXT.working;
      const show = () => { status.textContent = `${stage} ${Math.round((Date.now() - t0) / 1000)} s`; };
      show();
      const tick = setInterval(show, 1000);
      try {
        const r = await this.#opts.exportMap({ basemap: bm.checked, transparent: tr.checked, onProgress: (s) => { stage = s; show(); } });
        status.textContent = r ? `${EXPORT_TEXT.done} ${r.name} (${r.width} × ${r.height} px).` : EXPORT_TEXT.done.replace(/:$/, ".");
      } catch (e) { status.textContent = `Export failed: ${(e as Error)?.message ?? e}`; }
      finally { clearInterval(tick); bar.hidden = true; run.disabled = false; }
    });
    this.#openPop("export", owner, EXPORT_TEXT.title,
      h("label", { for: bmId, class: "inline" }, bm, ` ${EXPORT_TEXT.basemap}`),
      h("label", { for: trId, class: "inline" }, tr, ` ${EXPORT_TEXT.transparent}`),
      h("p", { class: "help" }, EXPORT_TEXT.note), run, bar, status);
  }
}

export function toast(text: string, ms = 2000) {
  const t = h("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

/** Anchor a tool popover to the left of the tools column, top aligned with its button, and keep it off an open
 *  cell panel: on the desktop it moves left of the panel when there is room (else it stays and
 *  may overlap); with the bottom sheet (narrow screens) its height stops above the sheet. */
export function placeToolPop(pop: HTMLElement, owner: HTMLElement, doc: Document = document, o: { fit?: boolean } = {}) {
  const r = owner.getBoundingClientRect(), vw = globalThis.innerWidth || 1024, vh = globalThis.innerHeight || 768;
  const top = Math.max(8, Math.min(r.top, vh - 120));
  let right = Math.max(8, vw - r.left + 8);
  let maxH = vh - top - 12;
  const cell = doc.getElementById("cell-panel");
  const cr = cell && !cell.hidden ? cell.getBoundingClientRect() : null;
  if (cr && cr.width > 0 && cr.height > 0) {
    const w = pop.getBoundingClientRect().width || Math.min(340, vw - 70);
    const sheet = cr.top > vh * 0.25 && cr.width >= vw * 0.9;   // narrow layout: the panel is a bottom sheet
    if (sheet) maxH = Math.max(160, Math.min(maxH, cr.top - top - 8));
    else if (vw - right > cr.left - 8 && cr.left - 8 - w >= 8) right = vw - cr.left + 8;   // left of the cell panel
    else if (o.fit && vw - right > cr.left - 8 && cr.left - 16 >= 220) {   // narrower, left of the cell panel
      right = vw - cr.left + 8;
      pop.style.width = `${cr.left - 16}px`;
    }
  }
  pop.style.top = `${top}px`;
  pop.style.right = `${right}px`;
  pop.style.maxHeight = `${maxH}px`;
}
