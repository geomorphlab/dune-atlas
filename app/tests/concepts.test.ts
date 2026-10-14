// @vitest-environment happy-dom
// Concepts panel (mortarboard button): the approved text of docs/concepts/ used unchanged (markup only), the
// entries of this atlas (Earth and both), every reference resolved, the Concept links of the ⓘ popovers, the
// button between Help and Share, and placement off the cell panel.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CONCEPT_OF_LAYER, CONCEPTS, conceptBodyHtml, conceptFor, conceptLinkHtml, entryReferences, parseConcepts, refKey, texify } from "../src/core/ui/concepts";
import { Tools, placeToolPop } from "../src/core/ui/tools";
import { infoHtml, renderLayerPanel } from "../src/core/ui/layerPanel";
import { thresholdInfoHtml } from "../src/core/ui/threshold";
import { loadRegistry } from "../src/core/registry/load";
import { Store, type AppState } from "../src/core/store";

const MD = fs.readFileSync(path.resolve(__dirname, "../../docs/concepts/concepts-earth-mars.md"), "utf8");
const ALL = parseConcepts(MD);
const reg = loadRegistry().registry;
/** rendered text back to the file's plain text: KaTeX output without spacing marks, its ∗ as * */
const plain = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; return (d.textContent ?? "").replace(/[\u200b\u2061]/g, "").replace(/∗/g, "*").replace(/Q\^/g, "Q̂").replace(/∣/g, "|").replace(/\s+/g, ""); };

describe("content from docs/concepts (verbatim)", () => {
  it("every entry of section 5 is parsed with its planet tag and references", () => {
    const heads = [...MD.matchAll(/^### (.*) — (Earth|Mars|both)\s*$/gm)];
    expect(ALL.entries.length).toBe(heads.length);
    expect(ALL.entries.length).toBeGreaterThanOrEqual(20);
    expect(ALL.entries.map((e) => e.tag)).toEqual(heads.map((m) => m[2]));
    expect(ALL.references.length).toBe((MD.split(/^## 6\. References$/m)[1].match(/^\S.*\(\d{4}\)\./gm) ?? []).length);
    expect(ALL.references.length).toBe(13);
  });
  it("the Earth atlas shows the Earth and both entries, in file order", () => {
    expect(CONCEPTS.map((c) => c.title)).toEqual(ALL.entries.filter((e) => e.tag !== "Mars").map((e) => e.title));
    expect(CONCEPTS.some((c) => c.title === "Grain size and threshold")).toBe(false);
    expect(CONCEPTS.find((c) => c.title === "Threshold friction velocity")).toBeDefined();
  });
  it("the rendered text equals the file text (symbols set in TeX, nothing else changed)", () => {
    for (const c of ALL.entries) {
      const paras = c.paragraphs.join(" ");
      const html = conceptBodyHtml({ ...c, refs: [] });
      expect(plain(html), c.title).toBe(paras.replace(/²(?=\(V)/g, "2").replace(/\s+/g, ""));
      // the paragraph text of the file, line breaks joined
      const block = MD.split(`### ${c.title} — ${c.tag}`)[1].split(/^References:/m)[0];
      expect(block.replace(/\s+/g, " ").trim()).toBe(paras);
    }
  });
  it("symbols are typeset as on the rest of the site", () => {
    expect(texify("αT and αH, σE/σH, Q̂∥/⊥,H, Q̂|⊥|/⊥,H, Q̂|⊥|/∥,E, u*,th, u*")).toBe("$\\alpha_T$ and $\\alpha_H$, $\\sigma_E/\\sigma_H$, $\\hat{Q}_{\\parallel/\\bot,H}$, $\\hat{Q}_{|\\bot|/\\bot,H}$, $\\hat{Q}_{|\\bot|/\\parallel,E}$, $u_{*,th}$, $u_*$");
    expect(conceptBodyHtml(CONCEPTS.find((c) => c.title.startsWith("Migration direction"))!)).toContain('class="katex"');
  });
  it("every short reference resolves to its full reference, with the DOI linked", () => {
    expect(refKey("Courrech du Pont et al. (2024)")).toBe(refKey("Courrech du Pont, S., Rubin, D. M. (2024). x"));
    for (const c of ALL.entries) for (const r of entryReferences(c)) expect(r, `${c.title}: ${r}`).toMatch(/doi:10\./);
    const dp = conceptBodyHtml(CONCEPTS.find((c) => c.id === "drift-potential-dp")!);
    expect(dp).toContain('href="https://doi.org/10.3133/pp1052"');
    expect(dp).toContain("References: Fryberger &amp; Dean (1979); Gunn (2026).");
    expect(conceptBodyHtml(CONCEPTS.find((c) => c.id === "wind-from-sand-toward")!)).not.toContain("References");
  });
});

describe("Concept links of the ⓘ popovers", () => {
  it("every mapped entry exists on Earth or Mars; layers, the slider and the dataset ⓘ link to theirs", () => {
    const ids = new Set(ALL.entries.map((e) => e.id));
    for (const [layer, cs] of Object.entries(CONCEPT_OF_LAYER)) expect(cs.some((c) => ids.has(c)), layer).toBe(true);
    expect(conceptFor("dpm")!.title).toBe("Drift potential (DP)");
    expect(conceptFor("@threshold")!.title).toBe("Threshold friction velocity");
    expect(conceptFor("@dataset")!.title).toBe("The two ERA5 wind datasets");
    expect(conceptFor("aridity")).toBeUndefined();
    // every wind-derived map field has an entry (aridity and vegetation are external data)
    for (const l of reg.layers.filter((x) => x.type === "zarr-field" && !["aridity", "vegetation"].includes(x.id))) expect(conceptFor(l.id), l.id).toBeDefined();
    const html = infoHtml(reg.layers.find((l) => l.id === "ab")!, "era5-land");
    expect(html).toContain('data-concept="crest-orientation-αh"');
    expect(thresholdInfoHtml(reg.threshold)).toContain('data-concept="threshold-friction-velocity"');
    expect(conceptLinkHtml("aridity")).toBe("");
  });
});

const R = (el: Element, r: { left: number; top: number; width: number; height: number }) => {
  (el as HTMLElement).getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r }) as DOMRect;
};
function page() {
  document.body.innerHTML = '<div id="app"><main id="map"></main><aside id="layer-panel"></aside><aside id="cell-panel" hidden></aside></div>';
  const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: true, opacity: 1 }])), order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false };
  renderLayerPanel(document.getElementById("layer-panel")!, reg, new Store(st));
  const tools = new Tools({ startTour: vi.fn(), shareLink: () => "x", exportMap: vi.fn(async () => {}), openAbout: vi.fn() } as never);
  document.getElementById("map")!.append(tools.el);
  return tools;
}

describe("Concepts button and panel", () => {
  it("mortarboard button between Help and Share, with an accessible name", () => {
    const t = page();
    expect([...t.el.querySelectorAll("button")].map((b) => b.className.replace("tool-btn ", ""))).toEqual(["help-btn", "concepts-btn", "share-btn", "export-btn", "planet-btn"]);
    const b = t.el.querySelector(".concepts-btn")!;
    expect(b.getAttribute("aria-label")).toBe("Concepts");
    expect(b.getAttribute("aria-haspopup")).toBe("dialog");
    expect(b.querySelector("svg")).not.toBeNull();
  });
  it("opens a dialog listing every entry of the atlas (collapsed); Esc closes it and returns focus", () => {
    const t = page();
    const b = t.el.querySelector(".concepts-btn") as HTMLButtonElement;
    b.click();
    const pop = document.querySelector(".tool-pop-concepts") as HTMLElement;
    expect(pop.getAttribute("role")).toBe("dialog");
    expect(pop.querySelector("h2")!.textContent).toBe("Concepts");
    const items = [...pop.querySelectorAll("details.concept")] as HTMLDetailsElement[];
    expect(items.length).toBe(CONCEPTS.length);
    expect(items.every((d) => !d.open)).toBe(true);
    expect(document.activeElement).toBe(items[0].querySelector("summary"));
    expect(b.getAttribute("aria-expanded")).toBe("true");
    pop.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector(".tool-pop-concepts")).toBeNull();
    expect(document.activeElement).toBe(b);
  });
  it("the Concept link of an ⓘ opens the panel at that entry", () => {
    page();
    const link = document.querySelector('.layer-item[data-layer="rdpa"] [data-concept]') as HTMLButtonElement;
    expect(link.textContent).toBe("Concept: Resultant drift direction (RDD)");
    link.click();
    const pops = document.querySelectorAll(".tool-pop-concepts");   // (the earlier tests' tool columns listen too)
    const open = [...pops[pops.length - 1].querySelectorAll("details.concept")].filter((d) => (d as HTMLDetailsElement).open);
    expect(open.map((d) => d.id)).toEqual(["concept-resultant-drift-direction-rdd"]);
    expect(document.activeElement).toBe(open[0].querySelector("summary"));
  });
  it("kept off an open cell panel: left of it, narrowed when needed; above the bottom sheet on narrow screens", () => {
    vi.stubGlobal("innerWidth", 1100); vi.stubGlobal("innerHeight", 800);
    document.body.innerHTML = '<aside id="cell-panel"></aside><button id="o"></button><div id="p" class="tool-pop"></div>';
    const cell = document.getElementById("cell-panel")!, pop = document.getElementById("p")!, owner = document.getElementById("o")!;
    R(owner, { left: 1061, top: 129, width: 29, height: 29 });
    R(cell, { left: 380, top: 10, width: 668, height: 760 });
    R(pop, { left: 0, top: 0, width: 420, height: 400 });
    placeToolPop(pop, owner, document, { fit: true });
    expect(parseFloat(pop.style.right)).toBe(1100 - 380 + 8);
    expect(parseFloat(pop.style.width)).toBe(380 - 16);
    R(cell, { left: 0, top: 400, width: 1100, height: 400 });   // bottom sheet
    pop.style.width = "";
    placeToolPop(pop, owner, document, { fit: true });
    expect(parseFloat(pop.style.maxHeight)).toBeLessThanOrEqual(400 - 129 - 8);
  });
});
