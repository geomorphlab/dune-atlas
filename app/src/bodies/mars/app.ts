// Mars hooks of the shared entry module (apphooks.ts): the Mars cell store (per-sample series), the
// body-aware scale bar (R_MARS), the Mars basemaps (pmtiles hillshade + archive-depth clamp,
// esri-mars:// protocol for the Esri OnMars imagery) and the globe polar caps.
import type { AppHooks } from "../../core/apphooks";
import { ensurePmtiles } from "../../core/map/adapters";
import { MarsCellStore } from "./cell/cellstore";
import { BodyScaleControl } from "./map/scale";
import { clampPmtilesBasemaps, prepareMarsBasemaps } from "./map/basemaps";
import { ESRI_STATS } from "./map/esri";
import { globePolarCaps, marsPolarCapOptions } from "./map/globecaps";
import { EXAMPLE_CELL, MARS_GRID, R_MARS } from "./body";
import { CITATION_SOURCES, entryLink } from "../../core/cell/citation";
import { datasetCredits, datasetInfo } from "../../core/cell/datasetinfo";
import { loadRegistry } from "../../core/registry/load";
import { escapeHtml } from "../../core/util/format";

const FV3_ATTRIBUTION = `Winds: <a href="https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/" target="_blank" rel="noopener">MCMC FV3 Mars GCM beta 1</a> (NASA Ames)`;
/** the map attribution's wind line: the dataset title linked to its wind-data source (registry credits.dataSource,
 *  its Data entry); MCMC FV3 as before */
export function windAttribution(datasetId: string): string {
  const info = datasetInfo(datasetId);
  if (info.id === "fv3-beta1") return FV3_ATTRIBUTION;
  const src = CITATION_SOURCES[datasetCredits(info.id).dataSource];
  const e = src?.entries.find((x) => x.label === "Data") ?? src?.entries[0];
  const title = loadRegistry().registry.datasets?.find((d) => d.id === info.id)?.title ?? info.name;
  const link = e ? entryLink(e) : "";
  return link ? `Winds: <a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>` : `Winds: ${escapeHtml(title)}`;
}

export type BodyCellStore = MarsCellStore;

export const APP_HOOKS: AppHooks<MarsCellStore> = {
  openCellStore: (url, opts) => MarsCellStore.open(url, opts),
  defaultGrid: MARS_GRID,
  // relative pmtiles:// basemap tiles resolved against the data base; esri-mars:// protocol for the Esri basemaps
  prepareBasemaps: (basemaps, dataBase) => prepareMarsBasemaps(basemaps, dataBase),
  scaleControl: () => new BodyScaleControl({ maxWidth: 120, radius: R_MARS }), // Mars radius, not the Earth ellipsoid
  attribution: (datasetId) => [
    windAttribution(datasetId),
    `Dunes: USGS Mars Global Digital Dune Database and <a href="https://doi.org/10.1016/j.icarus.2020.114018" target="_blank" rel="noopener">Fenton (2020)</a>; methods as outlined in <a href="https://doi.org/10.1038/s41467-026-75466-y" target="_blank" rel="noopener">Gunn (2026)</a>, transport: <a href="https://doi.org/10.1017/jfm.2023.343" target="_blank" rel="noopener">Pähtz &amp; Durán (2023)</a>`,
  ],
  mapAriaLabel: "Map of Mars. Click a cell to show its wind and sand-flux roses.",
  // globe polar caps (map/polarcap.ts, docs/guide/mars.md 5b): basemap cap + dune fill/invert caps, globe only
  onMapCreated: (map, reg, dataBase) => {
    const polarCaps = globePolarCaps(map, marsPolarCapOptions(dataBase, reg.basemaps, reg.layers));
    return { onProjection: () => polarCaps.sync() };
  },
  // pmtiles basemaps: overzoom from the archive's own maxzoom when it is shallower than the registry's (dev subsets)
  afterFirstBasemap: (reg, applyBasemap, store) => {
    if (reg.basemaps.some((b) => b.tiles?.some((t) => t.startsWith("pmtiles://")))) {
      void clampPmtilesBasemaps(reg.basemaps, ensurePmtiles(), (b) => { if (b.id === store.state.basemap) applyBasemap(); });
    }
  },
  // the Nili Patera dune field (9° N, 67° E; body.ts)
  exampleCell: EXAMPLE_CELL,
  debug: { body: "mars", esriStats: ESRI_STATS },
};
