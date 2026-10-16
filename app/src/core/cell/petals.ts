// Convention of the sand-flux rose petals: "toward" (default; the direction sand moves, as the map arrows and
// every bearing value) or "from" (the direction the transporting wind comes from, as on the wind rose). Only
// the drawing turns: each petal is drawn 180° round, nothing is recalculated. The arrows on the rose (RDD and
// the dune-orientation modes) always point toward, as in Fryberger & Dean (1979), and bearing values, map
// layers and downloaded data keep the toward convention. The choice is kept for the visit, for both atlases
// (core/visit.ts).
import { t } from "../../i18n";
import { sharedKey, visitGet, visitSet } from "../visit";

export type PetalConvention = "toward" | "from";
export const PETAL_CONVENTIONS: readonly PetalConvention[] = ["toward", "from"];
export const DEFAULT_PETALS: PetalConvention = "toward";
export const PETALS_STORAGE_KEY = sharedKey("fluxRosePetals");

export function loadPetals(): PetalConvention {
  const v = visitGet(PETALS_STORAGE_KEY);
  return v === "toward" || v === "from" ? v : DEFAULT_PETALS;
}

export function savePetals(p: PetalConvention): void {
  visitSet(PETALS_STORAGE_KEY, p);
}

/** rotation (deg) of the petals of the flux rose: 0 for toward, 180 for from */
export const petalOffset = (p: PetalConvention) => (p === "from" ? 180 : 0);

/** label of a choice in the panel switch */
export const PETAL_CHOICE_LABEL: Record<PetalConvention, string> = { toward: ` ${t("cell.petalsToward")}`, from: ` ${t("cell.petalsFrom")}` };
export const PETALS_SWITCH_LABEL = t("cell.petals");

/** heading of the flux rose section and title of the exported figure */
export const fluxRoseHeading = (p: PetalConvention) => `Sand flux rose (time-averaged, transport ${p})`;

/** short phrase for the accessible description: "by the direction sand moves toward" */
export const petalPhrase = (p: PetalConvention) =>
  p === "toward" ? "by the direction sand moves toward" : "by the direction the transporting wind comes from";

/** first sentence of the caption after its lead (HTML) */
export const petalCaptionHtml = (p: PetalConvention) =>
  p === "toward"
    ? "Direction sand moves TOWARD"
    : "Petals point to where the transporting wind comes FROM, as on the wind rose; the arrows point where sand and dunes move TOWARD";
