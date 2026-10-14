// @vitest-environment happy-dom
// One UI for both planets (src/core/body.ts): the Earth build's header label, planet toggle (target URL with
// and without a /mars/ base, embed carried, other planet's default view) and unchanged storage keys.
// The Mars build has the mirror test in tests/mars/body.test.ts.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BODY, BODY_NAME, isLocalHost, otherBodyUrl, storageKey, storageKeyFor } from "../src/core/body";
import { Tools } from "../src/core/ui/tools";
import { TOUR_SEEN_KEY } from "../src/core/ui/tour";
import { sectionOpenKey } from "../src/core/ui/cellPanel";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import { loadRegistry } from "../src/core/registry/load";
import { Store } from "../src/core/store";
import { DEFAULT_VIEW } from "../src/core/defaultview";

const tools = (navigate: (u: string) => void) => new Tools({ startTour: () => {}, shareLink: () => "", exportMap: async () => {}, openAbout: () => {}, navigate });

describe("Earth build: planet toggle and header", () => {
  it("is the Earth build", () => {
    expect(BODY).toBe("earth");
    expect(BODY_NAME).toBe("Earth");
  });
  it("the toggle sits directly under the camera button and opens <base>mars/ (its last view via resume=1, embed carried)", () => {
    const nav = vi.fn();
    const t = tools(nav);
    const btns = [...t.el.querySelectorAll("button.tool-btn")].map((b) => b.className.replace("tool-btn ", ""));
    expect(btns).toEqual(["help-btn", "concepts-btn", "share-btn", "export-btn", "planet-btn"]);
    const b = t.el.querySelector(".planet-btn") as HTMLButtonElement;
    expect([b.getAttribute("aria-label"), b.title]).toEqual(["Switch to Mars", "Switch to Mars"]);
    expect(b.innerHTML).toMatch(/<svg[^>]+width="18" height="18"/);
    expect(b.innerHTML).toMatch(/currentColor/);
    // the test page runs on localhost: the live Mars site (production: <base>mars/, URL rules below)
    expect(location.hostname).toBe("localhost");
    b.click();
    expect(nav).toHaveBeenCalledWith("https://map.geomorphlab.org/mars/?resume=1"); // the other atlas reopens its last view
    history.replaceState(null, "", "/?embed=1&lat=10&lon=20");
    b.click();
    expect(nav).toHaveBeenLastCalledWith("https://map.geomorphlab.org/mars/?embed=1&resume=1");
    history.replaceState(null, "", "/");
  });
  it("header: 'Dune Atlas' + grey 'Earth'; two-line subtitle (no planet) linking the Monash Geomorphology Lab; dataset selector", () => {
    const root = document.createElement("div");
    renderLayerPanel(root, loadRegistry().registry, new Store({ basemap: "x", projection: "globe", utIndex: 29, layers: {}, order: [], dataset: DEFAULT_VIEW.dataset, cell: null, embed: false } as never));
    expect(root.querySelector("h1")!.textContent).toBe("Dune Atlas Earth");
    expect(root.querySelector("h1 .body-name")!.textContent).toBe("Earth");
    const sub = root.querySelector(".subtitle")!;
    expect(sub.innerHTML.split("<br>").map((x) => x.replace(/<[^>]+>/g, ""))).toEqual(["Interactive explorer for aeolian geomorphology", "Developed by the Monash Geomorphology Lab"]);
    const sel = root.querySelector("#dataset-select") as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual(["era5-land", "era5"]);
    const a = sub.querySelector("a")!;
    expect([a.getAttribute("href"), a.getAttribute("target"), a.getAttribute("rel"), a.textContent]).toEqual(["https://www.geomorphlab.org/", "_blank", "noopener", "Monash Geomorphology Lab"]);
  });
  it("planet icon: thin ringed-planet line icon (disc + tilted elliptical ring arcs), same stroke as the other tools", () => {
    const t = tools(() => {});
    const svg = (cls: string) => t.el.querySelector(`.${cls} svg`)!;
    const p = svg("planet-btn"), cam = svg("export-btn");
    expect(p.querySelector("circle")).not.toBeNull();
    const arcs = p.querySelector("path")!.getAttribute("d")!.match(/A[\d.]+ [\d.]+ -?\d+/g)!;
    expect(arcs.length).toBe(3); // front arc over the disc, two back arcs ending at it
    for (const a of arcs) { const [rx, ry] = a.slice(1).split(" ").map(Number); expect(rx).toBeGreaterThan(2 * ry); }
    for (const el of p.querySelectorAll("circle, path")) {
      expect(el.getAttribute("stroke")).toBe("currentColor");
      expect(el.getAttribute("fill")).toBe("none");
      expect(el.getAttribute("stroke-width")).toBe(cam.querySelector("path")!.getAttribute("stroke-width"));
    }
    expect([p.getAttribute("viewBox"), p.getAttribute("width")]).toEqual([cam.getAttribute("viewBox"), cam.getAttribute("width")]);
  });
  it("long unbroken text (URLs) wraps in panels, info popovers, About, legends and tool popovers", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../src/core/style.css"), "utf8");
    document.head.innerHTML = `<style>${css}</style>`;
    document.body.innerHTML = '<aside id="layer-panel"><div class="info-popover"><p><a href="#">data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/averyveryverylongunbrokenpath</a></p></div><details class="about"><p>x</p></details><div class="legend">y</div></aside><aside id="cell-panel"><p>z</p></aside><div class="tool-pop">w</div>';
    for (const sel of ["#layer-panel", "#cell-panel", ".info-popover", ".about", ".legend", ".tool-pop"]) {
      expect(getComputedStyle(document.querySelector(sel)!).overflowWrap, sel).toBe("anywhere");
    }
    expect(getComputedStyle(document.querySelector(".info-popover a")!).overflowWrap).toBe("anywhere");
    document.head.innerHTML = ""; document.body.innerHTML = "";
  });
  it("info popovers: one structure (definition, then Units, Wind data, Slider, then the source rows); no repeated slider/units sentences", async () => {
    const { infoHtml } = await import("../src/core/ui/layerPanel");
    const reg = loadRegistry().registry;
    const rows = (id: string, ds = "era5-land") => [...infoHtml(reg.layers.find((l) => l.id === id)!, ds).matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1]);
    expect(rows("dpm")).toEqual(["Units", "Wind data", "Slider", "Citation"]);   // the shared map-field citation: a link to About
    expect(infoHtml(reg.layers.find((l) => l.id === "dpm")!, "era5-land")).toContain('data-about="cite-fields"');
    expect(rows("aridity")).toEqual(["Units", "Wind data", "Slider", "Source", "Citation", "Data DOI", "Licence", "Link", "Changes"]);
    const dpm = infoHtml(reg.layers.find((l) => l.id === "dpm")!, "era5");
    expect(dpm).toMatch(/<dt>Wind data<\/dt><dd>ERA5 0\.25°, 1950–2024<\/dd>/);
    expect(infoHtml(reg.layers.find((l) => l.id === "rdpa")!, "era5-land")).toMatch(/compass bearing, clockwise from north/);
    expect(infoHtml(reg.layers.find((l) => l.id === "uft")!, "era5-land")).toMatch(/<dd>fraction \(0–1\)<\/dd>/);
    for (const l of reg.layers) {
      const t = infoHtml(l, "era5-land").replace(/<dl[\s\S]*<\/dl>/, "");
      expect(t, l.id).not.toMatch(/Shown at the selected|Converted from m²\/s|Displayed as the compass bearing|Independent of the wind dataset/);
    }
  });
  it("URL rules: production Earth -> <base>mars/, Mars -> base without mars/; localhost -> live site; override", () => {
    const H = "map.geomorphlab.org";
    expect(otherBodyUrl({ body: "earth", base: "/", host: H })).toBe("/mars/");
    expect(otherBodyUrl({ body: "earth", base: "/atlas/", host: H })).toBe("/atlas/mars/");
    expect(otherBodyUrl({ body: "mars", base: "/mars/", host: H })).toBe("/");
    expect(otherBodyUrl({ body: "mars", base: "/atlas/mars/", host: H })).toBe("/atlas/");
    expect(otherBodyUrl({ body: "mars", base: "/mars", host: H })).toBe("/");
    expect(otherBodyUrl({ body: "mars", base: "/mars/", embed: true, host: H })).toBe("/?embed=1");
    // vite dev / preview on this machine: the other planet is the live site
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(otherBodyUrl({ body: "earth", base: "/", host })).toBe("https://map.geomorphlab.org/mars/");
      expect(otherBodyUrl({ body: "mars", base: "/mars/", host })).toBe("https://map.geomorphlab.org/");
      expect(otherBodyUrl({ body: "mars", base: "/", host, embed: true })).toBe("https://map.geomorphlab.org/?embed=1");
    }
    expect(otherBodyUrl({ body: "earth", base: "/", override: "http://localhost:5174/", host: "localhost" })).toBe("http://localhost:5174/");
    expect(otherBodyUrl({ body: "earth", base: "/", host: "192.168.1.5" })).toBe("/mars/");   // LAN host: same origin
    expect(isLocalHost("localhost")).toBe(true); expect(isLocalHost("map.geomorphlab.org")).toBe(false);
  });
  it("Earth storage keys are unchanged; Mars keys are namespaced", () => {
    expect(TOUR_SEEN_KEY).toBe("duneAtlas.tourSeen");
    expect(sectionOpenKey("modes")).toBe("duneAtlas.cellPanel.modesOpen");
    expect(storageKey("dataset")).toBe("duneAtlas.dataset");
    expect(storageKeyFor("mars", "tourSeen")).toBe("duneAtlasMars.tourSeen");
  });
});

describe("info texts at the source, one field citation, licences, basemap info", () => {
  const REPO = path.resolve(__dirname, "../..");
  const gen = ["registry/earth/generated/qsat_fields.yaml", "registry/earth/datasets/era5/qsat_fields.yaml", "registry/earth/generated/x_extra_fields.yaml", "registry/earth/datasets/era5/x_extra_fields.yaml", "registry/earth/generated/x_vegetation.yaml"];
  it("generated definitions carry no repeated units/slider/processing sentences; maths as TeX (KaTeX in the popover)", async () => {
    for (const f of gen) expect(fs.readFileSync(path.join(REPO, f), "utf8"), f).not.toMatch(/Shown at the selected|Shown in m\/kyr|Converted from m²\/s|Displayed as the compass bearing|Independent of the wind dataset/);
    const { infoHtml } = await import("../src/core/ui/layerPanel");
    const reg = loadRegistry().registry;
    const L = (id: string) => reg.layers.find((l) => l.id === id)!;
    expect(L("dpm").description).toMatch(/\$DP = \\sum n q \/ \\sum n\$/);
    expect(infoHtml(L("dpm"), "era5-land")).toMatch(/class="katex"/);
    expect(L("rdpa").description).toMatch(/compass bearing \(clockwise from north\)/);
    expect(L("rdpa").description).not.toMatch(/radians|CCW/);
    const veg = L("vegetation").description!;
    expect(veg.length).toBeLessThan(700); // was 707; + the non-photosynthetic-cover sentence
    expect(veg).toMatch(/Total cover includes non-photosynthetic vegetation \(dry and dead plant material\) as well as green vegetation, so it can be substantial where little green vegetation is visible; compare it with the aridity index\./);
    expect(veg).toMatch(/\[Explore the full monthly time series at GEOGLAM RAPP\]\(https:\/\/map\.geo-rapp\.org\/\)/);
  });
  it("every atlas-derived field: one citation format (= fieldsCitation) and the dataset licence row", async () => {
    const { fieldsCitation, fieldsLicence } = await import("../src/core/cell/citation");
    const { applyDatasetLayers } = await import("../src/core/registry/merge");
    for (const ds of ["era5-land", "era5"]) {
      const reg = loadRegistry().registry;
      if (ds !== reg.defaultDataset) applyDatasetLayers(reg, ds);
      const derived = reg.layers.filter((l) => l.type === "zarr-field" && l.source.includes("{dataset}"));
      expect(derived.length).toBe(24);
      for (const l of derived) {
        expect(l.attribution?.citation, `${ds} ${l.id}`).toBe(fieldsCitation(ds));
        expect(l.attribution?.licence, `${ds} ${l.id}`).toBe(fieldsLicence(ds));
      }
      expect(fieldsCitation(ds)).toMatch(/^Gunn, A\. \(2026\)\. The distribution of Earth's wind-blown sand dunes\. Nature Communications\. doi:10\.1038\/s41467-026-75466-y; .*winds: /);
    }
    expect(fieldsLicence("era5-land")).toBe("CC BY 4.0 (Zenodo Supplementary Data)");
    expect(fieldsLicence("era5")).toBe("CC BY 4.0");
  });
  it("basemaps have an info button with definition, Source, Resolution, Licence, Link; About cites the map fields", async () => {
    const { basemapInfoHtml } = await import("../src/core/ui/layerPanel");
    const reg = loadRegistry().registry;
    for (const b of reg.basemaps) {
      expect([...basemapInfoHtml(b).matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1]), b.id).toEqual(["Source", "Resolution", "Licence", "Link"]);
      expect(basemapInfoHtml(b), b.id).toMatch(/<p class="info-def">/);
    }
    const root = document.createElement("div");
    renderLayerPanel(root, reg, new Store({ basemap: "x", projection: "globe", utIndex: 14, layers: {}, order: [], dataset: DEFAULT_VIEW.dataset, cell: null, embed: false } as never));
    expect(root.querySelectorAll(".basemap-row .info-button").length).toBe(reg.basemaps.length);
    const about = root.querySelector(".about")!.textContent!;
    expect(about).toMatch(/Citing the map fields/);
    expect(about).toMatch(/ERA5-Land 0\.1°: Gunn, A\. \(2026\)\./);
    expect(about).toMatch(/ERA5 0\.25°: Gunn, A\. \(2026\)\./);
  });
});
