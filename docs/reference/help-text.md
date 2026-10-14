# Dune Atlas: help and tour text

Generated from the Earth help text (`app/src/bodies/earth/helpText.ts`, shared labels in `app/src/core/ui/helpText.ts`) by `npm run help-doc` (do not edit here; a test checks that
this file matches the source). `$...$` is rendered as inline maths.

## Help button and panel

- Button (top right, under the zoom buttons): "?", accessible label "Help and tour"
- Panel title: Help
- Button: Restart tour
- Link at the end: About, data sources & citation

### Threshold friction velocity $u_{*,th}$

Sand moves when the friction velocity of the wind exceeds a threshold. The slider at the top of the layer panel sets this threshold for every threshold-dependent map layer and for the cell panel (default 0.15 m/s). A lower threshold counts weaker winds as sand-moving.

### Layers and Active layers

Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset; dunes, aridity, vegetation and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Show names, in the Dunes group, labels named dune fields on the map (the largest first, smaller ones as you zoom in) and hides the basemap's place names other than countries and states while it is on; click a name to zoom to the field and see its other names, countries, mapped dune area and sources.

### Concepts

The Concepts button (mortarboard, under the Help button) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.

### Search

Type a dune-field name (e.g. Namib Sand Sea or Rub' al Khali), a country, or a latitude and a longitude in the box at the top of the layer panel. Names match either line of a label and the other names a field is known by, including its named parts, ignoring accents; the list under the box shows each match with its countries, the best matches first and, among equally good ones, the fields with the largest mapped dune area. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. -24.5, 15.2 or 24°30′S 15°12′E). Latitude comes first unless the letters say otherwise. The line under the box shows how the text was read; Enter moves the map there and opens the cell panel when the cell has data.

### Clicking a cell

Click any land cell to open the cell panel: the wind rose, the sand-flux rose at the current threshold, dune-orientation modes against the threshold, the flux divergence and a table of all parameters. Section headings fold and unfold. Close the panel with × or Esc. The latitude and longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The crosshair button next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).

### Wind datasets

The Wind dataset selector switches between reanalysis wind statistics (ERA5-Land, 0.1°; ERA5, 0.25°; 1950–2024). ERA5-Land, used by Gunn (2026), is a land-surface rerun driven by ERA5 atmospheric fields interpolated to its grid (Muñoz-Sabater et al. 2021), so its winds are not an independent estimate, and the datasets can still differ: e.g., Baas (2026) reports ERA5-Land 10 m wind speeds 20–30 % below those of ERA5. Where the datasets give different results, treat them as uncertain. The wind and sand-flux layers and the cell panel follow the selection; the dune map, aridity and vegetation layers are the same for every dataset.

### Downloads and citation

Download & cite in the cell panel saves the wind histogram and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite Gunn (2026) and the wind dataset you use.

### Downloading a region

The button below the camera (a dashed box) saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every threshold or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.

### Exporting images

Export map image (camera button, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.

### Sharing the view

The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, wind dataset, threshold, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.

## Guided tour

Shown once on the first visit (not in embed mode unless `?tour=1`). Buttons: Back / Next (Done on the last step) / Skip tour; counter "Step 1 of 10". Esc or a click outside skips.

### 1. Welcome to the Dune Atlas

Highlights: `.atlas-tools .help-btn`

This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.

### 2. Concepts

Highlights: `.atlas-tools .concepts-btn`

The Concepts button (mortarboard) explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.

### 3. The map

Highlights: `#map`

Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map.

### 4. Threshold friction velocity $u_{*,th}$

Highlights: `#layer-panel .pinned`

This slider sets the friction velocity above which the wind moves sand. Every threshold-dependent layer and the cell panel update as you move it.

### 5. Layers and their display

Highlights: `#layer-panel .layer-item[data-layer="rdpa"]` or `#layer-panel-body .layer-group` or `#layer-panel .panel-toggle`

Tick layers to add them to the map; ⓘ explains a layer. Display, opened here for the resultant drift direction (RDD), changes a layer's colours and colour limits and, for direction fields, draws a colour map, arrows or streamlines in the line colour and spacing you choose. Dunes only, under the Wind dataset selector, keeps the wind-derived layers to the cells with dunes.

### 6. Active layers

Highlights: `#layer-panel-body .order` or `#layer-panel .panel-toggle`

The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.

### 7. Click a land cell

Highlights: `#cell-panel:not([hidden])` or `#map`

Clicking a land cell opens the cell panel, shown here for a dune cell in the Namib Sand Sea: wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own $u_{*,th}$ slider at the top (outlined), linked to the main one. At the bottom you can download these data in NetCDF or CSV files and access citation information. The crosshair next to its title centres the map on the cell.

### 8. Wind dataset

Highlights: `#dataset-select` or `#layer-panel .panel-toggle`

Switch between the wind datasets; each option names the dataset and its grid. The map layers and the cell panel follow the selection.

### 9. Share and export

Highlights: `.atlas-tools .share-btn` or `.atlas-tools`

Copy a short link to this view, export the map as an image with colour bars, scale and data sources, or download the data of a region you draw on the map. Plots in the cell panel have their own Export menus.

### 10. Switch planet

Highlights: `.atlas-tools .planet-btn` or `.atlas-tools`

Earth and Mars share this atlas: the planet button below the camera swaps between them, and each atlas reopens the view you last had there.

Fallback (example cell not loaded): The example cell could not be loaded. Click any land cell on the map to open its panel.

## Share

- Button: Share / copy link
- Popover: Share this view; Copy link; confirmation "Link copied"
- Note: The link restores the position, zoom, wind dataset, threshold, basemap, active layers and the selected cell.

## Export

- Button: Export map image
- Popover: Export map image; Include basemap; Export PNG; while rendering "Rendering…"
- Note: PNG of the current view, 1600–2400 pixels wide, without the panels, on a white background unless Transparent background is ticked. Colour bars, legends, scale and data sources are added below the map.
- Cell-panel plots: menu "Export" with PNG, SVG
