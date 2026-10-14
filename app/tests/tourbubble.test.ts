// @vitest-environment happy-dom
// "Start tour" bubble: arrival / after-autostart rules, click / Enter starts the tour,
// Esc or a click elsewhere hides it for the visit, remembered once the tour has been started, placement never
// over the side panel, the cell panel or the planet button; plus the tour auto-start fallback and the loading
// indicator.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOUR_STARTED_KEY, TOUR_BUBBLE_LABEL, bubbleAfterTour, bubbleOnArrival, bubblePlacement, autostartTour, tourStarted, wireTourBubble } from "../src/ui/tourBubble";
import { LoadingIndicator, WHEEL_ZOOM_RATE } from "../src/ui/loading";
import type { TourEvent } from "../src/ui/tour";

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
  it("shown on arrival unless started or auto-starting", () => {
    expect(bubbleOnArrival({ started: false, autostart: false })).toBe(true);
    expect(bubbleOnArrival({ started: false, autostart: true })).toBe(false);
    expect(bubbleOnArrival({ started: true, autostart: false })).toBe(false);
  });
  it("after an automatic tour: only when skipped at step 1", () => {
    expect(bubbleAfterTour({ started: false, completed: false, index: 0 })).toBe(true);
    expect(bubbleAfterTour({ started: false, completed: false, index: 3 })).toBe(false);
    expect(bubbleAfterTour({ started: false, completed: true, index: 9 })).toBe(false);
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
    expect(tourStarted()).toBe(true);
    expect(mem.get(TOUR_STARTED_KEY)).toBe("1");
  });
  it("Esc hides it for the visit", () => {
    const t = new FakeTour();
    const w = wireTourBubble(t, { autostart: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(bubble().hidden).toBe(true);
    w.bubble.show();
    expect(bubble().hidden).toBe(true);    // dismissed for this visit
    expect(tourStarted()).toBe(false);     // ... but back on the next visit
  });
  it("the first click anywhere else hides it", () => {
    wireTourBubble(new FakeTour(), { autostart: false });
    document.getElementById("layer-panel")!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(bubble().hidden).toBe(true);
  });
  it("auto-start skipped at step 1 shows it afterwards; reaching step 2 marks the tour started", () => {
    let t = new FakeTour();
    wireTourBubble(t, { autostart: true });
    expect(bubble().hidden).toBe(true);
    t.start(); t.emit({ type: "end", completed: false, index: 0 });
    expect(bubble().hidden).toBe(false);
    expect(tourStarted()).toBe(false);
    page(); t = new FakeTour();
    wireTourBubble(t, { autostart: true });
    t.start(); t.emit({ type: "step", index: 1 }); t.emit({ type: "end", completed: false, index: 1 });
    expect(bubble().hidden).toBe(true);
    expect(tourStarted()).toBe(true);
    page(); wireTourBubble(new FakeTour(), { autostart: false });
    expect(bubble().hidden).toBe(true);   // never again once started
  });
  it("starting from Help counts as started", () => {
    const t = new FakeTour();
    const w = wireTourBubble(t, { autostart: false });
    w.fromHelp();
    expect(t.starts).toBe(1);
    expect(tourStarted()).toBe(true);
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
