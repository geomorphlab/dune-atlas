import { describe, expect, it } from "vitest";
import { roseSvg } from "../src/core/cell/roses";
import { fluxRoseHeading, petalCaptionHtml, petalOffset } from "../src/core/cell/petals";

const opts = (petalOffsetDeg: number) => roseSvg({
  values: [[1], [0], [0], [0], [0], [0], [0], [0]], colors: ["#fff"], title: "t", desc: "d", ringFormat: String,
  arrows: [{ bearing: 0, color: "#f00", label: "RDD" }], petalOffset: petalOffsetDeg, size: 200,
});
const petalPath = (svg: string) => /<g class="rose-petals"[^>]*><path d="([^"]+)"/.exec(svg)![1];
const arrowLine = (svg: string) => /<g class="rose-arrow"[^>]*><title>RDD<\/title><line ([^/]+)\/>/.exec(svg)![1];

describe("flux rose petal convention", () => {
  it("from turns the petals 180° and leaves the arrows", () => {
    const toward = opts(petalOffset("toward")), from = opts(petalOffset("from"));
    // north petal (toward): outer arc above the centre (y < 100); from: below
    const ys = (d: string) => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]));
    expect(Math.min(...ys(petalPath(toward)))).toBeLessThan(100);
    expect(Math.max(...ys(petalPath(from)))).toBeGreaterThan(100);
    expect(Math.min(...ys(petalPath(from)))).toBeGreaterThanOrEqual(100);
    expect(arrowLine(from)).toBe(arrowLine(toward));
  });
  it("texts follow the switch", () => {
    expect(fluxRoseHeading("toward")).toBe("Sand flux rose (time-averaged, transport toward)");
    expect(fluxRoseHeading("from")).toBe("Sand flux rose (time-averaged, transport from)");
    expect(petalCaptionHtml("toward")).toBe("Direction sand moves TOWARD");
    expect(petalCaptionHtml("from")).toMatch(/comes FROM.*arrows point .*TOWARD/);
  });
});
