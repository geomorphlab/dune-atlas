// One name per quantity (review L5, U12): the layer list (titleTex), the cell table (title), the info title,
// the rose legend (MODE_STYLE) and the CSV / NetCDF long names (fieldInfo) use the same name; αH is the
// migration-mode crest orientation (an axis), never labelled with a compass point.
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/registry/load";
import { FIELD_NAMES, fieldInfo } from "../src/cell/fieldinfo";
import { MODE_STYLE } from "../src/cell/analysis";
import { textOnly } from "../src/util/math";

const reg = loadRegistry().registry;
const nameOf = (title: string) => title.replace(/\s*⟨.*⟩\s*$/, "").replace(/\s*\((?:[^()]|\([^()]*\))*\)\s*$/, "");

describe("one name per quantity", () => {
  it("registry title / titleTex, field_names.json and the download long names agree for every field", () => {
    const fields = reg.layers.filter((l) => l.type === "zarr-field" && l.variable && FIELD_NAMES[l.variable]);
    expect(fields.length).toBe(23);
    for (const l of fields) {
      const n = FIELD_NAMES[l.variable!];
      expect(l.title, l.id).toBe(n.title);
      expect(l.titleTex, l.id).toBe(n.titleTex);
      expect(fieldInfo(l.variable!).longName, l.id).toBe(n.titleTex);
      expect(textOnly(l.titleTex!).trim(), l.id).toBe(nameOf(l.title));       // no second name in the layer list
      expect(l.titleTex!.trim().startsWith("$"), l.id).toBe(false);            // never symbol-only
    }
    const q = reg.layers.find((l) => l.id === "qsdiv")!;
    expect(textOnly(q.titleTex!).trim()).toBe("Saturated flux divergence");
  });
  it("αH: migration-mode crest orientation everywhere, its own definition, rose legend without compass word", () => {
    const ab = reg.layers.find((l) => l.id === "ab")!;
    expect(ab.title).toBe("Migration-mode crest orientation (αH)");
    expect(ab.description).toMatch(/^Orientation of the crests .* axis from 0° to 180°, perpendicular to the migration direction \$\\alpha_T\$\.$/);
    expect(ab.description).not.toMatch(/unsigned direction/);
    expect(MODE_STYLE.ab.label).toBe("αH (migration-mode crest orientation)");
    for (const k of ["at", "ae", "ao", "rdpa"] as const) {
      const l = reg.layers.find((x) => x.id === k)!;
      expect(MODE_STYLE[k].label.toLowerCase(), k).toContain(nameOf(l.title).toLowerCase());
    }
  });
});
