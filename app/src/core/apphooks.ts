// The per-body hooks of the shared entry module (main.ts), provided by @body/app: the cell store, the map
// controls and texts that differ, and the body's extra map setup (Mars: basemap protocols, polar caps).
import type { IControl, Map as MlMap } from "maplibre-gl";
import type { Grid } from "./cell/snap";
import type { BasemapDef, Registry } from "./registry/types";
import type { Store } from "./store";

export interface AppHooks<S> {
  /** open the body's cell store (cells.zarr + sidecars) */
  openCellStore(url: string, opts: { useSuffixRequest: boolean; aux: string[] }): Promise<S>;
  /** grid until the cell store is open */
  defaultGrid: Grid;
  /** basemap definitions as the map uses them (e.g. relative pmtiles:// tiles against the data base) */
  prepareBasemaps?(basemaps: BasemapDef[], dataBase: string): BasemapDef[];
  /** the scale bar control (bottom left) */
  scaleControl(): IControl;
  /** custom attribution lines of a wind dataset */
  attribution(datasetId: string): string[];
  /** aria-label of the map canvas */
  mapAriaLabel: string;
  /** extra map setup right after the overlays exist; returns what has to follow a projection change */
  onMapCreated?(map: MlMap, reg: Registry, dataBase: string): { onProjection?(): void };
  /** after the first basemap is applied */
  afterFirstBasemap?(reg: Registry, applyBasemap: () => void, store: Store): void;
  /** tour example cell (lon, lat) */
  exampleCell: { lon: number; lat: number };
  /** extra fields of window.duneAtlas (debugging in the console) */
  debug: Record<string, unknown>;
}
