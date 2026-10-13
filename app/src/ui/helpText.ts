// All text of the help panel and the guided tour (public; reviewed in docs/help-text.md, which is
// generated from this file by scripts/write-help-doc.ts and checked by tests/help.test.ts).
// Inline maths as $...$ (rendered with KaTeX); everything else plain text.

export const HELP_BUTTON_LABEL = "Help and tour";
export const HELP_TITLE = "Help";
export const HELP_RESTART = "Restart tour";
export const HELP_ABOUT_LINK = "About, data sources & citation";

export interface HelpSection { id: string; title: string; body: string }
export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "threshold", title: "Threshold friction velocity $u_{*,th}$",
    body: "Sand moves when the friction velocity of the wind exceeds a threshold. The slider at the top of the layer panel sets this threshold for every threshold-dependent map layer and for the cell panel (default 0.15 m/s). A lower threshold counts weaker winds as sand-moving.",
  },
  {
    id: "layers", title: "Layers and Active layers",
    body: "Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×.",
  },
  {
    id: "cell", title: "Clicking a cell",
    body: "Click any land cell to open the cell panel: the wind rose, the sand-flux rose at the current threshold, dune-orientation modes against the threshold, the flux divergence and a table of all parameters. Section headings fold and unfold. Close the panel with × or Esc.",
  },
  {
    id: "datasets", title: "Wind datasets",
    body: "The Wind dataset selector switches between ERA5-Land (0.1°) and ERA5 (0.25°) wind statistics for 1950–2024. The wind and sand-flux layers and the cell panel follow the selection; the dune map, aridity and vegetation layers are the same for both.",
  },
  {
    id: "downloads", title: "Downloads and citation",
    body: "Download & cite in the cell panel saves the wind histogram and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite Gunn (2026) and the wind dataset you use.",
  },
  {
    id: "images", title: "Exporting images",
    body: "Export map image (camera button, top right) saves the current view as a PNG at 1× or 2×, with or without the basemap, with an information strip below the map: colour bars, scale, view, wind dataset and data sources. Each plot in the cell panel has an Export menu for PNG or SVG in a light theme.",
  },
  {
    id: "share", title: "Sharing the view",
    body: "The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, wind dataset, threshold, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.",
  },
];

export interface TourStep {
  id: string;
  /** CSS selectors, first visible one is highlighted; none visible: the popover is centred */
  targets: string[];
  title: string;
  body: string;
}
export const TOUR_STEPS: TourStep[] = [
  {
    id: "help", targets: [".atlas-tools .help-btn"], title: "Welcome to the Dune Atlas",
    body: "This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.",
  },
  {
    id: "map", targets: ["#map"], title: "The map",
    body: "Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map.",
  },
  {
    id: "threshold", targets: ["#layer-panel .pinned"], title: "Threshold friction velocity $u_{*,th}$",
    body: "This slider sets the friction velocity above which the wind moves sand. Every threshold-dependent layer and the cell panel update as you move it.",
  },
  {
    id: "layers", targets: ["#layer-panel-body .layer-group", "#layer-panel .panel-toggle"], title: "Layers",
    body: "Tick layers to add them to the map. ⓘ explains a layer; Display changes its colours and limits and, for directions, shows arrows or streamlines. On small screens, open the list with the Layers button.",
  },
  {
    id: "active", targets: ["#layer-panel-body .order", "#layer-panel .panel-toggle"], title: "Active layers",
    body: "The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.",
  },
  {
    id: "cell", targets: ["#cell-panel:not([hidden])", "#map"], title: "Click a land cell",
    body: "Clicking a land cell opens the cell panel with its wind rose, sand-flux rose, dune-orientation modes and a table of all parameters, plus downloads and citation.",
  },
  {
    id: "dataset", targets: ["#dataset-select", "#layer-panel .panel-toggle"], title: "Wind dataset",
    body: "Switch between ERA5-Land (0.1°) and ERA5 (0.25°) wind statistics for 1950–2024. The map layers and the cell panel follow the selection.",
  },
  {
    id: "tools", targets: [".atlas-tools .share-btn", ".atlas-tools"], title: "Share and export",
    body: "Copy a short link to this view, or export the map as an image with colour bars, scale and data sources. Plots in the cell panel have their own Export menus. This is the end of the tour.",
  },
];

export const TOUR_LABELS = { back: "Back", next: "Next", done: "Done", skip: "Skip tour", step: (i: number, n: number) => `Step ${i} of ${n}` };

export const SHARE_TEXT = { button: "Share / copy link", title: "Share this view", copy: "Copy link", copied: "Link copied", note: "The link restores the position, zoom, wind dataset, threshold, basemap, active layers and the selected cell." };
export const EXPORT_TEXT = {
  button: "Export map image", title: "Export map image", scale: "Size", basemap: "Include basemap", run: "Export PNG", working: "Rendering…",
  note: "PNG of the current view without the panels, with colour bars, scale, view and data sources below the map.",
  plotMenu: "Export", png1: "PNG", png2: "PNG 2×", svg: "SVG",
};
