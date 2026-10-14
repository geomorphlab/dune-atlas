// First-visit guided tour (vanilla): a dimmed backdrop, a highlight over the step's control and a
// popover anchored to it (centred when the control is hidden, e.g. a collapsed panel on mobile).
// Back / Next / Skip on every step, step counter, Esc and a click outside skip; focus is trapped in
// the popover and returned afterwards; the step text is announced (aria-live).
import { h } from "./dom";
import { storageKey } from "../body";
import { mathHtml } from "../util/math";
import { TOUR_LABELS, TOUR_STEPS, type TourStep } from "./helpText";

export const TOUR_SEEN_KEY = storageKey("tourSeen"); // Earth "duneAtlas.tourSeen", Mars "duneAtlasMars.tourSeen" (body.ts)

/** First visit: not seen yet and not embedded; `?tour=1` always shows it. */
export function shouldShowTour(o: { embed: boolean; tourParam: boolean; seen: boolean }): boolean {
  return o.tourParam || (!o.embed && !o.seen);
}
export function tourSeen(): boolean {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === "1"; } catch { return false; }
}
function markSeen() { try { localStorage.setItem(TOUR_SEEN_KEY, "1"); } catch { /* private mode */ } }

/** Popover position next to the highlight `sr`: the first of below / above / right / left that lies fully on
 *  screen (12 px margin) and does not overlap the highlight; else the one with the least overlap (steps 8 and 9 ran off the right edge and step 3 covered its own target). `pop`
 *  is the border-box size. */
export function tourPlacement(sr: { left: number; top: number; width: number; height: number }, pop: { w: number; h: number }, view: { w: number; h: number }, gap = 10, margin = 12): { left: number; top: number; side: string } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const cx = sr.left + sr.width / 2 - pop.w / 2, cy = sr.top + sr.height / 2 - pop.h / 2;
  const cands = [
    { side: "below", left: cx, top: sr.top + sr.height + gap },
    { side: "above", left: cx, top: sr.top - gap - pop.h },
    { side: "right", left: sr.left + sr.width + gap, top: cy },
    { side: "left", left: sr.left - gap - pop.w, top: cy },
  ].map((c) => {
    const fits = c.top >= margin && c.top + pop.h <= view.h - margin && c.left >= margin && c.left + pop.w <= view.w - margin;
    const left = clamp(c.left, margin, Math.max(margin, view.w - pop.w - margin)), top = clamp(c.top, margin, Math.max(margin, view.h - pop.h - margin));
    const ox = Math.max(0, Math.min(left + pop.w, sr.left + sr.width) - Math.max(left, sr.left));
    const oy = Math.max(0, Math.min(top + pop.h, sr.top + sr.height) - Math.max(top, sr.top));
    return { side: c.side, left, top, fits, overlap: ox * oy };
  });
  const best = cands.find((c) => c.fits && c.overlap === 0) ?? cands.find((c) => c.overlap === 0)
    ?? [...cands].sort((a, b) => a.overlap - b.overlap)[0];
  return { left: best.left, top: best.top, side: best.side };
}

/** first target of the step that is rendered and visible */
export function visibleTarget(step: TourStep, doc: Document = document): HTMLElement | null {
  for (const sel of step.targets) {
    const el = doc.querySelector(sel) as HTMLElement | null;
    if (!el || el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

/** Per-step side effects: `enter` prepares the UI (may be async, e.g. loading an example cell;
 *  a returned string is shown under the step text, e.g. a fallback), `leave` restores the exact
 *  previous state. `leave` runs whenever the step is left: Next, Back, Skip, Esc, click outside. */
export interface TourHooks { enter?: () => void | string | Promise<void | string>; leave?: () => void | Promise<void> }

export type TourEvent = { type: "step"; index: number } | { type: "end"; completed: boolean; index: number };

export class Tour {
  #steps: TourStep[];
  #i = 0;
  #root: HTMLElement | null = null;
  #pop!: HTMLElement;
  #spot!: HTMLElement;
  #prevFocus: Element | null = null;
  #onEnd?: (completed: boolean) => void;
  #hooks: Record<string, TourHooks>;
  /** step whose `enter` ran and whose `leave` is still due */
  #entered: string | null = null;
  #seq = 0;
  #reposition = () => this.#place();
  #listeners: ((ev: TourEvent) => void)[] = [];
  /** step shown / tour closed (used by the "Start tour" bubble, ui/tourBubble.ts) */
  listen(fn: (ev: TourEvent) => void) { this.#listeners.push(fn); }
  #emit(ev: TourEvent) { for (const f of this.#listeners) { try { f(ev); } catch (e) { console.warn("[dune-atlas] tour listener", e); } } }

  constructor(steps: TourStep[] = TOUR_STEPS, opts: { onEnd?: (completed: boolean) => void; hooks?: Record<string, TourHooks> } = {}) {
    this.#steps = steps;
    this.#onEnd = opts.onEnd;
    this.#hooks = opts.hooks ?? {};
  }
  /** resolves when the current step's `enter` (and a previous `leave`) has finished */
  ready: Promise<void> = Promise.resolve();

  #leave(): Promise<void> {
    const id = this.#entered;
    this.#entered = null;
    return Promise.resolve(id ? this.#hooks[id]?.leave?.() : undefined).catch((e) => console.warn("[dune-atlas] tour: restore failed", e));
  }
  get active() { return !!this.#root; }
  get index() { return this.#i; }

  start(i = 0) {
    this.end(false, true);
    this.#prevFocus = document.activeElement;
    const back = h("button", { type: "button", class: "tour-back" }, TOUR_LABELS.back);
    const next = h("button", { type: "button", class: "tour-next" }, TOUR_LABELS.next);
    const skip = h("button", { type: "button", class: "tour-skip" }, TOUR_LABELS.skip);
    back.addEventListener("click", () => this.back());
    next.addEventListener("click", () => this.next());
    skip.addEventListener("click", () => this.end(false));
    this.#pop = h("div", { class: "tour-pop", role: "dialog", "aria-modal": "true", "aria-labelledby": "tour-title", "aria-describedby": "tour-body" },
      h("p", { class: "tour-count", "aria-live": "polite" }),
      h("h2", { id: "tour-title" }),
      h("div", { id: "tour-body", class: "tour-body", "aria-live": "polite" }),
      h("div", { class: "tour-buttons" }, skip, h("span", { class: "spacer" }), back, next));
    this.#spot = h("div", { class: "tour-spot", "aria-hidden": "true" });
    const backdrop = h("div", { class: "tour-backdrop", "aria-hidden": "true" });
    backdrop.addEventListener("click", () => this.end(false)); // click outside: skip
    this.#root = h("div", { class: "tour" }, backdrop, this.#spot, this.#pop);
    this.#root.addEventListener("keydown", (e) => this.#key(e));
    document.body.append(this.#root);
    globalThis.addEventListener?.("resize", this.#reposition);
    this.#show(i);
  }

  next() { if (this.#i >= this.#steps.length - 1) this.end(true); else this.#show(this.#i + 1); }
  back() { if (this.#i > 0) this.#show(this.#i - 1); }

  /** close; `completed` = finished with Done (else skipped). Either way the tour counts as seen. */
  end(completed: boolean, silent = false) {
    if (!this.#root) return;
    this.#root.remove();
    this.#root = null;
    this.#seq++;
    globalThis.removeEventListener?.("resize", this.#reposition);
    this.ready = this.ready.then(() => this.#leave());
    markSeen();
    if (this.#prevFocus instanceof HTMLElement) this.#prevFocus.focus();
    if (!silent) { this.#onEnd?.(completed); this.#emit({ type: "end", completed, index: this.#i }); }
  }

  #show(i: number) {
    this.#i = i;
    const s = this.#steps[i], n = this.#steps.length;
    const q = (c: string) => this.#pop.querySelector(c) as HTMLElement;
    q(".tour-count").textContent = TOUR_LABELS.step(i + 1, n);
    q("#tour-title").innerHTML = mathHtml(s.title);
    q("#tour-body").innerHTML = `<p>${mathHtml(s.body)}</p>`;
    // leave the previous step (restore), then enter this one; re-anchor once it is ready
    const my = ++this.#seq;
    const hook = this.#hooks[s.id];
    this.#pop.classList.toggle("tour-loading", !!hook?.enter);
    this.ready = this.ready.then(() => this.#leave()).then(async () => {
      // the previous step's restore (e.g. step 4 closing RDD's Display, scrolling the list back) moves the
      // controls: re-anchor on the restored layout, also for steps without a hook (step 5 kept the stale
      // highlight position of the layer list while the list moved)
      if (my === this.#seq && this.#root && !hook?.enter) { this.#place(); return; }
      if (my !== this.#seq || !hook?.enter) return;
      this.#entered = s.id;
      let note: void | string;
      try { note = await hook.enter(); } catch (e) { note = undefined; console.warn("[dune-atlas] tour step", s.id, e); }
      if (my !== this.#seq || !this.#root) return;
      if (typeof note === "string" && note) q("#tour-body").insertAdjacentHTML("beforeend", `<p class="tour-note">${mathHtml(note)}</p>`);
      this.#pop.classList.remove("tour-loading");
      this.#place();
    });
    (q(".tour-back") as HTMLButtonElement).disabled = i === 0;
    q(".tour-next").textContent = i === n - 1 ? TOUR_LABELS.done : TOUR_LABELS.next;
    this.#pop.dataset.step = s.id;
    this.#place();
    this.#emit({ type: "step", index: i });
    q(".tour-next").focus();
  }

  /** highlight the target and anchor the popover next to it (below, above, or beside; clamped) */
  #place() {
    if (!this.#root) return;
    const s = this.#steps[this.#i];
    const el = visibleTarget(s);
    const vw = globalThis.innerWidth || 1024, vh = globalThis.innerHeight || 768;
    const pw = Math.min(340, vw - 24);
    this.#pop.style.width = `${pw}px`;
    this.#root.classList.toggle("no-target", !el);
    if (!el) {
      this.#spot.hidden = true;
      Object.assign(this.#pop.style, { left: `${Math.max(12, (vw - pw) / 2)}px`, top: `${Math.max(12, vh * 0.3)}px` });
      this.#pop.dataset.anchor = "centre";
      return;
    }
    const r = el.getBoundingClientRect(), pad = 6;
    this.#spot.hidden = false;
    // a target larger than most of the view (the map) gets an inset highlight
    const big = r.width > 0.8 * vw && r.height > 0.8 * vh;
    const sr = big ? { left: vw * 0.3, top: vh * 0.25, width: vw * 0.4, height: vh * 0.5 } : { left: r.left - pad, top: r.top - pad, width: r.width + 2 * pad, height: r.height + 2 * pad };
    Object.assign(this.#spot.style, { left: `${sr.left}px`, top: `${sr.top}px`, width: `${sr.width}px`, height: `${sr.height}px` });
    const ph = this.#pop.getBoundingClientRect().height || this.#pop.offsetHeight || 180;
    const { left, top } = tourPlacement(sr, { w: pw, h: ph }, { w: vw, h: vh });
    Object.assign(this.#pop.style, { left: `${left}px`, top: `${top}px` });
    this.#pop.dataset.anchor = s.targets.find((t) => document.querySelector(t) === el) ?? "";
  }

  #key(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.end(false); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); this.next(); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); this.back(); return; }
    if (e.key !== "Tab") return;
    // focus trap inside the popover
    const f = [...this.#pop.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
    if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  }
}
