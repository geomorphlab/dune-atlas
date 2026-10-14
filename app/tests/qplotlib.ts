// Shared by tests/qplot.test.ts and tests/mars/qplot.test.ts: the "<quantity> vs threshold / grain diameter" plot.
import { expect } from "vitest";
import { linePlotSvg } from "../src/cell/lineplot";
import { SENTINEL } from "../src/cell/qplot";

/** x tick labels of a line plot and whether each fits inside the SVG width (half its width either side) */
export function xTickFit(svg: string, fs = 10): { label: string; ok: boolean }[] {
  const W = Number(/viewBox="0 0 ([\d.]+) /.exec(svg)![1]);
  return [...svg.matchAll(/<text x="([\d.]+)" y="[\d.]+" text-anchor="middle">([^<]+)<\/text>/g)].map((m) => {
    const x = Number(m[1]), half = 0.3 * fs * m[2].length;
    return { label: m[2], ok: x + half <= W + 0.01 && x - half >= 0 };
  });
}

/** line-plot options: fixed direction axis with wrap breaks; sentinels marked and outside the autoscale */
export function checkLinePlotOptions(x: number[]) {
  const n = x.length;
  const bearing = Array.from({ length: n }, (_, k) => (340 + 2 * k) % 360);   // crosses north once
  const svg = linePlotSvg({ x, y: bearing, currentIndex: 3, xLabel: "x", yLabel: "y", title: "t", yRange: [0, 360], yTicks: [0, 90, 180, 270, 360], wrap: 360 });
  expect((svg.match(/<polyline/g) ?? []).length).toBe(2);
  for (const t of ["0", "90", "180", "270", "360"]) expect(svg).toContain(`text-anchor="end">${t}</text>`);
  const ratio = Array.from({ length: n }, (_, k) => (k % 10 === 3 ? SENTINEL : k % 10 === 7 ? -SENTINEL : 1 + k / 10));
  const s2 = linePlotSvg({ x, y: ratio, currentIndex: 3, xLabel: "x", yLabel: "y", title: "t", sentinel: SENTINEL });
  expect((s2.match(/class="offscale"/g) ?? []).length).toBe(ratio.filter((v) => Math.abs(v) >= SENTINEL).length);
  const yTicks = [...s2.matchAll(/text-anchor="end">([^<]+)<\/text>/g)].map((m) => Number(m[1]));
  expect(Math.max(...yTicks)).toBeLessThan(100);   // the autoscale ignores ±60,000
  const dp = Array.from({ length: n }, (_, k) => 1000 * 10 ** (-5 * k / (n - 1)));
  const s3 = linePlotSvg({ x, y: dp, currentIndex: 3, xLabel: "x", yLabel: "y", title: "t", logY: true });
  // log axis over 5 decades: plain decimal labels at decades (every other one when there are more than 5)
  const logLabels = [...s3.matchAll(/text-anchor="end">([^<]+)<\/text>/g)].map((m) => m[1]);
  expect(logLabels.length).toBeGreaterThanOrEqual(3);
  for (const l of logLabels) expect(l).toMatch(/^(0\.0*1|10*)$/);
}
