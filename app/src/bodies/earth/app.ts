// Earth hooks of the shared entry module (apphooks.ts).
import maplibregl from "maplibre-gl";
import type { AppHooks } from "../../core/apphooks";
import { CellStore } from "../../core/cell/cellstore";
import { ERA5_LAND_GRID } from "../../core/cell/snap";
import { mapAttributionHtml } from "./citation";
import { datasetNotice } from "../../core/cell/citation";
import { datasetMapNotices } from "../../core/cell/datasetinfo";

export type BodyCellStore = CellStore;

export const APP_HOOKS: AppHooks<CellStore> = {
  openCellStore: (url, opts) => CellStore.open(url, opts),
  defaultGrid: ERA5_LAND_GRID,
  scaleControl: () => new maplibregl.ScaleControl({ maxWidth: 120 }),
  // the wind-regime line follows the selected dataset (mapAttributionHtml)
  // the dataset's attribution line (registry credits.mapNotice, e.g. the Copernicus statement), then the wind-regime line
  attribution: (ds) => [...datasetMapNotices([ds]), mapAttributionHtml(ds)],
  mapAriaLabel: "Map. Click a land cell to show its wind and sand-flux roses.",
  // a dune cell in the Namib Sand Sea, the containing cell of the current dataset
  exampleCell: { lon: 15.2, lat: -24.5 },
  debug: { notice: datasetNotice() },
};
