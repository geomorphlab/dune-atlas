// Tour popover placement: fully on screen, never over its own highlight when there is room.
import { describe, it, expect } from "vitest";
import { tourPlacement } from "../src/core/ui/tour";

const inView = (p: { left: number; top: number }, pop: { w: number; h: number }, v: { w: number; h: number }) =>
  p.left >= 12 && p.top >= 12 && p.left + pop.w <= v.w - 12 && p.top + pop.h <= v.h - 12;
const overlaps = (p: { left: number; top: number }, pop: { w: number; h: number }, r: { left: number; top: number; width: number; height: number }) =>
  p.left < r.left + r.width && p.left + pop.w > r.left && p.top < r.top + r.height && p.top + pop.h > r.top;

describe("tourPlacement", () => {
  const pop = { w: 340, h: 200 };
  for (const v of [{ w: 1370, h: 900 }, { w: 1024, h: 700 }, { w: 800, h: 600 }]) {
    it(`targets at the right edge, the top-left panel and the bottom stay on screen at ${v.w}x${v.h}`, () => {
      const targets = [
        { left: v.w - 46, top: 60, width: 40, height: 40 },          // tools column button (steps 8-9)
        { left: v.w - 46, top: 8, width: 40, height: v.h * 0.4 },     // whole tools column
        { left: 6, top: 6, width: 300, height: v.h * 0.6 },          // layer panel (step 3)
        { left: v.w - 420, top: 6, width: 414, height: v.h - 12 },   // open cell panel
        { left: 200, top: v.h - 40, width: 300, height: 30 },        // bottom attribution
      ];
      for (const t of targets) {
        const p = tourPlacement(t, pop, v);
        expect(inView(p, pop, v), JSON.stringify({ t, p })).toBe(true);
        expect(overlaps(p, pop, t), JSON.stringify({ t, p })).toBe(false);
      }
    });
  }
  it("prefers below when it fits", () => {
    expect(tourPlacement({ left: 400, top: 100, width: 100, height: 40 }, pop, { w: 1370, h: 900 }).side).toBe("below");
  });
  it("a narrow phone screen still keeps the popover inside the view", () => {
    const v = { w: 360, h: 640 }, p2 = { w: 336, h: 220 };
    const p = tourPlacement({ left: 6, top: 6, width: 348, height: 400 }, p2, v);
    expect(p.left).toBeGreaterThanOrEqual(12 - 0.01 - 0); expect(p.top + p2.h).toBeLessThanOrEqual(v.h - 12);
  });
});
