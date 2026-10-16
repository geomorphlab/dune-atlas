// Compass points after a bearing ("292° (WNW)") are a variable part of the text, like a number: the
// translation key is the same for every direction and the point is shown in the reader's language.
import { describe, expect, it } from "vitest";
import { COMPASS_NAMES, COMPASS_POINTS, varTemplate, fillVars } from "../src/i18n";
import { compassPoint } from "../src/core/util/angles";

describe("compass points in translated text", () => {
  it("the 16 points match compassPoint and have a name in every language", () => {
    expect(Array.from({ length: 16 }, (_, k) => compassPoint(k * 22.5))).toEqual(COMPASS_POINTS);
    for (const names of Object.values(COMPASS_NAMES)) expect(new Set(names).size).toBe(16);
    expect(COMPASS_NAMES["zh-Hans"][COMPASS_POINTS.indexOf("WNW")]).toBe("西北西");
    expect(COMPASS_NAMES["zh-Hans"][COMPASS_POINTS.indexOf("ESE")]).toBe("东南东");
    expect(COMPASS_NAMES.fr[COMPASS_POINTS.indexOf("WNW")]).toBe("ONO");
  });
  it("every direction gives the same template; the value is the local name", () => {
    const a = varTemplate("RDD (resultant drift direction): 292° (WNW)", "zh-Hans");
    const b = varTemplate("RDD (resultant drift direction): 23° (NNE)", "zh-Hans");
    expect(a.tpl).toBe("RDD (resultant drift direction): ⟦#0⟧° (⟦#1⟧)");
    expect(b.tpl).toBe(a.tpl);
    expect(a.nums).toEqual(["292", "西北西"]);
    expect(a.local).toBe(true);
    expect(fillVars("RDD（合成输沙方向）：⟦#0⟧°（⟦#1⟧）", b.nums)).toBe("RDD（合成输沙方向）：23°（北东北）");
    expect(varTemplate("12° (S)", "fr").nums).toEqual(["12", "S"]);
    expect(varTemplate("90° (E)", "en").local).toBe(false);
  });
  it("capital letters elsewhere are not compass points", () => {
    expect(varTemplate("NE Africa and the SW of the grid (ERA5)", "zh-Hans").nums).toEqual([]);
    expect(varTemplate("10 m wind (W m⁻²)", "zh-Hans").nums).toEqual(["10"]);
  });
});
