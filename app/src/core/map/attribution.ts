// Map attribution box kept as written by page translators (translate="no"): it holds provider, product and
// licence names and required credit lines (e.g. "Contains modified Copernicus Climate Change Service
// information"), which must not be reworded. MapLibre rewrites the box's content when sources change; the
// attribute is on the control's container, so it covers every update.
import maplibregl, { type Map as MlMap } from "maplibre-gl";
import { markNoTranslate } from "../util/notranslate";

export class NoTranslateAttribution extends maplibregl.AttributionControl {
  onAdd(map: MlMap): HTMLElement {
    return markNoTranslate(super.onAdd(map));
  }
}
