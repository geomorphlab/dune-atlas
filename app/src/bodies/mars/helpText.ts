// Mars text of the help panel and the guided tour (same structure and step ids as Earth, so ui/tour.ts
// and ui/tourHooks.ts serve both). Shared labels and types: ui/helpText.ts. Inline maths as $...$
// (KaTeX); everything else plain text.
import type { HelpSection, TourStep } from "../../core/ui/helpText";
import { datasetFacts } from "../../core/cell/datasetinfo";
import { mathHtml } from "../../core/util/math";

/** the Wind dataset selector's ⓘ (Earth has an info text here); one Mars dataset: no ⓘ */
export const DATASET_INFO_TEXT = "";

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "threshold", title: "Median grain diameter $d$",
    body: "Sand moves when the friction velocity of the wind exceeds a threshold that depends on the grain size and on the thin Martian air. The slider at the top of the layer panel sets the median grain diameter d (50–1000 µm, default 200 µm) for every grain-size-dependent map layer and for the cell panel. For every hour of the Mars year the threshold $u_{*,th}$ is computed from d and that hour's air density and temperature (Pähtz & Durán 2023).",
  },
  {
    id: "layers", title: "Layers and Active layers",
    body: "Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset; dunes, elevation, air density and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Names, in the Dune Fields group, labels named dune fields and features on the map (where names would overlap, some appear only as you zoom in); click a name to zoom to the feature and see its type, other names and sources.",
  },
  {
    id: "concepts", title: "Concepts",
    body: "The Concepts button (mortarboard, under the Help button) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.",
  },
  {
    id: "search", title: "Search",
    body: "Type a feature name (e.g. Gale crater or Olympia Undae) or a latitude and a longitude in the box at the top of the layer panel. Names are IAU-approved feature names from the Gazetteer of Planetary Nomenclature, with a few informal aliases (e.g. Bagnold Dunes); the list under the box shows each match with its feature type and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. 4.5, 137.4 or 4°30′N 137°24′E). Latitude comes first unless the letters say otherwise. Longitudes are planetocentric and east-positive, from −180° to 180°; a longitude typed as 0–360° E (e.g. 354.8) is converted (to −5.2). The line under the box shows how the text was read; Enter moves the map there and opens the cell panel when the cell has data.",
  },
  {
    id: "cell", title: "Clicking a cell",
    body: "Click any cell to open the cell panel: the wind rose, the sand-flux rose at the current grain diameter, dune-orientation modes against the grain diameter, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the Petals switch above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The planetocentric latitude and east longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The crosshair button next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).",
  },
  {
    id: "datasets", title: "Wind dataset",
    body: "The winds are the hourly lowest-level winds of a Mars climate model over one Mars year (e.g., the MCMC FV3-based Mars Global Climate Model, beta release 1: 2° grid, 16,032 hourly samples). The wind and sand-flux layers and the cell panel use the dataset shown in the Wind dataset selector.",
  },
  {
    id: "basemaps", title: "Basemaps",
    body: "The opening basemap is a shaded relief of the MOLA–HRSC blended elevation model (Fergason, Hare & Laura 2018), released under CC BY-SA 3.0 IGO (derived from HRSC, CC BY-SA 3.0 IGO, and MOLA, CC0). Under Basemap you can also choose OpenPlanetaryMap and Esri's Mars imagery: the global CTX mosaic (about 5 m per pixel; The Murray Lab), HiRISE (down to about 25 cm per pixel), the Viking MDIM 2.1 colour mosaic and the MOLA–HRSC colour shaded relief. HiRISE covers only the small part of the surface it has imaged; elsewhere the map is dark. Credits are in the map attribution.",
  },
  {
    id: "downloads", title: "Downloads and citation",
    body: "Download & cite in the cell panel saves the hourly wind and air series and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite the wind dataset, Pähtz & Durán (2023) for the transport law and Gunn (2026), which outlines the methods.",
  },
  {
    id: "region", title: "Downloading a region",
    body: "The button below the camera (a dashed box) saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every grain diameter or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.",
  },
  {
    id: "images", title: "Exporting images",
    body: "Export map image (camera button, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.",
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
    id: "concepts", targets: [".atlas-tools .concepts-btn"], title: "Concepts",
    body: "The Concepts button (mortarboard) explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.",
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
    id: "tools", targets: [".atlas-tools .share-btn", ".atlas-tools"], span: [".atlas-tools .share-btn", ".atlas-tools .export-btn", ".atlas-tools .region-btn"], title: "Share and export",
    body: "Copy a short link to this view, export the map as an image with colour bars, scale and data sources, or download the data of a region you draw on the map. Plots in the cell panel have their own Export menus.",
  },
  {
    id: "planet", targets: [".atlas-tools .planet-btn", ".atlas-tools"], title: "Switch planet",
    body: "Earth and Mars share this atlas: the planet button below the camera swaps between them, and each atlas reopens the view you last had there.",
  },
];

export const TOUR_FALLBACK = { cell: "The example cell could not be loaded. Click any cell on the map to open its panel." };


export const SHARE_TEXT = { button: "Share / copy link", title: "Share this view", copy: "Copy link", copied: "Link copied", note: "The link restores the position, zoom, grain diameter, basemap, active layers and the selected cell." };

/** About: the paragraph under the AI notice (HTML) */
export const ABOUT_INTRO_HTML = "<p>Click any cell to see its wind rose over the Mars year of the wind dataset, the sand-flux rose at the selected grain diameter, dune-orientation modes and all wind-regime parameters.</p>";
/** About, Data sources: the items after the wind datasets' (HTML) */
export const DATA_SOURCES_ITEMS_HTML = `<li><strong>Sand-flux fields</strong>: for every hour, the threshold and the saturated transport rate of Pähtz &amp; Durán (2023) at the selected median grain diameter d (grain density 3000 kg/m³, g = 3.71 m/s²), averaged over the year; drift potentials, crest fluxes and dune-orientation modes follow the methods outlined in Gunn (2026). Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per Earth year (365.25 days), in m²/yr, as on Earth.</li>
  <li><strong>Dune map</strong>: USGS Mars Global Digital Dune Database (MGD3; Hayward et al. 2007, 2010, 2012, 2014) plus the small dune fields of Fenton (2020, Icarus 352, 114018), merged into 3,514 dune-field polygons (Mars 2000 sphere); MGD3 polygons: public domain (U.S. Geological Survey); Fenton (2020) dune fields: CC BY 4.0.</li>
  <li><strong>Saturated flux divergence</strong> ${mathHtml("$\\nabla\\cdot\\vec{q}_s$")}: divergence of the resultant drift potential vector (magnitude RDP, direction RDD) on the Mars sphere (R = 3389.5 km), following Gunn (2026), Methods M6, with central differences on the grid of the wind dataset (${datasetFacts("resolution")}). Negative values (convergence) imply deposition.</li>
  <li><strong>Elevation and shaded relief</strong>: MGS MOLA – MEX HRSC blended DEM, 200 m, v2 (Fergason, Hare &amp; Laura 2018, USGS Astrogeology); licence: MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO). Derived elevation and relief tiles: CC BY-SA 3.0 IGO.</li>`;
/** About: the closing note (HTML) */
export const ABOUT_CREDITS_NOTE_HTML = "<p class=\"help\">Basemap credits are shown in the map attribution.</p>";
