// Basemap styles from registry `basemaps`. Every basemap becomes a full MapLibre style; overlays
// are re-attached on each `style.load` (map/overlays.ts). The atlas is dark-themed: raster
// basemaps sit on a dark background and every style gets a dark sky/space for the globe.
import type { StyleSpecification, SkySpecification } from "maplibre-gl";
import type { BasemapDef } from "../registry/types";

export const SPACE_COLOR = "#05070b";
const EMPTY: StyleSpecification = { version: 8, sources: {}, layers: [] };

/** Dark space around the globe (MapLibre v5 sky); atmosphere kept faint. */
export const DARK_SKY: SkySpecification = {
  "sky-color": SPACE_COLOR,
  "horizon-color": "#0d1724",
  "fog-color": SPACE_COLOR,
  "sky-horizon-blend": 0.5,
  "horizon-fog-blend": 0.5,
  "fog-ground-blend": 0.5,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.35, 5, 0.2, 8, 0],
};

/** A basemap as a style object, or a style URL (kind=style). */
export function basemapStyle(b: BasemapDef): StyleSpecification | string {
  if (b.kind === "style") return b.style!;
  if (b.kind === "raster") {
    return {
      version: 8,
      sources: { basemap: { type: "raster", tiles: b.tiles!, tileSize: b.tileSize ?? 256, maxzoom: b.maxzoom ?? 19, attribution: b.attribution } },
      layers: [
        { id: "basemap-background", type: "background", paint: { "background-color": "#0e1216" } },
        { id: "basemap", type: "raster", source: "basemap" },
      ],
    };
  }
  // hillshade (2D): dark shaded relief from a DEM
  return {
    version: 8,
    sources: { "basemap-dem": { type: "raster-dem", tiles: b.tiles!, tileSize: b.tileSize ?? 256, maxzoom: b.maxzoom ?? 12, encoding: b.encoding ?? "terrarium", attribution: b.attribution } },
    layers: [
      { id: "basemap-background", type: "background", paint: { "background-color": "#1b1f24" } },
      { id: "basemap-hillshade", type: "hillshade", source: "basemap-dem", paint: { "hillshade-exaggeration": 0.65, "hillshade-shadow-color": "#000000", "hillshade-highlight-color": "#8d949c", "hillshade-accent-color": "#2a2f35" } },
    ],
  };
}

/** transformStyle hook: projection + dark sky for whichever style loads; never 3D terrain. */
export function withAtlasAdditions(next: StyleSpecification, opts: { projection: "globe" | "mercator" }): StyleSpecification {
  const s: StyleSpecification = { ...EMPTY, ...next, sources: { ...next.sources }, layers: [...next.layers] };
  s.projection = { type: opts.projection };
  s.sky = { ...DARK_SKY };
  delete s.terrain;
  return s;
}

export function defaultBasemap(basemaps: BasemapDef[]): BasemapDef {
  return basemaps.find((b) => b.default) ?? basemaps[0];
}
