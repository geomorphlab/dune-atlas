// Earth source attributes of the qsat fields (long names, units, descriptions of the Supplementary Data
// record); shared display metadata: cell/fieldinfo.ts.
import meta from "../../../../registry/earth/qsat_field_metadata.json";

export const FIELD_METADATA = meta as unknown as Record<string, { long_name: string; units: string; description: string }>;
/** field_names.json key of an Earth-specific description (none: the shared descriptions are Earth's) */
export const DESCRIPTION_VARIANT: "descriptionMars" | undefined = undefined;
