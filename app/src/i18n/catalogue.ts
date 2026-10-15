// Every translatable string of this atlas, key -> English, in reading order: what docs/translations/<lang>.md
// must cover (scripts/i18n.ts adds new keys there; tests/i18n.test.ts checks). Scope (translation plan,
// option 2): interface labels, help panel, guided tour, layer and group names, legends and units, basemap
// names, Concepts. Popovers, About, the cell panel and downloads stay in English.
import { HELP_ABOUT_LINK, HELP_RESTART, HELP_SECTIONS, HELP_TITLE, TOUR_STEPS } from "../core/ui/helpText";
import { loadRegistry } from "../core/registry/load";
import { CONCEPTS } from "../core/ui/concepts";
import { PROFILE } from "@body/profile";
import { BODY } from "../core/body";
import { UI } from "./ui";
import { FRY_TEXT } from "../core/ui/frybergerfig";
import { basemapKey, conceptKey, groupKey, helpKey, layerKey, layerTitleEn, tourKey } from "./keys";

export const SHARED_HELP = { "help.title": HELP_TITLE, "help.restart": HELP_RESTART, "help.aboutLink": HELP_ABOUT_LINK };

export interface CatEntry { key: string; en: string; area: string }
export function catalogue(): CatEntry[] {
  const out: CatEntry[] = [];
  const add = (area: string, key: string, en: string | undefined) => { if (en && en.trim()) out.push({ key, en: en.trim(), area }); };
  for (const [k, v] of Object.entries(UI)) add("Interface", k, v);
  for (const [k, v] of Object.entries(SHARED_HELP)) add("Help panel", k, v);
  for (const s of HELP_SECTIONS) { add("Help panel", helpKey(s.id, "title"), s.title); add("Help panel", helpKey(s.id, "body"), s.body); }
  for (const s of TOUR_STEPS) { add("Guided tour", tourKey(s.id, "title"), s.title); add("Guided tour", tourKey(s.id, "body"), s.body); }
  const { registry } = loadRegistry();
  for (const g of registry.groups) {
    add("Layer groups", groupKey(g.id), g.title);
    add("Layer groups", groupKey(g.id, "desc"), g.description);
    for (const l of registry.layers.filter((x) => x.group === g.id)) {
      add("Layers and legends", layerKey(l.id, "title"), layerTitleEn(l));
      add("Layers and legends", layerKey(l.id, "short"), l.shortTitle);
      add("Layers and legends", layerKey(l.id, "units"), l.units);
      add("Layers and legends", layerKey(l.id, "legendNote"), l.display?.legendNote);
    }
  }
  add("Layers and legends", `${BODY}.invert.legend`, PROFILE.invert?.legend);
  for (const b of registry.basemaps) add("Basemaps", basemapKey(b.id), b.title);
  for (const c of CONCEPTS) {
    if (BODY === "earth" && c.id === "drift-potential-dp") for (const [k, v] of Object.entries(FRY_TEXT)) add("Concepts", `fry.${k}`, v);
    add("Concepts", conceptKey(c, "title"), c.title);
    c.paragraphs.forEach((p, i) => add("Concepts", conceptKey(c, `p${i + 1}`), p));
  }
  return out;
}
