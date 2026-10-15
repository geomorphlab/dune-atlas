// @vitest-environment happy-dom
// "Start tour" bubble: arrival / after-autostart rules, click / Enter starts the tour,
// Esc or a click elsewhere hides it for the visit, back on every new visit, placement never
// over the side panel, the cell panel or the planet button; plus the tour auto-start fallback and the loading
// indicator.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOUR_BUBBLE_LABEL, bubbleAfterTour, bubbleOnArrival, bubblePlacement, autostartTour, wireTourBubble } from "../src/core/ui/tourBubble";
import { LoadingIndicator, WHEEL_ZOOM_RATE } from "../src/core/ui/loading";
import type { TourEvent } from "../src/core/ui/tour";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });

class FakeTour {
  fns: ((e: TourEvent) => void)[] = [];
  starts = 0;
  listen(f: (e: TourEvent) => void) { this.fns.push(f); }
  start() { this.starts++; this.emit({ type: "step", index: 0 }); }
  emit(e: TourEvent) { for (const f of this.fns) f(e); }
}
function page() {
  document.body.innerHTML = '<aside id="layer-panel"></aside><aside id="cell-panel" hidden></aside><div class="maplibregl-ctrl-top-right"><div class="atlas-tools"><button class="tool-btn help-btn"></button><button class="tool-btn planet-btn"></button></div></div>';
}
const bubble = () => document.querySelector(".tour-bubble") as HTMLButtonElement;

describe("arrival and after-tour rules", () => {
  it("shown on every arrival unless the tour starts by itself", () => {
    expect(bubbleOnArrival({ autostart: false })).toBe(true);
    expect(bubbleOnArrival({ autostart: true })).toBe(false);
  });
  it("after an automatic tour: only when skipped at step 1", () => {
    expect(bubbleAfterTour({ completed: false, index: 0 })).toBe(true);
    expect(bubbleAfterTour({ completed: false, index: 3 })).toBe(false);
    expect(bubbleAfterTour({ completed: true, index: 9 })).toBe(false);
  });
});

describe("TourBubble in the page", () => {
  beforeEach(() => { mem.clear(); page(); });
  it("has an accessible name and starts the tour on click (Enter on a button is a click)", () => {
    const t = new FakeTour();
    wireTourBubble(t, { autostart: false });
    expect(bubble().hidden).toBe(false);
    expect(bubble().getAttribute("aria-label")).toBe(TOUR_BUBBLE_LABEL);
    expect(bubble().tagName).toBe("BUTTON");
    bubble().click();
    expect(t.starts).toBe(1);
    expect(bubble().hidden).toBe(true);
    t.emit({ type: "end", completed: false, index: 0 });
    expect(bubble().hidden).toBe(true);    // not back during this visit
  });
  it("Esc hides it for the visit", () => {
    const t = new FakeTour();
    const w = wireTourBubble(t, { autostart: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(bubble().hidden).toBe(true);
    w.bubble.show();
    expect(bubble().hidden).toBe(true);    // dismissed for this visit
  });
  it("the first click anywhere else hides it", () => {
    wireTourBubble(new FakeTour(), { autostart: false });
    document.getElementById("layer-panel")!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(bubble().hidden).toBe(true);
  });
  it("back on every later visit, also after the tour has been taken (nothing is remembered)", () => {
    let t = new FakeTour();
    wireTourBubble(t, { autostart: false });
    bubble().click(); t.emit({ type: "step", index: 5 }); t.emit({ type: "end", completed: true, index: 9 });
    expect(mem.size).toBe(0);
    page(); t = new FakeTour();
    wireTourBubble(t, { autostart: false });
    expect(bubble().hidden).toBe(false);
  });
  it("auto-start (first visit): hidden while the tour runs; shown afterwards only if skipped at step 1", () => {
    let t = new FakeTour();
    wireTourBubble(t, { autostart: true });
    expect(bubble().hidden).toBe(true);
    t.start(); t.emit({ type: "end", completed: false, index: 0 });
    expect(bubble().hidden).toBe(false);
    page(); t = new FakeTour();
    wireTourBubble(t, { autostart: true });
    t.start(); t.emit({ type: "step", index: 1 }); t.emit({ type: "end", completed: false, index: 1 });
    expect(bubble().hidden).toBe(true);
  });
  it("starting from Help hides it for the visit", () => {
    const t = new FakeTour();
    const w = wireTourBubble(t, { autostart: false });
    w.fromHelp();
    expect(t.starts).toBe(1);
    t.emit({ type: "end", completed: false, index: 0 });
    expect(bubble().hidden).toBe(true);
  });
});

describe("bubblePlacement", () => {
  const view = { w: 1370, h: 900 }, size = { w: 104, h: 32 };
  const help = { left: 1324, top: 120, right: 1354, bottom: 150 }, column = { left: 1324, top: 10, right: 1354, bottom: 290 };
  it("left of the Help button when clear", () => {
    const p = bubblePlacement(help, column, size, view, [{ left: 6, top: 6, right: 330, bottom: 880 }])!;
    expect(p.tail).toBe("right");
    expect(p.left + size.w).toBeLessThanOrEqual(help.left);
  });
  it("below the column when an open panel is beside the button; hidden when both are covered", () => {
    const cellNextToButton = { left: 1000, top: 100, right: 1314, bottom: 170 };
    expect(bubblePlacement(help, column, size, view, [cellNextToButton])!.tail).toBe("up");
    const sheet = { left: 0, top: 280, right: 1370, bottom: 900 };
    expect(bubblePlacement(help, column, size, view, [cellNextToButton, sheet])).toBeNull();
  });
  it("narrow screen: a full-width side panel under the column hides it rather than covering the panel", () => {
    const v = { w: 360, h: 640 };
    const h2 = { left: 320, top: 110, right: 350, bottom: 140 }, col = { left: 320, top: 10, right: 350, bottom: 250 };
    const p = bubblePlacement(h2, col, size, v, [{ left: 0, top: 0, right: 300, bottom: 640 }]);
    if (p) expect(p.left).toBeGreaterThanOrEqual(300);
  });
});

describe("tour auto-start fallback and loading indicator", () => {
  it("starts once on idle, or after the fallback when the map never goes idle", () => {
    vi.useFakeTimers();
    let start = 0;
    autostartTour({ once: () => undefined }, () => start++, 8000, 500);
    vi.advanceTimersByTime(7999); expect(start).toBe(0);
    vi.advanceTimersByTime(600); expect(start).toBe(1);
    let idle: () => void = () => undefined; start = 0;
    autostartTour({ once: (_e, f) => { idle = f; } }, () => start++, 8000, 500);
    idle(); vi.advanceTimersByTime(10000); expect(start).toBe(1);
    vi.useRealTimers();
  });
  it("loading pill shows until idle (role=status) and times out", () => {
    vi.useFakeTimers();
    let idle: (() => void) | null = null;
    const L = new LoadingIndicator({ once: (_e, f) => { idle = f; }, areTilesLoaded: () => true, loaded: () => true }, document.body, 30000);
    expect(L.el.getAttribute("role")).toBe("status");
    L.begin(0);
    expect(L.shown).toBe(true);
    idle!(); expect(L.shown).toBe(false);
    L.begin(0); vi.advanceTimersByTime(30001); expect(L.shown).toBe(false);
    vi.useRealTimers();
    expect(WHEEL_ZOOM_RATE).toBeGreaterThan(1 / 450);
  });
});

// Regression (October 2026 review: "the Start tour bubble no longer appears"): the bubble is placed again when the
// layout changes and waits, hidden, while every position is blocked (e.g. a link or the planet button reopening
// a view with the cell panel open), instead of staying invisible for the whole visit.
describe("bubble placement follows the layout", () => {
  const R = (el: Element, r: { left: number; top: number; width: number; height: number }) => {
    (el as HTMLElement).getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r }) as DOMRect;
  };
  function layout(cellOpen: boolean) {
    document.body.innerHTML = `<aside id="layer-panel"></aside><aside id="cell-panel" ${cellOpen ? "" : "hidden"}></aside><div class="maplibregl-ctrl-top-right"><div class="atlas-tools"><button class="tool-btn help-btn"></button><button class="tool-btn planet-btn"></button></div></div>`;
    vi.stubGlobal("innerWidth", 1370); vi.stubGlobal("innerHeight", 900);
    R(document.querySelector("#layer-panel")!, { left: 10, top: 10, width: 330, height: 800 });
    R(document.querySelector("#cell-panel")!, { left: 900, top: 10, width: 418, height: 860 });   // right: 52 px
    R(document.querySelector(".maplibregl-ctrl-top-right")!, { left: 1331, top: 0, width: 39, height: 300 });
    R(document.querySelector(".help-btn")!, { left: 1331, top: 120, width: 29, height: 29 });
    R(document.querySelector(".planet-btn")!, { left: 1331, top: 236, width: 29, height: 29 });
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));
  beforeEach(() => mem.clear());
  it("on a clear page it is shown left of the Help button", () => {
    layout(false);
    const { bubble: b } = wireTourBubble(new FakeTour(), { autostart: false });
    expect(b.visible).toBe(true);
    expect(b.el.dataset.tail).toBe("right");
    expect(parseFloat(b.el.style.left) + 110).toBeLessThanOrEqual(1331);
  });
  it("with the cell panel open on arrival it waits hidden, and appears when the panel closes", async () => {
    layout(true);
    const { bubble: b } = wireTourBubble(new FakeTour(), { autostart: false });
    expect(b.shown).toBe(true);
    expect(b.visible).toBe(false);
    document.getElementById("cell-panel")!.hidden = true;   // e.g. Esc or the panel's close button
    await tick();
    expect(b.visible).toBe(true);
  });
  it("a window resize places it again", () => {
    layout(false);
    const { bubble: b } = wireTourBubble(new FakeTour(), { autostart: false });
    R(document.querySelector(".help-btn")!, { left: 1331, top: 160, width: 29, height: 29 });
    globalThis.dispatchEvent(new Event("resize"));
    expect(parseFloat(b.el.style.top)).toBeGreaterThan(150);
  });
  it("hiding it stops the observers (no placement after the first click)", async () => {
    layout(false);
    const { bubble: b } = wireTourBubble(new FakeTour(), { autostart: false });
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(b.shown).toBe(false);
    document.getElementById("cell-panel")!.hidden = false;
    await tick();
    expect(b.el.hidden).toBe(true);
  });
  it("Esc on the bubble does not also close the cell panel (keys.ts names the bubble's class)", async () => {
    const { escapeClosesCell } = await import("../src/core/ui/keys");
    layout(false);
    const { bubble: b } = wireTourBubble(new FakeTour(), { autostart: false });
    const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    Object.defineProperty(e, "target", { value: b.el });
    expect(escapeClosesCell(e)).toBe(false);
  });
});
