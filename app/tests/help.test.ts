// @vitest-environment happy-dom
// Help button / panel and the first-visit guided tour: visibility rules, step flow (Back / Next /
// Done / Skip), keyboard (Esc, arrows, focus trap), click outside, restart from the help panel,
// highlight vs centred fallback, and the text file that documents all help text.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Tour, TOUR_SEEN_KEY, shouldShowTour, tourSeen, visibleTarget } from "../src/core/ui/tour";
import { Tools } from "../src/core/ui/tools";
import { HELP_BUTTON_LABEL, HELP_SECTIONS, TOUR_STEPS } from "../src/core/ui/helpText";
import { helpMarkdown } from "../src/core/ui/helpDoc";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import { loadRegistry } from "../src/core/registry/load";
import { Store, type AppState } from "../src/core/store";

const mem = (() => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear() }; })();
vi.stubGlobal("localStorage", mem);
const reg = loadRegistry().registry;
const key = (el: Element, k: string, shift = false) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, shiftKey: shift, bubbles: true }));
const rect = (el: Element, r: { left: number; top: number; width: number; height: number }) => {
  (el as HTMLElement).getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r }) as DOMRect;
};

let tools: Tools, opts: { startTour: ReturnType<typeof vi.fn>; shareLink: () => string; exportMap: ReturnType<typeof vi.fn>; openAbout: ReturnType<typeof vi.fn> };
function page() {
  document.body.innerHTML = '<div id="app"><main id="map"></main><aside id="layer-panel"></aside><aside id="cell-panel" hidden></aside></div><button id="before">x</button>';
  const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: 1 }])), order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false };
  renderLayerPanel(document.getElementById("layer-panel")!, reg, new Store(st));
  opts = { startTour: vi.fn(), shareLink: () => "https://map.geomorphlab.org/#v=AQEB", exportMap: vi.fn(async () => {}), openAbout: vi.fn() };
  tools = new Tools(opts as never);
  document.getElementById("map")!.append(tools.el);
  rect(tools.el.querySelector(".help-btn")!, { left: 980, top: 100, width: 29, height: 29 });
  rect(tools.el.querySelector(".share-btn")!, { left: 980, top: 129, width: 29, height: 29 });
  rect(document.getElementById("map")!, { left: 0, top: 0, width: 1024, height: 768 });
  rect(document.querySelector("#layer-panel .pinned")!, { left: 10, top: 90, width: 330, height: 70 });
}
beforeEach(() => { mem.clear(); page(); });
afterEach(() => { document.querySelector(".tour")?.remove(); });

describe("tour visibility", () => {
  it("first visit only; never in embed mode unless ?tour=1", () => {
    expect(shouldShowTour({ embed: false, tourParam: false, seen: false })).toBe(true);
    expect(shouldShowTour({ embed: false, tourParam: false, seen: true })).toBe(false);
    expect(shouldShowTour({ embed: true, tourParam: false, seen: false })).toBe(false);
    expect(shouldShowTour({ embed: true, tourParam: true, seen: true })).toBe(true);
    expect(tourSeen()).toBe(false);
  });
});

describe("guided tour", () => {
  it("step 1 highlights the help button and says the tour restarts from it; focus on Next; Back disabled", () => {
    (document.getElementById("before") as HTMLElement).focus();
    const t = new Tour();
    t.start();
    const pop = document.querySelector(".tour-pop") as HTMLElement;
    expect(pop.getAttribute("role")).toBe("dialog");
    expect(pop.getAttribute("aria-modal")).toBe("true");
    expect(pop.querySelector(".tour-count")!.textContent).toBe(`Step 1 of ${TOUR_STEPS.length}`);
    expect(pop.querySelector(".tour-count")!.getAttribute("aria-live")).toBe("polite");
    expect(pop.textContent).toMatch(/Help button \(\?\)/);
    expect(pop.textContent).toMatch(/restarts this tour/);
    expect(pop.dataset.anchor).toBe(".atlas-tools .help-btn");
    const spot = document.querySelector(".tour-spot") as HTMLElement;
    expect(spot.hidden).toBe(false);
    expect(spot.style.left).toBe("974px");
    expect((pop.querySelector(".tour-back") as HTMLButtonElement).disabled).toBe(true);
    expect(document.activeElement).toBe(pop.querySelector(".tour-next"));
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(10);   // short: one step per main control
    expect(TOUR_STEPS.map((s) => s.id)).toEqual(["help", "concepts", "map", "threshold", "layers", "active", "cell", "dataset", "tools", "planet"]);
  });
  it("Next / Back / arrows; Done on the last step ends it (completed) and marks it seen", () => {
    const onEnd = vi.fn();
    const t = new Tour(TOUR_STEPS, { onEnd });
    t.start();
    const pop = () => document.querySelector(".tour-pop") as HTMLElement;
    (pop().querySelector(".tour-next") as HTMLButtonElement).click();
    expect(pop().dataset.step).toBe("concepts");
    expect(TOUR_STEPS[1].targets).toEqual([".atlas-tools .concepts-btn"]);
    (pop().querySelector(".tour-next") as HTMLButtonElement).click();
    expect(pop().dataset.step).toBe("map");
    key(pop(), "ArrowRight");
    expect(pop().dataset.step).toBe("threshold");
    expect(pop().dataset.anchor).toBe("#layer-panel .pinned");
    expect(pop().querySelector("#tour-title .katex")).not.toBeNull(); // u*,th rendered
    (pop().querySelector(".tour-back") as HTMLButtonElement).click();
    expect(pop().dataset.step).toBe("map");
    key(pop(), "ArrowLeft");
    expect(t.index).toBe(1);
    for (let i = 1; i < TOUR_STEPS.length - 1; i++) (pop().querySelector(".tour-next") as HTMLButtonElement).click();
    expect(pop().querySelector(".tour-next")!.textContent).toBe("Done");
    (pop().querySelector(".tour-next") as HTMLButtonElement).click();
    expect(document.querySelector(".tour")).toBeNull();
    expect(onEnd).toHaveBeenCalledWith(true);
    expect(mem.getItem(TOUR_SEEN_KEY)).toBe("1");
  });
  it("Skip, Esc and a click outside end it (seen); focus returns", () => {
    for (const how of ["skip", "esc", "outside"] as const) {
      mem.clear();
      const before = document.getElementById("before") as HTMLButtonElement;
      before.focus();
      const onEnd = vi.fn();
      new Tour(TOUR_STEPS, { onEnd }).start(2);
      const pop = document.querySelector(".tour-pop") as HTMLElement;
      if (how === "skip") (pop.querySelector(".tour-skip") as HTMLButtonElement).click();
      if (how === "esc") key(pop, "Escape");
      if (how === "outside") (document.querySelector(".tour-backdrop") as HTMLElement).click();
      expect(document.querySelector(".tour"), how).toBeNull();
      expect(onEnd).toHaveBeenCalledWith(false);
      expect(mem.getItem(TOUR_SEEN_KEY)).toBe("1");
      expect(document.activeElement).toBe(before);
    }
  });
  it("focus is trapped in the popover (Tab / Shift+Tab cycle)", () => {
    new Tour().start(1);
    const pop = document.querySelector(".tour-pop") as HTMLElement;
    const order = ["tour-skip", "tour-back", "tour-next"];
    (pop.querySelector(".tour-next") as HTMLElement).focus();
    key(pop, "Tab");
    expect((document.activeElement as HTMLElement).className).toBe(order[0]);
    key(pop, "Tab", true);
    expect((document.activeElement as HTMLElement).className).toBe(order[2]);
  });
  it("a hidden control (collapsed panel, mobile): falls back to the next target, else a centred popover", () => {
    const layers = TOUR_STEPS.find((s) => s.id === "layers")!;
    // panel body without layout (collapsed) -> the Layers toggle
    rect(document.querySelector("#layer-panel .panel-toggle")!, { left: 260, top: 14, width: 60, height: 22 });
    expect(visibleTarget(layers)).toBe(document.querySelector("#layer-panel .panel-toggle"));
    new Tour().start(TOUR_STEPS.indexOf(layers));
    expect((document.querySelector(".tour-pop") as HTMLElement).dataset.anchor).toBe("#layer-panel .panel-toggle");
    document.querySelector(".tour")!.remove();
    // nothing visible: centred, dimmed backdrop, no highlight
    document.getElementById("layer-panel")!.hidden = true;
    new Tour().start(TOUR_STEPS.indexOf(layers));
    expect((document.querySelector(".tour-pop") as HTMLElement).dataset.anchor).toBe("centre");
    expect((document.querySelector(".tour-spot") as HTMLElement).hidden).toBe(true);
    expect(document.querySelector(".tour")!.classList.contains("no-target")).toBe(true);
  });
});

describe("help button and panel", () => {
  it("permanent button with the accessible label; opens a panel with all sections, restart and About link", () => {
    const b = tools.el.querySelector(".help-btn") as HTMLButtonElement;
    expect(b.getAttribute("aria-label")).toBe(HELP_BUTTON_LABEL);
    b.click();
    const pop = document.querySelector(".tool-pop-help") as HTMLElement;
    expect(pop.getAttribute("role")).toBe("dialog");
    expect(b.getAttribute("aria-expanded")).toBe("true");
    expect([...pop.querySelectorAll("section[data-help]")].map((s) => s.getAttribute("data-help"))).toEqual(HELP_SECTIONS.map((s) => s.id));
    expect(pop.querySelector("h3 .katex")).not.toBeNull();
    (pop.querySelector(".restart-tour") as HTMLButtonElement).click();
    expect(opts.startTour).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".tool-pop")).toBeNull();
    b.click();
    (document.querySelector(".tool-pop .about-link") as HTMLButtonElement).click();
    expect(opts.openAbout).toHaveBeenCalledTimes(1);
    // Esc and the close button close it and return focus to the button
    b.click();
    key(document.querySelector(".tool-pop")!, "Escape");
    expect(document.querySelector(".tool-pop")).toBeNull();
    expect(document.activeElement).toBe(b);
    b.click();
    (document.querySelector(".tool-pop .close") as HTMLButtonElement).click();
    expect(tools.open).toBeNull();
    // the same button toggles
    b.click(); b.click();
    expect(tools.open).toBeNull();
  });
  it("share: shows the link, copies it with a confirmation", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { ...globalThis.navigator, clipboard: { writeText } });
    (tools.el.querySelector(".share-btn") as HTMLButtonElement).click();
    const pop = document.querySelector(".tool-pop-share") as HTMLElement;
    expect((pop.querySelector("input.share-link") as HTMLInputElement).value).toBe("https://map.geomorphlab.org/#v=AQEB");
    await new Promise((r) => setTimeout(r, 0));
    expect(writeText).toHaveBeenCalledWith("https://map.geomorphlab.org/#v=AQEB");
    expect(document.querySelector(".toast")!.textContent).toBe("Link copied");
    (pop.querySelector(".copy-link") as HTMLButtonElement).click();
    expect(writeText).toHaveBeenCalledTimes(2);
  });
  it("export map: one size (no scale choice); basemap option is passed on", async () => {
    (tools.el.querySelector(".export-btn") as HTMLButtonElement).click();
    const pop = document.querySelector(".tool-pop-export") as HTMLElement;
    expect(pop.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(pop.textContent).not.toMatch(/[12]×|\b[12]x\b|resolution:/i);
    expect((pop.querySelector(".run-export") as HTMLButtonElement).textContent).toBe("Export PNG");
    (pop.querySelector('input[type="checkbox"]') as HTMLInputElement).checked = false;
    (pop.querySelector(".run-export") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(opts.exportMap).toHaveBeenCalledWith(expect.objectContaining({ basemap: false, transparent: false }));
    // the popover stays open with a completion line
    expect(document.querySelector(".tool-pop")).not.toBeNull();
    expect(pop.querySelector(".export-status")!.textContent).toMatch(/^Saved/);
  });
});

describe("help text document", () => {
  it("docs/reference/help-text.md matches the help text (run npm run help-doc after editing)", () => {
    const f = path.resolve(__dirname, "../../docs/reference/help-text.md");
    expect(fs.readFileSync(f, "utf8")).toBe(helpMarkdown());
  });
});

// Regression (October 2026 review): the highlight of the "Share and export" step covers the share-link, the camera
// and (where the atlas has it) the region-download buttons.
describe("tour highlight of the Share and export step", () => {
  it("covers the share and the camera buttons", () => {
    rect(tools.el.querySelector(".export-btn")!, { left: 980, top: 158, width: 29, height: 29 });
    const i = TOUR_STEPS.findIndex((s) => s.id === "tools");
    const t = new Tour();
    t.start(i);
    const spot = document.querySelector(".tour-spot") as HTMLElement;
    const pad = 6;
    expect(parseFloat(spot.style.left)).toBe(980 - pad);
    expect(parseFloat(spot.style.top)).toBe(129 - pad);
    expect(parseFloat(spot.style.height)).toBe(158 + 29 - 129 + 2 * pad);   // share top to camera bottom
    expect(parseFloat(spot.style.width)).toBe(29 + 2 * pad);
    expect(TOUR_STEPS[i].span).toEqual([".atlas-tools .share-btn", ".atlas-tools .export-btn", ".atlas-tools .region-btn"]);
    t.end(false);
  });
  it("covers the region-download button too, and the text names it", () => {
    tools.el.remove();
    tools = new Tools({ ...opts, region: { lonRange: 180, context: () => null, draw: vi.fn(), show: vi.fn(), run: vi.fn() } } as never);
    document.getElementById("map")!.append(tools.el);
    for (const [c, top] of [["help-btn", 100], ["share-btn", 129], ["export-btn", 158], ["region-btn", 187]] as const)
      rect(tools.el.querySelector(`.${c}`)!, { left: 980, top, width: 29, height: 29 });
    const i = TOUR_STEPS.findIndex((s) => s.id === "tools");
    const t = new Tour();
    t.start(i);
    const spot = document.querySelector(".tour-spot") as HTMLElement;
    expect(parseFloat(spot.style.top)).toBe(129 - 6);
    expect(parseFloat(spot.style.height)).toBe(187 + 29 - 129 + 12);   // share top to region-download bottom
    expect(TOUR_STEPS[i].body).toMatch(/download the data of a region you draw on the map/);
    t.end(false);
  });
  it("spanRect: the target alone for steps without a span", async () => {
    const { spanRect } = await import("../src/core/ui/tour");
    const el = tools.el.querySelector(".help-btn") as HTMLElement;
    expect(spanRect(TOUR_STEPS[0], el)).toMatchObject({ left: 980, top: 100, width: 29, height: 29 });
  });
});
