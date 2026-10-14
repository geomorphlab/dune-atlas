// Shared by tests/embed.test.ts and tests/mars/embed.test.ts: one embed / panel
// layout for both atlases. No browser runs in the test sandbox, so the layout is checked by
// (1) the DOM structure of the panel header, the embed pill and the slider block (identical
// signature in both builds), (2) the CSS rules that place them, and (3) width budgets at the iframe
// widths 360, 480, 640, 800 and full screen 1280 px, with text widths from the export's Helvetica
// metrics (src/core/export/texsvg.ts textWidth) times a 1.1 margin for system-ui.
import { expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry } from "../src/core/registry/load";
import { Store, type AppState } from "../src/core/store";
import { renderLayerPanel, datasetOptionLabel } from "../src/core/ui/layerPanel";
import { FULL_SCREEN_NOTE, FULL_SCREEN_TEXT } from "../src/core/ui/embed";
import { THRESHOLD_HELP } from "../src/core/ui/threshold";
import { textWidth } from "../src/core/export/texsvg";
import { BODY_NAME } from "../src/core/body";

export const WIDTHS = [360, 480, 640, 800, 1280];
const CSS = fs.readFileSync(path.resolve(__dirname, "../src/core/style.css"), "utf8");
const M = 1.1; // system-ui vs Helvetica metrics
const tw = (s: string, fs_: number, bold = false) => M * textWidth(s, fs_, bold);

export function mountPanel(embed: boolean, over: Partial<AppState> = {}) {
  const { registry: reg } = loadRegistry();
  document.body.innerHTML = '<div id="app"><div id="map"></div><aside id="layer-panel"></aside></div>';
  const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: reg.threshold.defaultIndex, layers: {}, order: [],
    dataset: reg.datasets?.[0]?.id ?? "", cell: null, embed, ...over };
  const store = new Store(st);
  const root = document.getElementById("layer-panel")!;
  let n = 0;
  const url = () => `https://map.geomorphlab.org/?v=${++n}`;
  renderLayerPanel(root, reg, store, { fullScreenUrl: embed ? url : undefined });
  return { reg, store, root, rerender: () => renderLayerPanel(root, reg, store, { fullScreenUrl: embed ? url : undefined }) };
}

const cls = (e: Element) => `${e.tagName.toLowerCase()}${e.classList.length ? "." + [...e.classList].sort().join(".") : ""}`;
/** the structure both builds must share (class names of the header rows and of the slider block) */
export function panelSignature(root: HTMLElement) {
  const header = root.querySelector(".atlas-header")!;
  const thr = root.querySelector(".pinned section.threshold")!;
  return {
    header: [...header.children].map(cls),
    titleRow: [...header.querySelector(".title-row")!.children].map(cls),
    slider: [...thr.children].map(cls),
    sliderHead: [...thr.querySelector(".threshold-head")!.children].map(cls),
    sliderReadout: [...thr.querySelector(".threshold-readout")!.children].map(cls),
  };
}
export const SIGNATURE = {
  header: ["div.title-row", "p.subtitle", "div.dataset-line", "label.dunes-only-row.inline"],
  titleRow: ["h1", "button.panel-toggle"],
  slider: ["div.threshold-head", "div.threshold-readout", "div.ut-track", "p.help", "div.info-popover"],
  sliderHead: ["label.ut-label", "button.info-button"],
  sliderReadout: ["output.live-num.ut-value", "button.link-button"],
};

export function checkStructure(embed: boolean) {
  const { root, store, rerender } = mountPanel(embed);
  expect(panelSignature(root)).toEqual(SIGNATURE);
  // no full-screen link in the header; in embed mode one pill on the map, before the panel
  expect([...root.querySelectorAll(".atlas-header a")].filter((x) => !x.closest(".subtitle"))).toEqual([]);
  const bars = document.querySelectorAll("#app > .embed-bar");
  if (!embed) { expect(bars).toHaveLength(0); return; }
  expect(bars).toHaveLength(1);
  expect(bars[0].nextElementSibling).toBe(root);
  const a = bars[0].querySelector("a.fullscreen-pill") as HTMLAnchorElement;
  expect([a.textContent, a.target, a.rel]).toEqual([FULL_SCREEN_TEXT, "_blank", "noopener"]);
  expect(bars[0].querySelector(".embed-note")!.textContent).toBe(FULL_SCREEN_NOTE);
  const h0 = a.href; store.set({ utIndex: 3 }); expect(a.href).not.toBe(h0); // follows the view
  rerender(); expect(document.querySelectorAll("#app > .embed-bar")).toHaveLength(1); // no duplicate
  // default embed state: list collapsed, header + slider block (pinned) still shown
  expect(root.classList.contains("collapsed")).toBe(true);
  expect(root.querySelector(".pinned .threshold")).not.toBeNull();
}

export function checkSlider() {
  const { root, reg } = mountPanel(false);
  const thr = root.querySelector(".pinned section.threshold")!;
  const help = thr.querySelector("p.help")!;
  expect(help.textContent).toBe(THRESHOLD_HELP);
  expect(THRESHOLD_HELP.split(/\.\s/)).toHaveLength(1); // one sentence
  const btn = thr.querySelector(".threshold-head .info-button") as HTMLButtonElement, pop = thr.querySelector(".info-popover") as HTMLElement;
  expect(pop.hidden).toBe(true);
  btn.click(); expect([pop.hidden, btn.getAttribute("aria-expanded")]).toEqual([false, "true"]);
  const t = reg.threshold, last = t.values.length - 1;
  expect(pop.textContent).toContain(`${t.values.length} `);
  const reset = thr.querySelector(".threshold-readout .link-button")!.textContent!;
  expect(reset).toMatch(/^default \S+ (m\/s|µm)$/); // "default" + value with unit, both builds
  expect(last).toBeGreaterThan(0);
  return { label: (thr.querySelector(".ut-label")!.textContent ?? "").trim(), reset };
}

/** CSS rules the layout depends on */
export function checkCss() {
  const rule = (sel: string) => { const m = CSS.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`)); return m?.[1] ?? ""; };
  expect(rule(".embed-bar")).toMatch(/position: absolute; top: 10px; left: 10px/);
  expect(CSS).toMatch(/body\.embed \{ --panel-w: min\(330px, calc\(100vw - 70px\)\); \}/);
  expect(rule("body.embed #layer-panel")).toMatch(/top: 44px; max-height: calc\(100% - 94px\)/);
  expect(CSS).toMatch(/@media \(max-width: 439px\) \{ \.embed-note \{ display: none; \} \}/);
  expect(rule("label.inline.dataset-row")).toMatch(/display: flex/);
  expect(rule(".dataset-row select")).toMatch(/flex: 1 1 auto; min-width: 0/);
  expect(rule("label.inline.dunes-only-row")).toMatch(/display: flex/);
  expect(rule(".threshold:not(.compact) .threshold-head")).toMatch(/flex-wrap: nowrap/);
  expect(rule(".threshold-readout")).toMatch(/white-space: nowrap/);
  expect(CSS).not.toMatch(/\.fullscreen-link/);
}

/** width budgets: [row, needed px, available px] at viewport width W */
export function budgets(W: number, embed: boolean) {
  const { root, reg } = mountPanel(embed);
  const panelW = W <= 720 ? (embed ? Math.min(330, W - 70) : W - 70) : 330; // style.css: body.embed caps --panel-w
  const inner = panelW - 2 - 24; // border, 12 px padding each side
  const rows: [string, number, number][] = [];
  const h1 = embed ? 15 : 18;
  rows.push(["title row", tw(`Dune Atlas ${BODY_NAME}`, h1, true) + 8 + tw("▾ Layers", 14) + 22, inner]);
  const opts = (reg.datasets ?? []).map((d) => datasetOptionLabel(d.id, d.title));
  const dsInfo = root.querySelector(".dataset-line > .info-button") ? 6 + 18 : 0;   // the dataset ⓘ (Earth)
  rows.push(["Wind dataset row", tw("Wind dataset", 12.5) + 6 + Math.max(...opts.map((o) => tw(o, 12.5))) + 30 + dsInfo, inner]);   // 12.5 px
  rows.push(["Dunes only row", 13 + 4 + tw("Dunes only", 12.5), inner]);
  const label = (root.querySelector(".pinned .ut-label")!.textContent ?? "").replace(/\s+/g, " ").trim();
  rows.push(["slider label + ⓘ", tw(label, 13.5, true) + 6 + 18, inner]);
  const reset = root.querySelector(".pinned .threshold-readout .link-button")!.textContent!;
  const vals = reg.threshold.values;
  const value = root.querySelector(".pinned .ut-value")!.textContent!;
  rows.push(["value + default", tw(value.replace(/\u2007/g, "0"), 18, true) + 8 + tw(reset, 12) + 4, inner]);
  rows.push(["help line (one line)", tw(THRESHOLD_HELP, 12), inner]);
  if (embed) {
    const right = 10 + 29 + 8; // top-right control column (navigation, tools) and a gap
    const pill = tw(FULL_SCREEN_TEXT, 12.5, true) + 22;
    rows.push([W >= 440 ? "pill + note" : "pill (note hidden < 440 px)", 10 + pill + (W >= 440 ? 8 + tw(FULL_SCREEN_NOTE, 11.5) + 12 : 0), W - right]);
  }
  expect(vals.length).toBeGreaterThan(1);
  return rows;
}

export function checkBudgets() {
  const report: string[] = [];
  for (const W of WIDTHS) for (const embed of W === 1280 ? [false] : [true]) {
    for (const [row, need, avail] of budgets(W, embed)) {
      report.push(`${W}${embed ? " embed" : ""}: ${row} ${need.toFixed(0)}/${avail.toFixed(0)}`);
      expect(need, `${W} px ${row}`).toBeLessThanOrEqual(avail);
    }
  }
  return report;
}
