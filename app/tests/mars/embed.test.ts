// @vitest-environment happy-dom
// Embed / panel layout (PI round 7 item 2), Mars. Shared checks in tests/embedlib.ts.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { checkBudgets, checkCss, checkSlider, checkStructure } from "../embedlib";

describe("embed and panel layout (Mars)", () => {
  it("header rows, slider block: the shared structure; full-screen pill on the map in embed mode only", () => {
    checkStructure(true); checkStructure(false);
  });
  it("slider: label + ⓘ, value + default with unit, one help sentence, details in the ⓘ", () => {
    const s = checkSlider();
    expect(s.label).toMatch(/^Median grain diameter/);
    expect(s.reset).toMatch(/^default 200 µm$/);
  });
  it("CSS rules of the layout", () => { checkCss(); });
  it("width budgets at 360, 480, 640, 800 px (embed) and 1280 px (full screen)", () => {
    const r = checkBudgets();
    if (process.env.LAYOUT_REPORT) fs.writeFileSync(process.env.LAYOUT_REPORT, r.join("\n") + "\n");
    expect(r.length).toBeGreaterThan(20);
  });
});
