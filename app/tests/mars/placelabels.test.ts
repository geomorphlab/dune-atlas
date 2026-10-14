// @vitest-environment happy-dom
// Mars dune-field name labels: the Gazetteer list on the map (large features at low zoom, small craters
// as you zoom in), the 'Show names' toggle in the Dunes group, the popup, basemap tones, the export credit
// and the help sentence.
import { describe, expect, it } from "vitest";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { PLACE_SOURCE, placeFeatures, placeLabelLayer, placePopupContent } from "../../src/core/map/placelabels";
import { loadPlaces } from "../../src/core/search/places";
import { loadRegistry } from "../../src/core/registry/load";
import { initialAppState } from "../../src/core/defaultview";
import { renderLayerPanel } from "../../src/core/ui/layerPanel";
import { Store } from "../../src/core/store";
import { HELP_SECTIONS, TOUR_STEPS } from "../../src/core/ui/helpText";
import { PROFILE } from "../../src/bodies/mars/profile";

const LIST = loadPlaces();
const R_KM = PROFILE.radiusM / 1000;
const fc = placeFeatures(LIST, R_KM);
const prop = (name: string) => fc.features.find((f) => f.properties!.line1 === name)!.properties!;

describe("Mars name labels", () => {
  it("a valid label layer over the whole list (no glyph server: local glyphs)", () => {
    const style = { version: 8, sources: { [PLACE_SOURCE]: { type: "geojson", data: fc } }, layers: [placeLabelLayer(true, "dark")] };
    expect(validateStyleMin(style as never)).toEqual([]);
    expect(fc.features).toHaveLength(LIST.places.length);
    for (const f of fc.features) {
      const [lon, lat] = f.geometry.coordinates;
      expect(lon, f.properties!.id).toBeGreaterThanOrEqual(-180);
      expect(lon, f.properties!.id).toBeLessThanOrEqual(180);
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(f.properties!.minzoom).toBeGreaterThanOrEqual(0);
      expect(f.properties!.minzoom).toBeLessThanOrEqual(9);
      expect(f.properties!.line2).toBeUndefined();
    }
  });
  it("large features at low zoom (Olympia Undae, the chasmata), small craters as you zoom in", () => {
    expect(prop("Olympia Undae").minzoom).toBeLessThan(1);
    const chasmata = LIST.places.filter((p) => p.type === "Chasma").map((p) => prop(p.line1).minzoom);
    const craters25 = LIST.places.filter((p) => p.type === "Crater" && p.radius_km <= 25).map((p) => prop(p.line1).minzoom);
    expect(chasmata.length).toBeGreaterThan(5);
    expect(craters25.length).toBeGreaterThan(5);
    expect(Math.max(...chasmata)).toBeLessThan(Math.min(...craters25));
    expect(prop("Gale crater").minzoom).toBeLessThan(prop("Endeavour crater").minzoom);
    expect(prop("Olympia Undae").rank).toBeLessThan(prop("Gale crater").rank);
    expect(prop("Olympia Undae").size).toBe(14);
    expect(prop("Endeavour crater").size).toBe(10);
  });
  it("near the pole and west of 0° E: centres as in the list (-180..180)", () => {
    const ou = fc.features.find((f) => f.properties!.line1 === "Olympia Undae")!.geometry.coordinates;
    expect(ou).toEqual([178.48, 81.16]);
    expect(fc.features.find((f) => f.properties!.line1 === "Endeavour crater")!.geometry.coordinates).toEqual([-5.2, -2.28]);
  });
  it("popup: name, feature type, aliases, mapped dune area, the Gazetteer and the feature page", () => {
    const el = placePopupContent(LIST.places.find((p) => p.line1 === "Gale crater")!);
    expect(el.querySelector(".place-name")!.textContent).toBe("Gale crater");
    expect(el.querySelector(".place-meta")!.textContent).toBe("Crater");
    expect(el.textContent).toContain("Also called: Bagnold Dunes");
    expect(el.textContent).toMatch(/Mapped dune area: 836 km²/);
    expect([...el.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["https://planetarynames.wr.usgs.gov/", "https://planetarynames.wr.usgs.gov/Feature/2071"]);
  });
  it("'Show names' in the Dunes group, off by default", () => {
    const reg = loadRegistry().registry;
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const store = new Store(initialAppState(reg, {}, reg.defaultDataset ?? "fv3-beta1"));
    renderLayerPanel(document.getElementById("layer-panel")!, reg, store);
    const cb = document.getElementById("show-names") as HTMLInputElement;
    expect(cb).not.toBeNull();
    expect(cb.checked).toBe(false);
    const group = cb.closest("details.layer-group")!;
    expect(group.querySelector("summary")!.textContent).toBe("Dunes");
    expect(cb.closest("label")!.textContent).toMatch(/^ Show names/);
    cb.checked = true; cb.dispatchEvent(new Event("change"));
    expect(store.state.names).toBe(true);
    store.set({ names: false });
    expect(cb.checked).toBe(false);
  });
  it("every basemap states its tone; the export credit names the Gazetteer", () => {
    const reg = loadRegistry().registry;
    for (const b of reg.basemaps) expect(["dark", "light"], b.id).toContain(b.tone);
    expect(reg.basemaps.find((b) => b.id === "hrsc-mola-hillshade")!.tone).toBe("dark");
    expect(LIST.credit).toMatch(/^Feature names: Gazetteer of Planetary Nomenclature/);
  });
  it("help: one sentence in Layers; no new tour step", () => {
    expect(HELP_SECTIONS.find((s) => s.id === "layers")!.body).toMatch(/Show names, in the Dunes group, labels named dune fields and features on the map/);
    expect(TOUR_STEPS.map((s) => s.id)).not.toContain("names");
    expect(TOUR_STEPS).toHaveLength(9);   // unchanged by the names
  });
});
