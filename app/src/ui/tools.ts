// Map tools (top right, under the zoom buttons; never under the side panels): Help and tour,
// Share / copy link, Export map image. Each opens a small popover (one at a time; Esc, × or a
// click outside closes it and returns focus to its button). Below them the planet toggle, a plain
// button that opens the other atlas (Earth <-> Mars; body.ts) at its default view.
import { h, nextId } from "./dom";
import { BODY, bodyName, isEmbedded, otherBody, otherBodyUrl } from "../body";
import { mathHtml } from "../util/math";
import { EXPORT_TEXT, HELP_ABOUT_LINK, HELP_BUTTON_LABEL, HELP_RESTART, HELP_SECTIONS, HELP_TITLE, SHARE_TEXT } from "./helpText";

export interface ToolsOptions {
  startTour: () => void;
  shareLink: () => string;
  exportMap: (o: { basemap: boolean }) => Promise<void>;
  openAbout: () => void;
  /** open a URL (default: location.assign); tests replace it */
  navigate?: (url: string) => void;
}

const ICONS = {
  help: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.6 7.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2.9-1.2 1.8v.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="14.6" r="1" fill="currentColor"/></svg>',
  share: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M8.5 11.5l3-3M7 9.5L5.2 11.3a2.6 2.6 0 0 0 3.7 3.7L10.7 13M13 10.5l1.8-1.8a2.6 2.6 0 0 0-3.7-3.7L9.3 6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  // ringed planet (line icon): the ring's front arc crosses the planet, its back arc stops at the disc
  planet: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="4.7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M17.79 6.85A8.4 2.7 -22 0 1 2.21 13.15M2.21 13.15A8.4 2.7 -22 0 1 5.35 9.33M12.88 6.29A8.4 2.7 -22 0 1 17.79 6.85" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  camera: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 7h3l1.4-2h5.2L14 7h3v8.5H3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="11" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};

export class Tools {
  readonly el: HTMLElement;
  #pop: HTMLElement | null = null;
  #owner: HTMLButtonElement | null = null;
  #opts: ToolsOptions;
  #outside = (e: Event) => { if (this.#pop && !this.#pop.contains(e.target as Node) && !this.#owner?.contains(e.target as Node)) this.close(); };

  constructor(opts: ToolsOptions) {
    this.#opts = opts;
    const btn = (cls: string, label: string, icon: string, fn: (b: HTMLButtonElement) => void) => {
      const b = h("button", { type: "button", class: `tool-btn ${cls}`, "aria-label": label, title: label, "aria-haspopup": "dialog", "aria-expanded": "false", html: icon }) as HTMLButtonElement;
      b.addEventListener("click", () => (this.#owner === b ? this.close() : fn(b)));
      return b;
    };
    this.el = h("div", { class: "maplibregl-ctrl maplibregl-ctrl-group atlas-tools" },
      btn("help-btn", HELP_BUTTON_LABEL, ICONS.help, (b) => this.openHelp(b)),
      btn("share-btn", SHARE_TEXT.button, ICONS.share, (b) => this.openShare(b)),
      btn("export-btn", EXPORT_TEXT.button, ICONS.camera, (b) => this.openExport(b)),
      this.#planetButton());
  }

  /** the planet toggle: "Switch to Mars" on Earth, "Switch to Earth" on Mars; carries ?embed=1 */
  #planetButton(): HTMLButtonElement {
    const label = `Switch to ${bodyName(otherBody(BODY))}`;
    const b = h("button", { type: "button", class: "tool-btn planet-btn", "aria-label": label, title: label, html: ICONS.planet }) as HTMLButtonElement;
    b.addEventListener("click", () => {
      this.close();
      const url = otherBodyUrl({ embed: isEmbedded() });
      (this.#opts.navigate ?? ((u: string) => globalThis.location.assign(u)))(url);
    });
    return b;
  }

  get open(): string | null { return this.#pop?.dataset.kind ?? null; }

  close() {
    if (!this.#pop) return;
    this.#pop.remove();
    this.#pop = null;
    document.removeEventListener("pointerdown", this.#outside, true);
    const b = this.#owner;
    this.#owner = null;
    b?.setAttribute("aria-expanded", "false");
    b?.focus();
  }

  #openPop(kind: string, owner: HTMLButtonElement, title: string, ...body: (Node | string)[]) {
    this.close();
    const tid = nextId("tool-title");
    const close = h("button", { type: "button", class: "close", "aria-label": "Close" }, "×");
    close.addEventListener("click", () => this.close());
    const pop = h("div", { class: `tool-pop tool-pop-${kind}`, role: "dialog", "aria-labelledby": tid, "data-kind": kind },
      h("header", {}, h("h2", { id: tid }, title), close), ...body);
    pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(); } });
    document.body.append(pop);
    // anchored to the left of the tools column, top aligned with the button
    const r = owner.getBoundingClientRect(), vw = globalThis.innerWidth || 1024, vh = globalThis.innerHeight || 768;
    pop.style.top = `${Math.max(8, Math.min(r.top, vh - 120))}px`;
    pop.style.right = `${Math.max(8, vw - r.left + 8)}px`;
    this.#pop = pop;
    this.#owner = owner;
    owner.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", this.#outside, true);
    (pop.querySelector("input, button:not(.close), a[href]") as HTMLElement | null ?? close).focus();
    return pop;
  }

  openHelp(owner = this.el.querySelector(".help-btn") as HTMLButtonElement) {
    const restart = h("button", { type: "button", class: "restart-tour" }, HELP_RESTART);
    restart.addEventListener("click", () => { this.close(); this.#opts.startTour(); });
    const about = h("button", { type: "button", class: "link-button about-link" }, HELP_ABOUT_LINK);
    about.addEventListener("click", () => { this.close(); this.#opts.openAbout(); });
    const secs = HELP_SECTIONS.map((s) => h("section", { "data-help": s.id }, h("h3", { html: mathHtml(s.title) }), h("p", { html: mathHtml(s.body) })));
    this.#openPop("help", owner, HELP_TITLE, restart, h("div", { class: "help-sections" }, ...secs), h("p", {}, about));
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
    const bmId = nextId("exp-bm");
    const bm = h("input", { type: "checkbox", id: bmId, checked: true }) as HTMLInputElement;
    const run = h("button", { type: "button", class: "run-export" }, EXPORT_TEXT.run) as HTMLButtonElement;
    const status = h("p", { class: "help", role: "status" });
    run.addEventListener("click", async () => {
      run.disabled = true; status.textContent = EXPORT_TEXT.working;
      try { await this.#opts.exportMap({ basemap: bm.checked }); this.close(); } catch (e) { status.textContent = `Export failed: ${(e as Error)?.message ?? e}`; run.disabled = false; }
    });
    this.#openPop("export", owner, EXPORT_TEXT.title, h("label", { for: bmId, class: "inline" }, bm, ` ${EXPORT_TEXT.basemap}`), h("p", { class: "help" }, EXPORT_TEXT.note), run, status);
  }
}

export function toast(text: string, ms = 2000) {
  const t = h("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}
