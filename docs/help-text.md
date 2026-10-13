# Dune Atlas: help and tour text

Generated from `app/src/ui/helpText.ts` by `npm run help-doc` (do not edit here; a test checks that
this file matches the source). `$...$` is rendered as inline maths.

## Help button and panel

- Button (top right, under the zoom buttons): "?", accessible label "Help and tour"
- Panel title: Help
- Button: Restart tour
- Link at the end: About, data sources & citation

### Threshold friction velocity $u_{*,th}$

Sand moves when the friction velocity of the wind exceeds a threshold. The slider at the top of the layer panel sets this threshold for every threshold-dependent map layer and for the cell panel (default 0.15 m/s). A lower threshold counts weaker winds as sand-moving.

### Layers and Active layers

Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×.

### Clicking a cell

Click any land cell to open the cell panel: the wind rose, the sand-flux rose at the current threshold, dune-orientation modes against the threshold, the flux divergence and a table of all parameters. Section headings fold and unfold. Close the panel with × or Esc.

### Wind datasets

The Wind dataset selector switches between ERA5-Land (0.1°) and ERA5 (0.25°) wind statistics for 1950–2024. The wind and sand-flux layers and the cell panel follow the selection; the dune map, aridity and vegetation layers are the same for both.

### Downloads and citation

Download & cite in the cell panel saves the wind histogram and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite Gunn (2026) and the wind dataset you use.

### Exporting images

Export map image (camera button, top right) saves the current view as a 300 dpi PNG at its on-screen size, with or without the basemap. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources, so the text is easy to crop. Each plot in the cell panel has an Export menu for a 300 dpi PNG or an SVG in a light theme.

### Sharing the view

The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, wind dataset, threshold, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.

## Guided tour

Shown once on the first visit (not in embed mode unless `?tour=1`). Buttons: Back / Next (Done on the last step) / Skip tour; counter "Step 1 of 8". Esc or a click outside skips.

### 1. Welcome to the Dune Atlas

Highlights: `.atlas-tools .help-btn`

This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.

### 2. The map

Highlights: `#map`

Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map.

### 3. Threshold friction velocity $u_{*,th}$

Highlights: `#layer-panel .pinned`

This slider sets the friction velocity above which the wind moves sand. Every threshold-dependent layer and the cell panel update as you move it.

### 4. Layers and their display

Highlights: `#layer-panel .layer-item[data-layer="rdpa"]` or `#layer-panel-body .layer-group` or `#layer-panel .panel-toggle`

Tick layers to add them to the map; ⓘ explains a layer. Display, opened here for the resultant drift direction (RDD), changes a layer's colours and colour limits and, for direction fields, draws a colour map, arrows or streamlines in the line colour and spacing you choose.

### 5. Active layers

Highlights: `#layer-panel-body .order` or `#layer-panel .panel-toggle`

The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.

### 6. Click a land cell

Highlights: `#cell-panel:not([hidden])` or `#map`

Clicking a land cell opens the cell panel, shown here for a dune cell in the Namib Sand Sea: wind rose, sand-flux rose, dune-orientation modes and a table of all parameters, with downloads and citation. The panel has its own $u_{*,th}$ slider at the top (outlined), linked to the main one.

### 7. Wind dataset

Highlights: `#dataset-select` or `#layer-panel .panel-toggle`

Switch between ERA5-Land (0.1°) and ERA5 (0.25°) wind statistics for 1950–2024. The map layers and the cell panel follow the selection.

### 8. Share and export

Highlights: `.atlas-tools .share-btn` or `.atlas-tools`

Copy a short link to this view, or export the map as an image with colour bars, scale and data sources. Plots in the cell panel have their own Export menus. This is the end of the tour.

Fallback (example cell not loaded): The example cell could not be loaded just now (are you offline?). Click any land cell on the map to open its panel.

## Share

- Button: Share / copy link
- Popover: Share this view; Copy link; confirmation "Link copied"
- Note: The link restores the position, zoom, wind dataset, threshold, basemap, active layers and the selected cell.

## Export

- Button: Export map image
- Popover: Export map image; Include basemap; Export PNG (300 dpi); while rendering "Rendering…"
- Note: 300 dpi PNG of the current view at its on-screen size, without the panels. Colour bars, legends, scale and data sources are added below the map.
- Cell-panel plots: menu "Export" with PNG (300 dpi), SVG
