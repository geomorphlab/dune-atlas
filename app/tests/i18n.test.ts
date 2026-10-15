// Translations of the Earth atlas (docs/translations/*.md -> src/i18n/*.json; tests/i18nlib.ts)
import { describe, expect, it } from "vitest";
import { i18nChecks, langChoiceChecks } from "./i18nlib";
import { parseUrlState, serializeUrlState } from "../src/core/urlstate";

describe("translations (Earth)", () => {
  i18nChecks("Earth");
  langChoiceChecks();
  it("share links keep the language", () => {
    expect(serializeUrlState({ zoom: 2, lang: "zh-Hans" })).toBe("?zoom=2.00&lang=zh-Hans");
    expect(parseUrlState("?lang=fr").lang).toBe("fr");
    expect(parseUrlState("?lang=xx").lang).toBeUndefined();
  });
});
