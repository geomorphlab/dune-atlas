// @vitest-environment happy-dom
// Mars named search: the place list (IAU Gazetteer of Planetary Nomenclature features with mapped dunes;
// registry/mars/places.yaml), its longitude convention, spot-checked centres, aliases, ranking, the results
// list (name and feature type) and the naming note in the dune layer's info.
import { describe, expect, it, vi } from "vitest";
import { loadPlaces, matchPlaces, placeBounds, type Place } from "../../src/core/search/places";
import { formatCoord, parseCoordinates } from "../../src/core/search/coords";
import { SearchBox, SEARCH_TEXT } from "../../src/core/ui/search";
import { infoHtml } from "../../src/core/ui/layerPanel";
import { loadRegistry } from "../../src/core/registry/load";
import { PROFILE } from "../../src/bodies/mars/profile";
import { HELP_SECTIONS } from "../../src/core/ui/helpText";

const LIST = loadPlaces();
const byName = (n: string) => LIST.places.find((p) => p.line1 === n)!;
const GAZ = "IAU/USGS Gazetteer of Planetary Nomenclature, https://planetarynames.wr.usgs.gov/";

describe("Mars place list", () => {
  it("enabled; every entry IAU-sourced with its Gazetteer feature page, a type, a dune area and no countries", () => {
    expect(LIST.enabled).toBe(true);
    expect(LIST.places.length).toBeGreaterThan(100);
    for (const p of LIST.places) {
      expect(p.sources[0], p.id).toBe(GAZ);
      expect(p.sources[1], p.id).toMatch(/^https:\/\/planetarynames\.wr\.usgs\.gov\/Feature\/\d+$/);
      expect(p.type, p.id).toMatch(/^[A-Z][a-z]+$/);
      expect(p.dune_km2, p.id).toBeGreaterThanOrEqual(10);
      expect(p.countries, p.id).toBeUndefined();
      expect(p.line2, p.id).toBeUndefined();
      expect(p.radius_km, p.id).toBeGreaterThanOrEqual(25);
      expect(p.radius_km, p.id).toBeLessThanOrEqual(600);
    }
    expect(new Set(LIST.places.map((p) => p.id)).size).toBe(LIST.places.length);
  });
  it("longitudes in the atlas convention: planetocentric, east-positive -180..180", () => {
    expect(PROFILE.search.lonRange).toBe(180);
    expect(LIST.places.some((p) => p.lon < 0)).toBe(true);
    for (const p of LIST.places) { expect(p.lon, p.id).toBeGreaterThanOrEqual(-180); expect(p.lon, p.id).toBeLessThanOrEqual(180); expect(Math.abs(p.lat)).toBeLessThanOrEqual(90); }
  });
  it.each([
    // name, type, lat, lon (° E), from the Gazetteer feature pages
    ["Gale Crater Dune Field", "Crater", -5.37, 137.81],
    ["Nili Patera Dune Field", "Patera", 8.97, 67.17],
    ["Proctor Crater Dune Field", "Crater", -47.63, 29.72],
    ["Olympia Undae", "Unda", 81.16, 178.48],
    ["Endeavour Crater Dune Field", "Crater", -2.28, -5.2],
  ])("%s: centre and type", (n, type, lat, lon) => {
    const p = byName(n);
    expect(p.type).toBe(type);
    expect(p.lat).toBeCloseTo(lat, 1);
    expect(p.lon).toBeCloseTo(lon, 1);
  });
  it("Endeavour (west of the prime meridian) frames the map around 5° W", () => {
    const [w, , e] = placeBounds(byName("Endeavour Crater Dune Field"), PROFILE.radiusM / 1000);
    expect((w + e) / 2).toBeCloseTo(-5.2, 1);
  });
  it("a 0-360° E input resolves to -180..180 (Endeavour: 354.80° E = -5.20)", () => {
    const r = parseCoordinates("-2.28, 354.80", PROFILE.search.lonRange);
    expect(r).toMatchObject({ ok: true, lat: -2.28 });
    expect(r.ok && r.lon).toBeCloseTo(-5.2, 6);
    expect(r.ok && r.lon).toBeCloseTo(byName("Endeavour Crater Dune Field").lon, 2);
    expect(r.ok && r.note).toBe("354.8° E = 5.2° W");
    expect(formatCoord(-2.28, 354.8, PROFILE.search.lonRange, 2)).toBe("2.28° S, 5.20° W");
    const b = new SearchBox({ lonRange: PROFILE.search.lonRange, example: PROFILE.search.example, places: LIST, goTo: vi.fn(async () => ""), goToPlace: (p: Place) => p.line1 });
    b.input.value = "2.28 S 354.8 E"; b.input.dispatchEvent(new Event("input"));
    expect(b.status.textContent).toBe("Go to 2.2800° S, 5.2000° W (354.8° E = 5.2° W)");
  });
  it("the example cell of the tour (Nili Patera) is the place's cell", () => {
    const p = byName("Nili Patera Dune Field");
    expect(Math.abs(p.lat - 9)).toBeLessThan(1);
    expect(Math.abs(p.lon - 67)).toBeLessThan(1);
  });
});

describe("Mars named search", () => {
  it("aliases find their features", () => {
    expect(matchPlaces("Bagnold Dunes", LIST.places)[0]).toMatchObject({ matched: "Bagnold Dunes", place: { line1: "Gale Crater Dune Field" } });
    expect(matchPlaces("north polar erg", LIST.places)[0].place.line1).toBe("Olympia Undae");
    expect(matchPlaces("Nili Patera dune field", LIST.places)[0].place.line1).toBe("Nili Patera Dune Field");
    expect(matchPlaces("gale", LIST.places)[0].place.line1).toBe("Gale Crater Dune Field");
    expect(matchPlaces("Proctor", LIST.places)[0].place.line1).toBe("Proctor Crater Dune Field");
  });
  it("ranked by match, then by mapped dune area", () => {
    const hits = matchPlaces("undae", LIST.places, 20);
    const sameScore = hits.filter((h) => h.score === hits[0].score);
    const areas = sameScore.map((h) => h.place.dune_km2 ?? 0);
    expect(areas).toEqual([...areas].sort((a, b) => b - a));
    expect(hits[0].place.line1).toBe("Olympia Undae");
  });
  it("the results list shows the name and the feature type", () => {
    const b = new SearchBox({ lonRange: PROFILE.search.lonRange, example: PROFILE.search.example, places: LIST, goTo: vi.fn(async () => ""), goToPlace: (p: Place) => p.line1 });
    document.body.replaceChildren(b.el);
    expect(b.el.querySelector("label")!.textContent).toBe(SEARCH_TEXT.labelPlaces);
    b.input.value = "gale"; b.input.dispatchEvent(new Event("input"));
    const li = b.list.querySelector("li")!;
    expect(li.querySelector(".hit-line1")!.textContent).toBe("Gale Crater Dune Field");
    expect(li.querySelector(".hit-type")!.textContent).toBe("Crater");
    expect(li.querySelector(".hit-country")).toBeNull();
    expect(b.list.hidden).toBe(false);
  });
  it("the dune layer's ⓘ carries the Mars naming note (and not Earth's)", () => {
    const dunes = loadRegistry().registry.layers.find((l) => l.id === "dunes")!;
    const html = infoHtml(dunes);
    expect(LIST.note).toBe("Dune fields are named after the IAU-approved names of the features they lie in, from the Gazetteer of Planetary Nomenclature (IAU/USGS); undae are IAU names for dune fields themselves. A few informal names are included as aliases.");
    expect(html).toContain('<p class="help places-note">Dune fields are named after the IAU-approved names of the features they lie in, from the <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">Gazetteer of Planetary Nomenclature</a> (IAU/USGS); undae are IAU names for dune fields themselves. A few informal names are included as aliases.</p>');
    expect(html).not.toContain("monash");
    for (const l of loadRegistry().registry.layers.filter((x) => x.id !== "dunes")) expect(infoHtml(l), l.id).not.toContain("places-note");
  });
  it("help describes the named search", () => {
    expect(HELP_SECTIONS.find((s) => s.id === "search")!.body).toMatch(/^Type a feature name \(e\.g\. Gale crater or Olympia Undae\)/);
  });
});
