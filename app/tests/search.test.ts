// @vitest-environment happy-dom
// Search box: named-place matching (diacritics, both name lines, aliases, typing errors), the place lists
// in the registry (schema-valid, empty and disabled until the names are approved), the search UI
// (feedback while typing, Enter flies there, named search hidden while disabled), and the naming note.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it, vi } from "vitest";
import { editDistance, loadPlaces, matchPlaces, nameScore, PLACES_DISCLAIMER, placeBounds, placesNote, searchKey, type Place } from "../src/core/search/places";
import { SearchBox, searchZoom, SEARCH_TEXT } from "../src/core/ui/search";
import { infoHtml } from "../src/core/ui/layerPanel";
import { loadRegistry } from "../src/core/registry/load";
import { PROFILE } from "../src/bodies/earth/profile";

const REG_DIR = path.resolve(__dirname, "../../registry");
const P = (o: Partial<Place> & { id: string; line1: string }): Place => ({ lat: 0, lon: 0, radius_km: 50, sources: ["test"], ...o });
const PLACES: Place[] = [
  P({ id: "grand-erg-oriental", line1: "Grand Erg Oriental", line2: { text: "العرق الشرقي الكبير", lang: "ar" }, countries: ["Algeria", "Tunisia"], lat: 30.5, lon: 7.5, radius_km: 300 }),
  P({ id: "rub-al-khali", line1: "Rubʿ al Khali", line2: { text: "الربع الخالي", lang: "ar" }, aliases: ["Empty Quarter"], countries: ["Saudi Arabia", "Oman", "United Arab Emirates", "Yemen"], lat: 20, lon: 50, radius_km: 500 }),
  P({ id: "taklamakan", line1: "Taklamakan Desert", line2: { text: "塔克拉玛干沙漠", lang: "zh-Hans" }, countries: ["China"], lat: 39, lon: 83, radius_km: 400 }),
  P({ id: "erg-chebbi", line1: "Erg Chebbi", countries: ["Morocco"], lat: 31.15, lon: -3.97, radius_km: 15 }),
  P({ id: "nordpolar", line1: "Olympia Undae", lat: 81, lon: 180, radius_km: 600 }),
];

describe("place matching", () => {
  it("search keys ignore case, diacritics, ʿayn and apostrophes", () => {
    expect(searchKey("Rubʿ al Khali")).toBe("rub al khali");
    expect(searchKey("Rub' al-Khālī")).toBe("rub al khali");
    expect(searchKey("ÉRG Chèbbi")).toBe("erg chebbi");
    expect(searchKey("الربع الخالي")).toBe("الربع الخالي");
  });
  it("finds a place by either line or an alias, best first", () => {
    expect(matchPlaces("rub al", PLACES)[0].place.id).toBe("rub-al-khali");
    expect(matchPlaces("Rub' al-Khālī", PLACES)[0].place.id).toBe("rub-al-khali");
    expect(matchPlaces("empty quarter", PLACES)[0]).toMatchObject({ matched: "Empty Quarter" });
    expect(matchPlaces("الربع", PLACES)[0].place.id).toBe("rub-al-khali");
    expect(matchPlaces("塔克拉", PLACES)[0].place.id).toBe("taklamakan");
    expect(matchPlaces("oriental", PLACES)[0].place.id).toBe("grand-erg-oriental");
    expect(matchPlaces("erg", PLACES).map((h) => h.place.id)).toEqual(["erg-chebbi", "grand-erg-oriental"]);
  });
  it("tolerates typing errors (transpositions, one or two letters)", () => {
    expect(matchPlaces("taklamkan", PLACES)[0]?.place.id).toBe("taklamakan");
    expect(matchPlaces("Teklamakan", PLACES)[0]?.place.id).toBe("taklamakan");
    expect(matchPlaces("erg chebi", PLACES)[0]?.place.id).toBe("erg-chebbi");
    expect(matchPlaces("olmypia", PLACES)[0]?.place.id).toBe("nordpolar");
    expect(matchPlaces("zzzz", PLACES)).toEqual([]);
    expect(editDistance("abcd", "abdc")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(nameScore("x", "")).toBe(0);
  });
  it("place bounds follow the radius (wider in longitude away from the equator; Mars 0-360 east)", () => {
    const [w, s, e, n] = placeBounds({ lat: 60, lon: 10, radius_km: 111.2 }, 6371);
    expect(n - s).toBeCloseTo(2, 1);
    expect(e - w).toBeGreaterThan(3.5);
    expect(placeBounds({ lat: 0, lon: 350, radius_km: 59 }, 3389.5)[0]).toBeCloseTo(-11, 0);
  });
});

describe("place lists in the registry", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(REG_DIR, "places.schema.json"), "utf8"));
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  it.each(["earth", "mars"])("registry/%s/places.yaml is schema-valid", (b) => {
    const doc = yaml.load(fs.readFileSync(path.join(REG_DIR, b, "places.yaml"), "utf8"));
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
  });
  it("Earth: disabled and empty (names under review); Mars: enabled", () => {
    expect(yaml.load(fs.readFileSync(path.join(REG_DIR, "earth", "places.yaml"), "utf8"))).toEqual({ enabled: false, places: [] });
    const mars = yaml.load(fs.readFileSync(path.join(REG_DIR, "mars", "places.yaml"), "utf8")) as { enabled: boolean; places: Place[] };
    expect(mars.enabled).toBe(true);
    expect(mars.places.length).toBeGreaterThan(100);
  });
  it("the schema accepts a full entry and rejects a bad one", () => {
    expect(validate({ enabled: true, places: [PLACES[1]] })).toBe(true);
    expect(validate({ enabled: true, places: [{ id: "x", line1: "X", lat: 99, lon: 0, radius_km: 1, sources: ["s"] }] })).toBe(false);
    expect(validate({ enabled: true, places: [{ id: "x", line1: "X", line2: { text: "Х" }, lat: 0, lon: 0, radius_km: 1, sources: ["s"] }] })).toBe(false);
  });
  it("the app loads the body's list (disabled)", () => {
    expect(loadPlaces()).toEqual({ enabled: false, places: [] });
    expect(loadPlaces({ x: "enabled: true\nplaces: []\n" }).enabled).toBe(true);
    expect(loadPlaces({})).toEqual({ enabled: false, places: [] });
  });
  it("equally good matches: larger mapped dune area first, then the name", () => {
    const L = [P({ id: "a", line1: "Alpha crater", dune_km2: 10 }), P({ id: "b", line1: "Beta crater", dune_km2: 500 }), P({ id: "c", line1: "Gamma crater" })];
    expect(matchPlaces("crater", L).map((h) => h.place.id)).toEqual(["b", "a", "c"]);
    expect(matchPlaces("alpha", L)[0].place.id).toBe("a");   // a better match wins over a larger area
  });
  it("the naming note: none while disabled or empty; the list's own note, else the default", () => {
    expect(placesNote({ enabled: false, places: PLACES, note: "N" })).toBe("");
    expect(placesNote({ enabled: true, places: [], note: "N" })).toBe("");
    expect(placesNote({ enabled: true, places: PLACES, note: "N" })).toBe("N");
    expect(placesNote({ enabled: true, places: PLACES })).toBe(PLACES_DISCLAIMER);
    expect(loadPlaces({ x: "enabled: true\nnote: N\nplaces: []\n" }).note).toBe("N");
  });
  it("the naming note is drafted but not shown in the dune layer's ⓘ while the named search is disabled", () => {
    const dunes = loadRegistry().registry.layers.find((l) => l.invertSource)!;
    expect(PLACES_DISCLAIMER).toMatch(/^Dune-field names in the search are for navigation only\./);
    expect(infoHtml(dunes)).not.toContain("navigation only");
  });
});

function box(o: { enabled?: boolean; range?: 180 | 360; note?: string; goTo?: (lat: number, lon: number) => Promise<string> } = {}) {
  const goTo = vi.fn(o.goTo ?? (async () => "done"));
  const goToPlace = vi.fn((p: Place) => p.line1);
  const b = new SearchBox({ lonRange: o.range ?? 180, example: "e.g. -24.5, 15.2", conventionNote: o.note, places: { enabled: !!o.enabled, places: PLACES }, goTo, goToPlace });
  document.body.replaceChildren(b.el);
  const type = (s: string) => { b.input.value = s; b.input.dispatchEvent(new Event("input")); };
  return { b, goTo, goToPlace, type };
}

describe("search box", () => {
  it("coordinates only while the place list is disabled: label, placeholder, no listbox role", () => {
    const { b, type } = box();
    expect(b.el.getAttribute("role")).toBe("search");
    expect(b.el.querySelector("label")!.textContent).toBe(SEARCH_TEXT.label);
    expect(b.input.placeholder).toBe("e.g. -24.5, 15.2");
    expect(b.input.getAttribute("role")).toBeNull();
    type("Erg Chebbi");
    expect(b.list.hidden).toBe(true);
    expect(b.status.textContent).toBe("Cannot read: no numbers found.");
  });
  it("feedback while typing; Enter flies to the point", async () => {
    const { b, goTo, type } = box();
    type("24°30′S 15°12′E");
    expect(b.status.textContent).toBe("Go to 24.5000° S, 15.2000° E");
    expect(b.status.dataset.kind).toBe("ok");
    type("95, 10");
    expect(b.status.textContent).toBe("Cannot read: latitude must be between -90 and 90 (latitude comes first).");
    expect(b.status.dataset.kind).toBe("error");
    await b.submit();
    expect(goTo).not.toHaveBeenCalled();
    type("-24.5, 15.2");
    await b.submit();
    expect(goTo).toHaveBeenCalledWith(-24.5, 15.2);
    expect(b.status.textContent).toBe("done");
    expect(b.status.getAttribute("aria-live")).toBe("polite");
  });
  it("Mars: east-positive feedback, the convention note under the field and the conversion of a west longitude", async () => {
    const { b, goTo, type } = box({ range: 360, note: "Planetocentric latitude, east-positive longitude (0–360° E)." });
    expect(b.el.querySelector(".search-note")!.textContent).toContain("east-positive");
    expect(b.input.getAttribute("aria-describedby")).toContain("note");
    type("10, -10");
    expect(b.status.textContent).toBe("Go to 10.0000° N, 350.0000° E (10° W = 350° E (east-positive))");
    await b.submit();
    expect(goTo).toHaveBeenCalledWith(10, 350);
  });
  it("Escape clears the field (and stays in it)", () => {
    const { b, type } = box();
    type("1, 2");
    const e = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    b.input.dispatchEvent(e);
    expect(b.input.value).toBe("");
    expect(e.defaultPrevented).toBe(true);
    expect(b.status.hidden).toBe(true);
  });
  it("with an enabled list: combobox with results showing both lines and the countries; arrows and Enter pick", async () => {
    const { b, goToPlace, type } = box({ enabled: true });
    expect(b.input.getAttribute("role")).toBe("combobox");
    type("rub");
    const hits = [...b.list.querySelectorAll(".search-hit")];
    expect(hits[0].querySelector(".hit-line1")!.textContent).toBe("Rubʿ al Khali");
    expect(hits[0].querySelector(".hit-line2")!.getAttribute("lang")).toBe("ar");
    expect(hits[0].querySelector(".hit-country")!.textContent).toBe("Saudi Arabia, Oman, United Arab Emirates, Yemen");
    expect(b.input.getAttribute("aria-expanded")).toBe("true");
    type("erg");
    b.input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(b.input.getAttribute("aria-activedescendant")).toMatch(/-1$/);
    await b.submit();
    expect(goToPlace).toHaveBeenCalledWith(expect.objectContaining({ id: "grand-erg-oriental" }));
    expect(b.list.hidden).toBe(true);
    type("qqqq");
    expect(b.status.textContent).toBe(SEARCH_TEXT.noPlace);
  });
  it("zoom shows a grid cell (Earth 0.1° and 0.25°, Mars 2°); Earth reads -180..180", () => {
    expect(searchZoom(0.1)).toBe(7);
    expect(searchZoom(-0.25)).toBe(5.5);
    expect(searchZoom(2)).toBe(2.5);
    expect(PROFILE.search.lonRange).toBe(180);
    expect(PROFILE.search.conventionNote).toBeUndefined();
  });
});
