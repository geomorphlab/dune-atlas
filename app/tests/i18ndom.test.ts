// @vitest-environment happy-dom
// Translation of rendered text (src/i18n/dom.ts): units become templates with kept nodes and numbers as
// markers; the translation is put back with the original nodes (same objects) and numbers; attributes are
// translated whole; untranslated and translate="no" text is left alone.
import { describe, expect, it, vi } from "vitest";

async function setup() {
  vi.resetModules();
  history.replaceState(null, "", "/?lang=fr");
  const i18n = await import("../src/i18n");
  const dom = await import("../src/i18n/dom");
  const add = (en: string, text: string) => { i18n.DICTS.fr[i18n.contentKey(en)] = { text, en: i18n.enHash(en) }; };
  return { i18n, dom, add };
}

describe("rendered text translation", () => {
  it("unit template: kept nodes and numbers become markers", async () => {
    const { dom } = await setup();
    const p = document.createElement("p");
    p.innerHTML = 'Loading<span translate="no"> ERA5-Land </span>data for 12 cells, <a href="https://x.org/">see</a>…';
    const t = dom.unitTemplate(p);
    expect(t.template).toBe('Loading⟦0⟧data for ⟦#0⟧ cells, <a href="https://x.org/">see</a>…');
    expect(t.nums).toEqual(["12"]);
  });
  it("translation keeps the original nodes and puts the numbers back", async () => {
    const { dom, add } = await setup();
    add("Radius = ⟦0⟧ of the ⟦#0⟧ hours.", "Rayon = ⟦0⟧ des ⟦#0⟧ heures.");
    const p = document.createElement("p");
    p.innerHTML = 'Radius = <span class="live-num">40 %</span> of the 1,234 hours.';
    const live = p.querySelector(".live-num")!;
    dom.translateDom(p);
    expect(p.textContent).toBe("Rayon = 40 % des 1,234 heures.");
    expect(p.querySelector(".live-num")).toBe(live);
  });
  it("controls inside a label survive (same element, listeners kept)", async () => {
    const { dom, add } = await setup();
    add("⟦0⟧Dunes only", "⟦0⟧Dunes seulement");
    const label = document.createElement("label");
    const cb = document.createElement("input"); cb.type = "checkbox";
    let clicks = 0; cb.addEventListener("click", () => clicks++);
    label.append(cb, "Dunes only");
    dom.translateDom(label);
    expect(label.textContent).toBe("Dunes seulement");
    expect(label.querySelector("input")).toBe(cb);
    cb.click(); expect(clicks).toBe(1);
  });
  it("attributes, translate=\"no\" and untranslated text", async () => {
    const { dom, add } = await setup();
    add("Show / hide ⟦#0⟧ layers", "Afficher / masquer ⟦#0⟧ calques");
    const d = document.createElement("div");
    d.innerHTML = '<button title="Show / hide 3 layers">x</button><p translate="no">Gunn (2026)</p><p>Not translated yet</p>';
    dom.translateDom(d);
    expect(d.querySelector("button")!.getAttribute("title")).toBe("Afficher / masquer 3 calques");
    expect(d.querySelectorAll("p")[0].textContent).toBe("Gunn (2026)");
    expect(d.querySelectorAll("p")[1].textContent).toBe("Not translated yet");
  });
  it("already translated text is left as it is (no loop)", async () => {
    const { dom, add } = await setup();
    add("Wind rose", "Rose des vents");
    const h = document.createElement("h3"); h.textContent = "Wind rose";
    dom.translateDom(h); dom.translateDom(h);
    expect(h.textContent).toBe("Rose des vents");
  });
});
