// Licences stated by the Mars atlas (DATA_LICENSE.md notes 4 and 5): the derived elevation and relief tiles
// are CC BY-SA 3.0 IGO; "public domain" applies to the MGD3 dune polygons only, and Fenton (2020) is listed as
// a source without a licence statement.
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../../src/core/registry/load";
import { auxSourceAttrs } from "../../src/core/cell/auxinfo";
import { DATA_SOURCES_ITEMS_HTML } from "../../src/bodies/mars/helpText";
import { BODY_CITATION_SOURCES, MAP_LAYER_CREDITS } from "../../src/bodies/mars/citation";

const DERIVED = "Derived elevation and relief tiles: CC BY-SA 3.0 IGO.";

describe("Mars licences", () => {
  const reg = loadRegistry().registry;
  it("elevation info and the relief basemap info state the derived licence", () => {
    expect(reg.layers.find((l) => l.id === "elevation")!.attribution!.licence).toBe(`CC0 (MOLA), CC BY-SA 3.0 IGO (HRSC). ${DERIVED}`);
    expect(reg.basemaps.find((b) => b.id === "hrsc-mola-hillshade")!.info!.licence).toBe(`CC0 (MOLA), CC BY-SA 3.0 IGO (HRSC). ${DERIVED}`);
    expect(DATA_SOURCES_ITEMS_HTML).toContain(DERIVED);
    expect(MAP_LAYER_CREDITS.elevation).toContain("derived elevation: CC BY-SA 3.0 IGO");
    expect(auxSourceAttrs({ series: {}, scalars: {}, attrs: {} } as never, "elev_mean").license).toBe(`MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO). ${DERIVED}`);
  });
  it("public domain is scoped to the MGD3 polygons; Fenton (2020) is a source without a licence", () => {
    const dunes = reg.layers.find((l) => l.id === "dunes")!.attribution!;
    expect(dunes.licence).toBe("MGD3 polygons: public domain (U.S. Geological Survey)");
    expect(dunes.source).toContain("Fenton (2020)");
    expect(dunes.citation).toContain("Fenton, L. K. (2020)");
    expect(DATA_SOURCES_ITEMS_HTML).toContain("MGD3 polygons: public domain (U.S. Geological Survey)");
    const fenton = BODY_CITATION_SOURCES.dunes.entries.find((e) => e.text.startsWith("Fenton"))!;
    expect(fenton.license).toBeUndefined();
    const all = JSON.stringify(reg) + DATA_SOURCES_ITEMS_HTML;
    expect(all).not.toMatch(/Fenton[^.;]{0,80}(public domain|CC BY|used with permission)/i);
    expect(all).not.toMatch(/used with permission/i);
  });
});
