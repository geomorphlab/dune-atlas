// @vitest-environment happy-dom
// Page translation: symbols, acronyms, names, licences and references are kept as written (Earth; the shared
// helpers are tested here, the Mars panels in tests/mars/notranslate.test.ts).
import { describe, expect, it, vi } from "vitest";
import { mathHtml } from "../src/core/util/math";
import { richHtml } from "../src/core/util/richtext";
import { protectDom, protectHtml, protectText, termRanges } from "../src/core/util/notranslate";
import { h } from "../src/core/ui/dom";
import { CONCEPTS, conceptBodyHtml } from "../src/core/ui/concepts";
import { citationHtml } from "../src/core/cell/citation";
import { collectPublicText } from "./publictext";
import { checkMarked, unprotected } from "./notranslatelib";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });
const terms = (s: string) => termRanges(s).map(([i, j]) => s.slice(i, j));
const textOf = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; };

describe("terms kept as written", () => {
  it("acronyms, symbols, dataset / provider names, licences, file names and author-year citations", () => {
    expect(terms("Raising the threshold lowers DP and can change RDD, RDP and RDP/DP.")).toEqual(["DP", "RDD", "RDP", "RDP/DP"]);
    expect(terms("Aridity index AI; u*,th and u* and u∗,th; αT, αE, αH and αO; σE/σH")).toEqual(["AI", "u*,th", "u*", "u∗,th", "αT", "αE", "αH", "αO", "σE/σH"]);
    expect(terms("ERA5-Land 0.1° and ERA5; MCMC FV3; © Mapterhorn; OpenFreeMap Positron; Esri World Imagery")).toEqual(["ERA5-Land", "ERA5", "MCMC FV3", "Mapterhorn", "OpenFreeMap", "Positron", "Esri World Imagery"]);
    expect(terms("Supplementary Code (Zenodo, MIT); CC BY 4.0; CC BY-SA 3.0 IGO; ODbL 1.0; CC0")).toEqual(["Supplementary Code", "Zenodo", "MIT", "CC BY 4.0", "CC BY-SA 3.0 IGO", "ODbL 1.0", "CC0"]);
    expect(terms("Gunn (2026), Martin & Kok (2017), Courrech du Pont et al. (2014), Hayward et al. 2007, 2010 and (Gunn 2026, Methods M3)"))
      .toEqual(["Gunn (2026)", "Martin & Kok (2017)", "Courrech du Pont et al. (2014)", "Hayward et al. 2007, 2010", "Gunn 2026", "M3"]);
    expect(terms("wind_histogram.csv and fields_by_threshold.csv")).toEqual(["wind_histogram.csv", "fields_by_threshold.csv"]);
    expect(terms("Dune Atlas Earth, by the Monash Geomorphology Lab")).toEqual(["Dune Atlas Earth", "Monash Geomorphology Lab"]);
  });
  it("ordinary words are left to the translator", () => {
    expect(terms("Wind FROM, sand TOWARD; the IAU-approved names; WNW and ENE; Drift potential")).toEqual([]);
    expect(terms("DPs, RDDx, xDP")).toEqual([]);
  });
});

describe("markup", () => {
  it("KaTeX output carries translate=\"no\"; a space beside a formula is kept inside the protected wrapper", () => {
    const html = mathHtml("Elongation direction $\\alpha_E$ (toward)");
    expect(html).toMatch(/^Elongation direction<span translate="no" class="notranslate"> <span class="katex" translate="no"/);
    expect(html).toMatch(/<\/span> <\/span>\(toward\)$/);
    expect(textOf(html)).toBe(textOf(`Elongation direction ${mathHtml("$\\alpha_E$")} (toward)`));
    expect(mathHtml("$u_{*,th}$")).toMatch(/^<span class="katex" translate="no"/);
    // one shared space between two formulas is used once
    expect(textOf(mathHtml("$a$ $b$"))).toBe(textOf(mathHtml("$a$")) + " " + textOf(mathHtml("$b$")));
    expect(mathHtml("$\\notacommand{x$")).toMatch(/translate="no"/);
  });
  it("plain-text acronyms in mathHtml / richHtml / h() are wrapped; the rendered text is unchanged", () => {
    const s = "Higher DP means a windier environment (ERA5-Land, CC BY 4.0).";
    for (const html of [mathHtml(s), richHtml(s), protectText(s)]) {
      expect(html).toContain('<span translate="no" class="notranslate"> DP </span>');
      expect(html).toContain('<span translate="no" class="notranslate">ERA5-Land</span>');
      expect(textOf(html)).toBe(s);
    }
    const el = h("p", {}, s);
    expect(el.textContent).toBe(s);
    expect([...el.querySelectorAll('[translate="no"]')].map((e) => e.textContent)).toEqual([" DP ", "ERA5-Land", " CC BY 4.0"]);
    // not inside <option> (no elements allowed there)
    expect(h("option", {}, "ERA5-Land 0.1°").innerHTML).toBe("ERA5-Land 0.1°");
  });
  it("protectHtml: only text is changed (not tags, attributes, protected or skipped elements); applying it twice changes nothing", () => {
    const html = '<p title="DP">DP <a href="https://x.org/DP">RDD</a> <span translate="no">AI</span><svg><text>DP</text></svg><option>DP</option></p>';
    const once = protectHtml(html);
    expect(once).toBe('<p title="DP"><span translate="no" class="notranslate">DP </span><a href="https://x.org/DP"><span translate="no" class="notranslate">RDD</span></a> <span translate="no">AI</span><svg><text>DP</text></svg><option>DP</option></p>');
    expect(protectHtml(once)).toBe(once);
    expect(protectHtml("Martin &amp; Kok (2017)")).toBe('<span translate="no" class="notranslate">Martin &amp; Kok (2017)</span>');
  });
  it("protectDom wraps the terms of text nodes once", () => {
    const d = document.createElement("div");
    d.innerHTML = "<p>DP here, RDP/DP there</p><code>DP</code>";
    protectDom(d); protectDom(d);
    expect(d.innerHTML).toBe('<p><span translate="no" class="notranslate">DP </span>here,<span translate="no" class="notranslate"> RDP/DP </span>there</p><code>DP</code>');
  });
  it("Concepts: references (short line and full list) are kept as written; only the word References is translated", () => {
    const html = conceptBodyHtml(CONCEPTS.find((c) => c.id === "drift-potential-dp")!);
    expect(html).toContain('References: <span translate="no" class="notranslate">Fryberger &amp; Dean (1979); Gunn (2026).</span>');
    expect(html).toContain('<ul class="concept-reflist" translate="no">');
    for (const c of CONCEPTS) {
      const d = document.createElement("div");
      d.innerHTML = conceptBodyHtml(c);
      checkConcept(d);
    }
  });
  it("About citations: the reference text and its link are kept as written", () => {
    expect(citationHtml()).toMatch(/<li>Paper: <span translate="no" class="notranslate">Gunn, A\. \(2026\)/);
  });
});
function checkConcept(d: HTMLElement) {
  expect(unprotected(d)).toEqual([]);
  for (const k of d.querySelectorAll(".katex")) expect(k.getAttribute("translate")).toBe("no");
}

describe("rendered panels (Earth)", () => {
  it("layer panel, About and cell panel: ⓘ buttons, formulas and references marked; no unprotected term left", async () => {
    await collectPublicText();
    const lp = document.getElementById("layer-panel")!, cp = document.getElementById("cell-panel")!;
    checkMarked(lp);
    expect(lp.querySelector("h1")!.getAttribute("translate")).toBe("no");
    for (const o of lp.querySelectorAll("#dataset-select option")) expect(o.getAttribute("translate")).toBe("no");
    expect(unprotected(lp)).toEqual([]);
    expect(unprotected(cp)).toEqual([]);
    expect(cp.querySelectorAll(".katex").length).toBeGreaterThan(0);
  });
});
