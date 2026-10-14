// Search box: typed coordinates (decimal, DMS, signed or N/S/E/W, both longitude conventions).
import { describe, expect, it } from "vitest";
import { formatCoord, parseCoordinates, wrapLonTo } from "../src/core/search/coords";

const ok = (s: string, range: 180 | 360 = 180) => {
  const r = parseCoordinates(s, range);
  if (!r.ok) throw new Error(`${s}: ${r.error}`);
  return r;
};
const close = (r: { lat: number; lon: number }, lat: number, lon: number) => {
  expect(r.lat).toBeCloseTo(lat, 6);
  expect(r.lon).toBeCloseTo(lon, 6);
};

describe("decimal degrees", () => {
  it.each([
    ["-24.5, 15.2", -24.5, 15.2],
    ["-24.5 15.2", -24.5, 15.2],
    ["  -24.5 ,15.2  ", -24.5, 15.2],
    ["24.5 S, 15.2 E", -24.5, 15.2],
    ["24.5S 15.2E", -24.5, 15.2],
    ["S24.5 E15.2", -24.5, 15.2],
    ["S 24.5, E 15.2", -24.5, 15.2],
    ["15.2 E, 24.5 S", -24.5, 15.2],          // letters set the axis, whatever the order
    ["15.2E 24.5S", -24.5, 15.2],
    ["24.5 south 15.2 east", -24.5, 15.2],
    ["24.5° S 15.2° W", -24.5, -15.2],
    ["−24.5, −15.2", -24.5, -15.2],             // Unicode minus
    ["+24.5, +15.2", 24.5, 15.2],
    ["24,5; 15,2", 24.5, 15.2],                 // decimal commas with a semicolon separator
    ["24.5/15.2", 24.5, 15.2],
    [".5, -.25", 0.5, -0.25],
    ["0, 0", 0, 0],
    ["90, 180", 90, 180],
    ["-90, -180", -90, -180],
  ])("%s", (s, lat, lon) => close(ok(s), lat, lon));
});

describe("degrees, minutes, seconds", () => {
  it.each([
    ["24°30′S, 15°12′E", -24.5, 15.2],
    ["24°30'S 15°12'E", -24.5, 15.2],
    ["24° 30' 36\" N, 15° 12' 0\" W", 24.51, -15.2],
    ["24°30′36″N 15°12′W", 24.51, -15.2],
    ["24 30 36 N 15 12 0 W", 24.51, -15.2],     // no marks: the letters end each value
    ["24°30′ 15°12′", 24.5, 15.2],              // no letters: a new degree mark starts the longitude
    ["-24°30′, 15°12.5′", -24.5, 15 + 12.5 / 60],
    ["24d30'S 15d12'E", -24.5, 15.2],
    ["24º30’S, 15º12’E", -24.5, 15.2],
  ])("%s", (s, lat, lon) => close(ok(s), lat, lon));
});

describe("errors are explained", () => {
  it.each([
    ["", "type a latitude"],
    ["Namib", "no numbers"],
    ["24.5", "two values"],
    ["1, 2, 3", "3 values"],
    ["24 30 15 12", "comma"],
    ["95, 10", "latitude must be between -90 and 90"],
    ["120, 45", "latitude comes first"],
    ["10, 400", "longitude must be between"],
    ["-24.5 S, 15 E", "minus sign or a hemisphere letter"],
    ["24 N, 15 S", "both values have N/S"],
    ["24 E 15 W", "both values have E/W"],
    ["24°75′ N, 15 E", "minutes must be below 60"],
    ["24°30′75″ N, 15 E", "seconds must be below 60"],
    ["24.5°30′ N, 15 E", "only the last"],
    ["24 x 15", "\"x\" is not part"],
    ["24 # 15", "\"#\" is not part"],
    ["°24, 15", "mark without a number"],
    ["24.5,", "missing"],
  ])("%s", (s, msg) => {
    const r = parseCoordinates(s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(msg);
  });
});

describe("longitude conventions", () => {
  it("Earth (-180..180): longitudes above 180 east are wrapped and reported", () => {
    const r = ok("10, 200");
    close(r, 10, -160);
    expect(r.note).toBe("200° E = 160° W");
  });
  it("Mars (0..360 east-positive): west longitudes are converted and reported", () => {
    const r = ok("10, -10", 360);
    close(r, 10, 350);
    expect(r.note).toBe("10° W = 350° E (east-positive)");
    close(ok("4.5 N 137.4 E", 360), 4.5, 137.4);
    close(ok("4.5 N 222.6 E", 360), 4.5, 222.6);
    close(ok("4.5 N 137.4 W", 360), 4.5, 222.6);
    expect(ok("4.5 N 222.6 E", 360).note).toBeUndefined();
  });
  it("wrapLonTo and formatCoord", () => {
    expect(wrapLonTo(-10, 360)).toBe(350);
    expect(wrapLonTo(360, 360)).toBe(0);
    expect(wrapLonTo(190, 180)).toBe(-170);
    expect(wrapLonTo(180, 180)).toBe(180);
    expect(formatCoord(-24.5, 15.2)).toBe("24.5000° S, 15.2000° E");
    expect(formatCoord(24.5, -15.2)).toBe("24.5000° N, 15.2000° W");
    expect(formatCoord(-24.5, -10, 360, 2)).toBe("24.50° S, 350.00° E");
  });
});
