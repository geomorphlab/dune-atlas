// The language switch: its own column of connected square buttons (EN, FR, 中文) on the map, below the
// planet button. Each label is in its own language and kept as written by page translators; the current
// language is pressed. Choosing another reloads the page in the same view (i18n/index.ts).
import { h } from "../core/ui/dom";
import { markNoTranslate } from "../core/util/notranslate";
import { LANG, LANGS, switchLang, t } from "./index";

export function langSwitch(): HTMLElement {
  const wrap = h("div", { class: "maplibregl-ctrl maplibregl-ctrl-group atlas-lang", role: "group", "aria-label": t("ui.language") },
    ...LANGS.map((l) => {
      const b = h("button", { type: "button", class: "tool-btn lang-btn", lang: l.html, title: l.name, "aria-label": l.name, "aria-pressed": String(l.id === LANG) }, l.label) as HTMLButtonElement;
      b.addEventListener("click", () => { if (l.id !== LANG) switchLang(l.id); });
      return b;
    }));
  return markNoTranslate(wrap);
}
