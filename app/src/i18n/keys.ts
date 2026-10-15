// Keys of the translatable texts. Text that differs between the atlases has the planet first
// ("earth.help.cell.body"); Concepts entries are shared by both atlases (one file), so their keys are not.
import { BODY } from "../core/body";
import type { LayerDef } from "../core/registry/types";
import { tr } from "./index";

export const helpKey = (id: string, part: "title" | "body") => `${BODY}.help.${id}.${part}`;
export const tourKey = (id: string, part: "title" | "body") => `${BODY}.tour.${id}.${part}`;
export const groupKey = (id: string, part?: "desc") => `${BODY}.group.${id}${part ? `.${part}` : ""}`;
export const layerKey = (id: string, part: "title" | "short" | "units" | "legendNote") => `${BODY}.layer.${id}.${part}`;
export const basemapKey = (id: string) => `${BODY}.basemap.${id}`;
/** Concepts: entries tagged Earth or Mars carry the tag (two entries share the title "Saturated sand flux …") */
export const conceptKey = (c: { id: string; tag: string }, part: string) => `concept.${c.tag === "both" ? "" : `${c.tag.toLowerCase()}.`}${c.id}.${part}`;

/** the English title a layer row shows (TeX where the registry has it) */
export const layerTitleEn = (l: LayerDef) => l.titleTex ?? l.title;
/** the layer title in the current language (TeX) */
export const layerTitleText = (l: LayerDef) => tr(layerKey(l.id, "title"), layerTitleEn(l));
/** the legend units of a layer in the current language */
export const layerUnits = (l: LayerDef) => (l.units ? tr(layerKey(l.id, "units"), l.units) : "");
