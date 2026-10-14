// All text of the Mars help panel and guided tour (replaces ui/helpText.ts in the Mars build; same
// exports, structure and step ids as Earth so ui/tour.ts and ui/tourHooks.ts work unchanged).
// Inline maths as $...$ (KaTeX); everything else plain text.
export type { HelpSection, TourStep } from "../../ui/helpText";
import type { HelpSection, TourStep } from "../../ui/helpText";

export const HELP_BUTTON_LABEL = "Help and tour";
export const HELP_TITLE = "Help";
export const HELP_RESTART = "Restart tour";
export const HELP_ABOUT_LINK = "About, data sources & citation";

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "threshold", title: "Median grain diameter $d$",
    body: "Sand moves when the friction velocity of the wind exceeds a threshold that depends on the grain size and on the thin Martian air. The slider at the top of the layer panel sets the median grain diameter d (50–1000 µm, default 200 µm) for every grain-size-dependent map layer and for the cell panel. For every hour of the Mars year the threshold $u_{*,th}$ is computed from d and that hour's air density and temperature (Pähtz & Durán 2023).",
  },
  {
    id: "layers", title: "Layers and Active layers",
    body: "Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset; dunes, elevation, air density and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link.",
  },
  {
    id: "cell", title: "Clicking a cell",
    body: "Click any 2° cell to open the cell panel: the wind rose, the sand-flux rose at the current grain diameter, dune-orientation modes against the grain diameter, the flux divergence and a table of all parameters. Section headings fold and unfold. Close the panel with × or Esc. The planetocentric latitude and east longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The crosshair button next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).",
  },
  {
    id: "datasets", title: "Wind dataset",
    body: "The winds are the lowest-level winds of the MCMC FV3-based Mars Global Climate Model, beta release 1 (2°, hourly, one Mars year: 16,032 hourly samples). The wind and sand-flux layers and the cell panel use this dataset; more Mars wind datasets may be added later.",
  },
  {
    id: "basemaps", title: "Basemaps",
    body: "The opening basemap is a shaded relief of the MOLA–HRSC blended elevation model (Fergason, Hare & Laura 2018), served with the atlas; its tiles are released under CC BY-SA 3.0 IGO (derived from HRSC, CC BY-SA 3.0 IGO, and MOLA, CC0). Under Basemap you can also choose OpenPlanetaryMap and Esri's Mars imagery services: the global CTX mosaic (about 5 m per pixel; The Murray Lab), HiRISE (down to about 25 cm per pixel, only where HiRISE has imaged), the Viking MDIM 2.1 colour mosaic and the MOLA–HRSC colour shaded relief. Esri's services are tiled in latitude and longitude and are reprojected in your browser. Where a service has no data (most of the planet for HiRISE) or does not respond, the dark map background shows. Credits are in the map attribution.",
  },
  {
    id: "downloads", title: "Downloads and citation",
    body: "Download & cite in the cell panel saves the hourly wind and air series and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite the FV3 GCM output, Pähtz & Durán (2023) for the transport law and Gunn (2026) for the method.",
  },
  {
    id: "images", title: "Exporting images",
    body: "Export map image (camera button, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources, so the text is easy to crop. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.",
  },
  {
    id: "share", title: "Sharing the view",
    body: "The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, grain diameter, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.",
  },
];

export const TOUR_STEPS: TourStep[] = [
  {
    id: "help", targets: [".atlas-tools .help-btn"], title: "Welcome to the Mars Dune Atlas",
    body: "This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.",
  },
  {
    id: "map", targets: ["#map"], title: "The map",
    body: "Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map. Coordinates are planetocentric latitude and east longitude (−180° to 180°).",
  },
  {
    id: "threshold", targets: ["#layer-panel .pinned"], title: "Median grain diameter $d$",
    body: "This slider sets the grain diameter. The threshold friction velocity is computed for every hour from d and the hour's air density and temperature; every grain-size-dependent layer and the cell panel update as you move it.",
  },
  {
    id: "layers", targets: ['#layer-panel .layer-item[data-layer="rdpa"]', "#layer-panel-body .layer-group", "#layer-panel .panel-toggle"], title: "Layers and their display",
    body: "Tick layers to add them to the map; ⓘ explains a layer. Display, opened here for the resultant drift direction (RDD), changes a layer's colours and colour limits and, for direction fields, draws a colour map, arrows or streamlines in the line colour and spacing you choose. Dunes only, under the Wind dataset selector, keeps the wind-derived layers to the cells with dunes.",
  },
  {
    id: "active", targets: ["#layer-panel-body .order", "#layer-panel .panel-toggle"], title: "Active layers",
    body: "The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.",
  },
  {
    id: "cell", targets: ["#cell-panel:not([hidden])", "#map"], title: "Click a cell",
    body: "Clicking a cell opens the cell panel, shown here for the dune field of Nili Patera (9° N, 67° E): wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own grain-diameter slider at the top (outlined), linked to the main one. At the bottom you can download these data in NetCDF or CSV files and access citation information. The crosshair next to its title centres the map on the cell.",
  },
  {
    id: "tools", targets: [".atlas-tools .share-btn", ".atlas-tools"], title: "Share and export",
    body: "Copy a short link to this view, or export the map as an image with colour bars, scale and data sources. Plots in the cell panel have their own Export menus.",
  },
  {
    id: "planet", targets: [".atlas-tools .planet-btn", ".atlas-tools"], title: "Switch planet",
    body: "Earth and Mars share this atlas: the planet button below the camera swaps between them and opens the Earth atlas at its default view. This is the end of the tour.",
  },
];

export const TOUR_FALLBACK = { cell: "The example cell could not be loaded just now (are you offline?). Click any cell on the map to open its panel." };

export const TOUR_LABELS = { back: "Back", next: "Next", done: "Done", skip: "Skip tour", step: (i: number, n: number) => `Step ${i} of ${n}` };

export const SHARE_TEXT = { button: "Share / copy link", title: "Share this view", copy: "Copy link", copied: "Link copied", note: "The link restores the position, zoom, grain diameter, basemap, active layers and the selected cell." };
export const EXPORT_TEXT = {
  button: "Export map image", title: "Export map image", basemap: "Include basemap", run: "Export PNG", working: "Rendering…",
  note: "PNG of the current view, 1600–2400 pixels wide, without the panels. Colour bars, legends, scale and data sources are added below the map, sized for slides.",
  plotMenu: "Export", png: "PNG", svg: "SVG",
};
