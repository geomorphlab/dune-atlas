// @vitest-environment happy-dom
// Mars named search: the place list (IAU Gazetteer of Planetary Nomenclature features with mapped dunes;
// registry/mars/places.yaml), its longitude convention, spot-checked centres, aliases, ranking, the results
// list (name and feature type) and the naming note in the dune layer's info.
import { describe, expect, it, vi } from "vitest";
import { loadPlaces, matchPlaces, placeBounds, type Place } from "../../src/core/search/places";
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
  it("longitudes in the atlas's search convention: planetocentric, east-positive 0-360", () => {
    expect(PROFILE.search.lonRange).toBe(360);
    for (const p of LIST.places) { expect(p.lon, p.id).toBeGreaterThanOrEqual(0); expect(p.lon, p.id).toBeLessThan(360); expect(Math.abs(p.lat)).toBeLessThanOrEqual(90); }
  });
  it.each([
    // name, type, lat, lon (° E), from the Gazetteer feature pages
    ["Gale crater", "Crater", -5.37, 137.81],
    ["Nili Patera", "Patera", 8.97, 67.17],
    ["Proctor crater", "Crater", -47.63, 29.72],
    ["Olympia Undae", "Unda", 81.16, 178.48],
    ["Endeavour crater", "Crater", -2.28, 354.8],
  ])("%s: centre and type", (n, type, lat, lon) => {
    const p = byName(n);
    expect(p.type).toBe(type);
    expect(p.lat).toBeCloseTo(lat, 1);
    expect(p.lon).toBeCloseTo(lon, 1);
  });
  it("Endeavour (west of the prime meridian) frames the map around 5° W", () => {
    const [w, , e] = placeBounds(byName("Endeavour crater"), PROFILE.radiusM / 1000);
    expect((w + e) / 2).toBeCloseTo(-5.2, 1);
  });
  it("the example cell of the tour (Nili Patera) is the place's cell", () => {
    const p = byName("Nili Patera");
    expect(Math.abs(p.lat - 9)).toBeLessThan(1);
    expect(Math.abs(p.lon - 67)).toBeLessThan(1);
  });
});

describe("Mars named search", () => {
  it("aliases find their features", () => {
    expect(matchPlaces("Bagnold Dunes", LIST.places)[0]).toMatchObject({ matched: "Bagnold Dunes", place: { line1: "Gale crater" } });
    expect(matchPlaces("north polar erg", LIST.places)[0].place.line1).toBe("Olympia Undae");
    expect(matchPlaces("Nili Patera dune field", LIST.places)[0].place.line1).toBe("Nili Patera");
    expect(matchPlaces("gale", LIST.places)[0].place.line1).toBe("Gale crater");
    expect(matchPlaces("Proctor", LIST.places)[0].place.line1).toBe("Proctor crater");
  });
  it("ranked by match, then by mapped dune area", () => {
    const hits = matchPlaces("undae", LIST.places, 20);
    const sameScore = hits.filter((h) => h.score === hits[0].score);
    const areas = sameScore.map((h) => h.place.dune_km2 ?? 0);
    expect(areas).toEqual([...areas].sort((a, b) => b - a));
    expect(hits[0].place.line1).toBe("Olympia Undae");
  });
  it("the results list shows the name and the feature type", () => {
    const b = new SearchBox({ lonRange: 360, example: PROFILE.search.example, places: LIST, goTo: vi.fn(async () => ""), goToPlace: (p: Place) => p.line1 });
    document.body.replaceChildren(b.el);
    expect(b.el.querySelector("label")!.textContent).toBe(SEARCH_TEXT.labelPlaces);
    b.input.value = "gale"; b.input.dispatchEvent(new Event("input"));
    const li = b.list.querySelector("li")!;
    expect(li.querySelector(".hit-line1")!.textContent).toBe("Gale crater");
    expect(li.querySelector(".hit-type")!.textContent).toBe("Crater");
    expect(li.querySelector(".hit-country")).toBeNull();
    expect(b.list.hidden).toBe(false);
  });
  it("the dune layer's ⓘ carries the Mars naming note (and not Earth's)", () => {
    const dunes = loadRegistry().registry.layers.find((l) => l.id === "dunes")!;
    const html = infoHtml(dunes);
    expect(html).toContain("IAU-approved feature names from the Gazetteer of Planetary Nomenclature");
    expect(html).toContain("the dune fields lie within or near the named features");
    expect(html).not.toContain("Indigenous");
    for (const l of loadRegistry().registry.layers.filter((x) => x.id !== "dunes")) expect(infoHtml(l), l.id).not.toContain("places-note");
  });
  it("help describes the named search", () => {
    expect(HELP_SECTIONS.find((s) => s.id === "search")!.body).toMatch(/^Type a feature name \(e\.g\. Gale crater or Olympia Undae\)/);
  });
});
