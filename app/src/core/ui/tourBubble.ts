// "Start tour" speech bubble pointing at the Help (?) button. Shared by both atlases,
// including ?embed=1.
//  - shown on arrival; when the tour starts by itself (first visit), shown after it closes only if it was
//    skipped at step 1;
//  - a click on it (or Enter) starts the tour; Esc, or the first click anywhere else, hides it for this visit;
//  - shown on later visits until the visitor has started the tour once (reached step 2 of an automatic start,
//    or started it from the bubble or Help), per body (localStorage "duneAtlas[Mars].tourStarted"), then never;
//  - placed left of the Help button, else below the tools column, else not shown: never over the planet
//    button, the side (layer) panel or the cell panel;
//  - no motion under prefers-reduced-motion (style.css).
import { h } from "./dom";
import { storageKey } from "../body";
import type { TourEvent } from "./tour";

export const TOUR_STARTED_KEY = storageKey("tourStarted"); // Earth "duneAtlas.tourStarted", Mars "duneAtlasMars.tourStarted"
export const TOUR_BUBBLE_TEXT = "Start tour";
export const TOUR_BUBBLE_LABEL = "Start the guided tour of the atlas";
/** elements the bubble must not cover */
export const BUBBLE_AVOID = ["#layer-panel", "#cell-panel", ".planet-btn"];

export function tourStarted(): boolean {
  try { return localStorage.getItem(TOUR_STARTED_KEY) === "1"; } catch { return false; }
}
export function markTourStarted() { try { localStorage.setItem(TOUR_STARTED_KEY, "1"); } catch { /* private mode */ } }

type Rect = { left: number; top: number; right: number; bottom: number };
const hit = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Bubble position (viewport px; the bubble's top-left and which side its tail points), or null when every
 *  candidate covers an obstacle or leaves the view. `help` = Help button, `column` = tools column. */
export function bubblePlacement(help: Rect, column: Rect, size: { w: number; h: number }, view: { w: number; h: number }, avoid: Rect[], gap = 10, margin = 6): { left: number; top: number; tail: "right" | "up" } | null {
  const cands: { left: number; top: number; tail: "right" | "up" }[] = [
    { left: help.left - gap - size.w, top: (help.top + help.bottom) / 2 - size.h / 2, tail: "right" },   // left of ?
    { left: column.right - size.w, top: column.bottom + gap, tail: "up" },                                // below the column
  ];
  for (const c of cands) {
    const r = { left: c.left, top: c.top, right: c.left + size.w, bottom: c.top + size.h };
    if (r.left < margin || r.top < margin || r.right > view.w - margin || r.bottom > view.h - margin) continue;
    if (avoid.some((a) => hit(r, a))) continue;
    return c;
  }
  return null;
}

/** Arrival rule: show unless the visitor has started the tour once; with an automatic start, wait for it to end. */
export function bubbleOnArrival(o: { started: boolean; autostart: boolean }): boolean { return !o.started && !o.autostart; }
/** after an automatic tour closes: show only when it was skipped at step 1 */
export function bubbleAfterTour(o: { started: boolean; completed: boolean; index: number }): boolean { return !o.started && !o.completed && o.index === 0; }

export class TourBubble {
  el: HTMLButtonElement;
  #doc: Document;
  #start: () => void;
  #shown = false;
  #dismissed = false;
  #onDown = (e: Event) => { if (!this.el.contains(e.target as Node)) this.hide(true); };
  #onKey = (e: KeyboardEvent) => { if (e.key === "Escape") this.hide(true); };
  #onResize = () => this.place();

  constructor(start: () => void, doc: Document = document) {
    this.#doc = doc;
    this.#start = start;
    this.el = h("button", { type: "button", class: "tour-bubble", hidden: true, "aria-label": TOUR_BUBBLE_LABEL },
      h("span", { class: "tour-bubble-text" }, TOUR_BUBBLE_TEXT)) as HTMLButtonElement;
    this.el.addEventListener("click", () => { this.hide(true); this.#start(); });   // Enter / Space click a button
    this.el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); this.hide(true); } });
    doc.body.append(this.el);
  }
  get shown() { return this.#shown; }

  /** show (once per visit: not after a dismissal) */
  show() {
    if (this.#dismissed || this.#shown) return;
    this.#shown = true;
    this.el.hidden = false;
    this.place();
    this.#doc.addEventListener("pointerdown", this.#onDown, true);
    this.#doc.addEventListener("keydown", this.#onKey);
    globalThis.addEventListener?.("resize", this.#onResize);
  }
  /** hide; `dismiss` = for the rest of this visit */
  hide(dismiss = false) {
    if (dismiss) this.#dismissed = true;
    if (!this.#shown) return;
    this.#shown = false;
    this.el.hidden = true;
    this.#doc.removeEventListener("pointerdown", this.#onDown, true);
    this.#doc.removeEventListener("keydown", this.#onKey);
    globalThis.removeEventListener?.("resize", this.#onResize);
  }
  place() {
    if (!this.#shown) return;
    const help = this.#doc.querySelector(".help-btn") as HTMLElement | null;
    const column = (help?.closest(".maplibregl-ctrl-top-right") ?? help?.closest(".atlas-tools")) as HTMLElement | null;   // the whole control column
    if (!help || !column) { this.el.style.visibility = "hidden"; return; }
    const vis = (e: Element) => { const el = e as HTMLElement; const r = el.getBoundingClientRect(); return !el.hidden && r.width > 0 && r.height > 0 ? r : null; };
    const avoid = BUBBLE_AVOID.flatMap((s) => [...this.#doc.querySelectorAll(s)].map(vis).filter((r): r is DOMRect => !!r));
    const br = this.el.getBoundingClientRect();
    const size = { w: br.width || 110, h: br.height || 34 };
    const p = bubblePlacement(help.getBoundingClientRect(), column.getBoundingClientRect(), size,
      { w: globalThis.innerWidth || 1024, h: globalThis.innerHeight || 768 }, avoid);
    this.el.style.visibility = p ? "" : "hidden";
    if (!p) return;
    this.el.dataset.tail = p.tail;
    Object.assign(this.el.style, { left: `${p.left}px`, top: `${p.top}px` });
  }
}

/** Wire the bubble to the tour: `autostart` = the tour starts by itself on this visit. Starting the tour from
 *  Help (`fromHelp`) or the bubble counts as started; so does reaching step 2. */
export function wireTourBubble(tour: { listen(fn: (ev: TourEvent) => void): void; start(): void }, o: { autostart: boolean; doc?: Document }) {
  let userStart = false;
  const start = () => { userStart = true; markTourStarted(); tour.start(); };
  const bubble = new TourBubble(start, o.doc);
  tour.listen((ev) => {
    if (ev.type === "step") { bubble.hide(); if (ev.index >= 1) markTourStarted(); return; }
    if (o.autostart && !userStart && bubbleAfterTour({ started: tourStarted(), completed: ev.completed, index: ev.index })) bubble.show();
  });
  if (bubbleOnArrival({ started: tourStarted(), autostart: o.autostart })) bubble.show();
  return { bubble, fromHelp: () => { userStart = true; markTourStarted(); bubble.hide(true); tour.start(); } };
}

/** Start the first-visit tour once the map is idle, or after `fallbackMs` if it never goes idle (continuous
 *  repaint or a slow tile host kept the tour from ever starting). */
export function autostartTour(map: { once(ev: "idle", fn: () => void): unknown }, start: () => void, fallbackMs = 8000, delayMs = 500) {
  let done = false;
  const go = () => { if (done) return; done = true; setTimeout(start, delayMs); };
  map.once("idle", go);
  setTimeout(go, fallbackMs);
}
