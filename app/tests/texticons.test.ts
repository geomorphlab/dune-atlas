// @vitest-environment happy-dom
// Icons in help and tour text (Tia's review, Oct 2026): {icon_<name>} draws the tool button's own symbol.
import { describe, expect, it } from "vitest";
import { HELP_SECTIONS, TOUR_STEPS } from "../src/core/ui/helpText";
import { TEXT_ICON, TEXT_ICON_NAMES, withIcons } from "../src/core/ui/texticons";
import { iconWords } from "../src/core/ui/texticonwords";

const bodies = [...HELP_SECTIONS.map((s) => s.body), ...TOUR_STEPS.map((s) => s.body)];
const used = bodies.flatMap((b) => [...b.matchAll(TEXT_ICON)].map((m) => m[1]));

describe("icons in help and tour text", () => {
  it("every {icon_...} names a known icon, and the old picture names are gone", () => {
    expect(used.length).toBeGreaterThanOrEqual(9);
    for (const k of used) expect(TEXT_ICON_NAMES as readonly string[]).toContain(k);
    for (const b of bodies) expect(b).not.toMatch(/mortarboard|crosshair|\(\?\)|dashed box/);
  });
  it("draws each icon as a labelled image that the page translator leaves alone", () => {
    const d = document.createElement("div");
    d.innerHTML = withIcons("A {icon_concepts} B {icon_camera} C {icon_unknown}");
    const icons = d.querySelectorAll(".text-icon");
    expect(icons.length).toBe(2);
    for (const el of icons) {
      expect(el.getAttribute("role")).toBe("img");
      expect(el.getAttribute("aria-label")).toBeTruthy();
      expect(el.getAttribute("translate")).toBe("no");
      expect(el.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
    expect(icons[0].getAttribute("aria-label")).toBe("Concepts");
    expect(d.textContent).toContain("{icon_unknown}");
  });
  it("the help document names the icons in words", () => {
    expect(iconWords("The Concepts button {icon_concepts} (under {icon_help})")).toBe("The Concepts button [Concepts icon] (under [Help icon])");
  });
});
