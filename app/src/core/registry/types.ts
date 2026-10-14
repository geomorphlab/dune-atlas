// Types mirroring registry/layers.schema.json. The schema is the contract; keep in sync.

export type LayerType = "zarr-field" | "pmtiles-vector" | "pmtiles-raster" | "cog" | "geojson-points";
export type DisplayTransform = "none" | "scale" | "rad-to-bearing" | "rad-to-axis";

export interface LayerDisplay {
  transform?: DisplayTransform;
  scale?: number;
  log?: boolean;
  colormap?: string;
  clim?: [number, number];
  cyclic?: boolean;
  /** directional fields: variable scaling arrow length/opacity in 'arrows' mode */
  magnitudeVar?: string;
  /** directional fields: variable whose value must be > 0 for the direction to be shown (all
   *  render modes); defaults to magnitudeVar */
  maskVar?: string;
  /** legend tick values (display units) replacing the default ticks; clim ends always shown */
  ticks?: number[];
  /** label of the upper clim end, e.g. "≥ 6.5" for a saturated top value */
  topLabel?: string;
  /** short note under the legend */
  legendNote?: string;
}

export interface LayerDef {
  id: string;
  title: string;
  titleTex?: string;
  group: string;
  type: LayerType;
  source: string;
  variable?: string;
  thresholdAware?: boolean;
  /** computed from the wind data ('Dunes only'); default: zarr-field && thresholdAware (map/dunemask.ts) */
  windDerived?: boolean;
  units?: string;
  description?: string;
  citation?: string;
  visible?: boolean;
  opacity?: number;
  queryable?: boolean;
  display?: LayerDisplay;
  /** Vector/raster styling: keys are MapLibre layer types (fill, line, circle, raster), values paint objects. */
  style?: Record<string, Record<string, unknown>>;
  sourceLayer?: string;
  /** complement tileset for the 'invert' toggle (e.g. land without dunes) */
  invertSource?: string;
  invertSourceLayer?: string;
  /** structured source statement for third-party / derived data (shown in the info popover) */
  attribution?: LayerAttribution;
  minzoom?: number;
  maxzoom?: number;
}

export interface LayerAttribution {
  source?: string;
  citation?: string;
  doi?: string;
  licence?: string;
  url?: string;
  changes?: string;
}

export interface GroupDef {
  id: string;
  title: string;
  description?: string;
  collapsed?: boolean;
}

export interface BasemapDef {
  id: string;
  title: string;
  kind: "raster" | "style" | "hillshade";
  tiles?: string[];
  style?: string;
  encoding?: "terrarium" | "mapbox";
  tileSize?: number;
  maxzoom?: number;
  attribution: string;
  default?: boolean;
  /** photographic imagery: the layer panel suggests lowering the colour layers' opacity */
  imagery?: boolean;
  /** overall lightness: dune-name labels pale on dark basemaps, dark brown on light ones (default dark) */
  tone?: "dark" | "light";
  /** info (i) popover: definition, Source, Resolution, Licence, Link */
  info?: { description?: string; source?: string; resolution?: string; coverage?: string; licence?: string; url?: string };
}

export interface ThresholdDef {
  dim: string;
  values: number[];
  defaultIndex: number;
  units: string;
  label: string;
}

export interface DatasetDef {
  id: string;
  title: string;
  /** path prefix relative to dataBase that '{dataset}' expands to (e.g. dune-atlas/v1) */
  prefix: string;
  description?: string;
  citation?: string;
  /** cell store path; default '{dataset}/cells.zarr' */
  cellStore?: string;
  /** per-cell sidecar stores, merged in order (default CONFIG.cellAuxPaths) */
  cellAuxStores?: string[];
  /** single sidecar (older registries; used when cellAuxStores is absent) */
  cellAuxStore?: string;
  /** how the panel, About and downloads describe the dataset (cell/datasetinfo.ts) */
  info?: DatasetInfoDef;
  /** citations and notices of the dataset (cell/citation.ts) */
  credits?: DatasetCredits;
  /** citation sources defined by this dataset */
  citationSources?: CitationSourceDef[];
}

export interface Registry {
  /** filled by the loader: per non-default dataset, the layer definitions that differ (by id) */
  datasetLayers?: Record<string, Record<string, LayerDef>>;
  version: 1;
  dataBase: string;
  datasets?: DatasetDef[];
  defaultDataset?: string;
  threshold: ThresholdDef;
  basemaps: BasemapDef[];
  groups: GroupDef[];
  layers: LayerDef[];
}

/** A generated fragment (registry/earth/generated/*.yaml): only groups and layers. */
export interface RegistryFragment {
  groups?: GroupDef[];
  layers?: LayerDef[];
}

/** registry `datasets[].info` (layers.schema.json) */
export interface DatasetInfoDef {
  name: string; resolution: string; resDeg: number; period: string; nHours: number;
  landRule: string; landThreshold: number; nonLandReason: string; dunesRule: string;
  fieldsFrom: "paper" | "atlas"; sourceTitle?: string; sourceHtml: string;
}
/** registry `datasets[].credits` */
export interface DatasetCredits {
  sources: string[]; dataSource: string; fieldsCitation: string; fieldsLicence: string; windSourceText: string; notice?: string;
}
/** a citation source (registry `datasets[].citationSources`, or a body's in @body/citation) */
export interface CitationSourceDef {
  id: string; title: string; notice?: string;
  entries: { label: string; text: string; doi: string; url?: string; license?: string; key?: string }[];
}
