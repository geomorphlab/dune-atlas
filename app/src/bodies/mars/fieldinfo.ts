// Mars source attributes of the qsat fields (texts of the per-hour Mars threshold); kinds, display units
// and transforms are shared (cell/fieldinfo.ts: flux m^2/yr with the same S2Y, Julian year; checked in
// tests/mars/panel.test.ts). Long names are the atlas names (same quantity, same name on both planets).
import meta from "../../../../registry/mars/qsat_field_metadata.json";

export const FIELD_METADATA = meta as unknown as Record<string, { long_name: string; units: string; description: string }>;
/** field_names.json key of the Mars descriptions (used where defined) */
export const DESCRIPTION_VARIANT: "descriptionMars" | undefined = "descriptionMars";
