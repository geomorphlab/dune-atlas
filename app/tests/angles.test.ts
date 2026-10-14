import { describe, expect, it } from "vitest";
import { angleDiffDeg, bearingToMath, bearingToXY, compassPoint, mathToAxisDeg, mathToBearingDeg, mod, towardToFrom } from "../src/core/util/angles";
import { BIN_TOWARD_BEARING, sectorOf, windRoseData, sectorSums, ROSE_BIN_CHOICES, sectorCentre, sectorsCentred, roseBinChoices, towardBearings } from "../src/core/cell/roses";
import { C } from "../src/core/util/constants";

const PI = Math.PI;
describe("math angle (CCW from east, toward) -> compass bearing", () => {
  it.each([
    [0, 90], [PI / 2, 0], [PI, 270], [-PI, 270], [-PI / 2, 180], [PI / 4, 45], [-PI / 4, 135], [(3 * PI) / 4, 315],
  ])("%f rad -> %f deg", (a, b) => {
    expect(mathToBearingDeg(a)).toBeCloseTo(b, 10);
  });
  it("matches flux.math_to_bearing_deg formula and stays in [0, 360)", () => {
    for (let a = -PI; a <= PI; a += 0.01) {
      const b = mathToBearingDeg(a);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
      expect(mod(90 - (a * 180) / PI, 360)).toBeCloseTo(b, 12);
    }
  });
  it("inverts with bearingToMath", () => {
    for (const b of [0, 10, 90, 181, 270, 359.5]) expect(mathToBearingDeg(bearingToMath(b))).toBeCloseTo(b, 9);
  });
});

describe("toward -> from (wind rose is meteorological)", () => {
  it("wind blowing toward the east (u>0, v=0) comes FROM the west", () => {
    expect(towardToFrom(mathToBearingDeg(Math.atan2(0, 1)))).toBe(270);
  });
  it("wind blowing toward the north (v>0) comes FROM the south", () => {
    expect(towardToFrom(mathToBearingDeg(Math.atan2(1, 0)))).toBe(180);
  });
  it("north-easterly trade wind (u<0, v<0 -> toward SW) comes FROM the NE", () => {
    expect(towardToFrom(mathToBearingDeg(Math.atan2(-1, -1)))).toBeCloseTo(45, 10);
  });
});

describe("axis, compass points, differences", () => {
  it("axis folds to [0,180)", () => {
    expect(mathToAxisDeg(0)).toBeCloseTo(90);
    expect(mathToAxisDeg(PI)).toBeCloseTo(90);
    expect(mathToAxisDeg(PI / 2)).toBeCloseTo(0);
    expect(mathToAxisDeg(PI / 4)).toBeCloseTo(45);
    expect(mathToAxisDeg((3 * PI) / 4)).toBeCloseTo(135);
  });
  it("compass points", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(359)).toBe("N");
    expect(compassPoint(22.5)).toBe("NNE");
    expect(compassPoint(225)).toBe("SW");
  });
  it("angleDiffDeg wraps", () => {
    expect(angleDiffDeg(10, 350)).toBe(20);
    expect(angleDiffDeg(350, 10)).toBe(-20);
  });
  it("SVG vector: N up, E right", () => {
    const [x0, y0] = bearingToXY(0);
    expect(x0).toBeCloseTo(0); expect(y0).toBeCloseTo(-1);
    const [x1, y1] = bearingToXY(90);
    expect(x1).toBeCloseTo(1); expect(y1).toBeCloseTo(0);
  });
});

describe("rose sector binning", () => {
  it("every allowed sector count receives exactly 128/n direction bins (bins align with sector edges)", () => {
    for (const n of ROSE_BIN_CHOICES) {
      const counts = new Array(n).fill(0);
      for (const b of BIN_TOWARD_BEARING) counts[sectorOf(b, n)]++;
      expect(counts.every((c) => c === 128 / n)).toBe(true);
      const fromCounts = new Array(n).fill(0);
      for (const b of BIN_TOWARD_BEARING) fromCounts[sectorOf(towardToFrom(b), n)]++;
      expect(fromCounts.every((c) => c === 128 / n)).toBe(true);
    }
  });
  it("a westerly wind (blowing toward E) lands in the W sector of the wind rose and E sector of the flux rose", () => {
    const j = C.UA_CENTRES.findIndex((a) => a > 0); // bin just CCW of east (toward ~88.6 deg)
    const h = new Uint32Array(128 * 128);
    h[40 * 128 + j] = 100; // speed bin 40 (~6.3 m/s)
    const wr = windRoseData(h, 16);
    expect(wr.freq[12].reduce((a, b) => a + b, 0)).toBeCloseTo(100); // sector 12 = W
    const per = new Float64Array(128); per[j] = 1;
    expect(sectorSums(per, 16)[4]).toBe(1); // sector 4 = E
  });
  it("allowed sector counts all divide 128; sectors centred on N except one-bin sectors", () => {
    for (const n of ROSE_BIN_CHOICES) expect(128 % n).toBe(0);
    expect(sectorsCentred(16)).toBe(true);
    expect(sectorCentre(0, 16)).toBe(0);
    expect(sectorsCentred(128)).toBe(false);
    expect(sectorCentre(0, 128)).toBeCloseTo(1.40625, 10);
    // each bin's bearing lies inside its sector
    for (const n of ROSE_BIN_CHOICES) for (const b of BIN_TOWARD_BEARING) {
      const c = sectorCentre(sectorOf(b, n), n);
      expect(Math.abs(angleDiffDeg(b, c))).toBeLessThanOrEqual(180 / n + 1e-9);
    }
  });
  it("sector choices follow the number of source bins (e.g. 72 or 36 direction bins)", () => {
    expect(roseBinChoices(128)).toEqual([8, 16, 32, 64, 128]);
    expect(roseBinChoices(72)).toEqual([8, 9, 12, 18, 24, 36, 72]);
    // centre-at-N source bins (36 bins of 10 deg centred on 0): odd multiples are centred
    const ua = Array.from({ length: 36 }, (_, k) => ((90 - k * 10) * Math.PI) / 180);
    for (const n of roseBinChoices(36)) {
      const counts = new Array(n).fill(0);
      for (const b of towardBearings(ua)) counts[sectorOf(b, n, ua)]++;
      expect(counts.every((c) => c === 36 / n)).toBe(true);
    }
  });
  it("wind rose frequencies sum to 100 %", () => {
    const h = new Uint32Array(128 * 128).map((_, i) => (i * 7919) % 13);
    const wr = windRoseData(h);
    expect(wr.freq.flat().reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });
});
