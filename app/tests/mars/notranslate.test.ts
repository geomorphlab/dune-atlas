// @vitest-environment happy-dom
// Page translation, Mars: the panels keep symbols, acronyms, names, licences and references as written
// (shared checks in tests/notranslatelib.ts; the helpers are tested in tests/notranslate.test.ts).
import { describe, expect, it, vi } from "vitest";
import { collectMarsPublicText } from "./publictext";
import { checkMarked, unprotected } from "../notranslatelib";
import { CONCEPTS, conceptBodyHtml } from "../../src/core/ui/concepts";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });

describe("rendered panels (Mars)", () => {
  it("layer panel, About and cell panel: ⓘ buttons, formulas and references marked; no unprotected term left", async () => {
    await collectMarsPublicText();
    const lp = document.getElementById("layer-panel")!, cp = document.getElementById("cell-panel")!;
    checkMarked(lp);
    expect(lp.querySelector("h1")!.getAttribute("translate")).toBe("no");
    expect(unprotected(lp)).toEqual([]);
    expect(unprotected(cp)).toEqual([]);
  });
  it("Concepts entries of the Mars atlas", () => {
    for (const c of CONCEPTS) {
      const d = document.createElement("div");
      d.innerHTML = conceptBodyHtml(c);
      expect(unprotected(d)).toEqual([]);
    }
  });
});
