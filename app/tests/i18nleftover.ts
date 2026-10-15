// English left on screen in another language: renders every panel (tests/publictext.ts) with ?lang=<lang> and
// lists the on-screen texts that still read as English sentences (several common English words; formulas,
// references and protected names removed first). Downloads are not on-screen and stay English.
import { vi } from "vitest";

const ON_SCREEN = /^(popover|bulk|panel|cell|legend|export|group|basemap|layer\.[^.]+\.(title|units|legendNote))\b/;
const STOP = /\b(the|and|of|to|is|with|for|from|on|in|by|are|this|that|or|at|as|be|which|where|when|its|it)\b/gi;
export const englishScore = (s: string) =>
  (s.replace(/\([^)]*\d{4}[^)]*\)|https?:\/\/\S+|doi:\S+|\$[^$]*\$/g, " ").match(STOP) ?? []).length;

export async function leftoverEnglish(lang: string, min = 3): Promise<{ key: string; text: string }[]> {
  vi.resetModules();
  history.replaceState(null, "", `/?lang=${lang}`);
  const { collectPublicText } = await import("./publictext");
  const t = await collectPublicText();
  return Object.entries(t).filter(([k, v]) => ON_SCREEN.test(k) && englishScore(v) >= min).map(([key, text]) => ({ key, text }));
}
