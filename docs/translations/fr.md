# Dune Atlas: French text

Edit only the text after `FR:`. Keep each translation on one line. Keep unchanged:
- anything between $ signs (formulas, e.g. $u_{*,th}$), HTML tags such as <br> and <a href="…">…</a>, and {placeholders};
- the markers ⟦0⟧, ⟦1⟧ … (a formula, a name, a number or a control is put there; it already carries its own
  spaces, so write it exactly as in the English, with no space added) and ⟦#0⟧, ⟦#1⟧ … (numbers);
- names of datasets, products and people, acronyms (DP, RDD, ERA5-Land …) and references.
An empty `FR:` line shows the English on the site. **STALE** after a heading: the English was changed after it
was translated; check the translation against the new English, then delete the word STALE.
Glossary of agreed terms: translation-glossary.csv.

# Interface

## ui.language (Interface)
EN: Language
FR: Langue

## header.subtitle (Interface)
EN: Interactive explorer for aeolian geomorphology<br>Developed by the <a href="https://www.geomorphlab.org/" target="_blank" rel="noopener">Monash Geomorphology Lab</a>
FR: Explorateur interactif de géomorphologie éolienne<br>Développé par le <a href="https://www.geomorphlab.org/" target="_blank" rel="noopener">Monash Geomorphology Lab</a>

## header.layers (Interface)
EN: Layers
FR: Calques

## header.layersTitle (Interface)
EN: Show / hide layers
FR: Afficher / masquer les calques

## basemap.legend (Interface)
EN: Basemap
FR: Fond de carte

## tools.help (Interface)
EN: Help and tour
FR: Aide et visite guidée

## tools.concepts (Interface)
EN: Concepts
FR: Concepts

## bubble.text (Interface)
EN: Help and Tour
FR: Aide et visite guidée

## bubble.label (Interface)
EN: Start the guided tour of the atlas
FR: Lancer la visite guidée de l’atlas

## tour.back (Interface)
EN: Back
FR: Précédent

## tour.next (Interface)
EN: Next
FR: Suivant

## tour.done (Interface)
EN: Done
FR: Terminé

## tour.skip (Interface)
EN: Skip tour
FR: Passer la visite

## tour.step (Interface)
EN: Step {i} of {n}
FR: Étape {i} sur {n}

## concepts.references (Interface)
EN: References:
FR: Références :

## concepts.link (Interface)
EN: Concept
FR: Concept

## legend.log (Interface)
EN: (log scale)
FR: (échelle logarithmique)

## legend.symlog (Interface)
EN: (symlog, linear within ±{x})
FR: (symlog, linéaire sur ±{x})

## legend.atCurrent (Interface)
EN: at current
FR: actuellement

## legend.axis (Interface)
EN: orientation axis (headless)
FR: axe d’orientation (sans pointe)

## legend.toward (Interface)
EN: direction of transport (toward)
FR: direction du transport (vers)

## legend.arrows (Interface)
EN: Arrows
FR: Flèches

## legend.streamlines (Interface)
EN: Streamlines
FR: Lignes de courant

## legend.arrowLength (Interface)
EN: Arrow length and opacity scale with the paired flux magnitude where available.
FR: La longueur et l’opacité des flèches sont proportionnelles à l’intensité du flux associé, lorsqu’elle est disponible.

## basemap.failed (Interface)
EN: The basemap “{title}” could not be loaded from its provider. It may be blocked on your network or temporarily unavailable. Please choose another basemap.
FR: Le fond de carte « {title} » n’a pas pu être chargé depuis son fournisseur. Il est peut-être bloqué sur votre réseau ou temporairement indisponible. Veuillez choisir un autre fond de carte.

# Help panel

## help.title (Help panel)
EN: Help
FR: Aide

## help.restart (Help panel)
EN: Restart tour
FR: Relancer la visite guidée

## help.aboutLink (Help panel)
EN: About, data sources & citation
FR: À propos, sources des données et citation

## earth.help.threshold.title (Help panel)
EN: Threshold friction velocity $u_{*,th}$
FR: Vitesse de frottement seuil $u_{*,th}$

## earth.help.threshold.body (Help panel)
EN: Sand moves when the friction velocity of the wind exceeds a threshold. The slider at the top of the layer panel sets this threshold for every threshold-dependent map layer and for the cell panel (default 0.15 m/s). A lower threshold counts weaker winds as sand-moving.
FR: Le sable se met en mouvement lorsque la vitesse de frottement du vent dépasse un seuil. Le curseur situé en haut du panneau des calques fixe ce seuil pour tous les calques cartographiques qui en dépendent ainsi que pour le panneau de cellule (valeur par défaut : 0,15 m/s). Un seuil plus bas fait compter des vents plus faibles comme vents transportant le sable.

## earth.help.layers.title (Help panel)
EN: Layers and Active layers
FR: Calques et calques actifs

## earth.help.layers.body (Help panel)
EN: Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset, and draws the dune map at no more than 50 % opacity so that these cells show through it; aridity, vegetation and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Names, in the Dune Fields group, labels named dune fields on the map (where names would overlap, some appear only as you zoom in) and hides the basemap's place names other than countries and states while it is on; click a name to zoom to the field and see its other names, countries and sources.
FR: Cochez un calque pour l’afficher. Le bouton ⓘ donne sa définition, ses unités et sa source de données ; Affichage modifie ses couleurs, ses bornes de couleur et son échelle, ou représente les champs de direction par des flèches ou des lignes de courant, avec un curseur d’espacement allant de Plus fin (lignes plus denses) à Plus grossier. Calques actifs liste ce qui est affiché sur la carte, de haut en bas : faites glisser une ligne ou utilisez les flèches pour changer l’ordre de dessin, réglez l’opacité avec son curseur et retirez un calque avec ×. Dunes seulement (sous le sélecteur Jeu de données de vent) dessine tous les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) uniquement dans les cellules contenant des dunes selon le jeu de données, et affiche la carte des dunes à une opacité d’au plus 50 % afin que ces cellules soient visibles par transparence ; l’aridité, la végétation et les fonds de carte restent inchangés, et le panneau de cellule fonctionne toujours pour n’importe quelle cellule. Ce réglage fait partie du lien. Noms, dans le groupe Champs de dunes, étiquette sur la carte les champs de dunes nommés (là où les noms se chevaucheraient, certains n’apparaissent qu’en zoomant) et masque, tant qu’il est activé, les noms de lieux du fond de carte autres que ceux des pays et des États ; cliquez sur un nom pour zoomer sur le champ et voir ses autres noms, ses pays et ses sources.

## earth.help.concepts.title (Help panel)
EN: Concepts
FR: Concepts

## earth.help.concepts.body (Help panel)
EN: The Concepts button {icon_concepts} (under the Help button {icon_help}) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
FR: Le bouton Concepts {icon_concepts} (sous le bouton Aide {icon_help}) explique les grandeurs de l’atlas, chacune avec ses références. Le lien Concept dans le ⓘ d’un calque ouvre l’entrée correspondante.

## earth.help.search.title (Help panel)
EN: Search
FR: Recherche

## earth.help.search.body (Help panel)
EN: Type a dune-field name (e.g. Namib Sand Sea or Rub' al Khali), a country, or a latitude and a longitude in the box at the top of the layer panel. Names match either line of a label and the other names a field is known by, including its named parts, ignoring accents; the list under the box shows each match with its countries and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. -24.5, 15.2 or 24°30′S 15°12′E). Latitude comes first unless the letters say otherwise. While you type coordinates, the line under the box shows the position they were read as (“Go to …”); Enter moves the map there and opens the cell panel when the cell has data.
FR: Saisissez le nom d’un champ de dunes (p. ex. Namib Sand Sea ou Rub' al Khali), un pays, ou une latitude et une longitude dans la zone située en haut du panneau des calques. Les noms correspondent à l’une ou l’autre ligne d’une étiquette ainsi qu’aux autres noms sous lesquels un champ est connu, y compris ses parties nommées, sans tenir compte des accents ; la liste sous la zone affiche chaque correspondance avec ses pays, les meilleures correspondances en premier. Les coordonnées peuvent être données en degrés décimaux ou en degrés, minutes et secondes, avec un signe ou avec N, S, E ou W (p. ex. -24.5, 15.2 ou 24°30′S 15°12′E). La latitude vient en premier, sauf si les lettres indiquent le contraire. Pendant que vous saisissez des coordonnées, la ligne sous la zone affiche la position telle qu’elle a été interprétée (« Aller à … ») ; Entrée déplace la carte à cet endroit et ouvre le panneau de cellule lorsque la cellule contient des données.

## earth.help.cell.title (Help panel)
EN: Clicking a cell
FR: Cliquer sur une cellule

## earth.help.cell.body (Help panel)
EN: Click any land cell to open the cell panel: the wind rose, the sand-flux rose at the current threshold, dune-orientation modes against the threshold, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the “Petals: toward / from” choice above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The latitude and longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The button {icon_centre} next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
FR: Cliquez sur n’importe quelle cellule terrestre pour ouvrir le panneau de cellule : la rose des vents, la rose des flux de sable au seuil actuel, les modes d’orientation des dunes en fonction du seuil, la divergence du flux et un tableau de tous les paramètres. Les pétales de la rose des flux de sable pointent vers l’endroit où se déplace le sable ; le choix « Pétales : vers / depuis » au-dessus de la rose les inverse pour montrer plutôt d’où vient le vent (les flèches pointent toujours vers la direction de transport). Les titres de section se replient et se déplient. Fermez le panneau avec × ou Échap. La latitude et la longitude sous le curseur sont affichées à côté de la barre d’échelle, en bas à gauche (sur écran tactile : le dernier point touché). Le bouton {icon_centre} à côté du titre de la cellule centre la carte sur la cellule (en ne zoomant que si la cellule est trop petite pour être visible).

## earth.help.datasets.title (Help panel)
EN: Wind datasets
FR: Jeux de données de vent

## earth.help.datasets.body (Help panel)
EN: The Wind dataset selector switches between wind datasets (ERA5-Land, 0.1°, 1950–2024; ERA5, 0.25°, 1950–2024). ERA5-Land, used by Gunn (2026), re-runs ECMWF's land-surface model driven by ERA5 atmospheric fields interpolated to its 0.1° grid (Muñoz-Sabater et al. 2021); Baas (2026) reports its 10 m wind speeds 20–30 % below those of ERA5. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
FR: Le sélecteur Jeu de données de vent permet de basculer entre des jeux de données de vent (ERA5-Land, 0,1°, 1950–2024 ; ERA5, 0,25°, 1950–2024). ERA5-Land, utilisé par Gunn (2026), est une réexécution du modèle de surface terrestre d'ECMWF forcée par les champs atmosphériques d'ERA5 interpolés sur sa grille de 0,1° (Muñoz-Sabater et al. 2021) ; Baas (2026) signale des vitesses du vent à 10 m d'ERA5-Land inférieures de 20 à 30 % à celles d'ERA5. Les calques de vent et de flux de sable ainsi que le panneau de cellule suivent la sélection ; le masque des champs de dunes et les calques d'aridité et de végétation sont les mêmes pour tous les jeux de données.

## earth.help.downloads.title (Help panel)
EN: Downloads and citation
FR: Téléchargements et citation

## earth.help.downloads.body (Help panel)
EN: Download & cite in the cell panel saves the wind histogram and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite Gunn (2026) and the wind dataset you use.
FR: Télécharger et citer, dans le panneau de cellule, enregistre l’histogramme du vent et tous les paramètres de la cellule au format NetCDF ou sous forme d’archive CSV, avec la citation de chaque source de données. Merci de citer Gunn (2026) ainsi que le jeu de données de vent utilisé.

## earth.help.region.title (Help panel)
EN: Downloading a region
FR: Télécharger une région

## earth.help.region.body (Help panel)
EN: The region button {icon_region}, below the camera button {icon_camera}, saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every threshold or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
FR: Le bouton de région {icon_region}, sous le bouton appareil photo {icon_camera}, enregistre toutes les cellules du jeu de données de vent sélectionné comprises dans un cadre en latitude-longitude, sous la forme d’un unique fichier NetCDF accompagné d’un README. Saisissez les limites, ou appuyez sur Dessiner sur la carte et tracez un cadre sur la carte (Échap pour annuler). Cochez les paramètres, puis choisissez tous les seuils ou le seuil actuel. La taille est estimée au fur et à mesure et ne peut dépasser ce qu’un navigateur peut contenir. Pour la grille entière, voir Obtenir la grille complète sous Télécharger et citer.

## earth.help.images.title (Help panel)
EN: Exporting images
FR: Exporter des images

## earth.help.images.body (Help panel)
EN: Export map image (camera button {icon_camera}, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
FR: Exporter l’image de la carte (bouton appareil photo {icon_camera}, en haut à droite) enregistre la vue actuelle au format PNG, avec une largeur de 1600 à 2400 pixels (1,5 fois sa largeur à l’écran), avec ou sans fond de carte, sur fond blanc ou transparent. Sous la carte figurent les barres de couleur, les légendes, la flèche du nord et la barre d’échelle, puis la vue, le jeu de données de vent et les sources des données. Chaque graphique du panneau de cellule dispose d’un menu Exporter qui produit un PNG (1600 pixels de large) ou un SVG en thème clair, avec la même mise en page.

## earth.help.share.title (Help panel)
EN: Sharing the view
FR: Partager la vue

## earth.help.share.body (Help panel)
EN: The share button {icon_share} (top right) copies a short link that restores this view: position, zoom, globe or flat map, wind dataset, threshold, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
FR: Le bouton de partage {icon_share} (en haut à droite) copie un lien court qui restaure cette vue : position, zoom, globe ou carte plane, jeu de données de vent, seuil, fond de carte, calques actifs avec leurs paramètres d’affichage, et cellule sélectionnée. La barre d’adresse contient aussi en permanence un lien complet vers la vue actuelle.

# Guided tour

## earth.tour.help.title (Guided tour)
EN: Welcome to the Dune Atlas
FR: Bienvenue dans le Dune Atlas

## earth.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button {icon_help} highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
FR: Cette courte visite guidée présente les principales commandes. Le bouton Aide {icon_help}, mis en évidence ici dans le coin supérieur droit, ouvre un aide-mémoire et relance cette visite à tout moment.

## earth.tour.concepts.title (Guided tour)
EN: Concepts
FR: Concepts

## earth.tour.concepts.body (Guided tour)
EN: The Concepts button {icon_concepts} explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
FR: Le bouton Concepts {icon_concepts} explique la signification des grandeurs représentées sur la carte, avec leurs références. Le ⓘ de chaque calque renvoie à l’entrée correspondante.

## earth.tour.map.title (Guided tour)
EN: The map
FR: La carte

## earth.tour.map.body (Guided tour)
EN: Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map.
FR: Faites glisser pour vous déplacer ; faites défiler, pincez ou utilisez + et − pour zoomer. L’option Vue globe, sous Fond de carte, bascule entre le globe et une carte plane.

## earth.tour.threshold.title (Guided tour)
EN: Threshold friction velocity $u_{*,th}$
FR: Vitesse de frottement seuil $u_{*,th}$

## earth.tour.threshold.body (Guided tour)
EN: This slider sets the friction velocity above which the wind moves sand. Every threshold-dependent layer and the cell panel update as you move it.
FR: Ce curseur fixe la vitesse de frottement au-delà de laquelle le vent transporte le sable. Tous les calques dépendant du seuil, ainsi que le panneau de cellule, se mettent à jour lorsque vous le déplacez.

## earth.tour.layers.title (Guided tour)
EN: Layers and their display
FR: Les calques et leur affichage

## earth.tour.layers.body (Guided tour)
EN: Tick layers to add them to the map; ⓘ explains a layer. Display, opened here for the resultant drift direction (RDD), changes a layer's colours and colour limits and, for direction fields, draws a colour map, arrows or streamlines in the line colour and spacing you choose. Dunes only, under the Wind dataset selector, keeps the wind-derived layers to the cells with dunes.
FR: Cochez des calques pour les ajouter à la carte ; ⓘ explique un calque. Affichage, ouvert ici pour la direction de dérive résultante (RDD), modifie les couleurs et les bornes de l’échelle de couleurs d’un calque et, pour les champs de directions, trace une carte en couleurs, des flèches ou des lignes de courant avec la couleur de trait et l’espacement de votre choix. Dunes seulement, sous le sélecteur Jeu de données de vent, restreint les calques dérivés du vent aux cellules comportant des dunes.

## earth.tour.active.title (Guided tour)
EN: Active layers
FR: Calques actifs

## earth.tour.active.body (Guided tour)
EN: The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.
FR: Les calques présents sur la carte, de haut en bas. Faites glisser une ligne ou utilisez les flèches pour choisir le calque dessiné au-dessus, le curseur pour régler l’opacité et × pour retirer un calque.

## earth.tour.cell.title (Guided tour)
EN: Click a land cell
FR: Cliquez sur une cellule terrestre

## earth.tour.cell.body (Guided tour)
EN: Clicking a land cell opens the cell panel, shown here for a dune cell in the Namib Sand Sea: wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own $u_{*,th}$ slider at the top (outlined), linked to the main one. At the bottom, Download & cite saves these data as NetCDF or CSV, with the citations. The button {icon_centre} next to its title centres the map on the cell.
FR: Cliquer sur une cellule terrestre ouvre le panneau de cellule, présenté ici pour une cellule de dunes de la Namib Sand Sea : rose des vents, rose des flux de sable, modes d’orientation des dunes et tableau de tous les paramètres. Le panneau possède en haut son propre curseur $u_{*,th}$ (encadré), lié au curseur principal. En bas, Télécharger et citer enregistre ces données au format NetCDF ou CSV, avec les citations. Le bouton {icon_centre} à côté de son titre centre la carte sur la cellule.

## earth.tour.dataset.title (Guided tour)
EN: Wind dataset
FR: Jeu de données de vent

## earth.tour.dataset.body (Guided tour)
EN: Switch between the wind datasets; each option names the dataset and its grid. The map layers and the cell panel follow the selection.
FR: Basculez entre les jeux de données de vent ; chaque option indique le jeu de données et sa grille. Les calques de la carte et le panneau de cellule suivent la sélection.

## earth.tour.tools.title (Guided tour)
EN: Share and export
FR: Partager et exporter

## earth.tour.tools.body (Guided tour)
EN: Copy a short link to this view, export the map as an image with colour bars, scale and data sources, or download the data of a region you draw on the map. Plots in the cell panel have their own Export menus.
FR: Copiez un lien court vers cette vue, exportez la carte sous forme d’image avec barres de couleur, échelle et sources des données, ou téléchargez les données d’une région que vous dessinez sur la carte. Les graphiques du panneau de cellule disposent de leurs propres menus Exporter.

## earth.tour.planet.title (Guided tour)
EN: Switch planet
FR: Changer de planète

## earth.tour.planet.body (Guided tour)
EN: Earth and Mars share this atlas: the planet button {icon_planet}, below the camera button {icon_camera}, swaps between them, and each atlas reopens the view you last had there.
FR: La Terre et Mars partagent cet atlas : le bouton planète {icon_planet}, sous le bouton appareil photo {icon_camera}, permet de passer de l’une à l’autre, et chaque atlas rouvre la dernière vue que vous y aviez.

# Layer groups

## earth.group.dunes (Layer groups)
EN: Dune Fields
FR: Champs de dunes

## earth.group.dunes.desc (Layer groups)
EN: Global aeolian dune map on the 0.1° ERA5-Land grid (106,540 cells, 7.8 % of land area).
FR: Carte globale des dunes éoliennes sur la grille ERA5-Land à 0,1° (106 540 cellules, 7,8 % de la surface continentale).

# Layers and legends

## earth.layer.dunes.title (Layers and legends)
EN: Dune-field mask
FR: Masque des champs de dunes

## earth.layer.dunes.short (Layers and legends)
EN: Mask
FR: Masque

# Layer groups

## earth.group.orientation (Layer groups)
EN: Bedform orientation
FR: Orientation des formes de lit

## earth.group.orientation.desc (Layer groups)
EN: Predicted dune orientations: crest orientation and migration direction of the bed-instability mode, elongation direction and along-crest transport direction.
FR: Orientations prédites des dunes : orientation de la crête et direction de migration du mode d’instabilité du lit, direction d’allongement et direction du transport le long de la crête.

# Layers and legends

## earth.layer.at.title (Layers and legends)
EN: Transverse migration direction $\alpha_T$
FR: Direction de migration transverse $\alpha_T$

## earth.layer.at.units (Layers and legends)
EN: °
FR: °

## earth.layer.ae.title (Layers and legends)
EN: Elongation direction $\alpha_E$
FR: Direction d’allongement $\alpha_E$

## earth.layer.ae.units (Layers and legends)
EN: °
FR: °

## earth.layer.ab.title (Layers and legends)
EN: Crest orientation, bed-instability mode $\alpha_H$
FR: Orientation de la crête, mode d’instabilité du lit $\alpha_H$

## earth.layer.ab.units (Layers and legends)
EN: °
FR: °

## earth.layer.ao.title (Layers and legends)
EN: Along-crest transport direction $\alpha_O$
FR: Direction du transport le long de la crête $\alpha_O$

## earth.layer.ao.units (Layers and legends)
EN: °
FR: °

# Layer groups

## earth.group.crest-fluxes (Layer groups)
EN: Crest-normal/parallel fluxes
FR: Flux normaux et parallèles à la crête

## earth.group.crest-fluxes.desc (Layer groups)
EN: Net and absolute sand flux resolved across (normal to) and along (parallel to) predicted crests.
FR: Flux de sable net et absolu décomposés à travers les crêtes prédites (normalement à celles-ci) et le long de ces crêtes (parallèlement à celles-ci).

# Layers and legends

## earth.layer.qacb.title (Layers and legends)
EN: Absolute across-crest flux, bed-instability mode $\langle |Q_{\bot}(\alpha_H)|\rangle$
FR: Flux absolu à travers la crête, mode d’instabilité du lit $\langle |Q_{\bot}(\alpha_H)|\rangle$

## earth.layer.qacb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.qncb.title (Layers and legends)
EN: Net across-crest flux, bed-instability mode $\langle Q_{\bot}(\alpha_H)\rangle$
FR: Flux net à travers la crête, mode d’instabilité du lit $\langle Q_{\bot}(\alpha_H)\rangle$

## earth.layer.qncb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.qnlb.title (Layers and legends)
EN: Net along-crest flux, bed-instability mode $\langle Q_{\parallel}(\alpha_H)\rangle$
FR: Flux net le long de la crête, mode d’instabilité du lit $\langle Q_{\parallel}(\alpha_H)\rangle$

## earth.layer.qnlb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.qalb.title (Layers and legends)
EN: Absolute along-crest flux, bed-instability mode $\langle |Q_{\parallel}(\alpha_H)|\rangle$
FR: Flux absolu le long de la crête, mode d’instabilité du lit $\langle |Q_{\parallel}(\alpha_H)|\rangle$

## earth.layer.qalb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.qnle.title (Layers and legends)
EN: Net along-crest flux, elongation mode $\langle Q_{\parallel}(\alpha_E)\rangle$
FR: Flux net le long de la crête, mode d’allongement $\langle Q_{\parallel}(\alpha_E)\rangle$

## earth.layer.qnle.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.qale.title (Layers and legends)
EN: Absolute along-crest flux, elongation mode $\langle |Q_{\parallel}(\alpha_E)|\rangle$
FR: Flux absolu le long de la crête, mode d’allongement $\langle |Q_{\parallel}(\alpha_E)|\rangle$

## earth.layer.qale.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.qace.title (Layers and legends)
EN: Absolute across-crest flux, elongation mode $\langle |Q_{\bot}(\alpha_E)|\rangle$
FR: Flux absolu à travers la crête, mode d’allongement $\langle |Q_{\bot}(\alpha_E)|\rangle$

## earth.layer.qace.units (Layers and legends)
EN: m²/yr
FR: m²/yr

# Layer groups

## earth.group.morphology (Layer groups)
EN: Ratios & morphology indices
FR: Rapports et indices morphologiques

## earth.group.morphology.desc (Layer groups)
EN: Dimensionless flux ratios related to dune morphology and stability.
FR: Rapports de flux adimensionnels liés à la morphologie et à la stabilité des dunes.

# Layers and legends

## earth.layer.sige_sigh.title (Layers and legends)
EN: Stability of elongating dunes on starved beds $\sigma_E/\sigma_H$
FR: Stabilité des dunes en allongement sur lits pauvres en sable $\sigma_E/\sigma_H$

## earth.layer.sige_sigh.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.qhab_nl_nc.title (Layers and legends)
EN: Crest straightness vs sinuosity, bed-instability mode $\hat{Q}_{\parallel/\bot,H}$
FR: Rectitude vs sinuosité des crêtes, mode d’instabilité du lit $\hat{Q}_{\parallel/\bot,H}$

## earth.layer.qhab_nl_nc.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.qhab_ac_nc.title (Layers and legends)
EN: Growth-in-height vs migration balance $\hat{Q}_{|\bot|/\bot,H}$
FR: Équilibre entre croissance en hauteur et migration $\hat{Q}_{|\bot|/\bot,H}$

## earth.layer.qhab_ac_nc.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.qhne_ac_nl.title (Layers and legends)
EN: Morphology of elongating dunes $\hat{Q}_{|\bot|/\parallel,E}$
FR: Morphologie des dunes en allongement $\hat{Q}_{|\bot|/\parallel,E}$

## earth.layer.qhne_ac_nl.units (Layers and legends)
EN: dimensionless
FR: sans dimension

# Layer groups

## earth.group.wind (Layer groups)
EN: Wind statistics
FR: Statistiques du vent

## earth.group.wind.desc (Layer groups)
EN: How often and how strongly the flat-bed friction velocity exceeds the threshold.
FR: À quelle fréquence et avec quelle intensité la vitesse de frottement sur lit plat dépasse le seuil.

# Layers and legends

## earth.layer.uft.title (Layers and legends)
EN: Fraction of time above threshold $T|u_{\ast,f}>u_{\ast,th}/T$
FR: Fraction du temps au-dessus du seuil $T|u_{\ast,f}>u_{\ast,th}/T$

## earth.layer.uft.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.ufm.title (Layers and legends)
EN: Mean above-threshold friction velocity / threshold $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$
FR: Vitesse de frottement moyenne au-dessus du seuil / seuil $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$

## earth.layer.ufm.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.qhbf.title (Layers and legends)
EN: Fraction of bed-instability-mode flux while flat bed above threshold
FR: Fraction du flux en mode d’instabilité du lit lorsque la vitesse de frottement sur lit plat dépasse le seuil

## earth.layer.qhbf.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.qhef.title (Layers and legends)
EN: Fraction of elongation-mode flux while flat bed above threshold
FR: Fraction du flux en mode d’allongement lorsque la vitesse de frottement sur lit plat dépasse le seuil

## earth.layer.qhef.units (Layers and legends)
EN: dimensionless
FR: sans dimension

# Layer groups

## earth.group.drift (Layer groups)
EN: Drift potential
FR: Potentiel de dérive

## earth.group.drift.desc (Layer groups)
EN: Flat-bed sand flux: total (DP), net (RDP), its direction (RDD) and directionality (RDP/DP).
FR: Flux de sable sur lit plat : total (DP), net (RDP), sa direction (RDD) et sa directionnalité (RDP/DP).

# Layers and legends

## earth.layer.dpm.title (Layers and legends)
EN: Drift potential $DP$
FR: Potentiel de dérive $DP$

## earth.layer.dpm.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.rdpm.title (Layers and legends)
EN: Resultant drift potential $RDP$
FR: Potentiel de dérive résultant $RDP$

## earth.layer.rdpm.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## earth.layer.rdpa.title (Layers and legends)
EN: Resultant drift direction $RDD$
FR: Direction de dérive résultante $RDD$

## earth.layer.rdpa.units (Layers and legends)
EN: °
FR: °

## earth.layer.qha_rdp_dp.title (Layers and legends)
EN: Flux directionality $RDP/DP$
FR: Directionnalité du flux $RDP/DP$

## earth.layer.qha_rdp_dp.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.qsdiv.title (Layers and legends)
EN: Saturated flux divergence $\nabla\cdot\vec{q}_s$
FR: Divergence du flux saturé $\nabla\cdot\vec{q}_s$

## earth.layer.qsdiv.units (Layers and legends)
EN: m/kyr
FR: m/kyr

# Layer groups

## earth.group.climate (Layer groups)
EN: Related data
FR: Données associées

## earth.group.climate.desc (Layer groups)
EN: Surface conditions from external datasets: aridity and vegetation cover. These do not depend on the wind dataset or on u*,th.
FR: Conditions de surface issues de jeux de données externes : aridité et couvert végétal. Elles ne dépendent ni du jeu de données de vent ni de u*,th.

# Layers and legends

## earth.layer.aridity.title (Layers and legends)
EN: Aridity index $\mathrm{AI}$
FR: Indice d’aridité $\mathrm{AI}$

## earth.layer.aridity.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## earth.layer.vegetation.title (Layers and legends)
EN: Total vegetation cover $V$
FR: Couvert végétal total $V$

## earth.layer.vegetation.units (Layers and legends)
EN: %
FR: %

## earth.invert.legend (Layers and legends)
EN: Land without mapped dunes
FR: Terres sans dunes cartographiées

# Basemaps

## earth.basemap.openfreemap-dark (Basemaps)
EN: Dark (OpenFreeMap)
FR: Sombre (OpenFreeMap)

## earth.basemap.esri-imagery (Basemaps)
EN: Satellite imagery (Esri)
FR: Imagerie satellite (Esri)

## earth.basemap.hillshade (Basemaps)
EN: Shaded relief (Mapterhorn, 2D)
FR: Relief ombré (Mapterhorn, 2D)

## earth.basemap.opentopomap (Basemaps)
EN: Topographic (OpenTopoMap)
FR: Topographique (OpenTopoMap)

## earth.basemap.openfreemap-light (Basemaps)
EN: Light (OpenFreeMap Positron)
FR: Clair (OpenFreeMap Positron)

# Concepts

## concept.earth.saturated-sand-flux-and-the-transport-law.title (Concepts)
EN: Saturated sand flux and the transport law
FR: Flux de sable saturé et loi de transport

## concept.earth.saturated-sand-flux-and-the-transport-law.p1 (Concepts)
EN: Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. It is zero below the threshold friction velocity and grows with the excess wind stress above it. The Earth atlas uses the transport law of Martin & Kok (2017), which is linear in the excess shear stress, with the friction velocity u* derived from the hourly 10 m wind by a logarithmic profile with a roughness length of 1 mm. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per year (m²/yr). Real transport is lower wherever sand is scarce, wet, crusted or vegetated.
FR: Le flux de sable saturé est le débit auquel le vent déplacerait le sable sur un lit plat entièrement couvert de sable meuble et sec. C’est la capacité de transport du vent, et non nécessairement le transport qui a réellement lieu. Il est nul en dessous de la vitesse de frottement seuil et croît avec l’excès de contrainte du vent au-delà de ce seuil. L’atlas Terre utilise la loi de transport de Martin & Kok (2017), linéaire en fonction de l’excès de contrainte de cisaillement. La vitesse de frottement u* y est déduite de la série horaire du vent à 10 m par un profil logarithmique, avec une longueur de rugosité de 1 mm. Les flux sont des volumes de sable compacté (compacité 0,6, espace poral inclus) par mètre de largeur et par an (m²/yr). Le transport réel est plus faible partout où le sable est rare, humide, encroûté ou couvert de végétation.

## fry.heading (Concepts)
EN: Atlas DP and Fryberger DP for a steady wind
FR: DP de l’atlas et DP de Fryberger pour un vent constant

## fry.slider (Concepts)
EN: Atlas threshold $u_{*,th}$
FR: Seuil de l’atlas $u_{*,th}$

## fry.atlas (Concepts)
EN: Atlas DP (m²/yr)
FR: DP de l’atlas (m²/yr)

## fry.fryberger (Concepts)
EN: Fryberger DP (VU)
FR: DP de Fryberger (VU)

## fry.ratio (Concepts)
EN: Atlas DP / Fryberger DP
FR: DP de l’atlas / DP de Fryberger

## fry.ratioUnits (Concepts)
EN: (m²/yr per VU)
FR: (m²/yr par VU)

## fry.xAxis (Concepts)
EN: 10 m wind speed $U_{10}$ (m/s)
FR: Vitesse du vent à 10 m $U_{10}$ (m/s)

## fry.knots (Concepts)
EN: knots
FR: nœuds

## fry.hint (Concepts)
EN: Point at the plot to read off the values.
FR: Pointez sur le graphique pour lire les valeurs.

## fry.mapValue (Concepts)
EN: map value
FR: valeur de la carte

## fry.mapValueTitle (Concepts)
EN: Back to the threshold of the map
FR: Revenir au seuil de la carte

## fry.readU (Concepts)
EN: $U_{10}$:
FR: $U_{10}$ :

## fry.readAtlas (Concepts)
EN: Atlas DP:
FR: DP de l’atlas :

## fry.readFry (Concepts)
EN: Fryberger DP:
FR: DP de Fryberger :

## fry.readRatio (Concepts)
EN: Ratio:
FR: Rapport :

## fry.caption (Concepts)
EN: For a wind blowing at one speed for the whole year. Atlas DP: the saturated flux of Martin & Kok (2017) from $u_* = \kappa U_{10} / \ln(z/z_0)$ with $z_0$ = 1 mm, at the threshold set above. Fryberger DP: $V^2(V - V_t)$ with $V$ in knots, $V_t$ = 12 knots and the wind blowing 100 % of the time. Dashed lines: the two thresholds; between them only one DP is above zero. The ratio changes with wind speed, so there is no fixed conversion factor; for a real wind record it depends on the mix of wind speeds. Hours above 20 m/s are not counted by the atlas.
FR: Pour un vent soufflant à une vitesse unique toute l’année. DP de l’atlas : le flux saturé de Martin & Kok (2017), à partir de $u_* = \kappa U_{10} / \ln(z/z_0)$ avec $z_0$ = 1 mm, au seuil défini ci-dessus. DP de Fryberger : $V^2(V - V_t)$, avec $V$ en nœuds, $V_t$ = 12 nœuds et un vent soufflant 100 % du temps. Lignes en tirets : les deux seuils ; entre eux, un seul des deux DP est supérieur à zéro. Le rapport change avec la vitesse du vent, si bien qu’il n’existe pas de facteur de conversion fixe ; pour une série de vent réelle, il dépend de la répartition des vitesses de vent. Les heures au-dessus de 20 m/s ne sont pas comptabilisées par l’atlas.

## concept.drift-potential-dp.title (Concepts)
EN: Drift potential (DP)
FR: Potentiel de dérive (DP)

## concept.drift-potential-dp.p1 (Concepts)
EN: DP is the saturated sand flux averaged over each time step of the record, whatever its direction: how much sand the wind could move in a year over a flat sandy bed, in m²/yr. Higher DP means a windier, more energetic sand-transport environment. The name follows Fryberger & Dean (1979), whose drift potential also measures transport capacity, but the two are different quantities. Fryberger's DP is in vector units, computed from 10 m wind speeds in knots as V²(V − Vt) with a 12-knot threshold. The atlas DP is a physical flux computed from the friction velocity. Because the two formulas grow differently with wind speed, there is no fixed conversion factor between them; Fryberger's low, intermediate and high-energy classes (below 200, 200–400 and above 400 vector units) are defined in vector units.
FR: Le DP est le flux de sable saturé moyenné sur chaque pas de temps de la série, quelle que soit sa direction : il exprime la quantité de sable que le vent pourrait déplacer en un an sur un lit sableux plat, en m²/yr. Un DP plus élevé traduit un environnement de transport sableux plus venteux et plus énergétique. Le nom reprend celui de Fryberger & Dean (1979), dont le potentiel de dérive mesure lui aussi une capacité de transport, mais il s’agit de deux grandeurs différentes. Le DP de Fryberger s’exprime en unités vectorielles et se calcule à partir des vitesses du vent à 10 m en nœuds, selon V²(V − Vt), avec un seuil de 12 nœuds. Le DP de l’atlas est un flux physique calculé à partir de la vitesse de frottement. Comme les deux formules croissent différemment avec la vitesse du vent, il n’existe pas de facteur de conversion fixe entre elles ; les classes de faible, moyenne et forte énergie de Fryberger (inférieur à 200, de 200 à 400 et supérieur à 400 unités vectorielles) sont définies en unités vectorielles.

## concept.resultant-drift-potential-rdp.title (Concepts)
EN: Resultant drift potential (RDP)
FR: Potentiel de dérive résultant (RDP)

## concept.resultant-drift-potential-rdp.p1 (Concepts)
EN: RDP is the net sand flux: the fluxes of each time step added as vectors, so that transport in opposite directions cancels, then averaged over the record (m²/yr). It equals DP only if all transport goes the same way. A cell with high DP but low RDP has strong winds that move sand back and forth with little net displacement; a cell with RDP close to DP moves sand steadily in one direction. RDP is the magnitude of the vector whose direction is the resultant drift direction (RDD), and the divergence of this vector gives the flux divergence layer.
FR: Le RDP est le flux de sable net : les flux de chaque pas de temps sont additionnés comme des vecteurs, de sorte que les transports de sens opposés s’annulent, puis moyennés sur la série (m²/yr). Il n’est égal au DP que si tout le transport s’effectue dans la même direction. Une cellule à DP élevé mais à RDP faible connaît des vents forts qui déplacent le sable dans un sens puis dans l’autre, avec un faible déplacement net ; une cellule dont le RDP est proche du DP déplace le sable de façon régulière dans une seule direction. Le RDP est la norme du vecteur dont la direction est la direction de dérive résultante (RDD), et la divergence de ce vecteur fournit le calque de divergence du flux.

## concept.resultant-drift-direction-rdd.title (Concepts)
EN: Resultant drift direction (RDD)
FR: Direction de dérive résultante (RDD)

## concept.resultant-drift-direction-rdd.p1 (Concepts)
EN: RDD is the direction of the net sand flux, given as the compass bearing toward which sand moves (0° = north, 90° = east). It summarises the direction of net sand transport over the whole record and is often compared with the migration direction of dunes and the trend of linear dunes. Where RDP/DP is low, opposing fluxes nearly cancel, and a small change of threshold (or grain diameter), wind dataset or neighbouring cell can turn RDD by up to 180°. The dune-orientation modes (αT, αE) use the whole distribution of flux directions, including the speed-up of the wind over dune crests, and can differ from RDD.
FR: La RDD est la direction du flux de sable net, exprimée comme l’azimut vers lequel le sable se déplace (0° = nord, 90° = est). Elle résume la direction du transport net de sable sur l’ensemble de la série et est souvent comparée à la direction de migration des dunes et à l’orientation des dunes linéaires. Là où RDP/DP est faible, les flux opposés s’annulent presque, et une petite modification du seuil (ou du diamètre des grains), du jeu de données de vent ou de la cellule voisine peut faire tourner la RDD jusqu’à 180°. Les modes d’orientation des dunes (αT, αE) utilisent l’ensemble de la distribution des directions de flux, y compris l’accélération du vent au-dessus des crêtes des dunes, et peuvent différer de la RDD.

## concept.directionality-rdp-dp.title (Concepts)
EN: Directionality (RDP/DP)
FR: Directionnalité (RDP/DP)

## concept.directionality-rdp-dp.p1 (Concepts)
EN: RDP/DP is the ratio of net to total sand flux. It is 1 when all transport goes in one direction and approaches 0 when transport from several directions cancels. Fryberger & Dean (1979) used the ratio to classify wind regimes: below 0.3 low (complex or obtuse bimodal winds), 0.3–0.8 intermediate (obtuse to acute bimodal winds), above 0.8 high (unimodal winds). The atlas ratio counts only transport above the selected threshold (Gunn 2026) and uses a different flux law, so it changes with the threshold or grain-diameter setting. Wasson & Hyde (1983) related dune type to this ratio together with sand availability.
FR: RDP/DP est le rapport entre le flux de sable net et le flux de sable total. Il vaut 1 lorsque tout le transport s’effectue dans une seule direction et tend vers 0 lorsque les transports provenant de plusieurs directions s’annulent. Fryberger & Dean (1979) ont utilisé ce rapport pour classer les régimes de vent : en dessous de 0,3, faible (vents complexes ou bimodaux obtus) ; de 0,3 à 0,8, intermédiaire (vents bimodaux obtus à aigus) ; au-dessus de 0,8, élevé (vents unimodaux). Le rapport de l’atlas ne prend en compte que le transport au-dessus du seuil sélectionné (Gunn 2026) et utilise une loi de flux différente, de sorte qu’il varie avec le réglage du seuil ou du diamètre des grains. Wasson & Hyde (1983) ont relié le type de dune à ce rapport ainsi qu’à la disponibilité en sable.

## concept.wind-from-sand-toward.title (Concepts)
EN: Wind FROM, sand TOWARD
FR: Vent DE, sable VERS

## concept.wind-from-sand-toward.p1 (Concepts)
EN: The atlas uses two opposite conventions, as is usual in each field. Wind roses are meteorological: a petal pointing north shows wind blowing from the north. Sand-flux roses, RDD and the dune-orientation modes show the direction sand or dunes move toward: a petal pointing south shows sand moving to the south. So a north wind appears as a north petal on the wind rose and a south petal on the sand rose. The Petals switch above the sand-flux rose in the cell panel can turn its petals to show the direction the wind comes from instead, as on the wind rose; the arrows on the rose, the bearing values, the map and the downloaded data keep the toward convention. The crest orientation αH is an axis (0–180°), not a direction of motion, and has neither "from" nor "toward".
FR: L’atlas utilise deux conventions opposées, conformément à l’usage de chaque discipline. Les roses des vents suivent la convention météorologique : un pétale pointant vers le nord indique un vent soufflant du nord. Les roses des flux de sable, la RDD et les modes d’orientation des dunes indiquent la direction vers laquelle se déplacent le sable ou les dunes : un pétale pointant vers le sud indique du sable se déplaçant vers le sud. Ainsi, un vent du nord apparaît comme un pétale nord sur la rose des vents et comme un pétale sud sur la rose des flux de sable. Le commutateur Pétales, au-dessus de la rose des flux de sable dans le panneau de la cellule, permet d’orienter ses pétales pour indiquer plutôt la direction d’où vient le vent, comme sur la rose des vents ; les flèches de la rose, les valeurs d’azimut, la carte et les données téléchargées conservent la convention « vers ». L’orientation de la crête αH est un axe (0–180°), et non une direction de mouvement : elle n’a ni « de » ni « vers ».

## concept.earth.threshold-friction-velocity.title (Concepts)
EN: Threshold friction velocity
FR: Vitesse de frottement seuil

## concept.earth.threshold-friction-velocity.p1 (Concepts)
EN: Sand moves when the friction velocity u* of the wind, a measure of the shear stress the wind exerts on the surface, exceeds a threshold u*,th. The default of 0.15 m/s is the value used for the global analysis of Gunn (2026), one value for the whole globe, not calibrated for any site. Values between 0.1 and 0.4 m/s are typical, and for loose, dry sand the threshold depends mainly on grain size and density. With the atlas's wind profile, 0.15 m/s equals a 3.4 m/s wind at 10 m (6.6 knots), and Fryberger's 12 knots equals about 0.27 m/s. Raising the threshold lowers DP and can change directions.
FR: Le sable se met en mouvement lorsque la vitesse de frottement u* du vent, mesure de la contrainte de cisaillement que le vent exerce sur la surface, dépasse un seuil u*,th. La valeur par défaut de 0,15 m/s est celle utilisée pour l’analyse globale de Gunn (2026) : une valeur unique pour le globe entier, non calibrée pour un site particulier. Les valeurs comprises entre 0,1 et 0,4 m/s sont typiques, et pour un sable sec et meuble, le seuil dépend principalement de la taille et de la masse volumique des grains. Avec le profil de vent de l’atlas, 0,15 m/s correspond à un vent de 3,4 m/s à 10 m (6,6 nœuds), et les 12 nœuds de Fryberger correspondent à environ 0,27 m/s. Relever le seuil diminue le DP et peut modifier les directions.

## concept.two-ways-dunes-orient-bed-instability-and-elongation.title (Concepts)
EN: Two ways dunes orient: bed instability and elongation
FR: Deux modes d’orientation des dunes : instabilité du lit et allongement

## concept.two-ways-dunes-orient-bed-instability-and-elongation.p1 (Concepts)
EN: Dunes can grow in two ways that give different orientations in the same wind regime. Where loose sand covers the bed, dunes grow in height from the bed itself (the bed instability): crests align so that the gross sand transport across them is as large as possible (Rubin & Hunter 1987), and the dunes migrate. Where sand is scarce over a non-erodible bed, dunes can instead grow in length from a sand source (the elongation mode): they extend in the direction of the net sand flux on the dune, where the net flux across the crest is zero. Elongating dunes need winds from more than one direction, and in approximately bi-directional winds the two orientations often differ by more than 90°. Mapped crest orientations can be compared with both predictions.
FR: Les dunes peuvent croître de deux manières, qui donnent des orientations différentes sous un même régime de vent. Là où du sable meuble recouvre le lit, les dunes croissent en hauteur à partir du lit lui-même (l’instabilité du lit) : les crêtes s’alignent de sorte que le transport brut de sable qui les traverse soit le plus grand possible (Rubin & Hunter 1987), et les dunes migrent. Là où le sable est rare sur un lit non érodable, les dunes peuvent au contraire croître en longueur à partir d’une source de sable (le mode d’allongement) : elles s’étendent dans la direction du flux net de sable sur la dune, là où le flux net à travers la crête est nul. Les dunes en allongement nécessitent des vents provenant de plus d’une direction, et sous des vents approximativement bidirectionnels, les deux orientations diffèrent souvent de plus de 90°. Les orientations de crête cartographiées peuvent être comparées aux deux prédictions.

## concept.migration-direction-αt.title (Concepts)
EN: Migration direction αT
FR: Direction de migration αT

## concept.migration-direction-αt.p1 (Concepts)
EN: αT is the direction in which dunes with the bed-instability crest orientation αH migrate, as a compass bearing (toward). It is perpendicular to αH, on the side toward which the net sand flux across the crest points. Because αH depends on the gross crest transport from all directions, αT reflects the whole flux rose and can differ from RDD, especially in bimodal winds. Barchan dunes migrate in the direction their horns point. Gunn (2026) compares αT with mapped barchans and shows that in some places the predicted direction changes strongly with the threshold, that is, with grain size or other factors such as vegetation.
FR: αT est la direction dans laquelle migrent les dunes dont la crête a l’orientation αH issue de l’instabilité du lit, exprimée sous forme d’azimut (vers). Elle est perpendiculaire à αH, du côté vers lequel pointe le flux net de sable à travers la crête. Comme αH dépend du transport brut sur la crête provenant de toutes les directions, αT reflète l’ensemble de la rose des flux et peut différer de la RDD, en particulier sous des vents bimodaux. Les barkhanes migrent dans la direction vers laquelle pointent leurs cornes. Gunn (2026) compare αT aux barkhanes cartographiées et montre qu’en certains endroits la direction prédite varie fortement avec le seuil, c’est-à-dire avec la taille des grains ou d’autres facteurs tels que la végétation.

## concept.crest-orientation-αh.title (Concepts)
EN: Crest orientation αH
FR: Orientation de la crête αH

## concept.crest-orientation-αh.p1 (Concepts)
EN: αH is the orientation of dune crests formed by the bed instability: the axis along which crests receive the largest gross sand transport across them, because transport from both sides builds a dune up (Rubin & Hunter 1987). The atlas computes it with the speed-up of the wind over a dune crest, which is largest when the wind crosses the crest at a right angle. αH is also the expected crest orientation of migrating dunes such as barchans. It is an axis between 0° and 180°, not a direction of motion: e.g., 128° and 308° describe the same line. Dunes with this orientation migrate perpendicular to it, in direction αT.
FR: αH est l’orientation des crêtes de dunes formées par l’instabilité du lit : l’axe selon lequel les crêtes reçoivent le plus grand transport brut de sable qui les traverse, car un transport provenant des deux côtés fait croître une dune (Rubin & Hunter 1987). L’atlas la calcule en tenant compte de l’accélération du vent au-dessus d’une crête de dune, qui est maximale lorsque le vent traverse la crête à angle droit. αH est aussi l’orientation de crête attendue pour les dunes en migration telles que les barkhanes. Il s’agit d’un axe compris entre 0° et 180°, et non d’une direction de déplacement : par exemple, 128° et 308° décrivent la même droite. Les dunes ayant cette orientation migrent perpendiculairement à celle-ci, dans la direction αT.

## concept.elongation-direction-αe.title (Concepts)
EN: Elongation direction αE
FR: Direction d’allongement αE

## concept.elongation-direction-αe.p1 (Concepts)
EN: αE is the direction in which dunes of the elongation mode extend, as a compass bearing (toward). These dunes form where sand is limited over a non-erodible bed, typically growing from a fixed source such as sand trapped behind an obstacle. A dune elongates where the net sand flux across its crest is zero and the net flux along it is positive; this direction is stable, because transport turns a dune that deviates from it back toward it. Because the dune itself changes the winds it feels, αE can be longitudinal or oblique to RDD. An elongating dune needs winds from more than one direction. Where several elongation directions exist, as for star dunes, the atlas shows the most stable one.
FR: αE est la direction dans laquelle s’étendent les dunes du mode d’allongement, exprimée en azimut (vers). Ces dunes se forment là où le sable est limité sur un lit non érodable, et croissent généralement à partir d’une source fixe, par exemple du sable piégé derrière un obstacle. Une dune s’allonge là où le flux net de sable à travers sa crête est nul et où le flux net le long de celle-ci est positif. Cette direction est stable, car le transport ramène vers elle une dune qui s’en écarte. Comme la dune modifie elle-même les vents qu’elle subit, αE peut être longitudinale ou oblique par rapport à la RDD. Une dune en allongement nécessite des vents provenant de plus d’une direction. Là où coexistent plusieurs directions d’allongement, comme pour les dunes étoiles, l’atlas affiche la plus stable.

## concept.along-crest-transport-direction-αo.title (Concepts)
EN: Along-crest transport direction αO
FR: Direction du transport le long de la crête αO

## concept.along-crest-transport-direction-αo.p1 (Concepts)
EN: αO is a direction along the crests of the bed-instability orientation αH: the way the net sand flux along those crests points, as a compass bearing (toward). Where crests are transverse to the net transport, sand crosses them with little along-crest movement; where they are oblique or longitudinal, part of the transport runs along the crest, and αO shows which way. Along-crest transport tends to keep crests straight, and superimposed features such as small dunes and crest sinuosities that migrate along a main crest reveal the direction of along-crest transport on imagery.
FR: αO est une direction le long des crêtes correspondant à l’orientation d’instabilité du lit αH : le sens dans lequel pointe le flux net de sable le long de ces crêtes, exprimé en azimut (vers). Là où les crêtes sont transverses au transport net, le sable les franchit avec peu de déplacement le long de la crête. Là où elles sont obliques ou longitudinales, une partie du transport s’effectue le long de la crête, et αO en indique le sens. Le transport le long de la crête tend à maintenir les crêtes rectilignes. Sur l’imagerie, les formes superposées qui migrent le long d’une crête principale, telles que de petites dunes ou des sinuosités de crête, révèlent la direction du transport le long de la crête.

## concept.stability-of-elongating-dunes-σe-σh.title (Concepts)
EN: Stability of elongating dunes σE/σH
FR: Stabilité des dunes en allongement σE/σH

## concept.stability-of-elongating-dunes-σe-σh.p1 (Concepts)
EN: σE/σH compares how fast dunes grow in height in the two orientations: the gross sand transport across a crest in the elongation orientation αE divided by that across a crest in the bed-instability orientation αH. It lies between 0 and 1. A dune can exist only if winds cross its crest and build it up, whatever its orientation. In numerical simulations of dunes elongating from a sand source on a starved bed, and in dunes around the Tibesti Massif, elongating linear dunes form where σE/σH is above about 0.6; below it, the source instead produces a train of migrating barchans.
FR: σE/σH compare la vitesse de croissance en hauteur des dunes dans les deux orientations. C’est le transport brut de sable à travers une crête orientée selon la direction d’allongement αE, divisé par celui à travers une crête orientée selon l’orientation d’instabilité du lit αH. Ce rapport est compris entre 0 et 1. Quelle que soit son orientation, une dune ne peut exister que si les vents franchissent sa crête et l’édifient. Des simulations numériques de dunes s’allongeant à partir d’une source de sable sur un lit pauvre en sable ont été réalisées, et des dunes autour du massif du Tibesti ont été étudiées. Dans les deux cas, des dunes linéaires en allongement se forment là où σE/σH dépasse environ 0,6. En deçà, la source produit plutôt un train de barkhanes en migration.

## concept.along-crest-versus-across-crest-transport-q-h.title (Concepts)
EN: Along-crest versus across-crest transport Q̂∥/⊥,H
FR: Transport le long de la crête par rapport au transport à travers la crête Q̂∥/⊥,H

## concept.along-crest-versus-across-crest-transport-q-h.p1 (Concepts)
EN: Q̂∥/⊥,H divides the net sand flux along crests of the bed-instability orientation by the net flux across them. Across-crest transport makes dunes migrate and tends to make crests sinuous; along-crest transport tends to keep them straight (Rubin 2012). Higher values therefore suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures how far the migration direction departs from the direction of the sand flux on the dune, a departure that makes dunes such as barchans asymmetric. In examples of long-crested dunes on sand-covered beds, it is about 0.03 for transverse, 0.4 for oblique and 22 for longitudinal dunes.
FR: Q̂∥/⊥,H est le flux net de sable le long des crêtes correspondant à l'orientation d'instabilité du lit, divisé par le flux net à travers celles-ci. Le transport à travers la crête fait migrer les dunes et tend à rendre les crêtes sinueuses ; le transport le long de la crête tend à les maintenir rectilignes (Rubin 2012). Des valeurs plus élevées suggèrent donc des dunes à crête longue plus rectilignes sur des lits couverts de sable. Pour les dunes migrant sur des lits pauvres en sable, le rapport mesure l'écart entre la direction de migration et la direction du flux de sable sur la dune, un écart qui rend asymétriques des dunes telles que les barkhanes. Dans des exemples de dunes à crête longue sur des lits couverts de sable, il vaut environ 0,03 pour les dunes transverses, 0,4 pour les dunes obliques et 22 pour les dunes longitudinales.

## concept.growth-in-height-versus-migration-q-h.title (Concepts)
EN: Growth in height versus migration Q̂|⊥|/⊥,H
FR: Croissance en hauteur par rapport à la migration Q̂|⊥|/⊥,H

## concept.growth-in-height-versus-migration-q-h.p1 (Concepts)
EN: Q̂|⊥|/⊥,H divides the gross sand transport across crests of the bed-instability orientation by the net transport across them. It is never below 1. A value close to 1 means that transport across the crest goes one way, so the dunes mainly migrate. Large values mean that transport reverses across the crest and sand is piled up from both sides: the dunes grow in height and migrate little, as reversing dunes do. Because growth in height builds the coherence of a dune, larger values may also favour straighter crests. In examples of long-crested dunes on sand-covered beds, it is about 1.1 for transverse, 5 for oblique and 49 for longitudinal dunes.
FR: Q̂|⊥|/⊥,H est le rapport entre le transport brut de sable à travers les crêtes orientées selon le mode d’instabilité du lit et le transport net à travers ces mêmes crêtes. Il n’est jamais inférieur à 1. Une valeur proche de 1 signifie que le transport à travers la crête s’effectue dans un seul sens, de sorte que les dunes migrent principalement. Des valeurs élevées signifient que le transport s’inverse de part et d’autre de la crête et que le sable s’accumule des deux côtés : les dunes connaissent une croissance en hauteur et migrent peu, comme les dunes réversibles. Comme la croissance en hauteur renforce la cohérence d’une dune, des valeurs plus élevées peuvent aussi favoriser des crêtes plus rectilignes. Dans des exemples de dunes à crête longue sur des lits couverts de sable, il vaut environ 1,1 pour les dunes transverses, 5 pour les dunes obliques et 49 pour les dunes longitudinales.

## concept.morphology-of-elongating-dunes-q-e.title (Concepts)
EN: Morphology of elongating dunes Q̂|⊥|/∥,E
FR: Morphologie des dunes en allongement Q̂|⊥|/∥,E

## concept.morphology-of-elongating-dunes-q-e.p1 (Concepts)
EN: Q̂|⊥|/∥,E divides the gross sand transport across crests in the elongation orientation αE by the net transport along them: the balance between growth in height and elongation. For dunes that elongate without migrating, it is the parameter expected to distinguish their shapes. On a starved bed, comparing it with Q̂|⊥|/⊥,H indicates whether elongation or migration is more likely to set dune shape and orientation: each ratio measures how strongly growth in height outweighs one of the two dynamics, and the dynamic with the larger ratio is expected to prevail. In examples of dunes on Earth it ranges from about 0.5 to 16.
FR: Q̂|⊥|/∥,E est le rapport entre le transport brut de sable à travers les crêtes orientées selon la direction d’allongement αE et le transport net le long de ces crêtes : il traduit l’équilibre entre croissance en hauteur et allongement. Pour les dunes qui s’allongent sans migrer, c’est le paramètre censé distinguer leurs formes. Sur un lit pauvre en sable, sa comparaison avec Q̂|⊥|/⊥,H indique si l’allongement ou la migration est le plus susceptible de déterminer la forme et l’orientation des dunes : chaque rapport mesure dans quelle mesure la croissance en hauteur l’emporte sur l’une des deux dynamiques, et la dynamique dont le rapport est le plus élevé est censée prévaloir. Dans des exemples de dunes terrestres, il varie d’environ 0,5 à 16.

## concept.flux-divergence.title (Concepts)
EN: Flux divergence
FR: Divergence du flux

## concept.flux-divergence.p1 (Concepts)
EN: Flux divergence measures whether more sand leaves a place than arrives. It is the divergence of the net saturated flux vector (magnitude RDP, direction RDD) on the sphere, in metres of bed level per thousand years, and by conservation of sand mass it gives the rate at which the bed would be lowered or raised. Negative values (convergence) mean deposition; positive values (divergence) mean erosion. Gunn (2026) found dunes more common where flux converges. The values assume a saturated flux everywhere, that is, an unlimited supply of loose sand; on rock, gravel, crusted or vegetated surfaces, positive values give potential erosion.
FR: La divergence du flux indique si davantage de sable quitte un lieu qu'il n'en arrive. Il s'agit de la divergence, sur la sphère, du vecteur flux saturé net (de norme RDP et de direction RDD), exprimée en mètres de niveau du lit par millier d'années ; par conservation de la masse de sable, elle donne la vitesse à laquelle le lit s'abaisserait ou s'exhausserait. Les valeurs négatives (convergence) correspondent à un dépôt ; les valeurs positives (divergence) à une érosion. Gunn (2026) a constaté que les dunes sont plus fréquentes là où le flux converge. Ces valeurs supposent un flux saturé partout, c'est-à-dire un apport illimité de sable meuble ; sur des surfaces rocheuses, graveleuses, encroûtées ou végétalisées, les valeurs positives indiquent une érosion potentielle.

## concept.earth.the-two-era5-wind-datasets.title (Concepts)
EN: The two ERA5 wind datasets
FR: Les deux jeux de données de vent ERA5

## concept.earth.the-two-era5-wind-datasets.p1 (Concepts)
EN: The Earth atlas offers two hourly 10 m wind records for 1950–2024. ERA5 is ECMWF's global atmospheric reanalysis on a 0.25° grid (about 28 km). ERA5-Land re-runs ECMWF's land-surface model at 0.1° (about 9–11 km), driven by ERA5 atmospheric fields interpolated to the finer grid, so its winds are not an independent estimate. Baas (2026) reports that ERA5-Land 10 m wind speeds are systematically 20–30 % lower than those of ERA5. Gunn (2026) used ERA5-Land, and the dune map is on its grid. Neither dataset resolves winds around individual dunes or small hills. Where the two datasets give different directions, ratios or fluxes, treat the result as uncertain.
FR: L’atlas terrestre propose deux séries horaires du vent à 10 m couvrant 1950–2024. ERA5 est la réanalyse atmosphérique globale de l’ECMWF, sur une grille de 0,25° (environ 28 km). ERA5-Land correspond à une nouvelle exécution du modèle de surface continentale de l’ECMWF à 0,1° (environ 9–11 km), forcée par les champs atmosphériques d’ERA5 interpolés sur la grille plus fine ; ses vents ne constituent donc pas une estimation indépendante. Baas (2026) indique que les vitesses du vent à 10 m d’ERA5-Land sont systématiquement inférieures de 20–30 % à celles d’ERA5. Gunn (2026) a utilisé ERA5-Land, et la carte des dunes est établie sur sa grille. Aucun des deux jeux de données ne résout les vents autour de dunes individuelles ou de petites collines. Là où les deux jeux de données donnent des directions, des rapports ou des flux différents, le résultat doit être considéré comme incertain.

# Help panel

## mars.help.threshold.title (Help panel)
EN: Median grain diameter $d$
FR: Diamètre médian des grains $d$

## mars.help.threshold.body (Help panel)
EN: Sand moves when the friction velocity of the wind exceeds a threshold that depends on the grain size and on the thin Martian air. The slider at the top of the layer panel sets the median grain diameter d (50–1000 µm, default 200 µm) for every grain-size-dependent map layer and for the cell panel. For each time step of the wind dataset, the threshold $u_{*,th}$ is computed from d and that step's air density and temperature (Pähtz & Durán 2023).
FR: Le sable se met en mouvement lorsque la vitesse de frottement du vent dépasse un seuil qui dépend de la taille des grains et de l’air martien raréfié. Le curseur en haut du panneau des calques fixe le diamètre médian des grains d (50–1000 µm, 200 µm par défaut) pour tous les calques cartographiques dépendant de la taille des grains et pour le panneau de cellule. Pour chaque pas de temps du jeu de données de vent, le seuil $u_{*,th}$ est calculé à partir de d ainsi que de la masse volumique et de la température de l’air à ce pas de temps (Pähtz & Durán 2023).

## mars.help.layers.title (Help panel)
EN: Layers and Active layers
FR: Calques et calques actifs

## mars.help.layers.body (Help panel)
EN: Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset, and draws the dune map at no more than 50 % opacity so that these cells show through it; elevation, air density and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Names, in the Dune Fields group, labels named dune fields and features on the map (where names would overlap, some appear only as you zoom in); click a name to zoom to the feature and see its type, other names and sources.
FR: Cochez un calque pour l’afficher. Le bouton ⓘ en donne la définition, les unités et la source des données ; Affichage modifie ses couleurs, les bornes de couleur et l’échelle, ou représente les champs de direction par des flèches ou des lignes de courant, avec un curseur d’espacement allant de Plus fin (lignes plus denses) à Plus grossier. Calques actifs liste ce qui figure sur la carte, de haut en bas : faites glisser une ligne ou utilisez les flèches pour modifier l’ordre d’affichage, réglez l’opacité avec son curseur et retirez un calque avec ×. Dunes seulement (sous le sélecteur Jeu de données de vent) n’affiche tous les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) que dans les cellules contenant des dunes du jeu de données, et affiche la carte des dunes à une opacité d’au plus 50 % afin que ces cellules soient visibles par transparence ; l’altitude, la masse volumique de l’air et les fonds de carte restent inchangés, et le panneau de cellule fonctionne toujours pour n’importe quelle cellule. Ce réglage fait partie du lien. Noms, dans le groupe Champs de dunes, affiche sur la carte les noms des champs de dunes et des entités nommées (là où les noms se chevaucheraient, certains n’apparaissent qu’en zoomant) ; cliquez sur un nom pour zoomer sur l’entité et voir son type, ses autres noms et ses sources.

## mars.help.concepts.title (Help panel)
EN: Concepts
FR: Concepts

## mars.help.concepts.body (Help panel)
EN: The Concepts button {icon_concepts} (under the Help button {icon_help}) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
FR: Le bouton Concepts {icon_concepts} (sous le bouton Aide {icon_help}) explique les grandeurs de l’atlas, chacune avec ses références. Le lien Concept dans le ⓘ d’un calque ouvre l’entrée correspondante.

## mars.help.search.title (Help panel)
EN: Search
FR: Recherche

## mars.help.search.body (Help panel)
EN: Type a feature name (e.g. Gale crater or Olympia Undae) or a latitude and a longitude in the box at the top of the layer panel. Names are IAU-approved feature names from the Gazetteer of Planetary Nomenclature, with a few informal aliases (e.g. Bagnold Dunes); the list under the box shows each match with its feature type and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. 4.5, 137.4 or 4°30′N 137°24′E). Latitude comes first unless the letters say otherwise. Longitudes are planetocentric and east-positive, from −180° to 180°; a longitude typed as 0–360° E (e.g. 354.8) is converted (to −5.2). While you type coordinates, the line under the box shows the position they were read as (“Go to …”); Enter moves the map there and opens the cell panel when the cell has data.
FR: Saisissez le nom d'une entité (p. ex. Gale crater ou Olympia Undae) ou une latitude et une longitude dans le champ en haut du panneau des calques. Les noms sont les noms d'entités approuvés par l'IAU issus du Gazetteer of Planetary Nomenclature, avec quelques alias informels (p. ex. Bagnold Dunes) ; la liste sous le champ présente chaque correspondance avec son type d'entité, les meilleures correspondances en premier. Les coordonnées peuvent être exprimées en degrés décimaux ou en degrés, minutes et secondes, signées ou accompagnées de N, S, E ou W (p. ex. 4.5, 137.4 ou 4°30′N 137°24′E). La latitude vient en premier, sauf si les lettres indiquent le contraire. Les longitudes sont planétocentriques et positives vers l'est, de −180° à 180° ; une longitude saisie entre 0 et 360° E (p. ex. 354.8) est convertie (en −5.2). Pendant la saisie des coordonnées, la ligne sous le champ indique la position telle qu'elle a été interprétée (« Aller à … ») ; Entrée déplace la carte à cet endroit et ouvre le panneau de cellule lorsque la cellule contient des données.

## mars.help.cell.title (Help panel)
EN: Clicking a cell
FR: Cliquer sur une cellule

## mars.help.cell.body (Help panel)
EN: Click any cell to open the cell panel: the wind rose, the sand-flux rose at the current grain diameter, dune-orientation modes against the grain diameter, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the “Petals: toward / from” choice above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The planetocentric latitude and east longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The button {icon_centre} next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
FR: Cliquez sur une cellule pour ouvrir le panneau de cellule : la rose des vents, la rose des flux de sable au diamètre de grain actuel, les modes d’orientation des dunes en fonction du diamètre des grains, la divergence du flux et un tableau de tous les paramètres. Les pétales de la rose des flux de sable pointent vers la direction où se déplace le sable ; le choix « Pétales : vers / depuis » au-dessus de la rose permet de leur faire indiquer plutôt la direction d’où vient le vent (les flèches pointent toujours « vers »). Les titres de section se replient et se déplient. Fermez le panneau avec × ou Échap. La latitude planétocentrique et la longitude est sous le curseur sont affichées à côté de la barre d’échelle, en bas à gauche (sur écran tactile : le dernier point touché). Le bouton {icon_centre} à côté du titre de la cellule centre la carte sur la cellule (en zoomant uniquement si la cellule était trop petite pour être visible).

## mars.help.datasets.title (Help panel)
EN: Wind dataset
FR: Jeu de données de vent

## mars.help.datasets.body (Help panel)
EN: The Wind dataset selector switches between Mars wind datasets (MCMC FV3, 2°; EMARS, 6° × 5.14°; MACDA, 5°), each one Mars year of lowest-level winds on its own grid (MCMC FV3: free-running climate-model simulation; EMARS and MACDA: reanalysis of Mars Year 30, with spacecraft observations of the atmosphere assimilated into a climate model). The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. No EMARS data poleward of 87.43° N: the northernmost cells of its grid are centred at 84.86° N.
FR: Le sélecteur Jeu de données de vent permet de passer d’un jeu de données de vent martien à l’autre (MCMC FV3, 2° ; EMARS, 6° × 5,14° ; MACDA, 5°), chacun couvrant une année martienne de vents du niveau le plus bas sur sa propre grille (MCMC FV3 : simulation libre d’un modèle climatique ; EMARS et MACDA : réanalyse de l’année martienne 30, avec des observations de l’atmosphère faites par des sondes spatiales assimilées dans un modèle climatique). Les calques de vent et de flux de sable ainsi que le panneau de la cellule suivent la sélection ; la carte des dunes et l’altitude sont les mêmes pour tous les jeux de données. Pas de données EMARS au-delà de 87,43° N vers le pôle : les cellules les plus septentrionales de sa grille sont centrées sur 84,86° N.

## mars.help.basemaps.title (Help panel)
EN: Basemaps
FR: Fonds de carte

## mars.help.basemaps.body (Help panel)
EN: The opening basemap is a shaded relief of the MOLA–HRSC blended elevation model (Fergason, Hare & Laura 2018), released under CC BY-SA 3.0 IGO (derived from HRSC, CC BY-SA 3.0 IGO, and MOLA, CC0). Under Basemap you can also choose OpenPlanetaryMap and Esri's Mars imagery: the global CTX mosaic (about 5 m per pixel; The Murray Lab), HiRISE (down to about 25 cm per pixel), the Viking MDIM 2.1 colour mosaic and the MOLA–HRSC colour shaded relief. HiRISE covers only the small part of the surface it has imaged; elsewhere the map is dark. Credits are in the map attribution.
FR: Le fond de carte initial est un relief ombré du modèle d’élévation fusionné MOLA–HRSC (Fergason, Hare & Laura 2018), publié sous licence CC BY-SA 3.0 IGO (dérivé de HRSC, CC BY-SA 3.0 IGO, et de MOLA, CC0). Dans Fond de carte, vous pouvez également choisir les images de Mars d’OpenPlanetaryMap et d’Esri : la mosaïque globale CTX (environ 5 m par pixel ; The Murray Lab), HiRISE (jusqu’à environ 25 cm par pixel), la mosaïque en couleur Viking MDIM 2.1 et le relief ombré en couleur MOLA–HRSC. HiRISE ne couvre que la petite partie de la surface qu’il a imagée ; ailleurs, la carte est sombre. Les crédits figurent dans l’attribution de la carte.

## mars.help.downloads.title (Help panel)
EN: Downloads and citation
FR: Téléchargements et citation

## mars.help.downloads.body (Help panel)
EN: Download & cite in the cell panel saves the wind and air series and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite the wind dataset, Pähtz & Durán (2023) for the transport law and Gunn (2026), which outlines the methods.
FR: Télécharger et citer, dans le panneau de cellule, enregistre les séries du vent et de l’air ainsi que tous les paramètres de la cellule au format NetCDF ou sous forme d’archive CSV, avec la citation de chaque source de données. Veuillez citer le jeu de données de vent, Pähtz & Durán (2023) pour la loi de transport et Gunn (2026), qui présente les méthodes.

## mars.help.region.title (Help panel)
EN: Downloading a region
FR: Télécharger une région

## mars.help.region.body (Help panel)
EN: The region button {icon_region}, below the camera button {icon_camera}, saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every grain diameter or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
FR: Le bouton de région {icon_region}, sous le bouton appareil photo {icon_camera}, enregistre toutes les cellules du jeu de données de vent sélectionné comprises dans un cadre en latitude-longitude, sous la forme d’un unique fichier NetCDF accompagné d’un README. Saisissez les limites, ou appuyez sur Dessiner sur la carte et tracez un cadre sur la carte (Échap pour annuler). Cochez les paramètres et choisissez tous les diamètres de grain ou le diamètre actuel ; la taille est estimée au fur et à mesure et limitée à ce qu’un navigateur peut contenir. Pour la grille entière, voir Obtenir la grille complète dans Télécharger et citer.

## mars.help.images.title (Help panel)
EN: Exporting images
FR: Exporter des images

## mars.help.images.body (Help panel)
EN: Export map image (camera button {icon_camera}, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
FR: Exporter l’image de la carte (bouton appareil photo {icon_camera}, en haut à droite) enregistre la vue actuelle au format PNG, avec une largeur de 1600 à 2400 pixels (1,5 fois sa largeur à l’écran), avec ou sans fond de carte, sur fond blanc ou transparent. Sous la carte figurent les barres de couleur, les légendes, la flèche du nord et la barre d’échelle, puis la vue, le jeu de données de vent et les sources des données. Chaque graphique du panneau de cellule dispose d’un menu Exporter qui produit un PNG (1600 pixels de large) ou un SVG en thème clair, avec la même mise en page.

## mars.help.share.title (Help panel)
EN: Sharing the view
FR: Partager la vue

## mars.help.share.body (Help panel)
EN: The share button {icon_share} (top right) copies a short link that restores this view: position, zoom, globe or flat map, grain diameter, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
FR: Le bouton de partage {icon_share} (en haut à droite) copie un lien court qui restaure cette vue : position, zoom, globe ou carte plane, diamètre des grains, fond de carte, calques actifs avec leurs paramètres d’affichage, et cellule sélectionnée. La barre d’adresse contient en outre toujours un lien complet vers la vue actuelle.

# Guided tour

## mars.tour.help.title (Guided tour)
EN: Welcome to the Mars Dune Atlas
FR: Bienvenue dans le Mars Dune Atlas

## mars.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button {icon_help} highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
FR: Cette courte visite guidée présente les principales commandes. Le bouton Aide {icon_help}, mis en évidence ici dans le coin supérieur droit, ouvre un aide-mémoire et relance cette visite à tout moment.

## mars.tour.concepts.title (Guided tour)
EN: Concepts
FR: Concepts

## mars.tour.concepts.body (Guided tour)
EN: The Concepts button {icon_concepts} explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
FR: Le bouton Concepts {icon_concepts} explique la signification des grandeurs représentées sur la carte, avec leurs références. Le ⓘ de chaque calque renvoie à l’entrée correspondante.

## mars.tour.map.title (Guided tour)
EN: The map
FR: La carte

## mars.tour.map.body (Guided tour)
EN: Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map. Coordinates are planetocentric latitude and east longitude (−180° to 180°).
FR: Faites glisser pour vous déplacer ; faites défiler, pincez ou utilisez + et − pour zoomer. L’option Vue globe, sous Fond de carte, bascule entre le globe et une carte plane. Les coordonnées sont exprimées en latitude planétocentrique et en longitude est (−180° à 180°).

## mars.tour.threshold.title (Guided tour)
EN: Median grain diameter $d$
FR: Diamètre médian des grains $d$

## mars.tour.threshold.body (Guided tour)
EN: This slider sets the grain diameter. The threshold friction velocity is computed for each time step from d and that step's air density and temperature; every grain-size-dependent layer and the cell panel update as you move it.
FR: Ce curseur règle le diamètre des grains. La vitesse de frottement seuil est calculée pour chaque pas de temps à partir de d ainsi que de la masse volumique et de la température de l’air à ce pas de temps ; tous les calques dépendant de la taille des grains et le panneau de la cellule se mettent à jour lorsque vous le déplacez.

## mars.tour.layers.title (Guided tour)
EN: Layers and their display
FR: Les calques et leur affichage

## mars.tour.layers.body (Guided tour)
EN: Tick layers to add them to the map; ⓘ explains a layer. Display, opened here for the resultant drift direction (RDD), changes a layer's colours and colour limits and, for direction fields, draws a colour map, arrows or streamlines in the line colour and spacing you choose. Dunes only, under the Wind dataset selector, keeps the wind-derived layers to the cells with dunes.
FR: Cochez des calques pour les ajouter à la carte ; ⓘ explique un calque. Affichage, ouvert ici pour la direction de dérive résultante (RDD), modifie les couleurs et les bornes de l’échelle de couleurs d’un calque et, pour les champs de directions, trace une carte en couleurs, des flèches ou des lignes de courant avec la couleur de trait et l’espacement de votre choix. Dunes seulement, sous le sélecteur Jeu de données de vent, restreint les calques dérivés du vent aux cellules comportant des dunes.

## mars.tour.active.title (Guided tour)
EN: Active layers
FR: Calques actifs

## mars.tour.active.body (Guided tour)
EN: The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.
FR: Les calques présents sur la carte, de haut en bas. Faites glisser une ligne ou utilisez les flèches pour choisir le calque dessiné au-dessus, le curseur pour régler l’opacité et × pour retirer un calque.

## mars.tour.cell.title (Guided tour)
EN: Click a cell
FR: Cliquez sur une cellule

## mars.tour.cell.body (Guided tour)
EN: Clicking a cell opens the cell panel, shown here for the dune field of Nili Patera (9° N, 67° E): wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own grain-diameter slider at the top (outlined), linked to the main one. At the bottom, Download & cite saves these data as NetCDF or CSV, with the citations. The button {icon_centre} next to its title centres the map on the cell.
FR: Cliquer sur une cellule ouvre le panneau de la cellule, présenté ici pour le champ de dunes de Nili Patera (9° N, 67° E) : rose des vents, rose des flux de sable, modes d’orientation des dunes et tableau de l’ensemble des paramètres. Le panneau possède son propre curseur de diamètre des grains en haut (encadré), lié au curseur principal. En bas, Télécharger et citer enregistre ces données au format NetCDF ou CSV, avec les citations. Le bouton {icon_centre} à côté de son titre centre la carte sur la cellule.

## mars.tour.tools.title (Guided tour)
EN: Share and export
FR: Partager et exporter

## mars.tour.tools.body (Guided tour)
EN: Copy a short link to this view, export the map as an image with colour bars, scale and data sources, or download the data of a region you draw on the map. Plots in the cell panel have their own Export menus.
FR: Copiez un lien court vers cette vue, exportez la carte sous forme d’image avec barres de couleur, échelle et sources des données, ou téléchargez les données d’une région que vous dessinez sur la carte. Les graphiques du panneau de cellule disposent de leurs propres menus Exporter.

## mars.tour.planet.title (Guided tour)
EN: Switch planet
FR: Changer de planète

## mars.tour.planet.body (Guided tour)
EN: Earth and Mars share this atlas: the planet button {icon_planet}, below the camera button {icon_camera}, swaps between them, and each atlas reopens the view you last had there.
FR: La Terre et Mars partagent cet atlas : le bouton planète {icon_planet}, sous le bouton appareil photo {icon_camera}, permet de passer de l’une à l’autre, et chaque atlas rouvre la dernière vue que vous y aviez.

# Layer groups

## mars.group.dunes (Layer groups)
EN: Dune Fields
FR: Champs de dunes

## mars.group.dunes.desc (Layer groups)
EN: Mapped Martian dune fields (USGS Mars Global Digital Dune Database and Fenton 2020, 3,514 polygons, 1.05 million km²).
FR: Champs de dunes martiens cartographiés (USGS Mars Global Digital Dune Database et Fenton 2020, 3 514 polygones, 1,05 million de km²).

# Layers and legends

## mars.layer.dunes.title (Layers and legends)
EN: Dune-field mask
FR: Masque des champs de dunes

## mars.layer.dunes.short (Layers and legends)
EN: Mask
FR: Masque

# Layer groups

## mars.group.orientation (Layer groups)
EN: Bedform orientation
FR: Orientation des formes de lit

## mars.group.orientation.desc (Layer groups)
EN: Predicted dune orientations: crest orientation and migration direction of the bed-instability mode, elongation direction and along-crest transport direction.
FR: Orientations prédites des dunes : orientation de la crête et direction de migration du mode d’instabilité du lit, direction d’allongement et direction du transport le long de la crête.

# Layers and legends

## mars.layer.at.title (Layers and legends)
EN: Transverse migration direction $\alpha_T$
FR: Direction de migration transverse $\alpha_T$

## mars.layer.at.units (Layers and legends)
EN: °
FR: °

## mars.layer.ae.title (Layers and legends)
EN: Elongation direction $\alpha_E$
FR: Direction d’allongement $\alpha_E$

## mars.layer.ae.units (Layers and legends)
EN: °
FR: °

## mars.layer.ab.title (Layers and legends)
EN: Crest orientation, bed-instability mode $\alpha_H$
FR: Orientation de la crête, mode d’instabilité du lit $\alpha_H$

## mars.layer.ab.units (Layers and legends)
EN: °
FR: °

## mars.layer.ao.title (Layers and legends)
EN: Along-crest transport direction $\alpha_O$
FR: Direction du transport le long de la crête $\alpha_O$

## mars.layer.ao.units (Layers and legends)
EN: °
FR: °

# Layer groups

## mars.group.crest-fluxes (Layer groups)
EN: Crest-normal/parallel fluxes
FR: Flux normaux et parallèles à la crête

## mars.group.crest-fluxes.desc (Layer groups)
EN: Net and absolute sand flux resolved across (normal to) and along (parallel to) predicted crests.
FR: Flux de sable net et absolu décomposés à travers les crêtes prédites (normalement à celles-ci) et le long de ces crêtes (parallèlement à celles-ci).

# Layers and legends

## mars.layer.qacb.title (Layers and legends)
EN: Absolute across-crest flux, bed-instability mode $\langle |Q_{\bot}(\alpha_H)|\rangle$
FR: Flux absolu à travers la crête, mode d’instabilité du lit $\langle |Q_{\bot}(\alpha_H)|\rangle$

## mars.layer.qacb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.qncb.title (Layers and legends)
EN: Net across-crest flux, bed-instability mode $\langle Q_{\bot}(\alpha_H)\rangle$
FR: Flux net à travers la crête, mode d’instabilité du lit $\langle Q_{\bot}(\alpha_H)\rangle$

## mars.layer.qncb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.qnlb.title (Layers and legends)
EN: Net along-crest flux, bed-instability mode $\langle Q_{\parallel}(\alpha_H)\rangle$
FR: Flux net le long de la crête, mode d’instabilité du lit $\langle Q_{\parallel}(\alpha_H)\rangle$

## mars.layer.qnlb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.qalb.title (Layers and legends)
EN: Absolute along-crest flux, bed-instability mode $\langle |Q_{\parallel}(\alpha_H)|\rangle$
FR: Flux absolu le long de la crête, mode d’instabilité du lit $\langle |Q_{\parallel}(\alpha_H)|\rangle$

## mars.layer.qalb.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.qnle.title (Layers and legends)
EN: Net along-crest flux, elongation mode $\langle Q_{\parallel}(\alpha_E)\rangle$
FR: Flux net le long de la crête, mode d’allongement $\langle Q_{\parallel}(\alpha_E)\rangle$

## mars.layer.qnle.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.qale.title (Layers and legends)
EN: Absolute along-crest flux, elongation mode $\langle |Q_{\parallel}(\alpha_E)|\rangle$
FR: Flux absolu le long de la crête, mode d’allongement $\langle |Q_{\parallel}(\alpha_E)|\rangle$

## mars.layer.qale.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.qace.title (Layers and legends)
EN: Absolute across-crest flux, elongation mode $\langle |Q_{\bot}(\alpha_E)|\rangle$
FR: Flux absolu à travers la crête, mode d’allongement $\langle |Q_{\bot}(\alpha_E)|\rangle$

## mars.layer.qace.units (Layers and legends)
EN: m²/yr
FR: m²/yr

# Layer groups

## mars.group.morphology (Layer groups)
EN: Ratios & morphology indices
FR: Rapports et indices morphologiques

## mars.group.morphology.desc (Layer groups)
EN: Dimensionless flux ratios related to dune morphology and stability.
FR: Rapports de flux adimensionnels liés à la morphologie et à la stabilité des dunes.

# Layers and legends

## mars.layer.sige_sigh.title (Layers and legends)
EN: Stability of elongating dunes on starved beds $\sigma_E/\sigma_H$
FR: Stabilité des dunes en allongement sur lits pauvres en sable $\sigma_E/\sigma_H$

## mars.layer.sige_sigh.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## mars.layer.qhab_nl_nc.title (Layers and legends)
EN: Crest straightness vs sinuosity, bed-instability mode $\hat{Q}_{\parallel/\bot,H}$
FR: Rectitude vs sinuosité des crêtes, mode d’instabilité du lit $\hat{Q}_{\parallel/\bot,H}$

## mars.layer.qhab_nl_nc.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## mars.layer.qhab_ac_nc.title (Layers and legends)
EN: Growth-in-height vs migration balance $\hat{Q}_{|\bot|/\bot,H}$
FR: Équilibre entre croissance en hauteur et migration $\hat{Q}_{|\bot|/\bot,H}$

## mars.layer.qhab_ac_nc.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## mars.layer.qhne_ac_nl.title (Layers and legends)
EN: Morphology of elongating dunes $\hat{Q}_{|\bot|/\parallel,E}$
FR: Morphologie des dunes en allongement $\hat{Q}_{|\bot|/\parallel,E}$

## mars.layer.qhne_ac_nl.units (Layers and legends)
EN: dimensionless
FR: sans dimension

# Layer groups

## mars.group.wind (Layer groups)
EN: Wind statistics
FR: Statistiques du vent

## mars.group.wind.desc (Layer groups)
EN: How often and how strongly the flat-bed friction velocity exceeds the threshold.
FR: À quelle fréquence et avec quelle intensité la vitesse de frottement sur lit plat dépasse le seuil.

# Layers and legends

## mars.layer.uft.title (Layers and legends)
EN: Fraction of time above threshold $T|u_{\ast,f}>u_{\ast,th}/T$
FR: Fraction du temps au-dessus du seuil $T|u_{\ast,f}>u_{\ast,th}/T$

## mars.layer.uft.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## mars.layer.ufm.title (Layers and legends)
EN: Mean above-threshold friction velocity / threshold $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$
FR: Vitesse de frottement moyenne au-dessus du seuil / seuil $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$

## mars.layer.ufm.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## mars.layer.qhbf.title (Layers and legends)
EN: Fraction of bed-instability-mode flux while flat bed above threshold
FR: Fraction du flux en mode d’instabilité du lit lorsque la vitesse de frottement sur lit plat dépasse le seuil

## mars.layer.qhbf.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## mars.layer.qhef.title (Layers and legends)
EN: Fraction of elongation-mode flux while flat bed above threshold
FR: Fraction du flux en mode d’allongement lorsque la vitesse de frottement sur lit plat dépasse le seuil

## mars.layer.qhef.units (Layers and legends)
EN: dimensionless
FR: sans dimension

# Layer groups

## mars.group.drift (Layer groups)
EN: Drift potential
FR: Potentiel de dérive

## mars.group.drift.desc (Layer groups)
EN: Flat-bed sand flux: total (DP), net (RDP), its direction (RDD) and directionality (RDP/DP).
FR: Flux de sable sur lit plat : total (DP), net (RDP), sa direction (RDD) et sa directionnalité (RDP/DP).

# Layers and legends

## mars.layer.dpm.title (Layers and legends)
EN: Drift potential $DP$
FR: Potentiel de dérive $DP$

## mars.layer.dpm.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.rdpm.title (Layers and legends)
EN: Resultant drift potential $RDP$
FR: Potentiel de dérive résultant $RDP$

## mars.layer.rdpm.units (Layers and legends)
EN: m²/yr
FR: m²/yr

## mars.layer.rdpa.title (Layers and legends)
EN: Resultant drift direction $RDD$
FR: Direction de dérive résultante $RDD$

## mars.layer.rdpa.units (Layers and legends)
EN: °
FR: °

## mars.layer.qha_rdp_dp.title (Layers and legends)
EN: Flux directionality $RDP/DP$
FR: Directionnalité du flux $RDP/DP$

## mars.layer.qha_rdp_dp.units (Layers and legends)
EN: dimensionless
FR: sans dimension

## mars.layer.qsdiv.title (Layers and legends)
EN: Saturated flux divergence $\nabla\cdot\vec{q}_s$
FR: Divergence du flux saturé $\nabla\cdot\vec{q}_s$

## mars.layer.qsdiv.units (Layers and legends)
EN: m/kyr
FR: m/kyr

# Layer groups

## mars.group.environment (Layer groups)
EN: Related data
FR: Données associées

## mars.group.environment.desc (Layer groups)
EN: Near-surface air density (from the wind dataset, mean over the year) and elevation (MOLA–HRSC). These do not depend on the grain diameter d.
FR: Masse volumique de l’air près de la surface (issue du jeu de données de vent, moyenne annuelle) et altitude (MOLA–HRSC). Ces grandeurs ne dépendent pas du diamètre médian des grains d.

# Layers and legends

## mars.layer.rho_mean.title (Layers and legends)
EN: Near-surface air density $\overline{\rho_f}$
FR: Masse volumique de l’air près de la surface $\overline{\rho_f}$

## mars.layer.rho_mean.units (Layers and legends)
EN: kg/m³
FR: kg/m³

## mars.layer.elevation.title (Layers and legends)
EN: Elevation $z$ (MOLA–HRSC)
FR: Altitude $z$ (MOLA–HRSC)

## mars.layer.elevation.units (Layers and legends)
EN: m
FR: m

## mars.invert.legend (Layers and legends)
EN: Areas without mapped dunes
FR: Zones sans dunes cartographiées

# Basemaps

## mars.basemap.hrsc-mola-hillshade (Basemaps)
EN: Shaded relief (MOLA–HRSC, 2D)
FR: Relief ombré (MOLA–HRSC, 2D)

## mars.basemap.opm-mars (Basemaps)
EN: OpenPlanetaryMap Mars (v0.2)
FR: OpenPlanetaryMap Mars (v0.2)

## mars.basemap.esri-ctx1 (Basemaps)
EN: CTX mosaic, 5 m (Murray Lab V01, Esri)
FR: Mosaïque CTX, 5 m (Murray Lab V01, Esri)

## mars.basemap.esri-hirise (Basemaps)
EN: HiRISE, where imaged (Esri)
FR: HiRISE, là où disponible (Esri)

## mars.basemap.esri-mdim (Basemaps)
EN: Viking MDIM 2.1 colour (Esri)
FR: Viking MDIM 2.1 en couleur (Esri)

## mars.basemap.esri-mcolordem (Basemaps)
EN: MOLA–HRSC colour shaded relief (Esri)
FR: Relief ombré en couleur MOLA–HRSC (Esri)

# Concepts

## concept.mars.saturated-sand-flux-and-the-transport-law.title (Concepts)
EN: Saturated sand flux and the transport law
FR: Flux de sable saturé et loi de transport

## concept.mars.saturated-sand-flux-and-the-transport-law.p1 (Concepts)
EN: Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. On Mars the atlas uses the transport law of Pähtz & Durán (2023), derived from numerical simulations for planetary conditions. For each time step, the friction velocity u* comes from the lowest-level wind of the wind dataset through a smooth-wall profile, and the threshold from the grain diameter and that step's air density and temperature. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per Earth year (m²/yr), as on Earth. Real transport is lower wherever sand is scarce or indurated.
FR: Le flux de sable saturé est le débit auquel le vent déplacerait le sable sur un lit plat entièrement recouvert de sable meuble et sec : c’est la capacité de transport du vent, et pas nécessairement le transport qui a effectivement lieu. Sur Mars, l’atlas utilise la loi de transport de Pähtz & Durán (2023), établie à partir de simulations numériques pour des conditions planétaires. Pour chaque pas de temps, la vitesse de frottement u* est obtenue à partir du vent au niveau le plus bas du modèle climatique au moyen d’un profil de paroi lisse. Le seuil est obtenu à partir du diamètre des grains ainsi que de la masse volumique et de la température de l’air à ce pas de temps. Les flux sont exprimés en volumes de sable compacté (compacité 0,6, espace poreux inclus) par mètre de largeur et par année terrestre (m²/yr), comme sur Terre. Le transport réel est plus faible partout où le sable est rare ou induré.

## concept.mars.grain-size-and-threshold.title (Concepts)
EN: Grain size and threshold
FR: Taille des grains et seuil

## concept.mars.grain-size-and-threshold.p1 (Concepts)
EN: On Mars the slider sets the median grain diameter d rather than the threshold. The threshold friction velocity is computed for each time step from d and that step's air density and temperature with the law of Pähtz & Durán (2023), because the thin, cold Martian air changes from hour to hour and season to season. Martian air near the surface is only about 1–2 % as dense as Earth's, so the threshold friction velocity of the same grains is much higher. The cell panel shows the median threshold over the year, its 5–95 % range, the equivalent wind at the lowest model level and the share of time steps above threshold.
FR: Sur Mars, le curseur règle le diamètre médian des grains d plutôt que le seuil. La vitesse de frottement seuil est calculée pour chaque pas de temps à partir de d ainsi que de la masse volumique et de la température de l’air à ce pas de temps, selon la loi de Pähtz & Durán (2023), car l’air martien, ténu et froid, varie d’heure en heure et de saison en saison. Près de la surface, l’air martien n’a qu’environ 1–2 % de la masse volumique de l’air terrestre, si bien que la vitesse de frottement seuil des mêmes grains est bien plus élevée. Le panneau de la cellule indique le seuil médian sur l’année, son intervalle 5–95 %, le vent équivalent au niveau le plus bas du modèle et la proportion des pas de temps au-dessus du seuil.

# Interface

## panel.dunesOnly (Interface)
EN: Dunes only
FR: Dunes seulement

## panel.names (Interface)
EN: Names
FR: Noms

## panel.display (Interface)
EN: Display
FR: Affichage

## panel.finer (Interface)
EN: Finer
FR: Plus fin

## panel.coarser (Interface)
EN: Coarser
FR: Plus grossier

## panel.active (Interface)
EN: Active layers
FR: Calques actifs

## tools.share (Interface)
EN: Share / copy link
FR: Partager / copier le lien

## tools.export (Interface)
EN: Export map image
FR: Exporter l’image de la carte

## cell.downloads (Interface)
EN: Download & cite
FR: Télécharger et citer

## cell.petals (Interface)
EN: Petals:
FR: Pétales :

## cell.petalsToward (Interface)
EN: toward
FR: vers

## cell.petalsFrom (Interface)
EN: from
FR: depuis

# Screen-reader labels and tooltips

## c.cbf0821a (Screen-reader labels and tooltips)
EN: About {title}
FR: À propos de {title}

## c.e7dc4699 (Screen-reader labels and tooltips)
EN: Move {title} up
FR: Monter {title}

## c.ecdb15e0 (Screen-reader labels and tooltips)
EN: Move {title} down
FR: Descendre {title}

## c.2ff214e6 (Screen-reader labels and tooltips)
EN: Remove {title} from the map
FR: Retirer {title} de la carte

## c.33ff2167 (Screen-reader labels and tooltips)
EN: Opacity of {title}
FR: Opacité de {title}

## c.a2de8b84 (Screen-reader labels and tooltips)
EN: Show {title}
FR: Afficher {title}

## c.32a4672f (Screen-reader labels and tooltips)
EN: Fill colour for {title}
FR: Couleur de remplissage de {title}

# Other

## c.9e5e6896 (Other)
EN: Dune-field names
FR: Noms des champs de dunes

# Screen-reader labels and tooltips

## c.ce3f61ab (Screen-reader labels and tooltips)
EN: Display {title} as
FR: Afficher {title} sous forme de

## c.1b597f46 (Screen-reader labels and tooltips)
EN: Arrow / streamline colour for {title}
FR: Couleur des flèches / lignes de courant pour {title}

## c.7e0bca77 (Screen-reader labels and tooltips)
EN: Line spacing for {title}, finer to coarser
FR: Espacement des lignes pour {title}, du plus fin au plus grossier

## c.cf77fd20 (Screen-reader labels and tooltips)
EN: Colour map for {title}
FR: Palette de couleurs pour {title}

## c.30453a2a (Screen-reader labels and tooltips)
EN: Reverse colour map for {title}
FR: Inverser la palette de couleurs pour {title}

## c.149cfa70 (Screen-reader labels and tooltips)
EN: Colour scale minimum for {title}
FR: Minimum de l’échelle de couleurs pour {title}

## c.8b6b1072 (Screen-reader labels and tooltips)
EN: Colour scale maximum for {title}
FR: Maximum de l’échelle de couleurs pour {title}

## c.8c096bed (Screen-reader labels and tooltips)
EN: Logarithmic colour scale for {title}
FR: Échelle de couleurs logarithmique pour {title}

## c.e85083b1 (Screen-reader labels and tooltips)
EN: ERA5-Land ⟦#0⟧°, ⟦#1⟧–⟦#2⟧; land cells: land–sea mask fraction > ⟦#3⟧
FR: ERA5-Land ⟦#0⟧°, ⟦#1⟧–⟦#2⟧ ; cellules terrestres : fraction du masque terre–mer > ⟦#3⟧

## c.c66b4f99 (Screen-reader labels and tooltips)
EN: Draw the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in cells with dunes; the other layers and the cell panel are unchanged.
FR: N’afficher les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) que dans les cellules comportant des dunes ; les autres calques et le panneau de la cellule restent inchangés.

## c.e801d9a2 (Screen-reader labels and tooltips)
EN: Reset to the default ⟦#0⟧ m/s
FR: Rétablir la valeur par défaut de ⟦#0⟧ m/s

# Layer panel

## c.72156bc9 (Layer panel)
EN: default ⟦#0⟧ m/s
FR: par défaut ⟦#0⟧ m/s

## c.95919b83 (Layer panel)
EN: Applies to the map layers and the cell panel.
FR: S’applique aux calques de la carte et au panneau de la cellule.

# Layer popovers

## c.bf84b28e (Layer popovers)
EN: The friction velocity ⟦0⟧ above which the wind moves sand. Every threshold-dependent map layer (its ⓘ says so) and the cell panel use the value set here.
FR: La vitesse de frottement ⟦0⟧ au-delà de laquelle le vent met le sable en mouvement. Tous les calques de la carte qui dépendent du seuil (leur ⓘ l’indique) ainsi que le panneau de la cellule utilisent la valeur définie ici.

## c.5b6d3e3c (Layer popovers)
EN: With the roughness length of ⟦#0⟧ mm used here, ⟦#1⟧ m/s corresponds to a ⟦#2⟧ m wind of ⟦#3⟧ m/s (⟦#4⟧ knots); the ⟦#5⟧-knot threshold of⟦0⟧corresponds to about ⟦#6⟧ m/s.
FR: Avec la longueur de rugosité de ⟦#0⟧ mm utilisée ici, ⟦#1⟧ m/s correspond à un vent à ⟦#2⟧ m de ⟦#3⟧ m/s (⟦#4⟧ nœuds) ; le seuil de ⟦#5⟧ nœuds de⟦0⟧correspond à environ ⟦#6⟧ m/s.

## c.842a7a09 (Layer popovers)
EN: ⟦#0⟧ values from ⟦#1⟧ m/s to ⟦#2⟧ m/s; default ⟦#3⟧ m/s (the mark under the slider). The compact copy at the top of the cell panel sets the same value.
FR: ⟦#0⟧ valeurs de ⟦#1⟧ m/s à ⟦#2⟧ m/s ; valeur par défaut ⟦#3⟧ m/s (le repère sous le curseur). La version compacte située en haut du panneau de la cellule règle la même valeur.

# Screen-reader labels and tooltips

## c.e764d433 (Screen-reader labels and tooltips)
EN: Active layers, drawing order (top is drawn on top)
FR: Calques actifs, ordre d’affichage (le calque du haut est dessiné au-dessus)

## c.fce503d3 (Screen-reader labels and tooltips)
EN: Drag to reorder
FR: Faire glisser pour réorganiser

# Layer panel

## c.3f0212fb (Layer panel)
EN: Fill ⟦0⟧
FR: Remplissage ⟦0⟧

# Screen-reader labels and tooltips

## c.82a20f6e (Screen-reader labels and tooltips)
EN: Invert: colour the land WITHOUT mapped dunes instead of the dunes. Latitudes beyond ±⟦#0⟧° (interior Antarctica) are not coloured.
FR: Inverser : colorer les terres SANS dunes cartographiées plutôt que les dunes. Les latitudes au-delà de ±⟦#0⟧° (intérieur de l’Antarctique) ne sont pas colorées.

# Layer panel

## c.c158f449 (Layer panel)
EN: ⟦0⟧ invert (land without dunes)
FR: ⟦0⟧ inverser (terres sans dunes)

# Screen-reader labels and tooltips

## c.4422e95b (Screen-reader labels and tooltips)
EN: Invert: colour land without dunes
FR: Inverser : colorer les terres sans dunes

# Layer popovers

## c.2be0d726 (Layer popovers)
EN: Displayed dune field names are derived from previously published academic research and data, regional knowledge, and internet searches. Naming conventions (language, jurisdiction, spelling, merging, etc.) were chosen for clarity but may be wrong or offend certain peoples. Please contact Andrew Gunn at <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> if you have any suggestions for changes, removals, or additions.
FR: Les noms des champs de dunes affichés sont issus de travaux et de données de recherche académique déjà publiés, de connaissances régionales et de recherches sur Internet. Les conventions de dénomination (langue, juridiction, orthographe, regroupement, etc.) ont été choisies par souci de clarté, mais peuvent être erronées ou offenser certains peuples. Veuillez contacter Andrew Gunn à l’adresse <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> si vous avez des suggestions de modifications, de suppressions ou d’ajouts.

## c.1226fbb4 (Layer popovers)
EN: Citation
FR: Citation

# Screen-reader labels and tooltips

## c.ec7be404 (Screen-reader labels and tooltips)
EN: Label named dune fields and features on the map; where names would overlap, some appear only as you zoom in. Click a name for its details.
FR: Affiche les noms des champs de dunes et des entités nommées sur la carte ; lorsque des noms se chevaucheraient, certains n’apparaissent qu’en zoomant. Cliquez sur un nom pour afficher ses détails.

# Layer panel

## c.1e62d767 (Layer panel)
EN: Show as ⟦0⟧
FR: Afficher en ⟦0⟧

## c.c739a747 (Layer panel)
EN: colour map
FR: palette de couleurs

## c.8b3f7f3a (Layer panel)
EN: Line colour ⟦0⟧
FR: Couleur de ligne ⟦0⟧

# Screen-reader labels and tooltips

## c.f9cf5751 (Screen-reader labels and tooltips)
EN: Spacing between arrows / streamlines: left finer (denser lines), right coarser
FR: Espacement entre les flèches / lignes de courant : à gauche plus fin (lignes plus denses), à droite plus grossier

# Layer panel

## c.bc8b4ab6 (Layer panel)
EN: Spacing <span class="spacing-end">Finer</span>⟦0⟧<span class="spacing-end">Coarser</span>
FR: Espacement <span class="spacing-end">Plus fin</span>⟦0⟧<span class="spacing-end">Plus grossier</span>

## c.02860b5d (Layer panel)
EN: Colours ⟦0⟧
FR: Couleurs ⟦0⟧

## c.9fbef08a (Layer panel)
EN: ⟦0⟧ reversed
FR: ⟦0⟧ inversées

## c.a9812c14 (Layer panel)
EN: min ⟦0⟧
FR: min ⟦0⟧

## c.c728f056 (Layer panel)
EN: max ⟦0⟧
FR: max ⟦0⟧

## c.650d33c0 (Layer panel)
EN: reset
FR: réinitialiser

# Screen-reader labels and tooltips

## c.f5ecdead (Screen-reader labels and tooltips)
EN: Colour scale from ⟦#0⟧ to ⟦#1⟧
FR: Échelle de couleurs de ⟦#0⟧ à ⟦#1⟧

## c.8fd4b665 (Screen-reader labels and tooltips)
EN: values outside the range are shown at the end colours
FR: les valeurs hors de l’intervalle sont affichées avec les couleurs des extrémités

# Layer popovers

## c.40b6e257 (Layer popovers)
EN: Migration direction⟦0⟧of dunes whose crests have the bed-instability orientation⟦1⟧: perpendicular to⟦2⟧, toward the side of the net sand flux across the crest (⟦3⟧;⟦4⟧).
FR: Direction de migration⟦0⟧des dunes dont les crêtes ont l’orientation du mode d’instabilité du lit⟦1⟧: perpendiculaire à⟦2⟧, vers le côté où se dirige le flux net de sable à travers la crête (⟦3⟧;⟦4⟧).

## c.6ed4163c (Layer popovers)
EN: Units
FR: Unités

## c.d7ff288f (Layer popovers)
EN: ° (compass bearing, clockwise from north, toward which sand moves)
FR: ° (azimut, compté dans le sens horaire depuis le nord, vers lequel se déplace le sable)

## c.56c1f3e5 (Layer popovers)
EN: Wind data
FR: Données de vent

## c.9b74c01c (Layer popovers)
EN: Slider
FR: Curseur

## c.fc8f6378 (Layer popovers)
EN: Updates with the ⟦0⟧ control.
FR: Mis à jour avec la commande ⟦0⟧.

## c.cb6596aa (Layer popovers)
EN: Citing the map fields (in About)
FR: Citer les champs de la carte (dans À propos)

## c.27cf9488 (Layer popovers)
EN: Elongation direction⟦0⟧: the direction in which a dune grows in length without migrating, where the net sand flux across its crest is zero and the net flux along it is positive (⟦1⟧). It applies to dunes on beds with limited sand, typically growing from a fixed sand source. Where a wind regime allows several such directions, the atlas shows the most stable one.
FR: Direction d’allongement⟦0⟧: direction dans laquelle une dune croît en longueur sans migrer, là où le flux net de sable à travers sa crête est nul et le flux net le long de celle-ci est positif (⟦1⟧). Elle s’applique aux dunes situées sur des lits où le sable est limité, qui croissent généralement à partir d’une source de sable fixe. Lorsqu’un régime de vents admet plusieurs directions de ce type, l’atlas affiche la plus stable.

## c.e2c0f300 (Layer popovers)
EN: Crest orientation⟦0⟧of the bed-instability mode: the axis (⟦#0⟧–⟦#1⟧°) of crests that receive the largest gross sand transport across them, including the speed-up of the wind over the crest (⟦1⟧;⟦2⟧). It is also the expected crest orientation of migrating dunes such as barchans. Dunes with this orientation migrate perpendicular to it, in direction⟦3⟧. As an axis it has no compass direction: e.g., ⟦#2⟧° and ⟦#3⟧° are the same line.
FR: Orientation de la crête⟦0⟧du mode d’instabilité du lit : axe (⟦#0⟧–⟦#1⟧°) des crêtes qui reçoivent le plus fort transport brut de sable à travers elles, en tenant compte de l’accélération du vent au-dessus de la crête (⟦1⟧;⟦2⟧). C’est aussi l’orientation de crête attendue pour les dunes qui migrent, comme les barkhanes. Les dunes ayant cette orientation migrent perpendiculairement à celle-ci, dans la direction⟦3⟧. En tant qu’axe, elle n’a pas de sens d’azimut : par exemple, ⟦#2⟧° et ⟦#3⟧° désignent la même droite.

## c.96a1a48e (Layer popovers)
EN: ° (crest axis, ⟦#0⟧–⟦#1⟧°)
FR: ° (axe de la crête, ⟦#0⟧–⟦#1⟧°)

## c.bc48cc14 (Layer popovers)
EN: Direction⟦0⟧along crests of the bed-instability orientation⟦1⟧in which the net sand flux along the crest points, as a compass bearing. Where crests are oblique to the net transport, sand moves along them as well as across them;⟦2⟧shows which way along the crest it moves.
FR: Direction⟦0⟧, le long des crêtes ayant l’orientation du mode d’instabilité du lit⟦1⟧, dans laquelle pointe le flux net de sable le long de la crête, exprimée en azimut. Lorsque les crêtes sont obliques par rapport au transport net, le sable se déplace le long de celles-ci aussi bien qu’à travers elles ;⟦2⟧indique dans quel sens il se déplace le long de la crête.

# Screen-reader labels and tooltips

## c.9887f73f (Screen-reader labels and tooltips)
EN: Colour scale (logarithmic) from ⟦#0⟧ to ⟦#1⟧
FR: Échelle de couleurs (logarithmique) de ⟦#0⟧ à ⟦#1⟧

## c.e7135998 (Screen-reader labels and tooltips)
EN: Limits span zero: symmetric log scale, linear close to zero
FR: Les limites encadrent zéro : échelle logarithmique symétrique, linéaire au voisinage de zéro

## c.69ce2e68 (Screen-reader labels and tooltips)
EN: Log scale needs min > ⟦#0⟧, or min < ⟦#1⟧ < max (symmetric log)
FR: L’échelle logarithmique exige min > ⟦#0⟧, ou min < ⟦#1⟧ < max (logarithmique symétrique)

# Layer popovers

## c.8dcaa52f (Layer popovers)
EN: Ratio of the growth rates in height of dunes in the elongation and bed-instability orientations,⟦0⟧, between ⟦#0⟧ and ⟦#1⟧. It assesses whether dunes elongating from a sand source on a starved bed are stable: in numerical simulations and in dunes around the Tibesti Massif, elongating linear dunes form where the ratio is above about ⟦#2⟧ and trains of barchans form below it (⟦1⟧;⟦2⟧). It does not take bed mobility or other boundary conditions into account.
FR: Rapport des taux de croissance en hauteur des dunes selon les orientations d’allongement et d’instabilité du lit,⟦0⟧, compris entre ⟦#0⟧ et ⟦#1⟧. Il permet d’évaluer si les dunes qui s’allongent à partir d’une source de sable sur un lit pauvre en sable sont stables : dans les simulations numériques et pour les dunes situées autour du massif du Tibesti, des dunes linéaires en allongement se forment lorsque le rapport est supérieur à environ ⟦#2⟧, et des trains de barkhanes se forment en dessous (⟦1⟧;⟦2⟧). Il ne tient pas compte de la mobilité du lit ni des autres conditions aux limites.

## c.b4eb3711 (Layer popovers)
EN: Gross over net across-crest sand flux for crests of the bed-instability orientation,⟦0⟧, never below ⟦#0⟧: the balance between growth in height and migration. Values near ⟦#1⟧ mean that transport across the crest goes one way and the dunes mainly migrate; large values mean that it reverses, building the dunes up with little net migration, which may also favour straighter crests (⟦1⟧). In the sand-covered-bed examples of⟦2⟧it is about ⟦#2⟧ for transverse, ⟦#3⟧ for oblique and ⟦#4⟧ for longitudinal dunes. The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#5⟧).
FR: Rapport du flux de sable brut à travers la crête au flux net à travers la crête pour les crêtes dans l’orientation du mode d’instabilité du lit,⟦0⟧, jamais inférieur à ⟦#0⟧ ; il traduit l’équilibre entre croissance en hauteur et migration. Des valeurs proches de ⟦#1⟧ signifient que le transport à travers la crête s’effectue dans un seul sens et que les dunes migrent principalement ; des valeurs élevées signifient qu’il s’inverse, faisant croître les dunes en hauteur avec une faible migration nette, ce qui peut aussi favoriser des crêtes plus rectilignes (⟦1⟧). Dans les exemples sur lit couvert de sable de⟦2⟧il vaut environ ⟦#2⟧ pour les dunes transverses, ⟦#3⟧ pour les dunes obliques et ⟦#4⟧ pour les dunes longitudinales. Le rapport tend vers l’infini lorsque son dénominateur (un flux net) tend vers zéro (valeurs affichées écrêtées à ±⟦#5⟧).

## c.e3ecff1e (Layer popovers)
EN: Gross across-crest over net along-crest sand flux for dunes in the elongation orientation,⟦0⟧: the balance between growth in height and elongation. For dunes that elongate without migrating, it is the parameter expected to distinguish their shapes. Compared with⟦1⟧, it indicates whether elongation or migration is more likely to set dune shape and orientation on a starved bed: the dynamic with the larger ratio favours growth in height more and is expected to prevail (⟦2⟧). The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#0⟧).
FR: Rapport du flux de sable brut à travers la crête au flux net le long de la crête pour les dunes dans l’orientation du mode d’allongement,⟦0⟧, soit l’équilibre entre croissance en hauteur et allongement. Pour les dunes qui s’allongent sans migrer, c’est le paramètre censé distinguer leurs formes. Comparé à⟦1⟧, il indique si l’allongement ou la migration est le plus susceptible de déterminer la forme et l’orientation des dunes sur un lit pauvre en sable : la dynamique présentant le rapport le plus élevé favorise davantage la croissance en hauteur et devrait l’emporter (⟦2⟧). Le rapport tend vers l’infini lorsque son dénominateur (un flux net) tend vers zéro (valeurs affichées écrêtées à ±⟦#0⟧).

## c.e5c17d00 (Layer popovers)
EN: Fraction of time flat-bed friction velocity is above threshold⟦0⟧.
FR: Fraction du temps pendant laquelle la vitesse de frottement sur lit plat est au-dessus du seuil⟦0⟧.

## c.e68c470c (Layer popovers)
EN: fraction (⟦#0⟧–⟦#1⟧)
FR: fraction (⟦#0⟧–⟦#1⟧)

## c.d66d70dc (Layer popovers)
EN: Average above-threshold flat-bed friction velocity, normalised by threshold⟦0⟧.
FR: Vitesse de frottement moyenne sur lit plat au-dessus du seuil, normalisée par le seuil⟦0⟧.

## c.7aed9ffd (Layer popovers)
EN: Fraction of bed-instability-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux.
FR: Fraction du flux de crête en mode d’instabilité du lit (⟦0⟧) qui se produit lorsque la vitesse de frottement sur lit plat dépasse le seuil,⟦1⟧. ⟦#0⟧ là où le flux de crête ne se produit que lorsque le lit plat est sous le seuil ; non définie là où il n’y a pas de flux de crête.

## c.0d2dc35f (Layer popovers)
EN: Fraction of elongation-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux.
FR: Fraction du flux de crête en mode d’allongement (⟦0⟧) qui se produit lorsque la vitesse de frottement sur lit plat dépasse le seuil,⟦1⟧. ⟦#0⟧ là où le flux de crête ne se produit que lorsque le lit plat est sous le seuil ; non définie là où il n’y a pas de flux de crête.

## c.40039fa4 (Layer popovers)
EN: Magnitude of the time-averaged flat-bed flux vector,⟦0⟧: the net volume of packed sand per metre width per year after transport in opposing directions has cancelled. Same units as⟦1⟧;⟦2⟧≤⟦3⟧, with equality only when all transport is in one direction.
FR: Norme du vecteur flux sur lit plat moyenné dans le temps,⟦0⟧: le volume net de sable compacté par mètre de largeur et par an, une fois compensés les transports de sens opposés. Mêmes unités que⟦1⟧;⟦2⟧≤⟦3⟧, l’égalité n’étant atteinte que lorsque tout le transport s’effectue dans une seule direction.

## c.d590db9a (Layer popovers)
EN: Divergence of the time-averaged saturated sand-flux vector (magnitude⟦0⟧, direction⟦1⟧) on the sphere, following⟦2⟧, Methods⟦3⟧:⟦4⟧with⟦5⟧,⟦6⟧. By conservation of sand mass, negative values (flux convergence) imply deposition and positive values (flux divergence) erosion. The values assume a saturated flux and an unlimited supply of loose sand, so on rock, crusted or vegetated surfaces actual erosion is limited by the sand available. No data at coasts (a neighbouring cell has no wind data) and on the ±⟦#0⟧° rows.
FR: Divergence du vecteur flux de sable saturé moyenné dans le temps (intensité⟦0⟧, direction⟦1⟧) sur la sphère, d’après⟦2⟧, Méthodes⟦3⟧:⟦4⟧avec⟦5⟧,⟦6⟧. Par conservation de la masse de sable, les valeurs négatives (convergence du flux) impliquent un dépôt et les valeurs positives (divergence du flux) une érosion. Ces valeurs supposent un flux saturé et un apport illimité de sable meuble ; sur les surfaces rocheuses, encroûtées ou végétalisées, l’érosion réelle est donc limitée par le sable disponible. Pas de données sur les côtes (une cellule voisine ne dispose pas de données de vent) ni sur les rangées à ±⟦#0⟧°.

## c.925905dc (Layer popovers)
EN: Global Aridity Index v3.1 (⟦#0⟧–⟦#1⟧): mean annual precipitation divided by reference evapotranspiration, native ⟦#2⟧″ (~⟦#3⟧ km) grid.⟦0⟧classes: &lt; ⟦#4⟧ hyper-arid, ⟦#5⟧–⟦#6⟧ arid, ⟦#7⟧–⟦#8⟧ semi-arid, ⟦#9⟧–⟦#10⟧ dry sub-humid, &gt; ⟦#11⟧ humid. Values of ⟦#12⟧ mean⟦1⟧≥ ⟦#13⟧ (source saturation). Ocean, Antarctica (south of ⟦#14⟧° S) and polar ice with zero⟦2⟧have no data.
FR: Global Aridity Index v3.1 (⟦#0⟧–⟦#1⟧) : précipitations annuelles moyennes divisées par l’évapotranspiration de référence, grille native à ⟦#2⟧″ (~⟦#3⟧ km).⟦0⟧classes : &lt; ⟦#4⟧ hyperaride, ⟦#5⟧–⟦#6⟧ aride, ⟦#7⟧–⟦#8⟧ semi-aride, ⟦#9⟧–⟦#10⟧ subhumide sec, &gt; ⟦#11⟧ humide. Les valeurs de ⟦#12⟧ signifient⟦1⟧≥ ⟦#13⟧ (saturation de la source). L’océan, l’Antarctique (au sud de ⟦#14⟧° S) et les glaces polaires où⟦2⟧vaut zéro n’ont pas de données.

## c.ab99d29d (Layer popovers)
EN: not used (the same for every wind dataset)
FR: non utilisé (identique pour tous les jeux de données de vent)

## c.71f5da7c (Layer popovers)
EN: Threshold-independent: not affected by the ⟦0⟧ control.
FR: Indépendant du seuil : non affecté par la commande ⟦0⟧.

## c.61e2a3f8 (Layer popovers)
EN: Source
FR: Source

## c.f9f78e2c (Layer popovers)
EN: ⟦0⟧, Version ⟦#0⟧ (⟦1⟧; Zomer &amp; Trabucco), annual aridity index ai_v31_yr, ⟦#1⟧-⟦#2⟧, ⟦#3⟧ arc-seconds
FR: ⟦0⟧, version ⟦#0⟧ (⟦1⟧ ; Zomer &amp; Trabucco), indice d’aridité annuel ai_v31_yr, ⟦#1⟧-⟦#2⟧, ⟦#3⟧ secondes d’arc

## c.735cb604 (Layer popovers)
EN: Data⟦0⟧
FR: Données⟦0⟧

## c.58c031d4 (Layer popovers)
EN: Licence
FR: Licence

## c.8e08e589 (Layer popovers)
EN: Link
FR: Lien

## c.7ec50eea (Layer popovers)
EN: Changes
FR: Modifications

## c.ac8f9d91 (Layer popovers)
EN: Processed for the atlas: source integers (⟦0⟧x ⟦#0⟧^⟦#1⟧) converted to decimal⟦1⟧; ocean (no⟦2⟧data) and⟦3⟧= ⟦#2⟧ pixels set to no data; the source maximum ⟦#3⟧ kept as ⟦#4⟧ (⟦4⟧&gt;= ⟦#5⟧); zoomed-out map views show means of the valid native pixels; values rounded to a relative precision of ⟦#6⟧.2e-⟦#7⟧.
FR: Traitement pour l’atlas : entiers de la source (⟦0⟧x ⟦#0⟧^⟦#1⟧) convertis en décimal⟦1⟧ ; pixels océaniques (sans⟦2⟧données) et pixels où⟦3⟧= ⟦#2⟧ définis comme sans données ; maximum de la source ⟦#3⟧ conservé comme ⟦#4⟧ (⟦4⟧&gt;= ⟦#5⟧) ; les vues de carte dézoomées affichent les moyennes des pixels natifs valides ; valeurs arrondies à une précision relative de ⟦#6⟧.2e-⟦#7⟧.

## c.e467a70d (Layer popovers)
EN: Fractional cover -⟦0⟧,⟦1⟧algorithm, Version ⟦#0⟧ (⟦2⟧;⟦3⟧collection ⟦#1⟧/⟦#2⟧, monthly medoid, ⟦#3⟧ m): total vegetation cover (photosynthetic + non-photosynthetic vegetation), ⟦#4⟧–⟦#5⟧; the vegetation product of⟦4⟧Rangeland and Pasture Productivity (⟦5⟧), hosted by⟦6⟧
FR: Fractional cover -⟦0⟧,⟦1⟧algorithme, version ⟦#0⟧ (⟦2⟧;⟦3⟧collection ⟦#1⟧/⟦#2⟧, médoïde mensuel, ⟦#3⟧ m) : couvert végétal total (végétation photosynthétique + non photosynthétique), ⟦#4⟧–⟦#5⟧ ; produit de végétation de⟦4⟧Rangeland and Pasture Productivity (⟦5⟧), hébergé par⟦6⟧

## c.8e5d4620 (Layer popovers)
EN: Processed for the atlas: monthly ⟦#0⟧ m tiles averaged to ⟦#1⟧° and over ⟦#2⟧–⟦#3⟧ (valid tot_cov ≤ ⟦#4⟧ %; months without valid data skipped); zoomed-out map views show means of the valid ⟦#5⟧° cells; values rounded to a relative precision of ⟦#6⟧.2e-⟦#7⟧.
FR: Traitement pour l’atlas : tuiles mensuelles de ⟦#0⟧ m moyennées à ⟦#1⟧° et sur ⟦#2⟧–⟦#3⟧ (tot_cov valide ≤ ⟦#4⟧ % ; mois sans données valides ignorés) ; les vues de carte dézoomées affichent les moyennes des cellules de ⟦#5⟧° valides ; valeurs arrondies à une précision relative de ⟦#6⟧.2e-⟦#7⟧.

## c.42e7477f (Layer popovers)
EN: Dark vector basemap of⟦0⟧roads, places, water and land cover, styled to sit under the atlas colours.
FR: Fond de carte vectoriel sombre⟦0⟧(routes, lieux, eau et occupation du sol), conçu pour s’afficher sous les couleurs de l’atlas.

## c.5018e106 (Layer popovers)
EN: ⟦0⟧, from⟦1⟧data (⟦2⟧schema), dark style
FR: ⟦0⟧, à partir des données⟦1⟧(schéma⟦2⟧), style sombre

## c.aee818af (Layer popovers)
EN: Resolution
FR: Résolution

## c.c432f449 (Layer popovers)
EN: Vector map, sharp at every zoom (street-level detail)
FR: Carte vectorielle, nette à tous les niveaux de zoom (détail à l’échelle de la rue)

## c.9f1c6cab (Layer popovers)
EN: Map data ©⟦0⟧contributors (⟦1⟧); ©⟦2⟧
FR: Données cartographiques © contributeurs⟦0⟧(⟦1⟧) ; ©⟦2⟧

## c.0fce76d6 (Layer popovers)
EN: Mosaic of satellite and aerial imagery of the land surface.
FR: Mosaïque d’images satellitaires et aériennes de la surface terrestre.

## c.7a9c10bd (Layer popovers)
EN: ⟦0⟧(⟦1⟧,⟦2⟧,⟦3⟧and the⟦4⟧)
FR: ⟦0⟧(⟦1⟧,⟦2⟧,⟦3⟧et la⟦4⟧)

## c.243e42f5 (Layer popovers)
EN: ⟦#0⟧ m worldwide, ⟦#1⟧ m or finer in many regions
FR: ⟦#0⟧ m à l’échelle mondiale, ⟦#1⟧ m ou plus fin dans de nombreuses régions

## c.5d6289ac (Layer popovers)
EN: ⟦0⟧service under the⟦1⟧/ Terms of Use
FR: Service⟦0⟧régi par le⟦1⟧/ les conditions d’utilisation

## c.e32b80e2 (Layer popovers)
EN: Shaded relief of an open global elevation model (⟦0⟧).
FR: Relief ombré d’un modèle numérique d’altitude ouvert à l’échelle mondiale (⟦0⟧).

## c.22335d7a (Layer popovers)
EN: ⟦0⟧open elevation data:⟦1⟧worldwide and national open elevation models where available
FR: ⟦0⟧données d’altitude ouvertes :⟦1⟧modèles d’altitude ouverts mondiaux et nationaux, lorsqu’ils sont disponibles

## c.a5298609 (Layer popovers)
EN: About ⟦#0⟧ m worldwide, finer in some countries
FR: Environ ⟦#0⟧ m à l’échelle mondiale, plus fin dans certains pays

## c.a9596935 (Layer popovers)
EN: Each source's open licence (for example the⟦0⟧licence), listed by⟦1⟧
FR: Licence ouverte propre à chaque source (par exemple la licence⟦0⟧), répertoriée par⟦1⟧

## c.d7137982 (Layer popovers)
EN: Topographic map with contour lines and hill shading.
FR: Carte topographique avec courbes de niveau et ombrage du relief.

## c.45fc789b (Layer popovers)
EN: ⟦0⟧, from⟦1⟧data and⟦2⟧elevation
FR: ⟦0⟧, à partir des données⟦1⟧et des données d’altitude⟦2⟧

## c.b47179e7 (Layer popovers)
EN: About ⟦#0⟧ m per pixel at the equator at the closest zoom
FR: Environ ⟦#0⟧ m par pixel à l’équateur au niveau de zoom le plus rapproché

## c.816ba161 (Layer popovers)
EN: Map data ©⟦0⟧contributors (⟦1⟧); map style ©⟦2⟧(⟦3⟧)
FR: Données cartographiques © contributeurs de⟦0⟧(⟦1⟧) ; style de carte ©⟦2⟧(⟦3⟧)

## c.84e91972 (Layer popovers)
EN: Light vector basemap of⟦0⟧roads, places, water and land cover (⟦1⟧style).
FR: Fond de carte vectoriel clair des⟦0⟧routes, lieux, plans d’eau et de l’occupation du sol (style⟦1⟧).

## c.6bc2c76c (Layer popovers)
EN: ⟦0⟧, from⟦1⟧data (⟦2⟧schema),⟦3⟧style
FR: ⟦0⟧, à partir des données⟦1⟧(schéma⟦2⟧), style⟦3⟧

# Layer panel

## c.dfaf4b2e (Layer panel)
EN: To see the imagery under the colour layers, lower their opacity in Active layers.
FR: Pour voir l’imagerie sous les calques colorés, réduisez leur opacité dans Calques actifs.

# About

## c.76b65eed (About)
EN: This page was created with assistance from Claude⟦0⟧. I have reviewed the functionality and underlying data but if you notice any issues or errors please contact me at <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a>.
FR: Cette page a été créée avec l’aide de Claude⟦0⟧. J’ai vérifié les fonctionnalités et les données sous-jacentes, mais si vous remarquez des problèmes ou des erreurs, veuillez me contacter à <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a>.

## c.a8714914 (About)
EN: Click any land cell to see its wind rose over the record of the wind dataset chosen with the Wind dataset selector, the sand-flux rose at the selected threshold, dune-orientation modes and all wind-regime parameters.
FR: Cliquez sur n’importe quelle cellule terrestre pour afficher sa rose des vents sur la période couverte par le jeu de données de vent choisi avec le sélecteur Jeu de données de vent, la rose des flux de sable au seuil sélectionné, les modes d’orientation des dunes et l’ensemble des paramètres du régime de vent.

## c.51f21a4b (About)
EN: Data sources
FR: Sources des données

## c.706c74d2 (About)
EN: <strong>Wind histograms and sand-flux fields (⟦0⟧⟦#0⟧°)</strong>:⟦1⟧⟦#1⟧–⟦#2⟧ hourly ⟦#3⟧ m winds on the ⟦#4⟧° grid (⟦2⟧;⟦3⟧,⟦4⟧, accessed via the⟦5⟧Australia replica); the histograms and the ⟦#5⟧ sand-flux fields are computed for the atlas with the methods outlined in⟦6⟧. Cells with an⟦7⟧land–sea mask fraction above ⟦#6⟧ (any land in the cell) carry wind data; a ⟦#7⟧° cell counts as a dune cell where it overlaps a mapped ⟦#8⟧° dune cell.
FR: <strong>Histogrammes de vent et champs de flux de sable (⟦0⟧⟦#0⟧°)</strong> :⟦1⟧⟦#1⟧–⟦#2⟧, vents horaires à ⟦#3⟧ m sur la grille à ⟦#4⟧° (⟦2⟧;⟦3⟧,⟦4⟧, consultés via la réplique⟦5⟧Australia) ; les histogrammes et les ⟦#5⟧ champs de flux de sable sont calculés pour l’atlas selon les méthodes décrites dans⟦6⟧. Les cellules dont la fraction du masque terre–mer⟦7⟧est supérieure à ⟦#6⟧ (présence de terre dans la cellule) comportent des données de vent ; une cellule de ⟦#7⟧° est comptée comme cellule de dunes lorsqu’elle recouvre une cellule de dunes cartographiée à ⟦#8⟧°.

## c.a7651e74 (About)
EN: <strong>Sand-flux fields</strong>: for every hour, the friction velocity⟦0⟧= κ U₁₀ / ln(z/z₀) from the ⟦#0⟧ m wind speed U₁₀ (logarithmic wind profile; κ = ⟦#1⟧, z = ⟦#2⟧ m, roughness length z₀ = ⟦#3⟧ mm) and the saturated transport rate of⟦1⟧, q = C ρ<sub>f</sub>⟦2⟧(u*² − u*,th²) / (g ρ<sub>s</sub> φ) for⟦3⟧&gt;⟦4⟧, with C = ⟦#4⟧, air density ρ<sub>f</sub> = ⟦#5⟧ kg/m³, grain density ρ<sub>s</sub> = ⟦#6⟧ kg/m³, packing fraction φ = ⟦#7⟧ and g = ⟦#8⟧ m/s², at the selected threshold⟦5⟧, averaged over ⟦#9⟧–⟦#10⟧ (⟦6⟧, Methods⟦7⟧). Fluxes are volumes of packed sand (pore space included) per metre width per year of ⟦#11⟧ days (m²/yr). Drift potentials, crest fluxes and dune-orientation modes follow the methods reviewed in⟦8⟧.
FR: <strong>Champs de flux de sable</strong> : pour chaque heure, la vitesse de frottement⟦0⟧= κ U₁₀ / ln(z/z₀) est obtenue à partir de la vitesse du vent à ⟦#0⟧ m U₁₀ (profil logarithmique du vent ; κ = ⟦#1⟧, z = ⟦#2⟧ m, longueur de rugosité z₀ = ⟦#3⟧ mm), ainsi que le taux de transport saturé de⟦1⟧, q = C ρ<sub>f</sub>⟦2⟧(u*² − u*,th²) / (g ρ<sub>s</sub> φ) pour⟦3⟧&gt;⟦4⟧, avec C = ⟦#4⟧, masse volumique de l’air ρ<sub>f</sub> = ⟦#5⟧ kg/m³, masse volumique des grains ρ<sub>s</sub> = ⟦#6⟧ kg/m³, compacité φ = ⟦#7⟧ et g = ⟦#8⟧ m/s², au seuil sélectionné⟦5⟧, moyenné sur ⟦#9⟧–⟦#10⟧ (⟦6⟧, Méthodes⟦7⟧). Les flux sont des volumes de sable compacté (porosité incluse) par mètre de largeur et par année de ⟦#11⟧ jours (m²/yr). Les potentiels de dérive, les flux de crête et les modes d’orientation des dunes suivent les méthodes passées en revue dans⟦8⟧.

## c.38fc33d0 (About)
EN: <strong>Dune map</strong>:⟦0⟧from the⟦1⟧record (⟦2⟧,⟦3⟧), vectorised into dune fields.
FR: <strong>Carte des dunes</strong> :⟦0⟧issue des données⟦1⟧(⟦2⟧,⟦3⟧), vectorisée en champs de dunes.

## c.2bc3ff20 (About)
EN: <strong>Saturated flux divergence</strong> ⟦0⟧: divergence of the time-averaged saturated sand-flux vector (magnitude⟦1⟧, direction⟦2⟧) on the sphere, ∇·q = [∂(q cos θ)/∂λ + ∂(q sin θ cos φ)/∂φ] / (R cos φ) with q =⟦3⟧, θ =⟦4⟧, latitude φ, longitude λ and R = ⟦#0⟧ km, computed with central differences on the grid of the selected wind dataset (⟦#1⟧° or ⟦#2⟧°), following⟦5⟧, Methods⟦6⟧. By conservation of sand mass, negative values (convergence) imply deposition and positive values erosion, in metres of bed level per thousand years. The values assume a saturated flux and an unlimited supply of loose sand.
FR: <strong>Divergence du flux saturé</strong> ⟦0⟧: divergence du vecteur flux de sable saturé moyenné dans le temps (intensité⟦1⟧, direction⟦2⟧) sur la sphère, ∇·q = [∂(q cos θ)/∂λ + ∂(q sin θ cos φ)/∂φ] / (R cos φ) avec q =⟦3⟧, θ =⟦4⟧, latitude φ, longitude λ et R = ⟦#0⟧ km, calculée par différences centrées sur la grille du jeu de données de vent sélectionné (⟦#1⟧° ou ⟦#2⟧°), d’après⟦5⟧, Méthodes⟦6⟧. Par conservation de la masse de sable, les valeurs négatives (convergence) traduisent un dépôt et les valeurs positives une érosion, en mètres de niveau du lit par millier d’années. Ces valeurs supposent un flux saturé et un apport illimité de sable meuble.

## c.c117cfda (About)
EN: <strong>Dune-field names</strong>: Displayed dune field names are derived from previously published academic research and data, regional knowledge, and internet searches. Naming conventions (language, jurisdiction, spelling, merging, etc.) were chosen for clarity but may be wrong or offend certain peoples. Please contact Andrew Gunn at <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> if you have any suggestions for changes, removals, or additions.
FR: <strong>Noms des champs de dunes</strong> : les noms de champs de dunes affichés sont issus de travaux et de données académiques déjà publiés, de connaissances régionales et de recherches sur Internet. Les conventions de dénomination (langue, juridiction, orthographe, regroupement, etc.) ont été choisies par souci de clarté, mais peuvent être erronées ou offenser certains peuples. Veuillez contacter Andrew Gunn à <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> si vous avez des suggestions de modifications, de suppressions ou d’ajouts.

## c.e1abc281 (About)
EN: Both atlases compute the same quantities with the methods outlined in⟦0⟧: the time-averaged saturated sand flux over a flat bed fully covered by loose sand (⟦1⟧), its resultant (⟦2⟧,⟦3⟧,⟦4⟧), crest fluxes, dune-orientation modes and flux divergence. Both report fluxes as volumes of packed sand (packing fraction ⟦#0⟧, pore space included) per metre width per Earth year of ⟦#1⟧ days (m²/yr), and both show wind roses as the direction the wind blows from and sand roses as the direction sand moves toward. They differ in four ways.
FR: Les deux atlas calculent les mêmes grandeurs selon les méthodes décrites dans⟦0⟧ : le flux de sable saturé moyenné dans le temps sur un lit plat entièrement recouvert de sable meuble (⟦1⟧), sa résultante (⟦2⟧,⟦3⟧,⟦4⟧), les flux de crête, les modes d’orientation des dunes et la divergence du flux. Tous deux expriment les flux en volumes de sable compacté (compacité ⟦#0⟧, espace poreux inclus) par mètre de largeur et par année terrestre de ⟦#1⟧ jours (m²/yr), et tous deux représentent les roses des vents selon la direction d’où souffle le vent et les roses des flux de sable selon la direction vers laquelle se déplace le sable. Ils diffèrent sur quatre points.

## c.8726a129 (About)
EN: Citing the map fields
FR: Citer les champs de la carte

## c.dd3ddd79 (About)
EN: <strong>⟦0⟧⟦#0⟧°</strong>: ⟦1⟧. Licence: ⟦2⟧.
FR: <strong>⟦0⟧⟦#0⟧°</strong> : ⟦1⟧. Licence : ⟦2⟧.

## c.ac07bd37 (About)
EN: ⟦0⟧/ dune map
FR: ⟦0⟧/ carte des dunes

## c.935e4396 (About)
EN: Paper: ⟦0⟧
FR: Article : ⟦0⟧

## c.b35fcfde (About)
EN: Data (wind histograms and sand-flux fields): ⟦0⟧
FR: Données (histogrammes de vent et champs de flux de sable) : ⟦0⟧

## c.11b8f814 (About)
EN: Data (dune map:⟦0⟧, contained in the⟦1⟧record): ⟦2⟧
FR: Données (carte des dunes :⟦0⟧, contenue dans l’enregistrement⟦1⟧) : ⟦2⟧

## c.e43657ea (About)
EN: Data: ⟦0⟧
FR: Données : ⟦0⟧

## c.85811cee (About)
EN: Contains modified⟦0⟧information (⟦1⟧, ⟦#0⟧–⟦#1⟧). Neither the European Commission nor⟦2⟧is responsible for any use that may be made of the⟦3⟧information or data it contains.
FR: Contient des informations⟦0⟧modifiées (⟦1⟧, ⟦#0⟧–⟦#1⟧). Ni la Commission européenne ni⟦2⟧ne sont responsables de l’usage qui pourrait être fait des informations⟦3⟧ou des données qu’elles contiennent.

## c.5b675aea (About)
EN: Global Aridity Index (⟦0⟧)
FR: Global Aridity Index (⟦0⟧)

## c.a60116c4 (About)
EN: Vegetation cover (⟦0⟧Fractional Cover v3.1)
FR: Couvert végétal (⟦0⟧Fractional Cover v3.1)

## c.6aa0a68b (About)
EN: Full monthly time series:⟦0⟧Map, <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">⟦1⟧</a>
FR: Série chronologique mensuelle complète :⟦0⟧Map, <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">⟦1⟧</a>

## c.1a6f67b1 (About)
EN: Contains modified⟦0⟧information. Basemap credits are shown in the map attribution.
FR: Contient des informations⟦0⟧modifiées. Les crédits des fonds de carte figurent dans l’attribution de la carte.

## c.3884b372 (About)
EN: To understand how the atlas is used, we count page visits and downloads by country, with Cloudflare Web Analytics and a small counter of our own. No cookies are set and no⟦0⟧addresses are kept.
FR: Afin de comprendre comment l’atlas est utilisé, nous comptabilisons les visites de pages et les téléchargements par pays, au moyen de Cloudflare Web Analytics et d’un petit compteur qui nous est propre. Aucun cookie n’est déposé et aucune adresse⟦0⟧n’est conservée.

# Screen-reader labels and tooltips

## c.ff5ee14a (Screen-reader labels and tooltips)
EN: Resize panel (drag, or use the arrow keys)
FR: Redimensionner le panneau (faire glisser ou utiliser les touches fléchées)

## c.a89ab2ab (Screen-reader labels and tooltips)
EN: Close cell panel
FR: Fermer le panneau de la cellule

# Cell panel

## c.ed60e8c1 (Cell panel)
EN: Loading⟦0⟧data for this cell…
FR: Chargement⟦0⟧des données de cette cellule…

## c.cd275e7b (Cell panel)
EN: Dunes present
FR: Dunes présentes

## c.f9cfdc68 (Cell panel)
EN: Threshold ⟦0⟧: <strong>⟦1⟧</strong>
FR: Seuil ⟦0⟧ : <strong>⟦1⟧</strong>

## c.ea559417 (Cell panel)
EN: Wind at ⟦#0⟧ m at the threshold: ≈ ⟦0⟧
FR: Vent à ⟦#0⟧ m au seuil : ≈ ⟦0⟧

## c.a5650846 (Cell panel)
EN: Wind rose
FR: Rose des vents

## c.2632e454 (Cell panel)
EN: Sectors
FR: Secteurs

## c.fcba0503 (Cell panel)
EN: Frequency of hourly ⟦#0⟧ m winds by the direction they blow from, ⟦#1⟧ sectors, stacked by speed class; ⟦#2⟧–⟦#3⟧; sums to ⟦#4⟧ %.
FR: Fréquence des vents horaires à ⟦#0⟧ m selon la direction d’où ils soufflent, ⟦#1⟧ secteurs, empilés par classe de vitesse ; ⟦#2⟧–⟦#3⟧ ; total de ⟦#4⟧ %.

## c.5d9e5efa (Cell panel)
EN: % of hours
FR: % des heures

## c.9f03a7d2 (Cell panel)
EN: Direction the wind blows FROM (meteorological), ⟦#0⟧ sectors of ⟦#1⟧°; radius = % of the ⟦#2⟧ counted hourly samples (sums to ⟦#3⟧ %; hours &gt; ⟦#4⟧ m/s are not in the histogram).⟦0⟧⟦#5⟧ m wind ⟦#6⟧–⟦#7⟧.
FR: Direction D’OÙ souffle le vent (météorologique), ⟦#0⟧ secteurs de ⟦#1⟧° ; rayon = % des ⟦#2⟧ échantillons horaires comptabilisés (total de ⟦#3⟧ % ; les heures &gt; ⟦#4⟧ m/s ne figurent pas dans l’histogramme).⟦0⟧Vent à ⟦#5⟧ m, ⟦#6⟧–⟦#7⟧.

# Screen-reader labels and tooltips

## c.aab9a2de (Screen-reader labels and tooltips)
EN: Export this plot (light theme, with data source and link)
FR: Exporter ce graphique (thème clair, avec la source des données et le lien)

# Cell panel

## c.e86349d3 (Cell panel)
EN: Export
FR: Exporter

## c.7193769a (Cell panel)
EN: ⟦0⟧ Transparent background
FR: ⟦0⟧ Fond transparent

## c.29c9bdfd (Cell panel)
EN: Sand flux rose (time-averaged, transport toward)
FR: Rose des flux de sable (moyennée dans le temps, transport vers)

## c.7789ddf5 (Cell panel)
EN: Flux ⟦0⟧
FR: Flux ⟦0⟧

# Screen-reader labels and tooltips

## c.6da97f0c (Screen-reader labels and tooltips)
EN: Flux rose mode
FR: Mode de la rose des flux

# Cell panel

## c.58919355 (Cell panel)
EN: Flat bed
FR: Lit plat

## c.1eeb99cc (Cell panel)
EN: Elongation (αE)
FR: Allongement (αE)

## c.36c18d9e (Cell panel)
EN: Transverse migration (αH)
FR: Migration transverse (αH)

# Screen-reader labels and tooltips

## c.0530e499 (Screen-reader labels and tooltips)
EN: Flux rose radial axis
FR: Axe radial de la rose des flux

# Cell panel

## c.6d1a8a4e (Cell panel)
EN: ⟦0⟧ % of total
FR: ⟦0⟧ % du total

# Screen-reader labels and tooltips

## c.1b0fc3f0 (Screen-reader labels and tooltips)
EN: Flux rose petal direction
FR: Direction des pétales de la rose des flux

# Cell panel

## c.e71fb327 (Cell panel)
EN: Time-averaged flat-bed sand flux by the direction sand moves toward, ⟦#0⟧ sectors of ⟦#1⟧ degrees, stacked by excess shear u*f/u*,th, percent of total flux, at u*,th ⟦#2⟧ m/s.
FR: Flux de sable sur lit plat moyenné dans le temps, selon la direction vers laquelle se déplace le sable, ⟦#0⟧ secteurs de ⟦#1⟧ degrés, empilés par excès de cisaillement u*f/u*,th, en pourcentage du flux total, pour u*,th ⟦#2⟧ m/s.

## c.04e86ff9 (Cell panel)
EN: αH (crest orientation, bed-instability mode): ⟦#0⟧° (axis)
FR: αH (orientation de la crête, mode d’instabilité du lit) : ⟦#0⟧° (axe)

## c.58e2a84e (Cell panel)
EN: % of total flux
FR: % du flux total

## c.8656e567 (Cell panel)
EN: ⟦#0⟧° (axis)
FR: ⟦#0⟧° (axe)

## c.531a7c8d (Cell panel)
EN: <span class="cap-lead"><strong>Flat bed</strong>: ⟦0⟧ = ⟦1⟧</span> Direction sand moves TOWARD; ⟦#0⟧ sectors of ⟦#1⟧°. Radius = % of the total flux in each sector (sums to ⟦#2⟧ %). Time-averaged saturated flat-bed flux (q from ⟦2⟧), Σ<sub>speed</sub> n·q / Σ<sub>all</sub> n from the wind histogram. Colours split each sector by the excess shear ⟦3⟧ of the winds carrying the flux (only ⟦4⟧ transports sand).⟦5⟧,⟦6⟧,⟦7⟧,⟦8⟧and the arrows are the map fields at this threshold; a direction is hidden where the flux defining it is zero.
FR: <span class="cap-lead"><strong>Lit plat</strong> : ⟦0⟧ = ⟦1⟧</span> Direction VERS laquelle se déplace le sable ; ⟦#0⟧ secteurs de ⟦#1⟧°. Rayon = % du flux total dans chaque secteur (somme : ⟦#2⟧ %). Flux saturé sur lit plat moyenné dans le temps (q d’après ⟦2⟧), Σ<sub>vitesse</sub> n·q / Σ<sub>total</sub> n à partir de l’histogramme des vents. Les couleurs subdivisent chaque secteur selon l’excès de cisaillement ⟦3⟧ des vents qui portent le flux (seul ⟦4⟧ transporte du sable).⟦5⟧,⟦6⟧,⟦7⟧,⟦8⟧et les flèches correspondent aux champs de la carte à ce seuil ; une direction est masquée là où le flux qui la définit est nul.

## c.85f6094f (Cell panel)
EN: Modes vs threshold (polar: angle = direction, radius = ⟦0⟧)
FR: Modes en fonction du seuil (polaire : angle = direction, rayon = ⟦0⟧)

# Screen-reader labels and tooltips

## c.2dbc70d1 (Screen-reader labels and tooltips)
EN: Polar plot of dune-orientation mode bearings (angle) against threshold friction velocity (radius, ⟦#0⟧ m/s at the centre to ⟦#1⟧ m/s at the rim)
FR: Diagramme polaire des azimuts des modes d’orientation des dunes (angle) en fonction de la vitesse de frottement seuil (rayon, de ⟦#0⟧ m/s au centre à ⟦#1⟧ m/s en bordure)

# Cell panel

## c.068b4cfe (Cell panel)
EN: radius: u*,th (m/s)
FR: rayon : u*,th (m/s)

## c.6e844047 (Cell panel)
EN: Drift potential⟦0⟧ vs threshold
FR: Potentiel de dérive⟦0⟧ en fonction du seuil

## c.dc80e435 (Cell panel)
EN: Plot ⟦0⟧
FR: Graphique ⟦0⟧

# Screen-reader labels and tooltips

## c.5c96f403 (Screen-reader labels and tooltips)
EN: Quantity plotted against the threshold
FR: Grandeur représentée en fonction du seuil

# Cell panel

## c.c4d7f978 (Cell panel)
EN: Flux directionality (RDP/DP)
FR: Directionnalité du flux (RDP/DP)

# Screen-reader labels and tooltips

## c.985d469b (Screen-reader labels and tooltips)
EN: Drift potential (DP) vs threshold
FR: Potentiel de dérive (DP) en fonction du seuil

# Cell panel

## c.dd4757c8 (Cell panel)
EN: <span class="cap-lead">At the current threshold: ⟦0⟧</span> Drift potential (⟦1⟧) of this cell for every threshold; dot and dashed line: current threshold. Triangles at the top or bottom edge: infinite ratio (its denominator, a net flux, is zero; ±⟦#0⟧ in the data), not plotted.
FR: <span class="cap-lead">Au seuil actuel : ⟦0⟧</span> Potentiel de dérive (⟦1⟧) de cette cellule pour chaque seuil ; point et ligne tiretée : seuil actuel. Triangles en bordure supérieure ou inférieure : rapport infini (son dénominateur, un flux net, est nul ; ±⟦#0⟧ dans les données), non représenté.

## c.a4c54ba4 (Cell panel)
EN: Cell summary at ⟦0⟧ = ⟦1⟧
FR: Résumé de la cellule à ⟦0⟧ = ⟦1⟧

## c.3a105ef1 (Cell panel)
EN: Symbol
FR: Symbole

## c.2bf732f8 (Cell panel)
EN: Quantity
FR: Grandeur

## c.d147f96a (Cell panel)
EN: Value
FR: Valeur

## c.81062dcd (Cell panel)
EN: ⟦#0⟧° <span class="unit">(bearing, toward)</span>
FR: ⟦#0⟧° <span class="unit">(azimut, vers)</span>

## c.8ebe5564 (Cell panel)
EN: ⟦#0⟧ <span class="unit">fraction (⟦#1⟧–⟦#2⟧)</span>
FR: ⟦#0⟧ <span class="unit">fraction (⟦#1⟧–⟦#2⟧)</span>

# Screen-reader labels and tooltips

## c.d9da59dc (Screen-reader labels and tooltips)
EN: Negative values (flux convergence) imply deposition
FR: Les valeurs négatives (convergence du flux) impliquent un dépôt

# Cell panel

## c.d169cc9f (Cell panel)
EN: ⟦#0⟧° <span class="unit">(axis, ⟦#1⟧–⟦#2⟧)</span>
FR: ⟦#0⟧° <span class="unit">(axe, ⟦#1⟧–⟦#2⟧)</span>

# Screen-reader labels and tooltips

## c.6382f602 (Screen-reader labels and tooltips)
EN: Cell mean, threshold-independent; ⟦#0⟧ % of cell valid, ⟦#1⟧ % saturated
FR: Moyenne sur la cellule, indépendante du seuil ; ⟦#0⟧ % de la cellule valide, ⟦#1⟧ % saturée

## c.3d735122 (Screen-reader labels and tooltips)
EN: Some pixels are at the source saturation value ⟦#0⟧, so the mean is a lower bound
FR: Certains pixels sont à la valeur de saturation de la source ⟦#0⟧, la moyenne est donc une borne inférieure

# Cell panel

## c.7b8c5d3b (Cell panel)
EN: ≥ ⟦#0⟧ <span class="unit">(arid)</span>
FR: ≥ ⟦#0⟧ <span class="unit">(aride)</span>

## c.e90a7bd5 (Cell panel)
EN: Cell
FR: Cellule

# Screen-reader labels and tooltips

## c.14e8021b (Screen-reader labels and tooltips)
EN: Yes: the cell overlaps at least one ⟦#0⟧° dune cell of the dune map (Gunn ⟦#1⟧)
FR: Oui : la cellule chevauche au moins une cellule de dunes de ⟦#0⟧° de la carte des dunes (Gunn ⟦#1⟧)

# Cell panel

## c.4e9f3590 (Cell panel)
EN: yes
FR: oui

# Screen-reader labels and tooltips

## c.2410610b (Screen-reader labels and tooltips)
EN: Latitude, longitude of the cell centre
FR: Latitude, longitude du centre de la cellule

# Cell panel

## c.7a7dbf8c (Cell panel)
EN: Cell centre
FR: Centre de la cellule

## c.f42590f9 (Cell panel)
EN: Angles are compass bearings of the transport direction; fluxes converted from m²/s to m²/yr; — = not defined (e.g. no crest flux).
FR: Les angles sont des azimuts de la direction du transport ; les flux sont convertis de m²/s en m²/yr ; — = non défini (p. ex. aucun flux de crête).

# Screen-reader labels and tooltips

## c.4598f0fa (Screen-reader labels and tooltips)
EN: Wind histogram, all fields vs threshold, flux roses and metadata in one NetCDF-⟦#0⟧ file (CF-⟦#1⟧)
FR: Histogramme du vent, tous les champs en fonction du seuil, roses des flux et métadonnées dans un seul fichier NetCDF-⟦#0⟧ (CF-⟦#1⟧)

## c.f163afcc (Screen-reader labels and tooltips)
EN: wind_histogram.csv, fields_by_threshold.csv, flux_rose.csv, rose_16_sectors.csv (⟦#0⟧ sectors, degrees), metadata.json and README.txt
FR: wind_histogram.csv, fields_by_threshold.csv, flux_rose.csv, rose_16_sectors.csv (⟦#0⟧ secteurs, degrés), metadata.json et README.txt

# Cell panel

## c.b46e7304 (Cell panel)
EN: ⟦0⟧bundle (.zip)
FR: Archive⟦0⟧(.zip)

# Screen-reader labels and tooltips

## c.a15445e7 (Screen-reader labels and tooltips)
EN: Citation text file
FR: Fichier texte de la citation

# Cell panel

## c.3d8b79ca (Cell panel)
EN: Citation (⟦0⟧)
FR: Citation (⟦0⟧)

# Screen-reader labels and tooltips

## c.94cd08c5 (Screen-reader labels and tooltips)
EN: Copy the citation text to the clipboard
FR: Copier le texte de la citation dans le presse-papiers

# Cell panel

## c.e4f8fbe5 (Cell panel)
EN: Copy citation
FR: Copier la citation

## c.9a9cfc21 (Cell panel)
EN: Get the whole grid
FR: Obtenir la grille complète

## c.94880c62 (Cell panel)
EN: The atlas reads public⟦0⟧(v3) stores on <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a>, which anyone can read, e.g. with Python. The map fields of⟦1⟧⟦#0⟧° are one store per variable, each holding the field against the threshold friction velocity (⟦2⟧, ⟦#1⟧ values) and latitude ⟦3⟧ and longitude ⟦4⟧ (cell centres in degrees; x from ⟦#2⟧ to ⟦#3⟧°, east positive). Level ⟦5⟧ of each store is the full-resolution grid; levels ⟦#4⟧, ⟦#5⟧, … are coarser copies for the map.
FR: L’atlas lit des dépôts⟦0⟧(v3) publics sur <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a>, accessibles à tous, par exemple avec Python. Les champs cartographiques de⟦1⟧⟦#0⟧° sont stockés à raison d’un dépôt par variable, chacun contenant le champ en fonction de la vitesse de frottement seuil (⟦2⟧, ⟦#1⟧ valeurs), de la latitude ⟦3⟧ et de la longitude ⟦4⟧ (centres des cellules en degrés ; x de ⟦#2⟧ à ⟦#3⟧°, positif vers l’est). Le niveau ⟦5⟧ de chaque dépôt correspond à la grille à pleine résolution ; les niveaux ⟦#4⟧, ⟦#5⟧, … en sont des copies plus grossières destinées à la carte.

## c.826bac69 (Cell panel)
EN: Copy code
FR: Copier le code

## c.c7598ba3 (Cell panel)
EN: Variables (replace ⟦0⟧ in the⟦1⟧): ⟦2⟧, ⟦3⟧, ⟦4⟧, ⟦5⟧, ⟦6⟧, ⟦7⟧, ⟦8⟧, ⟦9⟧, ⟦10⟧, ⟦11⟧, ⟦12⟧, ⟦13⟧, ⟦14⟧, ⟦15⟧, ⟦16⟧, ⟦17⟧, ⟦18⟧, ⟦19⟧, ⟦20⟧, ⟦21⟧, ⟦22⟧, ⟦23⟧, ⟦24⟧, ⟦25⟧. Per-cell data of the cell panel: ⟦26⟧ (layout: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦27⟧</a>).
FR: Variables (remplacer ⟦0⟧ dans le⟦1⟧) : ⟦2⟧, ⟦3⟧, ⟦4⟧, ⟦5⟧, ⟦6⟧, ⟦7⟧, ⟦8⟧, ⟦9⟧, ⟦10⟧, ⟦11⟧, ⟦12⟧, ⟦13⟧, ⟦14⟧, ⟦15⟧, ⟦16⟧, ⟦17⟧, ⟦18⟧, ⟦19⟧, ⟦20⟧, ⟦21⟧, ⟦22⟧, ⟦23⟧, ⟦24⟧, ⟦25⟧. Données par cellule du panneau de cellule : ⟦26⟧ (structure : <a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦27⟧</a>).

## c.ce1afc80 (Cell panel)
EN: Licence of these map fields:⟦0⟧(⟦1⟧Supplementary Data). Licences of every store: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦2⟧</a>. Please cite the sources listed under Download &amp; cite.
FR: Licence de ces champs cartographiques :⟦0⟧(⟦1⟧données supplémentaires). Licences de chaque dépôt : <a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦2⟧</a>. Veuillez citer les sources indiquées sous Télécharger et citer.

## c.bf82bd88 (Cell panel)
EN: infinite (⟦#0⟧ in the data).
FR: infini (⟦#0⟧ dans les données).

## c.4d123ca2 (Cell panel)
EN: Cell ⟦#0⟧, ⟦#1⟧
FR: Cellule ⟦#0⟧, ⟦#1⟧

# Other interface

## c.b316e3ad (Other interface)
EN: Outside the⟦0⟧land mask
FR: En dehors du masque des terres⟦0⟧

## c.3d5c01ad (Other interface)
EN: ⟦#0⟧° cell: row ⟦#1⟧, column ⟦#2⟧; centre ⟦#3⟧°S, ⟦#4⟧°E.
FR: Cellule de ⟦#0⟧° : ligne ⟦#1⟧, colonne ⟦#2⟧ ; centre ⟦#3⟧°S, ⟦#4⟧°E.

# Other

## c.4f6e56eb (Other)
EN: Switch to Mars
FR: Passer à Mars

# Screen-reader labels and tooltips

## c.cd86acc3 (Screen-reader labels and tooltips)
EN: Close
FR: Fermer

# Tool panels

## c.3be5a9ed (Tool panels)
EN: Share this view
FR: Partager cette vue

# Screen-reader labels and tooltips

## c.b03ebc37 (Screen-reader labels and tooltips)
EN: Link to this view
FR: Lien vers cette vue

# Tool panels

## c.23f990dc (Tool panels)
EN: Copy link
FR: Copier le lien

## c.db531243 (Tool panels)
EN: The link restores the position, zoom, wind dataset, threshold, basemap, active layers and the selected cell.
FR: Le lien restaure la position, le zoom, le jeu de données de vent, le seuil, le fond de carte, les calques actifs et la cellule sélectionnée.

# Other interface

## c.3887d7d3 (Other interface)
EN: Link copied
FR: Lien copié

# Tool panels

## c.46af3291 (Tool panels)
EN: ⟦0⟧ Include basemap
FR: ⟦0⟧ Inclure le fond de carte

## c.e695bc35 (Tool panels)
EN: ⟦0⟧ Transparent background (default white)
FR: ⟦0⟧ Fond transparent (blanc par défaut)

## c.963b6004 (Tool panels)
EN: ⟦0⟧of the current view, ⟦#0⟧–⟦#1⟧ pixels wide, without the panels, on a white background unless Transparent background is ticked. Colour bars, legends, scale and data sources are added below the map.
FR: ⟦0⟧de la vue actuelle, de ⟦#0⟧–⟦#1⟧ pixels de large, sans les panneaux, sur fond blanc sauf si Fond transparent est coché. Les barres de couleur, les légendes, l’échelle et les sources des données sont ajoutées sous la carte.

## c.f1d747de (Tool panels)
EN: Export⟦0⟧
FR: Exporter⟦0⟧

# Screen-reader labels and tooltips

## c.76ffaf4f (Screen-reader labels and tooltips)
EN: Rendering…
FR: Rendu en cours…

## c.30a14bad (Screen-reader labels and tooltips)
EN: Best viewed full screen: opens this view in a new tab
FR: Affichage optimal en plein écran : ouvre cette vue dans un nouvel onglet

# Other interface

## c.a09f6b17 (Other interface)
EN: Open full screen ↗
FR: Ouvrir en plein écran ↗

## c.84ba782e (Other interface)
EN: Best viewed full screen
FR: Affichage optimal en plein écran

# Screen-reader labels and tooltips

## c.0ba4b6a4 (Screen-reader labels and tooltips)
EN: MCMC FV3 ⟦#0⟧°, one Mars year (6th simulated year, ⟦#1⟧ sols)
FR: MCMC FV3 ⟦#0⟧°, une année martienne (6e année simulée, ⟦#1⟧ sols)

## c.5b8eff97 (Screen-reader labels and tooltips)
EN: Reset to the default ⟦#0⟧ µm
FR: Rétablir la valeur par défaut de ⟦#0⟧ µm

# Layer panel

## c.f2de880e (Layer panel)
EN: default ⟦#0⟧ µm
FR: par défaut ⟦#0⟧ µm

# Layer popovers

## c.01554ec1 (Layer popovers)
EN: ⟦#0⟧ log-spaced values from ⟦#1⟧ µm to ⟦#2⟧ µm; default ⟦#3⟧ µm (the mark under the slider). The compact copy at the top of the cell panel sets the same value.
FR: ⟦#0⟧ valeurs espacées logarithmiquement de ⟦#1⟧ µm à ⟦#2⟧ µm ; valeur par défaut ⟦#3⟧ µm (le repère sous le curseur). La copie compacte en haut du panneau de cellule règle la même valeur.

# Screen-reader labels and tooltips

## c.0068eba5 (Screen-reader labels and tooltips)
EN: Invert: colour the areas WITHOUT mapped dunes instead of the dunes.
FR: Inverser : colorer les zones SANS dunes cartographiées au lieu des dunes.

# Layer panel

## c.a524d750 (Layer panel)
EN: ⟦0⟧ invert (areas without dunes)
FR: ⟦0⟧ inverser (zones sans dunes)

# Screen-reader labels and tooltips

## c.227e780e (Screen-reader labels and tooltips)
EN: Invert: colour areas without dunes
FR: Inverser : colorer les zones sans dunes

# Layer popovers

## c.5e016412 (Layer popovers)
EN: Mapped aeolian dune fields of Mars: the⟦0⟧⟦1⟧(⟦2⟧; equatorial⟦3⟧, north polar⟦4⟧, south polar⟦5⟧;⟦6⟧) plus the small dune fields of⟦7⟧, merged into ⟦#0⟧ polygons (⟦#1⟧ km²).⟦8⟧maps fields larger than ⟦#2⟧ km²; ⟦#3⟧ polygons are smaller (⟦9⟧). Equatorward of ⟦#4⟧°: ⟦#5⟧ polygons, ⟦#6⟧ km² (⟦10⟧and⟦11⟧).
FR: Champs de dunes éoliennes cartographiés sur Mars : le⟦0⟧⟦1⟧(⟦2⟧; équatorial⟦3⟧, polaire nord⟦4⟧, polaire sud⟦5⟧;⟦6⟧) ainsi que les petits champs de dunes de⟦7⟧, fusionnés en ⟦#0⟧ polygones (⟦#1⟧ km²).⟦8⟧cartographie les champs de plus de ⟦#2⟧ km² ; ⟦#3⟧ polygones sont plus petits (⟦9⟧). À moins de ⟦#4⟧° de l’équateur : ⟦#5⟧ polygones, ⟦#6⟧ km² (⟦10⟧et⟦11⟧).

## c.2cb30509 (Layer popovers)
EN: Dune fields are named after the IAU-approved names of the features they lie in, from the <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">Gazetteer of Planetary Nomenclature</a> (⟦0⟧); undae are⟦1⟧names for dune fields themselves. A few informal names are included as aliases.
FR: Les champs de dunes portent les noms approuvés par l’IAU des formations dans lesquelles ils se trouvent, tirés du <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">Gazetteer of Planetary Nomenclature</a> (⟦0⟧) ; les undae sont des noms⟦1⟧qui désignent les champs de dunes eux-mêmes. Quelques noms informels sont inclus en tant qu’alias.

## c.b0aa5392 (Layer popovers)
EN: ⟦0⟧⟦1⟧(⟦2⟧) and⟦3⟧, merged, compiled by A. Gunn
FR: ⟦0⟧⟦1⟧(⟦2⟧) et⟦3⟧, fusionnés, compilés par A. Gunn

## c.7c3bca61 (Layer popovers)
EN: ⟦0⟧and⟦1⟧merged into one polygon layer; invalid geometries repaired; coordinates rounded to 1e-⟦#0⟧°.
FR: ⟦0⟧et⟦1⟧fusionnés en un seul calque de polygones ; géométries invalides corrigées ; coordonnées arrondies à 1e-⟦#0⟧°.

## c.bf621ba4 (Layer popovers)
EN: ⟦0⟧⟦#0⟧°, one Mars year (6th simulated year, ⟦#1⟧ sols)
FR: ⟦0⟧⟦#0⟧°, une année martienne (6e année simulée, ⟦#1⟧ sols)

## c.7fc88287 (Layer popovers)
EN: Updates with the grain-diameter ⟦0⟧ control.
FR: Se met à jour avec la commande du diamètre des grains ⟦0⟧.

## c.2a037b62 (Layer popovers)
EN: Independent of the grain diameter: not affected by the ⟦0⟧ control.
FR: Indépendant du diamètre des grains : non affecté par la commande ⟦0⟧.

## c.9ebf3d9d (Layer popovers)
EN: ⟦0⟧Ames⟦1⟧output; no licence stated (⟦2⟧open data)
FR: Sorties⟦0⟧Ames⟦1⟧; aucune licence indiquée (⟦2⟧données ouvertes)

## c.eec05683 (Layer popovers)
EN: Elevation⟦0⟧of the surface relative to the Mars areoid (⟦1⟧datum), from the Mars⟦2⟧–⟦3⟧Blended⟦4⟧Global 200m v2. The colour scale saturates beyond its ends (Olympus Mons ⟦#0⟧ km, Hellas ⟦#1⟧ km).
FR: Altitude⟦0⟧de la surface par rapport à l’aréoïde martien (niveau de référence⟦1⟧), d’après le Mars⟦2⟧–⟦3⟧Blended⟦4⟧Global 200m v2. L’échelle de couleurs sature au-delà de ses bornes (Olympus Mons ⟦#0⟧ km, Hellas ⟦#1⟧ km).

## c.1c27de48 (Layer popovers)
EN: Mars⟦0⟧–⟦1⟧Blended⟦2⟧Global 200m v2 (⟦3⟧; originators⟦4⟧,⟦5⟧,⟦6⟧; publication date ⟦#0⟧-⟦#1⟧-⟦#2⟧)
FR: Mars⟦0⟧–⟦1⟧Blended⟦2⟧Global 200m v2 (⟦3⟧; auteurs⟦4⟧,⟦5⟧,⟦6⟧; date de publication ⟦#0⟧-⟦#1⟧-⟦#2⟧)

## c.e98bd889 (Layer popovers)
EN: ⟦0⟧(⟦1⟧),⟦2⟧(⟦3⟧). Derived elevation and relief tiles:⟦4⟧.
FR: ⟦0⟧(⟦1⟧),⟦2⟧(⟦3⟧). Tuiles d’altitude et de relief dérivées :⟦4⟧.

## c.eee562e1 (Layer popovers)
EN: Area mean over ⟦#0⟧/⟦#1⟧° (~⟦#2⟧ km) pixels of the ⟦#3⟧ m⟦0⟧, rounded to ⟦#4⟧ m; zoomed-out map views show means (≤ ⟦#5⟧ m rounding).
FR: Moyenne surfacique sur des pixels de ⟦#0⟧/⟦#1⟧° (~⟦#2⟧ km) du ⟦#3⟧ m⟦0⟧, arrondie à ⟦#4⟧ m ; aux échelles de carte plus petites (vue éloignée), des moyennes sont affichées (arrondi ≤ ⟦#5⟧ m).

## c.3704a8f0 (Layer popovers)
EN: Shaded relief of the⟦0⟧blended elevation model.
FR: Relief ombré du modèle d’altitude⟦0⟧fusionné.

## c.db6c76a7 (Layer popovers)
EN: Mars⟦0⟧–⟦1⟧Blended⟦2⟧Global 200m v2 (⟦3⟧; Fergason,⟦4⟧)
FR: Mars⟦0⟧–⟦1⟧Blended⟦2⟧Global 200m v2 (⟦3⟧; Fergason,⟦4⟧)

## c.2d12b94c (Layer popovers)
EN: ⟦#0⟧ m⟦0⟧, shown at up to about ⟦#1⟧ m per pixel at the equator
FR: ⟦#0⟧ m⟦0⟧, affiché jusqu’à environ ⟦#1⟧ m par pixel à l’équateur

## c.2e1c0f7e (Layer popovers)
EN: ⟦0⟧basemap of Mars: shaded relief and colour with feature names.
FR: Fond de carte⟦0⟧de Mars : relief ombré et couleur avec les toponymes.

## c.644998c7 (Layer popovers)
EN: ⟦0⟧/⟦1⟧; data⟦2⟧(⟦3⟧),⟦4⟧(⟦5⟧),⟦6⟧
FR: ⟦0⟧/⟦1⟧ ; données⟦2⟧(⟦3⟧),⟦4⟧(⟦5⟧),⟦6⟧

## c.8540dd31 (Layer popovers)
EN: ⟦0⟧terms (see link);⟦1⟧and⟦2⟧data in the public domain
FR: Conditions d’utilisation⟦0⟧(voir le lien) ; données⟦1⟧et⟦2⟧relevant du domaine public

## c.ee2e3cf3 (Layer popovers)
EN: Global greyscale mosaic of Context Camera (⟦0⟧) images of⟦1⟧.
FR: Mosaïque globale en niveaux de gris d’images de la Context Camera (⟦0⟧) de⟦1⟧.

## c.dcf459d8 (Layer popovers)
EN: ⟦0⟧⟦1⟧(The⟦2⟧, Caltech;⟦3⟧),⟦4⟧service⟦5⟧
FR: ⟦0⟧⟦1⟧(The⟦2⟧, Caltech ;⟦3⟧),⟦4⟧service⟦5⟧

## c.4bee0614 (Layer popovers)
EN: About ⟦#0⟧ m per pixel
FR: Environ ⟦#0⟧ m par pixel

## c.297b433e (Layer popovers)
EN: Free use for all purposes, credit NASA/JPL/MSSS/The⟦0⟧;⟦1⟧service under the⟦2⟧/ Terms of Use
FR: Utilisation libre à toutes fins, avec mention NASA/JPL/MSSS/The⟦0⟧ ;⟦1⟧service régi par⟦2⟧/ les conditions d’utilisation

## c.2624acaf (Layer popovers)
EN: ⟦0⟧images of⟦1⟧, where⟦2⟧has imaged (a small part of the surface); elsewhere the map is dark.
FR: Images⟦0⟧de⟦1⟧, là où⟦2⟧a acquis des images (une petite partie de la surface) ; ailleurs, la carte est sombre.

## c.95f469ee (Layer popovers)
EN: ⟦0⟧(⟦1⟧/⟦2⟧/⟦3⟧),⟦4⟧service⟦5⟧
FR: ⟦0⟧(⟦1⟧/⟦2⟧/⟦3⟧),⟦4⟧service⟦5⟧

## c.56370639 (Layer popovers)
EN: Down to about ⟦#0⟧ cm per pixel; sparse coverage
FR: Jusqu’à environ ⟦#0⟧ cm par pixel ; couverture éparse

## c.c549e23b (Layer popovers)
EN: Coverage
FR: Couverture

## c.81e9bb01 (Layer popovers)
EN: ⟦0⟧footprints between about ⟦#0⟧° S and ⟦#1⟧° N; no imagery at higher latitudes in this mosaic (⟦1⟧).
FR: Emprises⟦0⟧entre environ ⟦#0⟧° S et ⟦#1⟧° N ; aucune image aux latitudes plus élevées dans cette mosaïque (⟦1⟧).

## c.4a0cf606 (Layer popovers)
EN: Public domain (⟦0⟧images);⟦1⟧service under the⟦2⟧/ Terms of Use
FR: Domaine public (images⟦0⟧) ; service⟦1⟧soumis au⟦2⟧/ aux conditions d’utilisation

## c.e7debcd9 (Layer popovers)
EN: Colorized global mosaic of Viking Orbiter images.
FR: Mosaïque globale colorisée d’images des orbiteurs Viking.

## c.8ec61eb6 (Layer popovers)
EN: ⟦0⟧Colorized Global Mosaic (⟦1⟧/⟦2⟧/⟦3⟧),⟦4⟧service⟦5⟧
FR: ⟦0⟧Colorized Global Mosaic (⟦1⟧/⟦2⟧/⟦3⟧), service⟦4⟧⟦5⟧

## c.773da507 (Layer popovers)
EN: About ⟦#0⟧ m per pixel (⟦#1⟧/⟦#2⟧°)
FR: Environ ⟦#0⟧ m par pixel (⟦#1⟧/⟦#2⟧°)

## c.a5d6c844 (Layer popovers)
EN: Public domain (⟦0⟧);⟦1⟧service under the⟦2⟧/ Terms of Use
FR: Domaine public (⟦0⟧) ; service⟦1⟧régi par le⟦2⟧/ les conditions d’utilisation

## c.d62fb31c (Layer popovers)
EN: Colour-coded shaded relief of the⟦0⟧blended elevation model.
FR: Relief ombré codé en couleur du modèle d’altitude⟦0⟧fusionné.

## c.7ab4f976 (Layer popovers)
EN: ⟦0⟧colorized shaded relief (⟦1⟧, from the Mars⟦2⟧–⟦3⟧Blended⟦4⟧Global 200m v2),⟦5⟧service MColorDEM
FR: Relief ombré colorisé⟦0⟧(⟦1⟧, d’après le Mars⟦2⟧–⟦3⟧Blended⟦4⟧Global 200m v2), service⟦5⟧MColorDEM

## c.6022c5f5 (Layer popovers)
EN: ⟦#0⟧ m⟦0⟧, shown at up to about ⟦#1⟧ m per pixel
FR: ⟦#0⟧ m⟦0⟧, affiché jusqu’à environ ⟦#1⟧ m par pixel

## c.5dbbfa26 (Layer popovers)
EN: Public domain (⟦0⟧); cite the⟦1⟧(Fergason,⟦2⟧);⟦3⟧service under the⟦4⟧/ Terms of Use
FR: Domaine public (⟦0⟧) ; citer le⟦1⟧(Fergason,⟦2⟧) ; service⟦3⟧soumis aux⟦4⟧/ conditions d’utilisation

# About

## c.63c884fd (About)
EN: Click any cell to see its wind rose over the Mars year of the wind dataset, the sand-flux rose at the selected grain diameter, dune-orientation modes and all wind-regime parameters.
FR: Cliquez sur n’importe quelle cellule pour afficher sa rose des vents sur l’année martienne du jeu de données de vent, la rose des flux de sable au diamètre de grain sélectionné, les modes d’orientation des dunes et tous les paramètres du régime des vents.

## c.5d754cff (About)
EN: <strong>Elevation and shaded relief</strong>:⟦0⟧–⟦1⟧blended⟦2⟧, ⟦#0⟧ m, v2 (Fergason,⟦3⟧,⟦4⟧); licence:⟦5⟧(⟦6⟧) and⟦7⟧(⟦8⟧). Derived elevation and relief tiles:⟦9⟧.
FR: <strong>Altitude et relief ombré</strong> :⟦0⟧–⟦1⟧fusionné⟦2⟧, ⟦#0⟧ m, v2 (Fergason,⟦3⟧,⟦4⟧) ; licence :⟦5⟧(⟦6⟧) et⟦7⟧(⟦8⟧). Tuiles d’altitude et de relief dérivées :⟦9⟧.

## c.530a3afd (About)
EN: <strong>Dune-field names</strong>: Dune fields are named after the IAU-approved names of the features they lie in, from the <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">Gazetteer of Planetary Nomenclature</a> (⟦0⟧); undae are⟦1⟧names for dune fields themselves. A few informal names are included as aliases.
FR: <strong>Noms des champs de dunes</strong> : les champs de dunes portent les noms approuvés par l’IAU des formations dans lesquelles ils se trouvent, d’après le <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">Gazetteer of Planetary Nomenclature</a> (⟦0⟧) ; les undae sont des noms⟦1⟧désignant les champs de dunes eux-mêmes. Quelques noms informels sont inclus comme alias.

## c.50055b7f (About)
EN: Mars⟦0⟧(method)
FR: Mars⟦0⟧(méthode)

## c.89d524a5 (About)
EN: Method (wind-regime and dune-orientation fields): ⟦0⟧
FR: Méthode (champs du régime des vents et de l’orientation des dunes) : ⟦0⟧

## c.72a649e1 (About)
EN: Mars wind series, sand-flux fields and flux divergence computed for the Mars⟦0⟧from the⟦1⟧lowest-level winds with the transport law of⟦2⟧and the methods outlined in⟦3⟧.
FR: Séries de vent martiennes, champs de flux de sable et divergence du flux calculés pour le Mars⟦0⟧à partir des vents du niveau le plus bas de⟦1⟧avec la loi de transport de⟦2⟧et les méthodes décrites dans⟦3⟧.

## c.a9bc77d4 (About)
EN: ⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧
FR: ⟦0⟧Mars⟦1⟧, version bêta ⟦#0⟧

## c.c020e5a4 (About)
EN: Model physics: ⟦0⟧
FR: Physique du modèle : ⟦0⟧

## c.8311cdd3 (About)
EN: Sediment transport law
FR: Loi de transport sédimentaire

## c.ba79a508 (About)
EN: Mars dune map (⟦0⟧⟦1⟧and⟦2⟧, merged)
FR: Carte des dunes de Mars (⟦0⟧⟦1⟧et⟦2⟧, fusionnées)

## c.4f0fafb8 (About)
EN: Topography (⟦0⟧blended⟦1⟧)
FR: Topographie (⟦0⟧fusionnée⟦1⟧)

## c.900a3648 (About)
EN: Basemap credits are shown in the map attribution.
FR: Les crédits des fonds de carte figurent dans l’attribution de la carte.

# Cell panel

## c.4a5374ef (Cell panel)
EN: Grain diameter ⟦0⟧: <strong>⟦1⟧</strong>
FR: Diamètre des grains ⟦0⟧ : <strong>⟦1⟧</strong>

## c.85102ae2 (Cell panel)
EN: Threshold ⟦0⟧, median over the hours: <strong>⟦1⟧</strong>
FR: Seuil ⟦0⟧, médiane sur les heures : <strong>⟦1⟧</strong>

## c.8d0e4128 (Cell panel)
EN: ⟦0⟧, ⟦#0⟧–⟦#1⟧ % of the hours: ⟦1⟧
FR: ⟦0⟧, ⟦#0⟧–⟦#1⟧ % des heures : ⟦1⟧

## c.51b43106 (Cell panel)
EN: Lowest-level wind at threshold (median height ⟦#0⟧ m): ≈ ⟦0⟧
FR: Vent au niveau le plus bas au seuil (hauteur médiane ⟦#0⟧ m) : ≈ ⟦0⟧

## c.de02b143 (Cell panel)
EN: Hours above threshold: ⟦0⟧
FR: Heures au-dessus du seuil : ⟦0⟧

## c.bd1de494 (Cell panel)
EN: Frequency of the hourly lowest-level winds by the direction they blow from, ⟦#0⟧ sectors, stacked by speed class; one Mars year; sums to ⟦#1⟧ %.
FR: Fréquence des vents horaires au niveau le plus bas selon la direction d’où ils soufflent, ⟦#0⟧ secteurs, empilés par classe de vitesse ; une année martienne ; total de ⟦#1⟧ %.

## c.55fb0a53 (Cell panel)
EN: m/s, lowest model level
FR: m/s, niveau le plus bas du modèle

## c.54424ba2 (Cell panel)
EN: Direction the wind blows FROM (meteorological), ⟦#0⟧ sectors of ⟦#1⟧°; radius = % of the ⟦#2⟧ hourly samples (sums to ⟦#3⟧ %).⟦0⟧lowest-level wind (height in this cell ⟦#4⟧–⟦#5⟧ m), one Mars year (6th simulated year, ⟦#6⟧ sols).
FR: Direction D’OÙ souffle le vent (convention météorologique), ⟦#0⟧ secteurs de ⟦#1⟧° ; rayon = % des ⟦#2⟧ échantillons horaires (total de ⟦#3⟧ %).⟦0⟧vent au niveau le plus bas (hauteur dans cette cellule ⟦#4⟧–⟦#5⟧ m), une année martienne (6e année simulée, ⟦#6⟧ sols).

## c.705e31ee (Cell panel)
EN: Time-averaged flat-bed sand flux by the direction sand moves toward, ⟦#0⟧ sectors of ⟦#1⟧ degrees, stacked by excess shear u*/u*,th of each hour, percent of total flux, at grain diameter d = ⟦#2⟧ µm.
FR: Flux de sable sur lit plat moyenné dans le temps, selon la direction vers laquelle se déplace le sable, ⟦#0⟧ secteurs de ⟦#1⟧ degrés, empilés par excès de cisaillement u*/u*,th de chaque heure, en pourcentage du flux total, pour un diamètre des grains d = ⟦#2⟧ µm.

## c.94bd0d74 (Cell panel)
EN: <span class="cap-lead"><strong>Flat bed</strong>: ⟦0⟧ = ⟦1⟧</span> Direction sand moves TOWARD; ⟦#0⟧ sectors of ⟦#1⟧°. Radius = % of the total flux in each sector (sums to ⟦#2⟧ %). Time-averaged saturated flat-bed flux (q from ⟦2⟧), Σ<sub>hours</sub> q / N over the ⟦#3⟧ hourly samples, with ⟦3⟧ of each hour from the lowest-level wind at its height z (smooth-wall mixing-length profile,⟦4⟧eq. ⟦#4⟧) and the threshold ⟦5⟧ of each hour from ⟦6⟧ and that hour's air density and temperature. Colours split each sector by the excess shear ⟦7⟧ of the hours carrying the flux (only ⟦8⟧ transports sand).⟦9⟧,⟦10⟧,⟦11⟧,⟦12⟧and the arrows are the map fields at this grain diameter; a direction is hidden where the flux defining it is zero.
FR: <span class="cap-lead"><strong>Lit plat</strong> : ⟦0⟧ = ⟦1⟧</span> Direction VERS laquelle se déplace le sable ; ⟦#0⟧ secteurs de ⟦#1⟧°. Rayon = % du flux total dans chaque secteur (total de ⟦#2⟧ %). Flux saturé sur lit plat moyenné dans le temps (q d’après ⟦2⟧), Σ<sub>heures</sub> q / N sur les ⟦#3⟧ échantillons horaires, avec ⟦3⟧ de chaque heure déduite du vent au niveau le plus bas à sa hauteur z (profil de longueur de mélange pour paroi lisse,⟦4⟧éq. ⟦#4⟧) et le seuil ⟦5⟧ de chaque heure déduit de ⟦6⟧ ainsi que de la masse volumique et de la température de l’air à cette heure. Les couleurs divisent chaque secteur selon l’excès de cisaillement ⟦7⟧ des heures qui portent le flux (seul ⟦8⟧ transporte du sable).⟦9⟧,⟦10⟧,⟦11⟧,⟦12⟧et les flèches correspondent aux champs de la carte pour ce diamètre des grains ; une direction est masquée là où le flux qui la définit est nul.

## c.92c30d6e (Cell panel)
EN: Modes vs grain diameter (polar: angle = direction, radius = ⟦0⟧, log scale)
FR: Modes en fonction du diamètre des grains (polaire : angle = direction, rayon = ⟦0⟧, échelle logarithmique)

# Screen-reader labels and tooltips

## c.0741b547 (Screen-reader labels and tooltips)
EN: Polar plot of dune-orientation mode bearings (angle) against median grain diameter (radius, log scale, ⟦#0⟧ µm at the centre to ⟦#1⟧ µm at the rim)
FR: Diagramme polaire des azimuts des modes d’orientation des dunes (angle) en fonction du diamètre médian des grains (rayon, échelle logarithmique, de ⟦#0⟧ µm au centre à ⟦#1⟧ µm en périphérie)

# Cell panel

## c.830d966e (Cell panel)
EN: radius: d (µm, log scale)
FR: rayon : d (µm, échelle logarithmique)

## c.78ee9922 (Cell panel)
EN: Drift potential⟦0⟧ vs grain diameter
FR: Potentiel de dérive⟦0⟧ en fonction du diamètre des grains

# Screen-reader labels and tooltips

## c.d092fe06 (Screen-reader labels and tooltips)
EN: Quantity plotted against the grain diameter
FR: Grandeur représentée en fonction du diamètre des grains

# Cell panel

## c.28791e51 (Cell panel)
EN: Median threshold friction velocity (u*,th)
FR: Vitesse de frottement seuil médiane (u*,th)

# Screen-reader labels and tooltips

## c.20d1128e (Screen-reader labels and tooltips)
EN: Drift potential (DP) vs grain diameter
FR: Potentiel de dérive (DP) en fonction du diamètre des grains

# Cell panel

## c.50a517f6 (Cell panel)
EN: <span class="cap-lead">At the current grain diameter: ⟦0⟧</span> Drift potential (⟦1⟧) of this cell for every grain diameter; dot and dashed line: current grain diameter.
FR: <span class="cap-lead">Pour le diamètre de grain actuel : ⟦0⟧</span> Potentiel de dérive (⟦1⟧) de cette cellule pour chaque diamètre de grain ; point et ligne tiretée : diamètre de grain actuel.

## c.2b98c4b5 (Cell panel)
EN: ⟦#0⟧×⟦#1⟧<sup>⟦#2⟧</sup> <span class="unit">ratio</span>
FR: ⟦#0⟧×⟦#1⟧<sup>⟦#2⟧</sup> <span class="unit">rapport</span>

## c.e89e84ed (Cell panel)
EN: Median threshold friction velocity
FR: Vitesse de frottement seuil médiane

# Screen-reader labels and tooltips

## c.08f8c08d (Screen-reader labels and tooltips)
EN: Lowest-layer air density, median over the hours
FR: Masse volumique de l’air dans la couche la plus basse, médiane sur les heures

# Cell panel

## c.aef2a8bb (Cell panel)
EN: Median air density
FR: Masse volumique médiane de l’air

# Screen-reader labels and tooltips

## c.701879e8 (Screen-reader labels and tooltips)
EN: Near-surface air density, mean over the year; grain-size independent
FR: Masse volumique de l’air près de la surface, moyenne annuelle ; indépendante de la taille des grains

# Cell panel

## c.c898e618 (Cell panel)
EN: Mean air density
FR: Masse volumique moyenne de l’air

# Screen-reader labels and tooltips

## c.db547236 (Screen-reader labels and tooltips)
EN: Cell mean of the MOLA–HRSC DEM
FR: Moyenne par cellule du MNT MOLA–HRSC

# Cell panel

## c.1059d6e4 (Cell panel)
EN: Elevation
FR: Altitude

# Screen-reader labels and tooltips

## c.dcbbdd2f (Screen-reader labels and tooltips)
EN: Yes: the cell overlaps at least one dune polygon of the merged dune map (USGS Mars Global Digital Dune Database and Fenton ⟦#0⟧); value in brackets: dune area fraction of the cell
FR: Oui : la cellule chevauche au moins un polygone de dune de la carte fusionnée des dunes (USGS Mars Global Digital Dune Database et Fenton ⟦#0⟧) ; valeur entre crochets : fraction de la surface de la cellule occupée par des dunes

# Cell panel

## c.f2400fd6 (Cell panel)
EN: yes <span class="unit">(⟦#0⟧ %)</span>
FR: oui <span class="unit">(⟦#0⟧ %)</span>

# Screen-reader labels and tooltips

## c.52fc6f74 (Screen-reader labels and tooltips)
EN: Hourly wind and air series, all fields vs grain size, flux roses and metadata in one NetCDF-⟦#0⟧ file (CF-⟦#1⟧)
FR: Séries horaires du vent et de l’air, tous les champs en fonction de la taille des grains, roses des flux et métadonnées dans un seul fichier NetCDF-⟦#0⟧ (CF-⟦#1⟧)

## c.d4fc85c9 (Screen-reader labels and tooltips)
EN: wind_series.csv, fields_by_grain_size.csv, flux_rose.csv, rose_16_sectors.csv (⟦#0⟧ sectors, degrees), metadata.json and README.txt
FR: wind_series.csv, fields_by_grain_size.csv, flux_rose.csv, rose_16_sectors.csv (⟦#0⟧ secteurs, degrés), metadata.json et README.txt

# Cell panel

## c.da36bb60 (Cell panel)
EN: The atlas reads public⟦0⟧(v3) stores on <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a>, which anyone can read, e.g. with Python. The map fields of⟦1⟧⟦#0⟧° are one store per variable, each holding the field against the median grain diameter (⟦2⟧, ⟦#1⟧ values) and latitude ⟦3⟧ and longitude ⟦4⟧ (cell centres in degrees; x from ⟦#2⟧ to ⟦#3⟧°, east positive). Level ⟦5⟧ of each store is the full-resolution grid; levels ⟦#4⟧, ⟦#5⟧, … are coarser copies for the map.
FR: L’atlas lit des dépôts publics⟦0⟧(v3) hébergés sur <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a>, lisibles par tous, par exemple avec Python. Les champs cartographiques de⟦1⟧⟦#0⟧° comportent un dépôt par variable, chacun contenant le champ en fonction du diamètre médian des grains (⟦2⟧, ⟦#1⟧ valeurs), de la latitude ⟦3⟧ et de la longitude ⟦4⟧ (centres des cellules en degrés ; x de ⟦#2⟧ à ⟦#3⟧°, positif vers l’est). Le niveau ⟦5⟧ de chaque dépôt correspond à la grille à pleine résolution ; les niveaux ⟦#4⟧, ⟦#5⟧, … sont des copies plus grossières destinées à la carte.

## c.d732de78 (Cell panel)
EN: Variables (replace ⟦0⟧ in the⟦1⟧): ⟦2⟧, ⟦3⟧, ⟦4⟧, ⟦5⟧, ⟦6⟧, ⟦7⟧, ⟦8⟧, ⟦9⟧, ⟦10⟧, ⟦11⟧, ⟦12⟧, ⟦13⟧, ⟦14⟧, ⟦15⟧, ⟦16⟧, ⟦17⟧, ⟦18⟧, ⟦19⟧, ⟦20⟧, ⟦21⟧, ⟦22⟧, ⟦23⟧, ⟦24⟧, ⟦25⟧, ⟦26⟧. Per-cell data of the cell panel: ⟦27⟧ (layout: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦28⟧</a>).
FR: Variables (remplacez ⟦0⟧ dans le⟦1⟧) : ⟦2⟧, ⟦3⟧, ⟦4⟧, ⟦5⟧, ⟦6⟧, ⟦7⟧, ⟦8⟧, ⟦9⟧, ⟦10⟧, ⟦11⟧, ⟦12⟧, ⟦13⟧, ⟦14⟧, ⟦15⟧, ⟦16⟧, ⟦17⟧, ⟦18⟧, ⟦19⟧, ⟦20⟧, ⟦21⟧, ⟦22⟧, ⟦23⟧, ⟦24⟧, ⟦25⟧, ⟦26⟧. Données par cellule du panneau de cellule : ⟦27⟧ (structure : <a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦28⟧</a>).

## c.930d7584 (Cell panel)
EN: Licence of these map fields:⟦0⟧Ames⟦1⟧output; no licence stated (⟦2⟧open data). Licences of every store: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦3⟧</a>. Please cite the sources listed under Download &amp; cite.
FR: Licence de ces champs cartographiques : sortie du modèle⟦0⟧Ames⟦1⟧; aucune licence indiquée (⟦2⟧données ouvertes). Licences de tous les dépôts : <a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦3⟧</a>. Veuillez citer les sources indiquées sous Télécharger et citer.

# Other

## c.a77cf12e (Other)
EN: Switch to Earth
FR: Passer à la Terre

# Tool panels

## c.e638d1ea (Tool panels)
EN: The link restores the position, zoom, grain diameter, basemap, active layers and the selected cell.
FR: Le lien restaure la position, le zoom, le diamètre des grains, le fond de carte, les calques actifs et la cellule sélectionnée.

# Exported images

## c.dae8c832 (Exported images)
EN: north up at view centre
FR: nord en haut au centre de la vue

## c.1aa05d8b (Exported images)
EN: Scale bar omitted: the scale varies strongly across this view
FR: Barre d’échelle omise : l’échelle varie fortement dans cette vue

## c.28660749 (Exported images)
EN: Dune Atlas · map.geomorphlab.org
FR: Dune Atlas · map.geomorphlab.org

## c.fa0a24f0 (Exported images)
EN: Globe (perspective view)
FR: Globe (vue en perspective)

## c.e4bb6ec6 (Exported images)
EN: centre
FR: centre

## c.df92e232 (Exported images)
EN: zoom
FR: zoom

## c.83822b4f (Exported images)
EN: Exported {date} from {site}.
FR: Exporté le {date} depuis {site}.

## c.776a3af5 (Exported images)
EN: Sand flux rose
FR: Rose des flux de sable

# Search and messages

## c.709b1f1a (Search and messages)
EN: Search coordinates
FR: Rechercher des coordonnées

## c.8ec38caf (Search and messages)
EN: Search places or coordinates
FR: Rechercher des lieux ou des coordonnées

## c.d66567e4 (Search and messages)
EN: Cannot read:
FR: Lecture impossible :

## c.11705e3e (Search and messages)
EN: No place or coordinates match.
FR: Aucun lieu ni aucune coordonnée ne correspond.

# Other

## c.09abd476 (Other)
EN: Download a region
FR: Télécharger une région

# Search and messages

## c.ab8fe15e (Search and messages)
EN: All cells of the selected wind dataset in a latitude-longitude box, in one NetCDF file (CF-⟦#0⟧) with a README.
FR: Toutes les cellules du jeu de données de vent sélectionné dans une zone délimitée en latitude et longitude, dans un seul fichier NetCDF (CF-⟦#0⟧) accompagné d’un README.

## c.9cbd6922 (Search and messages)
EN: Draw on map
FR: Dessiner sur la carte

## c.9e7eb071 (Search and messages)
EN: Drag on the map to draw the box; Esc cancels.
FR: Faites glisser sur la carte pour dessiner la zone ; Échap pour annuler.

## c.675e4fa4 (Search and messages)
EN: North
FR: Nord

## c.b3e29f1a (Search and messages)
EN: South
FR: Sud

## c.6b1595ce (Search and messages)
EN: West
FR: Ouest

## c.6733095c (Search and messages)
EN: East
FR: Est

## c.fd7f93f9 (Search and messages)
EN: Parameters
FR: Paramètres

## c.0bc7157e (Search and messages)
EN: Sand-flux fields
FR: Champs de flux de sable

## c.13254bc4 (Search and messages)
EN: all
FR: tous

## c.ada7afdb (Search and messages)
EN: none
FR: aucun

## c.6c5af3c3 (Search and messages)
EN: Dune flag
FR: Indicateur de dune

## c.c718d127 (Search and messages)
EN: Download (.zip)
FR: Télécharger (.zip)

## c.35afca3b (Search and messages)
EN: Cancel
FR: Annuler

## c.9c36b560 (Search and messages)
EN: Fetching cells
FR: Récupération des cellules

## c.77b19672 (Search and messages)
EN: Type the bounds or draw a box on the map.
FR: Saisissez les limites ou dessinez une zone sur la carte.

## c.144cc106 (Search and messages)
EN: Loading the grid of the wind dataset…
FR: Chargement de la grille du jeu de données de vent…

## c.971fcc50 (Search and messages)
EN: The grid of the wind dataset could not be loaded.
FR: La grille du jeu de données de vent n’a pas pu être chargée.

## c.bb7426bc (Search and messages)
EN: Wind histogram (hours per speed and direction bin)
FR: Histogramme du vent (heures par classe de vitesse et de direction)

## c.cc7fcd2b (Search and messages)
EN: Also called
FR: Également appelé

## c.c9ae189c (Search and messages)
EN: Includes
FR: Comprend

## c.3b5a9bd1 (Search and messages)
EN: About these names
FR: À propos de ces noms

## c.a2c773d1 (Search and messages)
EN: Sources
FR: Sources

## c.2062dc6d (Search and messages)
EN: Countries
FR: Pays

## c.1bb7f195 (Search and messages)
EN: Feature names
FR: Noms des entités géographiques

## c.e45d16ba (Search and messages)
EN: Drawing the map at export resolution (loading tiles; this can take up to a minute)…
FR: Tracé de la carte à la résolution d’export (chargement des tuiles ; cela peut prendre jusqu’à une minute)…

## c.eb69782d (Search and messages)
EN: Adding colour bars, keys and sources…
FR: Ajout des barres de couleur, des légendes et des sources…

## c.3c511e52 (Search and messages)
EN: Encoding the PNG…
FR: Encodage du PNG…

# Tool panels

## c.a19a24ae (Tool panels)
EN: Include basemap
FR: Inclure le fond de carte

## c.81360998 (Tool panels)
EN: Export PNG
FR: Exporter en PNG

## c.5d7718d4 (Tool panels)
EN: Transparent background (default white)
FR: Fond transparent (blanc par défaut)

## c.fb00fe74 (Tool panels)
EN: PNG of the current view, ⟦#0⟧–⟦#1⟧ pixels wide, without the panels, on a white background unless Transparent background is ticked. Colour bars, legends, scale and data sources are added below the map.
FR: PNG de la vue actuelle, de ⟦#0⟧ à ⟦#1⟧ pixels de large, sans les panneaux, sur fond blanc sauf si Fond transparent est coché. Les barres de couleur, les légendes, l’échelle et les sources des données sont ajoutées sous la carte.

## c.c20ad87a (Tool panels)
EN: Saved:
FR: Enregistré :

## c.513b2f5e (Tool panels)
EN: Download started:
FR: Téléchargement lancé :

## c.aceadefc (Tool panels)
EN: PNG
FR: PNG

## c.2a21a5c1 (Tool panels)
EN: SVG
FR: SVG

## c.be3c479f (Tool panels)
EN: Transparent background
FR: Fond transparent

# Search and messages

## c.8092ebfc (Search and messages)
EN: The example cell could not be loaded. Click any land cell on the map to open its panel.
FR: La cellule d’exemple n’a pas pu être chargée. Cliquez sur n’importe quelle cellule terrestre de la carte pour ouvrir son panneau.

## c.0489b765 (Search and messages)
EN: Loading map…
FR: Chargement de la carte…

# Exported images

## c.78a767a8 (Exported images)
EN: at view centre
FR: au centre de la vue

## c.eb82bb19 (Exported images)
EN: Mars Dune Atlas
FR: Mars Dune Atlas

## c.70583d0e (Exported images)
EN: Dunes only: wind-derived layers shown in cells with dunes.
FR: Dunes seulement : calques dérivés du vent affichés dans les cellules comportant des dunes.

# Search and messages

## c.b72a8db3 (Search and messages)
EN: The example cell could not be loaded. Click any cell on the map to open its panel.
FR: La cellule d’exemple n’a pas pu être chargée. Cliquez sur n’importe quelle cellule de la carte pour ouvrir son panneau.

# Layer popovers

## c.cb7f6eba (Layer popovers)
EN: ⟦0⟧polygons: public domain (U.S. Geological Survey);⟦1⟧dune fields:⟦2⟧
FR: Polygones⟦0⟧: domaine public (U.S. Geological Survey) ; champs de dunes de⟦1⟧:⟦2⟧

# About

## c.2905fdb9 (About)
EN: <strong>Dune map</strong>:⟦0⟧⟦1⟧(⟦2⟧;⟦3⟧) plus the small dune fields of Fenton (⟦#0⟧, Icarus ⟦#1⟧, ⟦#2⟧), merged into ⟦#3⟧ dune-field polygons (Mars ⟦#4⟧ sphere);⟦4⟧polygons: public domain (U.S. Geological Survey);⟦5⟧dune fields:⟦6⟧.
FR: <strong>Carte des dunes</strong> :⟦0⟧⟦1⟧(⟦2⟧;⟦3⟧), complétée par les petits champs de dunes de Fenton (⟦#0⟧, Icarus ⟦#1⟧, ⟦#2⟧), fusionnés en ⟦#3⟧ polygones de champs de dunes (sphère Mars ⟦#4⟧) ; polygones⟦4⟧: domaine public (U.S. Geological Survey) ; champs de dunes de⟦5⟧:⟦6⟧.

# Other

## c.15ee00d5 (Other)
EN: Centre map on this cell
FR: Centrer la carte sur cette cellule

# Cell panel

## c.3f2cdfbd (Cell panel)
EN: αE (elongation direction): ⟦#0⟧° (⟦#1⟧)
FR: αE (direction d’allongement) : ⟦#0⟧° (⟦#1⟧)

## c.b36b7be7 (Cell panel)
EN: αT (transverse migration direction): ⟦#0⟧° (⟦#1⟧)
FR: αT (direction de migration transverse) : ⟦#0⟧° (⟦#1⟧)

## c.7c7e35d8 (Cell panel)
EN: RDD (resultant drift direction): ⟦#0⟧° (⟦#1⟧)
FR: RDD (direction de dérive résultante) : ⟦#0⟧° (⟦#1⟧)

# About

## c.9192f9b0 (About)
EN: <strong>Winds (⟦0⟧v2.0 reanalysis, Mars Year ⟦#0⟧)</strong>: lowest-level winds, temperature and surface pressure, one sample every two Mars hours, of the Mars Analysis Correction Data Assimilation (⟦1⟧) v2.0 reanalysis (⟦2⟧,⟦3⟧Centre for Environmental Data Analysis; read from the analysis-ready⟦4⟧copy), Mars Year ⟦#1⟧, on its native ⟦#2⟧° grid (⟦#3⟧ × ⟦#4⟧ cells, about ⟦#5⟧ km across at the equator; the first column is centred on ⟦#6⟧°). The winds are those of the lowest model level (σ = ⟦#7⟧); air density ρ = p/(R T) with p = σ p<sub>s</sub>, the height of that level z = (R T/g) ln(⟦#8⟧/σ), and the friction velocity⟦5⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#9⟧, eq. ⟦#10⟧) under constant stress at that height (no roughness length); that level is ⟦#11⟧–⟦#12⟧ m above the surface (⟦6⟧⟦#13⟧–⟦#14⟧ m). In Mars Year ⟦#15⟧ the first ⟦#16⟧ samples (Ls ⟦#17⟧–⟦#18⟧°) assimilate Mars Odyssey⟦7⟧column dust, the others⟦8⟧⟦9⟧temperature and dust profiles. Data, documentation and file browser: <a href="https://catalogue.ceda.ac.uk/uuid/cd037a9ea387438fabf4d674dbe53088/" target="_blank" rel="noopener noreferrer">⟦10⟧v2.0 in the⟦11⟧Archive</a>; the analysis-ready copy read by the atlas: <a href="https://huggingface.co/datasets/ananyo01/ARCO-MACDA" target="_blank" rel="noopener noreferrer">⟦12⟧</a>. Contains public sector information licensed under the Open Government Licence v3.0 (⟦13⟧v2.0,⟦14⟧Centre for Environmental Data Analysis).
FR: <strong>Vents (⟦0⟧v2.0, réanalyse, année martienne ⟦#0⟧)</strong> : vents du niveau le plus bas, température et pression de surface, un échantillon toutes les deux heures martiennes, de la réanalyse Mars Analysis Correction Data Assimilation (⟦1⟧) v2.0 (⟦2⟧,⟦3⟧Centre for Environmental Data Analysis ; lue dans la copie⟦4⟧prête à l’analyse), année martienne ⟦#1⟧, sur sa grille native de ⟦#2⟧° (⟦#3⟧ × ⟦#4⟧ cellules, environ ⟦#5⟧ km de côté à l’équateur ; la première colonne est centrée sur ⟦#6⟧°). Les vents sont ceux du niveau le plus bas du modèle (σ = ⟦#7⟧) ; masse volumique de l’air ρ = p/(R T) avec p = σ p<sub>s</sub>, hauteur de ce niveau z = (R T/g) ln(⟦#8⟧/σ), et la vitesse de frottement⟦5⟧est obtenue à partir du profil de longueur de mélange en paroi lisse de Pähtz &amp; Durán (⟦#9⟧, éq. ⟦#10⟧) sous contrainte constante à cette hauteur (sans longueur de rugosité) ; ce niveau se situe à ⟦#11⟧–⟦#12⟧ m au-dessus de la surface (⟦6⟧⟦#13⟧–⟦#14⟧ m). Pendant l’année martienne ⟦#15⟧, les ⟦#16⟧ premiers échantillons (Ls ⟦#17⟧–⟦#18⟧°) assimilent les colonnes de poussière de Mars Odyssey⟦7⟧et les autres les profils⟦8⟧⟦9⟧de température et de poussière. Données, documentation et explorateur de fichiers : <a href="https://catalogue.ceda.ac.uk/uuid/cd037a9ea387438fabf4d674dbe53088/" target="_blank" rel="noopener noreferrer">⟦10⟧v2.0 dans le⟦11⟧Archive</a> ; la copie prête à l’analyse lue par l’atlas : <a href="https://huggingface.co/datasets/ananyo01/ARCO-MACDA" target="_blank" rel="noopener noreferrer">⟦12⟧</a>. Contains public sector information licensed under the Open Government Licence v3.0 (⟦13⟧v2.0,⟦14⟧Centre for Environmental Data Analysis).

## c.912ef7dd (About)
EN: <strong>Saturated flux divergence</strong> ⟦0⟧: divergence of the resultant drift potential vector (magnitude⟦1⟧, direction⟦2⟧) on the Mars sphere (R = ⟦#0⟧ km), following⟦3⟧, Methods⟦4⟧, with central differences on the grid of the wind dataset (⟦#1⟧° or ⟦#2⟧° × ⟦#3⟧° or ⟦#4⟧°). Negative values (convergence) imply deposition.
FR: <strong>Divergence du flux saturé</strong> ⟦0⟧: divergence du vecteur potentiel de dérive résultant (norme⟦1⟧, direction⟦2⟧) sur la sphère martienne (R = ⟦#0⟧ km), selon⟦3⟧, Methods⟦4⟧, avec des différences centrées sur la grille du jeu de données de vent (⟦#1⟧° ou ⟦#2⟧° × ⟦#3⟧° ou ⟦#4⟧°). Les valeurs négatives (convergence) indiquent un dépôt.

## c.c682ba25 (About)
EN: <strong>⟦0⟧⟦#0⟧° × ⟦#1⟧°</strong>: ⟦1⟧. Licence: ⟦2⟧.
FR: <strong>⟦0⟧⟦#0⟧° × ⟦#1⟧°</strong> : ⟦1⟧. Licence : ⟦2⟧.

## c.48251db8 (About)
EN: Web interface (explore the model output): ⟦0⟧
FR: Interface web (explorer les sorties du modèle) : ⟦0⟧

## c.251cd18d (About)
EN: ⟦0⟧v1.0 reanalysis (Mars Year ⟦#0⟧)
FR: Réanalyse ⟦0⟧v1.0 (année martienne ⟦#0⟧)

## c.19395603 (About)
EN: Data (analysis-ready copy read by the atlas): ⟦0⟧
FR: Données (copie prête à l’analyse lue par l’atlas) : ⟦0⟧

## c.8227d6a0 (About)
EN: ⟦0⟧v2.0 reanalysis (Mars Year ⟦#0⟧)
FR: Réanalyse ⟦0⟧v2.0 (année martienne ⟦#0⟧)

## c.db5eb4dc (About)
EN: Contains public sector information licensed under the Open Government Licence v3.0 (⟦0⟧v2.0,⟦1⟧Centre for Environmental Data Analysis).
FR: Contains public sector information licensed under the Open Government Licence v3.0 (⟦0⟧v2.0,⟦1⟧Centre for Environmental Data Analysis).

## c.b5eabe06 (About)
EN: <strong>Transport law and wind profile</strong>: Earth uses the transport law of⟦0⟧, with⟦1⟧from the ⟦#0⟧ m wind and a roughness length of ⟦#1⟧ mm; Mars uses the transport law of⟦2⟧, with⟦3⟧from the wind at the lowest level of the wind dataset (its height above the surface differs between datasets) and a smooth-wall profile without a roughness length.
FR: <strong>Loi de transport et profil de vent</strong> : sur Terre, on utilise la loi de transport de⟦0⟧, avec⟦1⟧à partir du vent à ⟦#0⟧ m et une longueur de rugosité de ⟦#1⟧ mm ; sur Mars, on utilise la loi de transport de⟦2⟧, avec⟦3⟧à partir du vent au niveau le plus bas du jeu de données de vent (sa hauteur au-dessus de la surface diffère d’un jeu de données à l’autre) et un profil de paroi lisse sans longueur de rugosité.

## c.c9e11e84 (About)
EN: <strong>Downloads</strong>: Earth cells provide a wind histogram and the fields against threshold (⟦0⟧,⟦1⟧); Mars cells provide the wind and air series and the fields against grain diameter (⟦2⟧,⟦3⟧).
FR: <strong>Téléchargements</strong> : les cellules terrestres fournissent un histogramme des vents et les champs en fonction du seuil (⟦0⟧,⟦1⟧) ; les cellules martiennes fournissent les séries de vent et d’air ainsi que les champs en fonction du diamètre des grains (⟦2⟧,⟦3⟧).

# Search and messages

## c.3cfbf3ce (Search and messages)
EN: Wind and air series (u, v, T, ρ, z)
FR: Séries du vent et de l’air (u, v, T, ρ, z)

# Layer popovers

## c.1e0c1012 (Layer popovers)
EN: Fraction of time flat-bed friction velocity is above threshold⟦0⟧. The threshold is the cessation threshold⟦1⟧of each sample, from⟦2⟧.
FR: Fraction du temps pendant laquelle la vitesse de frottement sur lit plat dépasse le seuil⟦0⟧. Le seuil est le seuil d’arrêt⟦1⟧de chaque échantillon, selon⟦2⟧.

## c.fb4c6ed6 (Layer popovers)
EN: Average above-threshold flat-bed friction velocity, normalised by threshold⟦0⟧. The threshold is the cessation threshold⟦1⟧of each sample, from⟦2⟧.
FR: Vitesse de frottement moyenne sur lit plat au-dessus du seuil, normalisée par le seuil⟦0⟧. Le seuil est le seuil d’arrêt⟦1⟧de chaque échantillon, selon⟦2⟧.

## c.b451b9c7 (Layer popovers)
EN: Fraction of bed-instability-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is the cessation threshold⟦2⟧of each sample, from⟦3⟧.
FR: Fraction du flux de crête en mode d’instabilité du lit (⟦0⟧) qui se produit lorsque la vitesse de frottement sur lit plat dépasse le seuil,⟦1⟧. Vaut ⟦#0⟧ là où le flux de crête ne se produit que lorsque le lit plat est sous le seuil ; non définie là où il n’y a pas de flux de crête. Le seuil est le seuil d’arrêt⟦2⟧de chaque échantillon, selon⟦3⟧.

## c.3c46d0c1 (Layer popovers)
EN: Fraction of elongation-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is the cessation threshold⟦2⟧of each sample, from⟦3⟧.
FR: Fraction du flux de crête en mode d’allongement (⟦0⟧) qui se produit lorsque la vitesse de frottement sur lit plat dépasse le seuil,⟦1⟧. Vaut ⟦#0⟧ là où le flux de crête ne se produit que lorsque le lit plat est sous le seuil ; non définie là où il n’y a pas de flux de crête. Le seuil est le seuil d’arrêt⟦2⟧de chaque échantillon, selon⟦3⟧.

## c.bbd07d73 (Layer popovers)
EN: Mean over the samples of the Mars year of the lowest-layer air density⟦0⟧of the wind dataset (one sample per Mars hour;⟦1⟧= mid pressure of the lowest layer,⟦2⟧= lowest-level temperature).
FR: Moyenne, sur les échantillons de l’année martienne, de la masse volumique de l’air de la couche la plus basse⟦0⟧du jeu de données de vent (un échantillon par heure martienne ;⟦1⟧= pression au milieu de la couche la plus basse,⟦2⟧= température du niveau le plus bas).

# Screen-reader labels and tooltips

## c.1803468a (Screen-reader labels and tooltips)
EN: Threshold friction velocity at this d, median over the samples of the Mars year
FR: Vitesse de frottement seuil pour ce d, médiane sur les échantillons de l’année martienne

# Concepts

## concept.earth.the-wind-datasets.title (Concepts)
EN: The wind datasets
FR: Les jeux de données de vent

## concept.earth.the-wind-datasets.p1 (Concepts)
EN: The Earth atlas offers two hourly 10 m wind records for 1950–2024. ERA5 is ECMWF's global atmospheric reanalysis on a 0.25° grid (about 28 km). ERA5-Land re-runs ECMWF's land-surface model at 0.1° (about 9–11 km), driven by ERA5 atmospheric fields interpolated to the finer grid. Baas (2026) reports ERA5-Land 10 m wind speeds 20–30 % below those of ERA5. Gunn (2026) used ERA5-Land, and the dune map is on its grid. Neither dataset resolves winds around individual dunes or small hills.
FR: L’atlas terrestre propose deux séries horaires du vent à 10 m couvrant 1950–2024. ERA5 est la réanalyse atmosphérique globale de l’ECMWF, sur une grille de 0,25° (environ 28 km). ERA5-Land correspond à une nouvelle exécution du modèle de surface continentale de l’ECMWF à 0,1° (environ 9–11 km), forcée par les champs atmosphériques d’ERA5 interpolés sur la grille plus fine. Baas (2026) indique que les vitesses du vent à 10 m d’ERA5-Land sont inférieures de 20–30 % à celles d’ERA5. Gunn (2026) a utilisé ERA5-Land, et la carte des dunes est établie sur sa grille. Aucun des deux jeux de données ne résout les vents autour de dunes individuelles ou de petites collines.

# About

## c.d62ef04b (About)
EN: <strong>Control</strong>: on Earth the slider sets one threshold friction velocity⟦0⟧for the whole record (default ⟦#0⟧ m/s); on Mars it sets the median grain diameter d (default ⟦#1⟧ µm), and the threshold is computed for each time step of the wind record from d and that step's air density and temperature.
FR: <strong>Contrôle</strong> : sur Terre, le curseur fixe une vitesse de frottement seuil⟦0⟧unique pour l’ensemble de l’enregistrement (valeur par défaut ⟦#0⟧ m/s) ; sur Mars, il fixe le diamètre médian des grains d (valeur par défaut ⟦#1⟧ µm), et le seuil est calculé pour chaque pas de temps de l’enregistrement de vent à partir de d ainsi que de la masse volumique et de la température de l’air à ce pas de temps.

## c.238c1534 (About)
EN: <strong>Sand-flux fields</strong>: for each time step of the wind dataset, the threshold and the saturated transport rate of⟦0⟧at the selected median grain diameter d (grain density ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), averaged over the year; drift potentials, crest fluxes and dune-orientation modes follow the methods outlined in⟦1⟧. Fluxes are volumes of packed sand (packing fraction ⟦#2⟧, pore space included) per metre width per Earth year (⟦#3⟧ days), in m²/yr, as on Earth.
FR: <strong>Champs de flux de sable</strong> : pour chaque pas de temps du jeu de données de vent, le seuil et le débit de transport saturé selon⟦0⟧au diamètre médian des grains d sélectionné (masse volumique des grains ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), moyennés sur l’année ; les potentiels de dérive, les flux de crête et les modes d’orientation des dunes suivent les méthodes décrites dans⟦1⟧. Les flux sont des volumes de sable compacté (compacité ⟦#2⟧, porosité incluse) par mètre de largeur et par année terrestre (⟦#3⟧ jours), en m²/yr, comme sur Terre.

# Layer popovers

## c.2c67fa30 (Layer popovers)
EN: The Wind dataset selector switches between wind datasets (⟦0⟧, ⟦#0⟧°, ⟦#1⟧–⟦#2⟧;⟦1⟧, ⟦#3⟧°, ⟦#4⟧–⟦#5⟧).⟦2⟧, used by⟦3⟧, re-runs⟦4⟧'s land-surface model driven by⟦5⟧atmospheric fields interpolated to its ⟦#6⟧° grid (Muñoz-Sabater et al. ⟦#7⟧);⟦6⟧reports its ⟦#8⟧ m wind speeds ⟦#9⟧–⟦#10⟧ % below those of⟦7⟧. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
FR: Le sélecteur de dataset de vent permet de basculer entre jeux de données de vent (⟦0⟧, ⟦#0⟧°, ⟦#1⟧–⟦#2⟧;⟦1⟧, ⟦#3⟧°, ⟦#4⟧–⟦#5⟧).⟦2⟧, utilisé par⟦3⟧, fait tourner à nouveau le modèle de surface continentale de⟦4⟧ piloté par les champs atmosphériques de⟦5⟧interpolés sur sa grille de ⟦#6⟧° (Muñoz-Sabater et al. ⟦#7⟧);⟦6⟧indique des vitesses de vent à ⟦#8⟧ m inférieures de ⟦#9⟧–⟦#10⟧ % à celles de⟦7⟧. Les calques de vent et de flux de sable ainsi que le panneau de cellule suivent la sélection; le masque du champ de dunes, l'aridité et les calques de végétation restent identiques pour chaque jeu de données.

## c.e5c7b256 (Layer popovers)
EN: The default, ⟦#0⟧ m/s, is the value used for the global analysis of⟦0⟧, one value for the whole globe, not calibrated for any site. Values between ⟦#1⟧ and ⟦#2⟧ m/s are typical; for loose, dry sand the threshold depends mainly on grain size and density.
FR: La valeur par défaut, ⟦#0⟧ m/s, est celle utilisée pour l’analyse globale de⟦0⟧, une seule valeur pour l’ensemble du globe, non calibrée pour un site particulier. Des valeurs comprises entre ⟦#1⟧ et ⟦#2⟧ m/s sont typiques ; pour un sable sec et meuble, le seuil dépend principalement de la taille et de la masse volumique des grains.

## c.00a48377 (Layer popovers)
EN: The ⟦#0⟧° dune cells of the dune map grouped into ⟦#1⟧ dune fields of touching cells (sharing an edge or a corner); polygon edges follow the grid-cell boundaries. Area is the sum of spherical cell areas.
FR: Les cellules de dunes à ⟦#0⟧° de la carte des dunes, regroupées en ⟦#1⟧ champs de dunes de cellules en contact (partageant un côté ou un coin) ; les contours des polygones suivent les limites des cellules de la grille. La superficie est la somme des aires sphériques des cellules.

## c.bf48091d (Layer popovers)
EN: Net along-crest over net across-crest sand flux for crests of the bed-instability orientation,⟦0⟧. Along-crest transport tends to keep crests straight, while across-crest transport, which drives migration, tends to make them sinuous (⟦1⟧), so higher values suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures how far the migration direction departs from the direction of the sand flux on the dune, which makes dunes such as barchans asymmetric (⟦2⟧). In the sand-covered-bed examples of⟦3⟧it is about ⟦#0⟧ for transverse, ⟦#1⟧ for oblique and ⟦#2⟧ for longitudinal dunes. The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#3⟧).
FR: Rapport du flux de sable net le long de la crête au flux net à travers la crête pour les crêtes dans l’orientation du mode d’instabilité du lit,⟦0⟧. Le transport le long de la crête tend à maintenir les crêtes rectilignes, tandis que le transport à travers la crête, qui entraîne la migration, tend à les rendre sinueuses (⟦1⟧) ; des valeurs plus élevées suggèrent donc des dunes à crête longue plus rectilignes sur des lits couverts de sable. Pour les dunes migrant sur des lits pauvres en sable, le rapport mesure l’écart entre la direction de migration et la direction du flux de sable sur la dune, ce qui rend asymétriques des dunes telles que les barkhanes (⟦2⟧). Dans les exemples sur lit couvert de sable de⟦3⟧il vaut environ ⟦#0⟧ pour les dunes transverses, ⟦#1⟧ pour les dunes obliques et ⟦#2⟧ pour les dunes longitudinales. Le rapport tend vers l’infini lorsque son dénominateur (un flux net) tend vers zéro (valeurs affichées écrêtées à ±⟦#3⟧).

## c.6816201a (Layer popovers)
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all speed and direction bins: the volume of packed sand per metre width that the wind could move per year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with the threshold set by the slider. The ratio of the two depends on the wind-speed distribution, and Fryberger's energy classes (below ⟦#2⟧, ⟦#3⟧–⟦#4⟧ and above ⟦#5⟧ vector units) are in vector units.
FR: Flux de sable saturé sur lit plat moyenné dans le temps,⟦0⟧sur l’ensemble des classes de vitesse et de direction : le volume de sable compacté par mètre de largeur que le vent pourrait déplacer par an sur un lit plat entièrement recouvert de sable meuble (⟦1⟧). Comme le potentiel de dérive de⟦2⟧il mesure la capacité du vent à transporter le sable, mais il s’agit d’une grandeur différente : le⟦3⟧de Fryberger est exprimé en unités vectorielles et calculé à partir des vitesses du vent à ⟦#0⟧ m en nœuds selon⟦4⟧avec un seuil de ⟦#1⟧ nœuds, tandis que ce⟦5⟧est un flux physique calculé à partir de la vitesse de frottement, avec le seuil fixé par le curseur. Le rapport entre les deux dépend de la distribution des vitesses du vent, et les classes d’énergie de Fryberger (moins de ⟦#2⟧, ⟦#3⟧–⟦#4⟧ et plus de ⟦#5⟧ unités vectorielles) sont exprimées en unités vectorielles.

## c.c7e3069a (Layer popovers)
EN: Direction of the time-averaged flat-bed flux vector,⟦0⟧, the direction sand moves, as a compass bearing (clockwise from north). Where⟦1⟧is low, transport in opposing directions nearly cancels, and a small change of the threshold or the winds can turn this direction by up to ⟦#0⟧°.
FR: Direction du vecteur de flux à lit plat moyenné dans le temps,⟦0⟧, la direction dans laquelle le sable se déplace, exprimée en azimut (dans le sens horaire depuis le nord). Lorsque⟦1⟧est faible, le transport dans des directions opposées s'annule presque, et une petite variation du seuil ou des vents peut faire tourner cette direction jusqu'à ⟦#0⟧°.

## c.b2c9170b (Layer popovers)
EN: Directional variability of sand flux: ratio of resultant to total drift potential,⟦0⟧(⟦#0⟧ = multidirectional, ⟦#1⟧ = unidirectional). Undefined where there is no sand flux (⟦1⟧).⟦2⟧classes: below ⟦#2⟧ low (complex or obtuse bimodal winds), ⟦#3⟧–⟦#4⟧ intermediate (obtuse to acute bimodal winds), above ⟦#5⟧ high (unimodal winds). Here only transport above the threshold counts, and the flux law differs from Fryberger's.
FR: Variabilité directionnelle du flux de sable : rapport du potentiel de dérive résultant au potentiel de dérive total,⟦0⟧(⟦#0⟧ = multidirectionnel, ⟦#1⟧ = unidirectionnel). Non défini là où il n’y a pas de flux de sable (⟦1⟧). Classes de⟦2⟧: moins de ⟦#2⟧, faible (vents complexes ou bimodaux obtus) ; ⟦#3⟧–⟦#4⟧, intermédiaire (vents bimodaux obtus à aigus) ; plus de ⟦#5⟧, élevé (vents unimodaux). Ici, seul le transport au-dessus du seuil est pris en compte, et la loi de flux diffère de celle de Fryberger.

## c.eb846f21 (Layer popovers)
EN: Mean total vegetation cover (green plus dry vegetation, including trees; % of the ground), ⟦#0⟧–⟦#1⟧, from the⟦0⟧Fractional Cover v3.1 (⟦#2⟧ m, monthly) averaged onto the ⟦#3⟧° cells over the months with valid data. Calibrated against Australian field sites; saturates under closed canopies. Total cover includes non-photosynthetic vegetation (dry and dead plant material) as well as green vegetation, so it can be substantial where little green vegetation is visible. No data over ocean, Antarctica, land north of ⟦#4⟧° N and the ⟦#5⟧° meridian cells. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full monthly time series at⟦1⟧</a>.
FR: Couvert végétal total moyen (végétation verte et sèche, arbres compris ; % du sol), ⟦#0⟧–⟦#1⟧, issu du⟦0⟧Fractional Cover v3.1 (⟦#2⟧ m, mensuel), moyenné sur les cellules de ⟦#3⟧° pour les mois disposant de données valides. Calibré sur des sites de terrain australiens ; sature sous les canopées fermées. Le couvert total inclut la végétation non photosynthétique (matériel végétal sec et mort) ainsi que la végétation verte, et il peut donc être important là où peu de végétation verte est visible. Pas de données sur l’océan, l’Antarctique, les terres au nord de ⟦#4⟧° N et les cellules du méridien ⟦#5⟧°. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explorer la série temporelle mensuelle complète sur⟦1⟧</a>.

# About

## c.d98fa964 (About)
EN: <strong>Wind histograms and sand-flux fields (⟦0⟧⟦#0⟧°)</strong>:⟦1⟧⟦#1⟧–⟦#2⟧ hourly ⟦#3⟧ m winds (⟦#4⟧°;⟦2⟧,⟦3⟧) and the saturated sand-flux (qsat) parameters of⟦4⟧, Supplementary Data (⟦5⟧,⟦6⟧). Drift potentials (⟦7⟧,⟦8⟧,⟦9⟧,⟦10⟧) and crest fluxes are averages over the hourly record.
FR: <strong>Histogrammes de vent et champs de flux de sable (⟦0⟧⟦#0⟧°)</strong> :⟦1⟧⟦#1⟧–⟦#2⟧, vents horaires à ⟦#3⟧ m (⟦#4⟧°;⟦2⟧,⟦3⟧) et paramètres du flux de sable saturé (qsat) de⟦4⟧, données supplémentaires (⟦5⟧,⟦6⟧). Les potentiels de dérive (⟦7⟧,⟦8⟧,⟦9⟧,⟦10⟧) et les flux de crête sont des moyennes sur la série horaire.

## c.a8ad2f3b (About)
EN: <strong>Aridity index</strong>: Global Aridity Index v3.1 (⟦0⟧; Zomer,⟦1⟧), ⟦#0⟧–⟦#1⟧, native ⟦#2⟧″ grid,⟦2⟧; ocean and Antarctica (south of ⟦#3⟧° S) have no data, values ≥ ⟦#4⟧ are at the top of the source range. The cell panel shows the mean over the cell of the selected wind dataset.
FR: <strong>Indice d’aridité</strong> : Global Aridity Index v3.1 (⟦0⟧; Zomer,⟦1⟧), ⟦#0⟧–⟦#1⟧, grille native à ⟦#2⟧″,⟦2⟧ ; les océans et l’Antarctique (au sud de ⟦#3⟧° S) n’ont pas de données, et les valeurs ≥ ⟦#4⟧ se situent au sommet de la plage de la source. Le panneau de la cellule indique la moyenne sur la cellule du jeu de données de vent sélectionné.

## c.aa472bb2 (About)
EN: <strong>Vegetation cover</strong>:⟦0⟧Fractional Cover v3.1 (⟦1⟧;⟦2⟧), total vegetation cover (photosynthetic + non-photosynthetic vegetation), mean of the monthly ⟦#0⟧ m values ⟦#1⟧–⟦#2⟧ on the ⟦#3⟧° grid,⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧, hosted by⟦5⟧; the vegetation product of⟦6⟧. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full time series at⟦7⟧</a>. The cell panel shows the cell mean and the number of valid months.
FR: <strong>Couvert végétal</strong> :⟦0⟧Fractional Cover v3.1 (⟦1⟧;⟦2⟧), couvert végétal total (végétation photosynthétique + végétation non photosynthétique), moyenne des valeurs mensuelles à ⟦#0⟧ m de ⟦#1⟧–⟦#2⟧ sur la grille à ⟦#3⟧°,⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧, hébergé par⟦5⟧ ; le produit de végétation de⟦6⟧. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explorer la série temporelle complète sur⟦7⟧</a>. Le panneau de la cellule affiche la moyenne de la cellule et le nombre de mois valides.

## c.500b2800 (About)
EN: Earth and Mars: methods and data
FR: Terre et Mars : méthodes et données

## c.2ebf7276 (About)
EN: <strong>Winds and grid</strong>: Earth uses decades of hourly reanalysis winds (e.g.,⟦0⟧, ⟦#0⟧° grid, ⟦#1⟧–⟦#2⟧); Mars uses one Mars year (⟦#3⟧ sols, about ⟦#4⟧ Earth years) of winds from a climate-model simulation or a reanalysis (e.g.,⟦1⟧, ⟦#5⟧° grid, about ⟦#6⟧ km at the equator), with no year-to-year variation.
FR: <strong>Vents et grille</strong> : sur Terre, on utilise des décennies de vents horaires issus de réanalyses (p. ex.⟦0⟧, grille à ⟦#0⟧°, ⟦#1⟧–⟦#2⟧) ; sur Mars, on utilise une année martienne (⟦#3⟧ sols, soit environ ⟦#4⟧ années terrestres) de vents issus d’une simulation de modèle climatique ou d’une réanalyse (p. ex.⟦1⟧, grille à ⟦#5⟧°, soit environ ⟦#6⟧ km à l’équateur), sans variabilité d’une année à l’autre.

## c.cadf63de (About)
EN: On both planets,⟦0⟧,⟦1⟧,⟦2⟧and the mode directions depend on the threshold or grain-diameter setting.
FR: Sur les deux planètes, ⟦0⟧, ⟦1⟧, ⟦2⟧ et les directions du mode dépendent du réglage du seuil ou du diamètre des grains.

# Cell panel

## c.974526cd (Cell panel)
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ m/s (centre) to ⟦#1⟧ m/s (rim); ⟦1⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current threshold. Where⟦2⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, and⟦3⟧can turn by up to ⟦#3⟧° with a small change of threshold or wind dataset. The modes depend on the whole flux rose rather than on its resultant: ⟦4⟧ follows the crest orientation ⟦5⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦6⟧.
FR: Azimuts des modes (vers) pour ⟦0⟧ = ⟦#0⟧ m/s (centre) à ⟦#1⟧ m/s (bord) ; ⟦1⟧ est un axe, tracé dans les deux sens. Les tracés s’interrompent là où un mode n’est pas défini (aucun flux déterminant). Anneau en tirets et points : seuil actuel. Là où⟦2⟧est faible (en dessous d’environ ⟦#2⟧), les transports de sens opposés se compensent presque, et⟦3⟧peut tourner de jusqu’à ⟦#3⟧° pour une faible modification du seuil ou du jeu de données de vent. Les modes dépendent de l’ensemble de la rose des flux plutôt que de sa résultante : ⟦4⟧ suit l’orientation de la crête ⟦5⟧ qui maximise le transport brut à travers les crêtes ; cette direction peut donc rester stable et différer de⟦6⟧.

# Other interface

## c.557bb11b (Other interface)
EN: Wind roses and sand-flux statistics are computed for land cells (land–sea mask fraction above ⟦#0⟧). This cell is mainly water. Choose a nearby land cell.
FR: Les roses des vents et les statistiques de flux de sable sont calculées pour les cellules terrestres (fraction du masque terre–mer supérieure à ⟦#0⟧). Cette cellule est principalement constituée d’eau. Choisissez une cellule terrestre voisine.

## c.53215ad6 (Other interface)
EN: Wind roses and sand-flux statistics are computed for land cells (land–sea mask fraction above ⟦#0⟧, i.e. any land in the cell). This cell has no land (land–sea mask fraction ⟦#1⟧). Choose a nearby land cell.
FR: Les roses des vents et les statistiques de flux de sable sont calculées pour les cellules terrestres (fraction du masque terre–mer supérieure à ⟦#0⟧, c’est-à-dire toute cellule contenant des terres). Cette cellule ne comporte aucune terre (fraction du masque terre–mer ⟦#1⟧). Choisissez une cellule terrestre voisine.

# Layer popovers

## c.fb1d1176 (Layer popovers)
EN: The Wind dataset selector switches between Mars wind datasets (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧° × ⟦#2⟧°;⟦2⟧, ⟦#3⟧°), each one Mars year of lowest-level winds on its own grid (⟦3⟧: free-running climate-model simulation;⟦4⟧and⟦5⟧: reanalysis of Mars Year ⟦#4⟧, with spacecraft observations of the atmosphere assimilated into a climate model). The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. No⟦6⟧data poleward of ⟦#5⟧° N: the northernmost cells of its grid are centred at ⟦#6⟧° N.
FR: Le sélecteur Jeu de données de vent permet de passer d’un jeu de données de vent martien à l’autre (⟦0⟧, ⟦#0⟧° ;⟦1⟧, ⟦#1⟧° × ⟦#2⟧° ;⟦2⟧, ⟦#3⟧°), chacun couvrant une année martienne de vents du niveau le plus bas sur sa propre grille (⟦3⟧ : simulation libre d’un modèle climatique ;⟦4⟧et⟦5⟧: réanalyse de l’année martienne ⟦#4⟧, avec des observations de l’atmosphère faites par des sondes spatiales assimilées dans un modèle climatique). Les calques de vent et de flux de sable ainsi que le panneau de la cellule suivent la sélection ; la carte des dunes et l’altitude sont les mêmes pour tous les jeux de données. Pas de données⟦6⟧au-delà de ⟦#5⟧° N vers le pôle : les cellules les plus septentrionales de sa grille sont centrées sur ⟦#6⟧° N.

## c.59fd3775 (Layer popovers)
EN: The median diameter ⟦0⟧ of the sand grains. Every grain-size-dependent map layer (its ⓘ says so) and the cell panel use the value set here. The threshold friction velocity ⟦1⟧ is computed for each time step from ⟦2⟧ and that step's air density and temperature (⟦3⟧).
FR: Le diamètre médian ⟦0⟧ des grains de sable. Chaque calque de la carte dépendant de la taille des grains (son ⓘ l’indique) ainsi que le panneau de cellule utilisent la valeur définie ici. La vitesse de frottement seuil ⟦1⟧ est calculée pour chaque pas de temps à partir de ⟦2⟧ et de la masse volumique et de la température de l’air à ce pas de temps (⟦3⟧).

## c.df0d9fab (Layer popovers)
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all N samples of the Mars year: the volume of packed sand per metre width that the wind could move per Earth year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with a threshold computed from the grain diameter. There is no fixed ratio between the two, and Fryberger's energy classes (below ⟦#2⟧, ⟦#3⟧–⟦#4⟧ and above ⟦#5⟧ vector units) are in vector units.
FR: Flux de sable saturé sur lit plat moyenné dans le temps,⟦0⟧sur l’ensemble des N échantillons de l’année martienne : le volume de sable compacté par mètre de largeur que le vent pourrait déplacer par année terrestre sur un lit plat entièrement couvert de sable meuble (⟦1⟧). Comme le potentiel de dérive de⟦2⟧il mesure la capacité du vent à transporter le sable, mais il s’agit d’une grandeur différente : le⟦3⟧de Fryberger est exprimé en unités vectorielles et calculé à partir des vitesses du vent à ⟦#0⟧ m en nœuds selon⟦4⟧avec un seuil de ⟦#1⟧ nœuds, tandis que ce⟦5⟧est un flux physique calculé à partir de la vitesse de frottement avec un seuil déterminé à partir du diamètre des grains. Il n’existe pas de rapport fixe entre les deux, et les classes d’énergie de Fryberger (inférieures à ⟦#2⟧, de ⟦#3⟧ à ⟦#4⟧ et supérieures à ⟦#5⟧ unités vectorielles) sont exprimées en unités vectorielles.

## c.0b10586c (Layer popovers)
EN: Divergence of the time-averaged saturated sand-flux vector (magnitude⟦0⟧, direction⟦1⟧) on the Mars sphere, following⟦2⟧, Methods⟦3⟧:⟦4⟧with⟦5⟧,⟦6⟧. By conservation of sand mass, negative values (flux convergence) imply deposition and positive values (flux divergence) erosion. The values assume a saturated flux and an unlimited supply of loose sand, so on rock or crusted surfaces actual erosion is limited by the sand available.
FR: Divergence du vecteur flux de sable saturé moyenné dans le temps (intensité⟦0⟧, direction⟦1⟧) sur la sphère martienne, d’après⟦2⟧, Méthodes⟦3⟧:⟦4⟧avec⟦5⟧,⟦6⟧. Par conservation de la masse de sable, les valeurs négatives (convergence du flux) impliquent un dépôt et les valeurs positives (divergence du flux) une érosion. Ces valeurs supposent un flux saturé et un apport illimité de sable meuble ; ainsi, sur les surfaces rocheuses ou encroûtées, l’érosion réelle est limitée par le sable disponible.

# About

## c.ca9b878e (About)
EN: <strong>Winds (⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧)</strong>: hourly lowest-level winds, temperature and surface pressure of the⟦2⟧Ames⟦3⟧FV3-based Mars Global Climate Model (c48 reference simulation, 6th simulated year), regridded to ⟦#1⟧° × ⟦#2⟧° (a cell is about ⟦#3⟧ km across at the equator): ⟦#4⟧ hourly samples, one Mars year. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature (⟦#5⟧–⟦#6⟧ m over all cells and hours; ⟦#7⟧–⟦#8⟧ m in ⟦#9⟧ % of the hours of dune cells; the cell panel gives the range of the selected cell), and the friction velocity⟦4⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#10⟧, eq. ⟦#11⟧) under constant stress at that height (no roughness length). Explore and download the full model output in the <a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦5⟧Ames⟦6⟧Data Portal web interface</a>.
FR: <strong>Vents (⟦0⟧Mars⟦1⟧, version bêta ⟦#0⟧)</strong> : vents horaires du niveau le plus bas, température et pression de surface du modèle climatique global martien⟦2⟧Ames⟦3⟧fondé sur FV3 (simulation de référence c48, 6e année simulée), rééchantillonnés sur une grille de ⟦#1⟧° × ⟦#2⟧° (une cellule mesure environ ⟦#3⟧ km de côté à l’équateur) : ⟦#4⟧ échantillons horaires, une année martienne. Masse volumique de l’air de la couche la plus basse ρ = p/(R T) ; la hauteur z du vent du niveau le plus bas découle de la pression et de la température horaires (⟦#5⟧–⟦#6⟧ m sur l’ensemble des cellules et des heures ; ⟦#7⟧–⟦#8⟧ m pendant ⟦#9⟧ % des heures des cellules dunaires ; le panneau de la cellule indique la plage de la cellule sélectionnée), et la vitesse de frottement⟦4⟧est obtenue à partir du profil de longueur de mélange en paroi lisse de Pähtz &amp; Durán (⟦#10⟧, éq. ⟦#11⟧) sous contrainte constante à cette hauteur (sans longueur de rugosité). Explorez et téléchargez l’ensemble des sorties du modèle dans l’interface web <a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦5⟧Ames⟦6⟧Data Portal</a>.

## c.82f006f8 (About)
EN: <strong>Winds (⟦0⟧v1.0 reanalysis, Mars Year ⟦#0⟧)</strong>: hourly analysis ensemble mean of the lowest-level winds, temperature and surface pressure of the Ensemble Mars Atmosphere Reanalysis System (⟦1⟧) v1.0 (⟦2⟧; read from the analysis-ready⟦3⟧copy), Mars Year ⟦#1⟧, on its native grid of ⟦#2⟧° in longitude × ⟦#3⟧° in latitude (⟦#4⟧ × ⟦#5⟧ cells, about ⟦#6⟧ km × ⟦#7⟧ km at the equator). The two half-width polar rows of⟦4⟧are not used, so the grid ends at ±⟦#8⟧°. The winds are averaged from the staggered⟦5⟧grid onto the cell centres. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature, and the friction velocity⟦6⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#9⟧, eq. ⟦#10⟧) under constant stress at that height (no roughness length). The lowest⟦7⟧layer is thick, so that height is ⟦#11⟧–⟦#12⟧ m above the surface (median ⟦#13⟧ m;⟦8⟧⟦#14⟧–⟦#15⟧ m,⟦9⟧⟦#16⟧–⟦#17⟧ m). Data and documentation: <a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">⟦10⟧v1.0 at the Penn State Data Commons</a>; the analysis-ready copy read by the atlas, <a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦11⟧</a>, with <a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">Python examples for reading and plotting it</a>.
FR: <strong>Vents (⟦0⟧v1.0, réanalyse, année martienne ⟦#0⟧)</strong> : moyenne horaire de l’ensemble d’analyses des vents du niveau le plus bas, de la température et de la pression de surface de l’Ensemble Mars Atmosphere Reanalysis System (⟦1⟧) v1.0 (⟦2⟧ ; lue dans la copie⟦3⟧prête à l’analyse), année martienne ⟦#1⟧, sur sa grille native de ⟦#2⟧° en longitude × ⟦#3⟧° en latitude (⟦#4⟧ × ⟦#5⟧ cellules, environ ⟦#6⟧ km × ⟦#7⟧ km à l’équateur). Les deux rangées polaires de demi-largeur de la grille⟦4⟧ne sont pas utilisées ; la grille s’arrête donc à ±⟦#8⟧°. Les vents sont moyennés depuis la grille⟦5⟧décalée vers les centres des cellules. Masse volumique de l’air de la couche la plus basse ρ = p/(R T) ; la hauteur z du vent du niveau le plus bas découle de la pression et de la température horaires, et la vitesse de frottement⟦6⟧est obtenue à partir du profil de longueur de mélange en paroi lisse de Pähtz &amp; Durán (⟦#9⟧, éq. ⟦#10⟧) sous contrainte constante à cette hauteur (sans longueur de rugosité). La couche⟦7⟧la plus basse est épaisse : cette hauteur est donc de ⟦#11⟧–⟦#12⟧ m au-dessus de la surface (médiane ⟦#13⟧ m ;⟦8⟧⟦#14⟧–⟦#15⟧ m,⟦9⟧⟦#16⟧–⟦#17⟧ m). Données et documentation : <a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">⟦10⟧v1.0 sur le Penn State Data Commons</a> ; la copie prête à l’analyse lue par l’atlas, <a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦11⟧</a>, avec des <a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">exemples Python pour la lire et la représenter</a>.

# Cell panel

## c.771e2d74 (Cell panel)
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ µm (centre) to ⟦#1⟧ µm (rim), radius logarithmic in ⟦1⟧; ⟦2⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current grain diameter. Where⟦3⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, and⟦4⟧can turn by up to ⟦#3⟧° with a small change of grain diameter. The modes depend on the whole flux rose rather than on its resultant: ⟦5⟧ follows the crest orientation ⟦6⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦7⟧.
FR: Azimuts des modes (vers) pour ⟦0⟧ = ⟦#0⟧ µm (centre) à ⟦#1⟧ µm (bord), rayon logarithmique en ⟦1⟧ ; ⟦2⟧ est un axe, tracé dans les deux sens. Les tracés s’interrompent là où un mode n’est pas défini (aucun flux le définissant). Cercle en tirets et points : diamètre des grains actuel. Là où⟦3⟧est faible (inférieur à environ ⟦#2⟧), le transport dans des directions opposées se compense presque, et⟦4⟧peut tourner jusqu’à ⟦#3⟧° pour une faible variation du diamètre des grains. Les modes dépendent de l’ensemble de la rose des flux plutôt que de sa résultante : ⟦5⟧ suit l’orientation de la crête ⟦6⟧ qui maximise le transport brut à travers les crêtes, et peut ainsi rester stable et différer de⟦7⟧.

# Interface

## search.goTo (Interface)
EN: Go to
FR: Aller à

# Layer popovers

## c.97317967 (Layer popovers)
EN: The other layers, the cell panel and the downloads are unchanged.
FR: Les autres calques, le panneau des cellules et les téléchargements restent inchangés.

## c.33496956 (Layer popovers)
EN: While it is on, the dune map is drawn at no more than ⟦#0⟧ % opacity, so the colours of the dune cells show through it. Its own opacity setting applies again when Dunes only is off.
FR: Tant qu’elle est activée, la carte des dunes est tracée à une opacité d’au plus ⟦#0⟧ %, afin que les couleurs des cellules de dunes transparaissent à travers elle. Son propre réglage d’opacité s’applique de nouveau lorsque Dunes seulement est désactivé.

## c.0b5ec76e (Layer popovers)
EN: Dunes only draws the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in the cells of the selected wind dataset that contain mapped dunes.
FR: Dunes seulement n’affiche les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) que dans les cellules du jeu de données de vent sélectionné qui contiennent des dunes cartographiées.

# Unused (English changed or removed)

## c.30170ce5 (Unused (English changed or removed))
EN: Dunes only draws the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in the cells of the selected wind dataset that contain mapped dunes; the other cells of these layers are left empty.
FR: Dunes seulement n’affiche les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) que dans les cellules du jeu de données de vent sélectionné qui contiennent des dunes cartographiées ; les autres cellules de ces calques restent vides.

## c.037dc143 (Unused (English changed or removed))
EN: The default, ⟦#0⟧ m/s, is the value used for the global analysis of⟦0⟧: a common global approximation used in place of more accurate local values, not calibrated for any site. Values between ⟦#1⟧ and ⟦#2⟧ m/s are typical; for loose, dry sand the threshold depends mainly on grain size and density.
FR: La valeur par défaut, ⟦#0⟧ m/s, est celle utilisée pour l’analyse globale de⟦0⟧: une approximation globale courante, utilisée à la place de valeurs locales plus précises, et non calibrée pour un site particulier. Des valeurs comprises entre ⟦#1⟧ et ⟦#2⟧ m/s sont typiques ; pour un sable sec et meuble, le seuil dépend principalement de la taille et de la masse volumique des grains.

## c.785bb05c (Unused (English changed or removed))
EN: The ⟦#0⟧° dune cells of the dune map grouped into ⟦#1⟧ dune fields of ⟦#2⟧-connected cells; polygon edges follow the grid-cell boundaries exactly. Area is the sum of spherical cell areas.
FR: Les cellules de dunes à ⟦#0⟧° de la carte des dunes, regroupées en ⟦#1⟧ champs de dunes de cellules ⟦#2⟧-connexes ; les contours des polygones suivent exactement les limites des cellules de la grille. La superficie est la somme des aires sphériques des cellules.

## c.a776804c (Unused (English changed or removed))
EN: Net along-crest over net across-crest sand flux for crests of the bed-instability orientation,⟦0⟧. Along-crest transport tends to keep crests straight, while across-crest transport, which drives migration, tends to make them sinuous (⟦1⟧), so higher values suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures the asymmetry of sand fluxes that makes dunes such as barchans asymmetric (⟦2⟧). In the sand-covered-bed examples of⟦3⟧it is about ⟦#0⟧ for transverse, ⟦#1⟧ for oblique and ⟦#2⟧ for longitudinal dunes. The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#3⟧).
FR: Rapport du flux de sable net le long de la crête au flux net à travers la crête pour les crêtes dans l’orientation du mode d’instabilité du lit,⟦0⟧. Le transport le long de la crête tend à maintenir les crêtes rectilignes, tandis que le transport à travers la crête, qui entraîne la migration, tend à les rendre sinueuses (⟦1⟧) ; des valeurs plus élevées suggèrent donc des dunes à crête longue plus rectilignes sur des lits couverts de sable. Pour les dunes migrant sur des lits pauvres en sable, le rapport mesure l’asymétrie des flux de sable qui rend asymétriques des dunes telles que les barkhanes (⟦2⟧). Dans les exemples sur lit couvert de sable de⟦3⟧il vaut environ ⟦#0⟧ pour les dunes transverses, ⟦#1⟧ pour les dunes obliques et ⟦#2⟧ pour les dunes longitudinales. Le rapport tend vers l’infini lorsque son dénominateur (un flux net) tend vers zéro (valeurs affichées écrêtées à ±⟦#3⟧).

## c.4c826ecf (Unused (English changed or removed))
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all speed and direction bins: the volume of packed sand per metre width that the wind could move per year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with the threshold set by the slider. The two cannot be converted into each other without the wind-speed distribution, and Fryberger's energy classes (below ⟦#2⟧, ⟦#3⟧–⟦#4⟧ and above ⟦#5⟧ vector units) do not apply to these values.
FR: Flux de sable saturé sur lit plat moyenné dans le temps,⟦0⟧sur l’ensemble des classes de vitesse et de direction : le volume de sable compacté par mètre de largeur que le vent pourrait déplacer par an sur un lit plat entièrement recouvert de sable meuble (⟦1⟧). Comme le potentiel de dérive de⟦2⟧il mesure la capacité du vent à transporter le sable, mais il s’agit d’une grandeur différente : le⟦3⟧de Fryberger est exprimé en unités vectorielles et calculé à partir des vitesses du vent à ⟦#0⟧ m en nœuds selon⟦4⟧avec un seuil de ⟦#1⟧ nœuds, tandis que ce⟦5⟧est un flux physique calculé à partir de la vitesse de frottement, avec le seuil fixé par le curseur. Les deux ne peuvent être convertis l’un en l’autre sans la distribution des vitesses du vent, et les classes d’énergie de Fryberger (moins de ⟦#2⟧, ⟦#3⟧–⟦#4⟧ et plus de ⟦#5⟧ unités vectorielles) ne s’appliquent pas à ces valeurs.

## c.4837126c (Unused (English changed or removed))
EN: Direction of the time-averaged flat-bed flux vector,⟦0⟧, the direction sand moves, as a compass bearing (clockwise from north). Poorly defined where⟦1⟧is low, because transport in opposing directions nearly cancels.
FR: Direction du vecteur flux sur lit plat moyenné dans le temps,⟦0⟧, c’est-à-dire la direction vers laquelle se déplace le sable, exprimée en azimut (dans le sens horaire depuis le nord). Mal définie là où⟦1⟧est faible, car les transports de sens opposés se compensent presque entièrement.

## c.e214427e (Unused (English changed or removed))
EN: Directional variability of sand flux: ratio of resultant to total drift potential,⟦0⟧(⟦#0⟧ = multidirectional, ⟦#1⟧ = unidirectional). Undefined where there is no sand flux (⟦1⟧).⟦2⟧classes: below ⟦#2⟧ low (complex or obtuse bimodal winds), ⟦#3⟧–⟦#4⟧ intermediate (obtuse to acute bimodal winds), above ⟦#5⟧ high (unimodal winds). Only transport above the threshold counts here, and the flux law differs from Fryberger's, so use the classes as a guide.
FR: Variabilité directionnelle du flux de sable : rapport du potentiel de dérive résultant au potentiel de dérive total,⟦0⟧(⟦#0⟧ = multidirectionnel, ⟦#1⟧ = unidirectionnel). Non défini là où il n’y a pas de flux de sable (⟦1⟧). Classes de⟦2⟧: moins de ⟦#2⟧, faible (vents complexes ou bimodaux obtus) ; ⟦#3⟧–⟦#4⟧, intermédiaire (vents bimodaux obtus à aigus) ; plus de ⟦#5⟧, élevé (vents unimodaux). Seul le transport au-dessus du seuil est pris en compte ici, et la loi de flux diffère de celle de Fryberger : utilisez donc ces classes à titre indicatif.

## c.d92bedb9 (Unused (English changed or removed))
EN: Mean total vegetation cover (green plus dry vegetation, including trees; % of the ground), ⟦#0⟧–⟦#1⟧, from the⟦0⟧Fractional Cover v3.1 (⟦#2⟧ m, monthly) averaged onto the ⟦#3⟧° cells over the months with valid data. Calibrated against Australian field sites; saturates under closed canopies. Total cover includes non-photosynthetic vegetation (dry and dead plant material) as well as green vegetation, so it can be substantial where little green vegetation is visible; compare it with the aridity index. No data over ocean, Antarctica, land north of ⟦#4⟧° N and the ⟦#5⟧° meridian cells. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full monthly time series at⟦1⟧</a>.
FR: Couvert végétal total moyen (végétation verte et sèche, arbres compris ; % du sol), ⟦#0⟧–⟦#1⟧, issu du⟦0⟧Fractional Cover v3.1 (⟦#2⟧ m, mensuel), moyenné sur les cellules de ⟦#3⟧° pour les mois disposant de données valides. Calibré sur des sites de terrain australiens ; sature sous les canopées fermées. Le couvert total inclut la végétation non photosynthétique (matériel végétal sec et mort) ainsi que la végétation verte ; il peut donc être important là où peu de végétation verte est visible ; à comparer avec l’indice d’aridité. Pas de données sur l’océan, l’Antarctique, les terres au nord de ⟦#4⟧° N et les cellules du méridien ⟦#5⟧°. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explorer la série temporelle mensuelle complète sur⟦1⟧</a>.

## c.edcb7fbe (Unused (English changed or removed))
EN: <strong>Wind histograms and sand-flux fields (⟦0⟧⟦#0⟧°)</strong>:⟦1⟧⟦#1⟧–⟦#2⟧ hourly ⟦#3⟧ m winds (⟦#4⟧°;⟦2⟧,⟦3⟧) and the qsat parameters of⟦4⟧, Supplementary Data (⟦5⟧,⟦6⟧). Drift potentials (⟦7⟧,⟦8⟧,⟦9⟧,⟦10⟧) and crest fluxes are averages over the hourly record.
FR: <strong>Histogrammes de vent et champs de flux de sable (⟦0⟧⟦#0⟧°)</strong> :⟦1⟧⟦#1⟧–⟦#2⟧, vents horaires à ⟦#3⟧ m (⟦#4⟧°;⟦2⟧,⟦3⟧) et paramètres qsat de⟦4⟧, données supplémentaires (⟦5⟧,⟦6⟧). Les potentiels de dérive (⟦7⟧,⟦8⟧,⟦9⟧,⟦10⟧) et les flux de crête sont des moyennes sur la série horaire.

## c.79930b39 (Unused (English changed or removed))
EN: <strong>Aridity index</strong>: Global Aridity Index v3.1 (⟦0⟧; Zomer,⟦1⟧), ⟦#0⟧–⟦#1⟧, native ⟦#2⟧″ grid,⟦2⟧; ocean and Antarctica (south of ⟦#3⟧° S) have no data, values ≥ ⟦#4⟧ are at the top of the source range. The click panel shows the mean over the cell of the selected wind dataset.
FR: <strong>Indice d’aridité</strong> : Global Aridity Index v3.1 (⟦0⟧; Zomer,⟦1⟧), ⟦#0⟧–⟦#1⟧, grille native à ⟦#2⟧″,⟦2⟧ ; les océans et l’Antarctique (au sud de ⟦#3⟧° S) n’ont pas de données, et les valeurs ≥ ⟦#4⟧ se situent au sommet de la plage de la source. Le panneau affiché au clic indique la moyenne sur la cellule du jeu de données de vent sélectionné.

## c.d9d754b4 (Unused (English changed or removed))
EN: <strong>Vegetation cover</strong>:⟦0⟧Fractional Cover v3.1 (⟦1⟧;⟦2⟧), total vegetation cover (photosynthetic + non-photosynthetic vegetation), mean of the monthly ⟦#0⟧ m values ⟦#1⟧–⟦#2⟧ on the ⟦#3⟧° grid,⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧, hosted by⟦5⟧; the vegetation product of⟦6⟧. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full time series at⟦7⟧</a>. The click panel shows the cell mean and the number of valid months.
FR: <strong>Couvert végétal</strong> :⟦0⟧Fractional Cover v3.1 (⟦1⟧;⟦2⟧), couvert végétal total (végétation photosynthétique + végétation non photosynthétique), moyenne des valeurs mensuelles à ⟦#0⟧ m de ⟦#1⟧–⟦#2⟧ sur la grille à ⟦#3⟧°,⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧, hébergé par⟦5⟧ ; le produit de végétation de⟦6⟧. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explorer la série temporelle complète sur⟦7⟧</a>. Le panneau de clic affiche la moyenne de la cellule et le nombre de mois valides.

## c.f43b95cb (Unused (English changed or removed))
EN: Earth and Mars: what can be compared
FR: Terre et Mars : ce qui peut être comparé

## c.ebb9f8a1 (Unused (English changed or removed))
EN: ⟦0⟧values on the two planets can therefore be compared in order of magnitude, not as precise numbers.⟦1⟧,⟦2⟧and the mode directions compare more directly, but each depends on the threshold or grain-diameter setting.
FR: Les valeurs de⟦0⟧sur les deux planètes peuvent donc être comparées en ordre de grandeur, et non comme des valeurs précises.⟦1⟧,⟦2⟧et les directions des modes se comparent plus directement, mais chacun dépend du réglage du seuil ou du diamètre des grains.

## c.6671ac04 (Unused (English changed or removed))
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ m/s (centre) to ⟦#1⟧ m/s (rim); ⟦1⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current threshold. Where⟦2⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, so⟦3⟧is poorly defined and can swing by up to ⟦#3⟧° with a small change of threshold or wind dataset. The modes depend on the whole flux rose rather than on its resultant: ⟦4⟧ follows the crest orientation ⟦5⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦6⟧.
FR: Azimuts des modes (vers) pour ⟦0⟧ = ⟦#0⟧ m/s (centre) à ⟦#1⟧ m/s (bord) ; ⟦1⟧ est un axe, tracé dans les deux sens. Les tracés s’interrompent là où un mode n’est pas défini (aucun flux déterminant). Anneau en tirets et points : seuil actuel. Là où⟦2⟧est faible (en dessous d’environ ⟦#2⟧), les transports de sens opposés se compensent presque, de sorte que⟦3⟧est mal définie et peut varier jusqu’à ⟦#3⟧° pour une faible modification du seuil ou du jeu de données de vent. Les modes dépendent de l’ensemble de la rose des flux plutôt que de sa résultante : ⟦4⟧ suit l’orientation de la crête ⟦5⟧ qui maximise le transport brut à travers les crêtes ; cette direction peut donc rester stable et différer de⟦6⟧.

## c.e7c53466 (Unused (English changed or removed))
EN: The median diameter ⟦0⟧ of the sand grains. Every grain-size-dependent map layer (its ⓘ says so) and the cell panel use the value set here. The threshold friction velocity ⟦1⟧ is computed for every hour from ⟦2⟧ and that hour's air density and temperature (⟦3⟧).
FR: Le diamètre médian ⟦0⟧ des grains de sable. Chaque calque de la carte dépendant de la taille des grains (son ⓘ l’indique) ainsi que le panneau de cellule utilisent la valeur définie ici. La vitesse de frottement seuil ⟦1⟧ est calculée pour chaque heure à partir de ⟦2⟧ et de la masse volumique et de la température de l’air à cette heure (⟦3⟧).

## c.a2cd8175 (Unused (English changed or removed))
EN: Divergence of the time-averaged saturated sand-flux vector (magnitude⟦0⟧, direction⟦1⟧) on the Mars sphere, following⟦2⟧, Methods⟦3⟧:⟦4⟧with⟦5⟧,⟦6⟧. By conservation of sand mass, negative values (flux convergence) imply deposition and positive values (flux divergence) erosion. The values assume a saturated flux and an unlimited supply of loose sand, so on rock, crusted or vegetated surfaces actual erosion is limited by the sand available.
FR: Divergence du vecteur flux de sable saturé moyenné dans le temps (intensité⟦0⟧, direction⟦1⟧) sur la sphère martienne, d’après⟦2⟧, Méthodes⟦3⟧:⟦4⟧avec⟦5⟧,⟦6⟧. Par conservation de la masse de sable, les valeurs négatives (convergence du flux) impliquent un dépôt et les valeurs positives (divergence du flux) une érosion. Ces valeurs supposent un flux saturé et un apport illimité de sable meuble ; ainsi, sur les surfaces rocheuses, encroûtées ou végétalisées, l’érosion réelle est limitée par le sable disponible.

## c.76650ed5 (Unused (English changed or removed))
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ µm (centre) to ⟦#1⟧ µm (rim), radius logarithmic in ⟦1⟧; ⟦2⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current grain diameter. Where⟦3⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, so⟦4⟧is poorly defined and can swing by up to ⟦#3⟧° with a small change of grain diameter. The modes depend on the whole flux rose rather than on its resultant: ⟦5⟧ follows the crest orientation ⟦6⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦7⟧.
FR: Azimuts des modes (vers) pour ⟦0⟧ = ⟦#0⟧ µm (centre) à ⟦#1⟧ µm (bord), rayon logarithmique en ⟦1⟧ ; ⟦2⟧ est un axe, tracé dans les deux sens. Les tracés s’interrompent là où un mode n’est pas défini (aucun flux le définissant). Cercle en tirets et points : diamètre des grains actuel. Là où⟦3⟧est faible (inférieur à environ ⟦#2⟧), le transport dans des directions opposées se compense presque, de sorte que⟦4⟧est mal définie et peut varier jusqu’à ⟦#3⟧° pour une faible variation du diamètre des grains. Les modes dépendent de l’ensemble de la rose des flux plutôt que de sa résultante : ⟦5⟧ suit l’orientation de la crête ⟦6⟧ qui maximise le transport brut à travers les crêtes, et peut ainsi rester stable et différer de⟦7⟧.

## c.6cd16937 (Unused (English changed or removed))
EN: <strong>Winds (⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧)</strong>: hourly lowest-level winds, temperature and surface pressure of the⟦2⟧Ames⟦3⟧FV3-based Mars Global Climate Model (c48 reference simulation, 6th simulated year), regridded to ⟦#1⟧° × ⟦#2⟧° (a cell is about ⟦#3⟧ km across at the equator, larger than most dune fields): ⟦#4⟧ hourly samples, one Mars year. The map draws each cell as one square, so a field that changes strongly from cell to cell, as⟦4⟧often does at low latitudes, looks blocky. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature (⟦#5⟧–⟦#6⟧ m over all cells and hours; ⟦#7⟧–⟦#8⟧ m in ⟦#9⟧ % of the hours of dune cells; the cell panel gives the range of the selected cell), and the friction velocity⟦5⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#10⟧, eq. ⟦#11⟧) under constant stress at that height (no roughness length). Explore and download the full model output in the <a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦6⟧Ames⟦7⟧Data Portal web interface</a>.
FR: <strong>Vents (⟦0⟧Mars⟦1⟧, version bêta ⟦#0⟧)</strong> : vents horaires du niveau le plus bas, température et pression de surface du modèle climatique global martien⟦2⟧Ames⟦3⟧fondé sur FV3 (simulation de référence c48, 6e année simulée), rééchantillonnés sur une grille de ⟦#1⟧° × ⟦#2⟧° (une cellule mesure environ ⟦#3⟧ km de côté à l’équateur, soit plus grande que la plupart des champs de dunes) : ⟦#4⟧ échantillons horaires, une année martienne. La carte représente chaque cellule par un carré ; un champ qui varie fortement d’une cellule à l’autre, comme le fait souvent⟦4⟧aux basses latitudes, paraît donc pixellisé. Masse volumique de l’air de la couche la plus basse ρ = p/(R T) ; la hauteur z du vent du niveau le plus bas découle de la pression et de la température horaires (⟦#5⟧–⟦#6⟧ m sur l’ensemble des cellules et des heures ; ⟦#7⟧–⟦#8⟧ m pendant ⟦#9⟧ % des heures des cellules dunaires ; le panneau de la cellule indique la plage de la cellule sélectionnée), et la vitesse de frottement⟦5⟧est obtenue à partir du profil de longueur de mélange en paroi lisse de Pähtz &amp; Durán (⟦#10⟧, éq. ⟦#11⟧) sous contrainte constante à cette hauteur (sans longueur de rugosité). Explorez et téléchargez l’ensemble des sorties du modèle dans l’interface web <a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦6⟧Ames⟦7⟧Data Portal</a>.

## c.5228f7bf (Unused (English changed or removed))
EN: <strong>Winds (⟦0⟧v1.0 reanalysis, Mars Year ⟦#0⟧)</strong>: hourly analysis ensemble mean of the lowest-level winds, temperature and surface pressure of the Ensemble Mars Atmosphere Reanalysis System (⟦1⟧) v1.0 (⟦2⟧; read from the analysis-ready⟦3⟧copy), Mars Year ⟦#1⟧, on its native grid of ⟦#2⟧° in longitude × ⟦#3⟧° in latitude (⟦#4⟧ × ⟦#5⟧ cells, about ⟦#6⟧ km × ⟦#7⟧ km at the equator). The two half-width polar rows of⟦4⟧are not used, so the grid ends at ±⟦#8⟧°: there is no⟦5⟧cell poleward of it. The winds are averaged from the staggered⟦6⟧grid onto the cell centres. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature, and the friction velocity⟦7⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#9⟧, eq. ⟦#10⟧) under constant stress at that height (no roughness length). The lowest⟦8⟧layer is thick, so that height is ⟦#11⟧–⟦#12⟧ m above the surface (median ⟦#13⟧ m;⟦9⟧⟦#14⟧–⟦#15⟧ m,⟦10⟧⟦#16⟧–⟦#17⟧ m): the wind and⟦11⟧refer to a much higher level than in the other Mars datasets. Data and documentation: <a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">⟦12⟧v1.0 at the Penn State Data Commons</a>; the analysis-ready copy read by the atlas, <a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦13⟧</a>, with <a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">Python examples for reading and plotting it</a>.
FR: <strong>Vents (⟦0⟧v1.0, réanalyse, année martienne ⟦#0⟧)</strong> : moyenne horaire de l’ensemble d’analyses des vents du niveau le plus bas, de la température et de la pression de surface de l’Ensemble Mars Atmosphere Reanalysis System (⟦1⟧) v1.0 (⟦2⟧ ; lue dans la copie⟦3⟧prête à l’analyse), année martienne ⟦#1⟧, sur sa grille native de ⟦#2⟧° en longitude × ⟦#3⟧° en latitude (⟦#4⟧ × ⟦#5⟧ cellules, environ ⟦#6⟧ km × ⟦#7⟧ km à l’équateur). Les deux rangées polaires de demi-largeur de la grille⟦4⟧ne sont pas utilisées ; la grille s’arrête donc à ±⟦#8⟧° : il n’y a aucune cellule⟦5⟧au-delà vers le pôle. Les vents sont moyennés depuis la grille⟦6⟧décalée vers les centres des cellules. Masse volumique de l’air de la couche la plus basse ρ = p/(R T) ; la hauteur z du vent du niveau le plus bas découle de la pression et de la température horaires, et la vitesse de frottement⟦7⟧est obtenue à partir du profil de longueur de mélange en paroi lisse de Pähtz &amp; Durán (⟦#9⟧, éq. ⟦#10⟧) sous contrainte constante à cette hauteur (sans longueur de rugosité). La couche⟦8⟧la plus basse est épaisse : cette hauteur est donc de ⟦#11⟧–⟦#12⟧ m au-dessus de la surface (médiane ⟦#13⟧ m ;⟦9⟧⟦#14⟧–⟦#15⟧ m,⟦10⟧⟦#16⟧–⟦#17⟧ m) : le vent et⟦11⟧se rapportent à un niveau bien plus élevé que dans les autres jeux de données martiens. Données et documentation : <a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">⟦12⟧v1.0 sur le Penn State Data Commons</a> ; la copie prête à l’analyse lue par l’atlas, <a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦13⟧</a>, avec des <a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">exemples Python pour la lire et la représenter</a>.

## c.3ae7fe48 (Unused (English changed or removed))
EN: The Wind dataset selector switches between wind datasets (⟦0⟧, ⟦#0⟧°, ⟦#1⟧–⟦#2⟧;⟦1⟧, ⟦#3⟧°, ⟦#4⟧–⟦#5⟧).⟦2⟧, used by⟦3⟧, is a land-surface rerun driven by⟦4⟧atmospheric fields interpolated to its grid (Muñoz-Sabater et al. ⟦#6⟧), so its winds are not an independent estimate, and the datasets can still differ: e.g.,⟦5⟧reports⟦6⟧⟦#7⟧ m wind speeds ⟦#8⟧–⟦#9⟧ % below those of⟦7⟧. Where the datasets give different results, treat them as uncertain. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
FR: Le sélecteur Jeu de données de vent permet de choisir entre des jeux de données de vent (⟦0⟧, ⟦#0⟧°, ⟦#1⟧–⟦#2⟧ ;⟦1⟧, ⟦#3⟧°, ⟦#4⟧–⟦#5⟧).⟦2⟧, utilisé par⟦3⟧, est une réexécution de la surface continentale pilotée par les champs atmosphériques de⟦4⟧interpolés sur sa grille (Muñoz-Sabater et al. ⟦#6⟧) : ses vents ne constituent donc pas une estimation indépendante, et les jeux de données peuvent malgré tout différer : par exemple,⟦5⟧indique des vitesses du vent à ⟦#7⟧ m de⟦6⟧inférieures de ⟦#8⟧–⟦#9⟧ % à celles de⟦7⟧. Là où les jeux de données donnent des résultats différents, considérez-les comme incertains. Les calques de vent et de flux de sable ainsi que le panneau de la cellule suivent la sélection ; le masque des champs de dunes et les calques d’aridité et de végétation sont les mêmes pour tous les jeux de données.

## c.5cedc7f4 (Unused (English changed or removed))
EN: <strong>Winds and grid</strong>: Earth uses decades of hourly reanalysis winds (e.g.,⟦0⟧, ⟦#0⟧° grid, ⟦#1⟧–⟦#2⟧); Mars uses one Mars year (⟦#3⟧ sols, about ⟦#4⟧ Earth years) of winds from a climate-model simulation or a reanalysis (e.g.,⟦1⟧, ⟦#5⟧° grid), so one Mars cell can span several dune fields and year-to-year variability is not sampled.
FR: <strong>Vents et grille</strong> : sur Terre, on utilise des décennies de vents horaires issus de réanalyses (p. ex.⟦0⟧, grille à ⟦#0⟧°, ⟦#1⟧–⟦#2⟧) ; sur Mars, on utilise une année martienne (⟦#3⟧ sols, soit environ ⟦#4⟧ années terrestres) de vents issus d’une simulation de modèle climatique ou d’une réanalyse (p. ex.⟦1⟧, grille à ⟦#5⟧°), de sorte qu’une cellule martienne peut couvrir plusieurs champs de dunes et que la variabilité interannuelle n’est pas échantillonnée.

## c.2d038d14 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (land–sea mask fraction above ⟦#0⟧). This cell is mainly water, so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦0⟧(coastal cells can differ between the land masks of the datasets).
FR: L’atlas calcule les roses des vents et les statistiques de flux de sable uniquement pour les cellules terrestres (fraction du masque terre–mer supérieure à ⟦#0⟧). Cette cellule est principalement constituée d’eau ; l’atlas ne dispose donc d’aucune statistique pour elle. Choisissez une cellule terrestre voisine, ou passez à⟦0⟧(les cellules côtières peuvent différer entre les masques des terres des jeux de données).

## c.e5b72715 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (land–sea mask fraction above ⟦#0⟧, i.e. any land in the cell). This cell has no land (land–sea mask fraction ⟦#1⟧), so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦0⟧(coastal cells can differ between the land masks of the datasets).
FR: L’atlas calcule les roses des vents et les statistiques de flux de sable uniquement pour les cellules terrestres (fraction du masque terre–mer supérieure à ⟦#0⟧, c’est-à-dire toute cellule contenant des terres). Cette cellule ne comporte aucune terre (fraction du masque terre–mer ⟦#1⟧) ; l’atlas ne dispose donc d’aucune statistique pour elle. Choisissez une cellule terrestre voisine, ou passez à⟦0⟧(les cellules côtières peuvent différer entre les masques des terres des jeux de données).

## c.8f6fed46 (Unused (English changed or removed))
EN: The Wind dataset selector switches between Mars wind datasets (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧° × ⟦#2⟧°;⟦2⟧, ⟦#3⟧°), each one Mars year of lowest-level winds on its own grid (⟦3⟧: free-running climate-model simulation;⟦4⟧and⟦5⟧: reanalysis of Mars Year ⟦#4⟧, with spacecraft observations of the atmosphere assimilated into a climate model). The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. Where the datasets give different results, treat them as uncertain. No⟦6⟧data poleward of ⟦#5⟧° N: the northernmost cells of its grid are centred at ⟦#6⟧° N.
FR: Le sélecteur Jeu de données de vent permet de passer d’un jeu de données de vent martien à l’autre (⟦0⟧, ⟦#0⟧° ;⟦1⟧, ⟦#1⟧° × ⟦#2⟧° ;⟦2⟧, ⟦#3⟧°), chacun couvrant une année martienne de vents du niveau le plus bas sur sa propre grille (⟦3⟧ : simulation libre d’un modèle climatique ;⟦4⟧et⟦5⟧: réanalyse de l’année martienne ⟦#4⟧, avec des observations de l’atmosphère faites par des sondes spatiales assimilées dans un modèle climatique). Les calques de vent et de flux de sable ainsi que le panneau de la cellule suivent la sélection ; la carte des dunes et l’altitude sont les mêmes pour tous les jeux de données. Lorsque les jeux de données donnent des résultats différents, considérez ces résultats comme incertains. Pas de données⟦6⟧au-delà de ⟦#5⟧° N vers le pôle : les cellules les plus septentrionales de sa grille sont centrées sur ⟦#6⟧° N.

## c.350b19fe (Unused (English changed or removed))
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all N samples of the Mars year: the volume of packed sand per metre width that the wind could move per Earth year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with a threshold computed from the grain diameter. The two cannot be converted into each other, and Fryberger's energy classes do not apply to these values.
FR: Flux de sable saturé sur lit plat moyenné dans le temps,⟦0⟧sur l’ensemble des N échantillons de l’année martienne : le volume de sable compacté par mètre de largeur que le vent pourrait déplacer par année terrestre sur un lit plat entièrement couvert de sable meuble (⟦1⟧). Comme le potentiel de dérive de⟦2⟧il mesure la capacité du vent à transporter le sable, mais il s’agit d’une grandeur différente : le⟦3⟧de Fryberger est exprimé en unités vectorielles et calculé à partir des vitesses du vent à ⟦#0⟧ m en nœuds selon⟦4⟧avec un seuil de ⟦#1⟧ nœuds, tandis que ce⟦5⟧est un flux physique calculé à partir de la vitesse de frottement avec un seuil déterminé à partir du diamètre des grains. Les deux ne peuvent pas être convertis l’un en l’autre, et les classes d’énergie de Fryberger ne s’appliquent pas à ces valeurs.

## c.005fdc07 (Unused (English changed or removed))
EN: <strong>Control</strong>: on Earth the slider sets one threshold friction velocity⟦0⟧for the whole record (default ⟦#0⟧ m/s); on Mars it sets the median grain diameter d (default ⟦#1⟧ µm), and the threshold is computed for every time step of the wind record from d and that step's air density and temperature.
FR: <strong>Contrôle</strong> : sur Terre, le curseur fixe une vitesse de frottement seuil⟦0⟧unique pour l’ensemble de l’enregistrement (valeur par défaut ⟦#0⟧ m/s) ; sur Mars, il fixe le diamètre médian des grains d (valeur par défaut ⟦#1⟧ µm), et le seuil est calculé pour chaque pas de temps de l’enregistrement de vent à partir de d ainsi que de la masse volumique et de la température de l’air à ce pas de temps.

## c.b8bd4f5a (Unused (English changed or removed))
EN: <strong>Sand-flux fields</strong>: for every time step of the wind dataset, the threshold and the saturated transport rate of⟦0⟧at the selected median grain diameter d (grain density ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), averaged over the year; drift potentials, crest fluxes and dune-orientation modes follow the methods outlined in⟦1⟧. Fluxes are volumes of packed sand (packing fraction ⟦#2⟧, pore space included) per metre width per Earth year (⟦#3⟧ days), in m²/yr, as on Earth.
FR: <strong>Champs de flux de sable</strong> : pour chaque pas de temps du jeu de données de vent, le seuil et le débit de transport saturé selon⟦0⟧au diamètre médian des grains d sélectionné (masse volumique des grains ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), moyennés sur l’année ; les potentiels de dérive, les flux de crête et les modes d’orientation des dunes suivent les méthodes décrites dans⟦1⟧. Les flux sont des volumes de sable compacté (compacité ⟦#2⟧, porosité incluse) par mètre de largeur et par année terrestre (⟦#3⟧ jours), en m²/yr, comme sur Terre.

## c.8cfd1c5c (Unused (English changed or removed))
EN: <strong>Control</strong>: on Earth the slider sets one threshold friction velocity⟦0⟧for all hours (default ⟦#0⟧ m/s); on Mars it sets the median grain diameter d (default ⟦#1⟧ µm), and the threshold is computed for every hour from d and that hour's air density and temperature.
FR: <strong>Contrôle</strong> : sur Terre, le curseur fixe une vitesse de frottement seuil⟦0⟧unique pour toutes les heures (valeur par défaut ⟦#0⟧ m/s) ; sur Mars, il fixe le diamètre médian des grains d (valeur par défaut ⟦#1⟧ µm), et le seuil est calculé pour chaque heure à partir de d ainsi que de la masse volumique et de la température de l’air à cette heure.

## c.182e7ab0 (Unused (English changed or removed))
EN: <strong>Transport law and wind profile</strong>: Earth uses the transport law of⟦0⟧, with⟦1⟧from the ⟦#0⟧ m wind and a roughness length of ⟦#1⟧ mm; Mars uses the transport law of⟦2⟧, with⟦3⟧from the lowest-level wind (≈ ⟦#2⟧–⟦#3⟧ m) and a smooth-wall profile without a roughness length.
FR: <strong>Loi de transport et profil de vent</strong> : sur Terre, on utilise la loi de transport de⟦0⟧, avec⟦1⟧à partir du vent à ⟦#0⟧ m et une longueur de rugosité de ⟦#1⟧ mm ; sur Mars, on utilise la loi de transport de⟦2⟧, avec⟦3⟧à partir du vent au niveau le plus bas (≈ ⟦#2⟧–⟦#3⟧ m) et un profil de paroi lisse sans longueur de rugosité.

## c.3b78ea48 (Unused (English changed or removed))
EN: <strong>Winds and grid</strong>: Earth uses a period of hourly reanalysis winds (e.g.,⟦0⟧, ⟦#0⟧° grid for ⟦#1⟧ years ⟦#2⟧–⟦#3⟧); Mars uses a representative year (⟦#4⟧ sols, about ⟦#5⟧ Earth years) of hourly simulated winds (e.g.,⟦1⟧, ⟦#6⟧° grid), so one Mars cell can span several dune fields and year-to-year variability is not sampled.
FR: <strong>Vents et grille</strong> : sur Terre, on utilise une période de vents horaires issus de réanalyses (p. ex.⟦0⟧, grille à ⟦#0⟧° sur ⟦#1⟧ ans, ⟦#2⟧–⟦#3⟧) ; sur Mars, on utilise une année représentative (⟦#4⟧ sols, soit environ ⟦#5⟧ années terrestres) de vents horaires simulés (p. ex.⟦1⟧, grille à ⟦#6⟧°), de sorte qu’une cellule martienne peut couvrir plusieurs champs de dunes et que la variabilité interannuelle n’est pas échantillonnée.

## c.6251885f (Unused (English changed or removed))
EN: <strong>Downloads</strong>: Earth cells provide a wind histogram and the fields against threshold (⟦0⟧,⟦1⟧); Mars cells provide the hourly wind and air series and the fields against grain diameter (⟦2⟧,⟦3⟧).
FR: <strong>Téléchargements</strong> : les cellules terrestres fournissent un histogramme des vents et les champs en fonction du seuil (⟦0⟧,⟦1⟧) ; les cellules martiennes fournissent les séries horaires de vent et d’air ainsi que les champs en fonction du diamètre des grains (⟦2⟧,⟦3⟧).

## c.d0a79f04 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (⟦0⟧land–sea mask fraction &gt; ⟦#0⟧). This cell is mainly water, so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦1⟧(coastal cells can differ between the two land masks).
FR: L’atlas calcule les roses des vents et les statistiques de flux de sable uniquement pour les cellules terrestres (fraction du masque terre–mer⟦0⟧&gt; ⟦#0⟧). Cette cellule est principalement constituée d’eau ; l’atlas ne dispose donc d’aucune statistique pour elle. Choisissez une cellule terrestre voisine, ou passez à⟦1⟧(les cellules côtières peuvent différer entre les deux masques des terres).

## c.0f4659f8 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (⟦0⟧land–sea mask fraction &gt; ⟦#0⟧). This cell has no land (land–sea mask fraction ⟦#1⟧), so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦1⟧(coastal cells can differ between the two land masks).
FR: L’atlas calcule les roses des vents et les statistiques de flux de sable uniquement pour les cellules terrestres (fraction du masque terre–mer⟦0⟧&gt; ⟦#0⟧). Cette cellule ne comporte aucune terre (fraction du masque terre–mer ⟦#1⟧) ; l’atlas ne dispose donc d’aucune statistique pour elle. Choisissez une cellule terrestre voisine, ou passez à⟦1⟧(les cellules côtières peuvent différer entre les deux masques des terres).

## c.55593e77 (Unused (English changed or removed))
EN: Fraction of time flat-bed friction velocity is above threshold⟦0⟧. The threshold is that hour's cessation threshold⟦1⟧of⟦2⟧.
FR: Fraction du temps pendant laquelle la vitesse de frottement sur lit plat dépasse le seuil⟦0⟧. Le seuil est, pour chaque heure, le seuil d’arrêt⟦1⟧de⟦2⟧.

## c.f1591313 (Unused (English changed or removed))
EN: Average above-threshold flat-bed friction velocity, normalised by threshold⟦0⟧. The threshold is that hour's cessation threshold⟦1⟧of⟦2⟧.
FR: Vitesse de frottement moyenne sur lit plat au-dessus du seuil, normalisée par le seuil⟦0⟧. Le seuil est, pour chaque heure, le seuil d’arrêt⟦1⟧de⟦2⟧.

## c.8ab3c2ce (Unused (English changed or removed))
EN: Fraction of bed-instability-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is that hour's cessation threshold⟦2⟧of⟦3⟧.
FR: Fraction du flux de crête en mode d’instabilité du lit (⟦0⟧) qui se produit lorsque la vitesse de frottement sur lit plat dépasse le seuil,⟦1⟧. Vaut ⟦#0⟧ là où le flux de crête ne se produit que lorsque le lit plat est sous le seuil ; non définie là où il n’y a pas de flux de crête. Le seuil est, pour chaque heure, le seuil d’arrêt⟦2⟧de⟦3⟧.

## c.8843ab2c (Unused (English changed or removed))
EN: Fraction of elongation-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is that hour's cessation threshold⟦2⟧of⟦3⟧.
FR: Fraction du flux de crête en mode d’allongement (⟦0⟧) qui se produit lorsque la vitesse de frottement sur lit plat dépasse le seuil,⟦1⟧. Vaut ⟦#0⟧ là où le flux de crête ne se produit que lorsque le lit plat est sous le seuil ; non définie là où il n’y a pas de flux de crête. Le seuil est, pour chaque heure, le seuil d’arrêt⟦2⟧de⟦3⟧.

## c.5dd4040a (Unused (English changed or removed))
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all N hours of the Mars year: the volume of packed sand per metre width that the wind could move per Earth year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with a threshold computed from the grain diameter. The two cannot be converted into each other, and Fryberger's energy classes do not apply to these values.
FR: Flux de sable saturé sur lit plat moyenné dans le temps,⟦0⟧sur l’ensemble des N heures de l’année martienne : le volume de sable compacté par mètre de largeur que le vent pourrait déplacer par année terrestre sur un lit plat entièrement couvert de sable meuble (⟦1⟧). Comme le potentiel de dérive de⟦2⟧il mesure la capacité du vent à transporter le sable, mais il s’agit d’une grandeur différente : le⟦3⟧de Fryberger est exprimé en unités vectorielles et calculé à partir des vitesses du vent à ⟦#0⟧ m en nœuds selon⟦4⟧avec un seuil de ⟦#1⟧ nœuds, tandis que ce⟦5⟧est un flux physique calculé à partir de la vitesse de frottement avec un seuil déterminé à partir du diamètre des grains. Les deux ne peuvent pas être convertis l’un en l’autre, et les classes d’énergie de Fryberger ne s’appliquent pas à ces valeurs.

## c.75d2f7e2 (Unused (English changed or removed))
EN: Mean over the Mars year of the hourly lowest-layer air density⟦0⟧of the wind dataset's climate model (⟦1⟧= mid pressure of the lowest layer,⟦2⟧= lowest-level temperature).
FR: Moyenne sur l’année martienne de la masse volumique horaire de l’air de la couche la plus basse⟦0⟧du modèle climatique du jeu de données de vent (⟦1⟧= pression au milieu de la couche la plus basse,⟦2⟧= température du niveau le plus bas).

## c.c238d4e5 (Unused (English changed or removed))
EN: <strong>Sand-flux fields</strong>: for every hour, the threshold and the saturated transport rate of⟦0⟧at the selected median grain diameter d (grain density ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), averaged over the year; drift potentials, crest fluxes and dune-orientation modes follow the methods outlined in⟦1⟧. Fluxes are volumes of packed sand (packing fraction ⟦#2⟧, pore space included) per metre width per Earth year (⟦#3⟧ days), in m²/yr, as on Earth.
FR: <strong>Champs de flux de sable</strong> : pour chaque heure, le seuil et le débit de transport saturé selon⟦0⟧au diamètre médian des grains d sélectionné (masse volumique des grains ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), moyennés sur l’année ; les potentiels de dérive, les flux de crête et les modes d’orientation des dunes suivent les méthodes décrites dans⟦1⟧. Les flux sont des volumes de sable compacté (compacité ⟦#2⟧, porosité incluse) par mètre de largeur et par année terrestre (⟦#3⟧ jours), en m²/yr, comme sur Terre.

## c.a6ed5186 (Unused (English changed or removed))
EN: Threshold friction velocity at this d, median over the hours
FR: Vitesse de frottement seuil pour ce d, médiane sur les heures

## c.b92a021d (Unused (English changed or removed))
EN: Hourly wind and air series (u, v, T, ρ, z)
FR: Séries horaires du vent et de l’air (u, v, T, ρ, z)

## c.f17421a6 (Unused (English changed or removed))
EN: The Wind dataset selector switches between reanalysis wind statistics (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧°; ⟦#2⟧–⟦#3⟧).⟦2⟧, used by⟦3⟧, is a land-surface rerun driven by⟦4⟧atmospheric fields interpolated to its grid (Muñoz-Sabater et al. ⟦#4⟧), so its winds are not an independent estimate, and the datasets can still differ: e.g.,⟦5⟧reports⟦6⟧⟦#5⟧ m wind speeds ⟦#6⟧–⟦#7⟧ % below those of⟦7⟧. Where the datasets give different results, treat them as uncertain. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
FR: Le sélecteur Jeu de données de vent permet de choisir entre des statistiques de vent issues de réanalyses (⟦0⟧, ⟦#0⟧° ;⟦1⟧, ⟦#1⟧° ; ⟦#2⟧–⟦#3⟧).⟦2⟧, utilisé par⟦3⟧, est une réexécution de la surface continentale pilotée par les champs atmosphériques de⟦4⟧interpolés sur sa grille (Muñoz-Sabater et al. ⟦#4⟧) : ses vents ne constituent donc pas une estimation indépendante, et les jeux de données peuvent malgré tout différer : par exemple,⟦5⟧indique des vitesses du vent à ⟦#5⟧ m de⟦6⟧inférieures de ⟦#6⟧–⟦#7⟧ % à celles de⟦7⟧. Là où les jeux de données donnent des résultats différents, considérez-les comme incertains. Les calques de vent et de flux de sable ainsi que le panneau de la cellule suivent la sélection ; le masque des champs de dunes et les calques d’aridité et de végétation sont les mêmes pour tous les jeux de données.

## c.c27adfd9 (Unused (English changed or removed))
EN: The Wind dataset selector switches between Mars wind datasets (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧° × ⟦#2⟧°;⟦2⟧, ⟦#3⟧°), each one Mars year of lowest-level winds on its own grid:⟦3⟧is a free-running climate-model simulation;⟦4⟧and⟦5⟧are reanalyses of Mars Year ⟦#4⟧, which assimilate spacecraft observations of the atmosphere into a climate model. The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. Where the datasets give different results, treat them as uncertain. No⟦6⟧data poleward of ⟦#5⟧° N: the northernmost cells of its grid are centred at ⟦#6⟧° N.
FR: Le sélecteur Jeu de données de vent permet de passer d’un jeu de données de vent martien à l’autre (⟦0⟧, ⟦#0⟧° ;⟦1⟧, ⟦#1⟧° × ⟦#2⟧° ;⟦2⟧, ⟦#3⟧°), chacun couvrant une année martienne de vents du niveau le plus bas sur sa propre grille :⟦3⟧est une simulation libre d’un modèle climatique ;⟦4⟧et⟦5⟧sont des réanalyses de l’année martienne ⟦#4⟧, qui assimilent dans un modèle climatique des observations de l’atmosphère faites par des sondes spatiales. Les calques de vent et de flux de sable ainsi que le panneau de la cellule suivent la sélection ; la carte des dunes et l’altitude sont les mêmes pour tous les jeux de données. Lorsque les jeux de données donnent des résultats différents, considérez ces résultats comme incertains. Pas de données⟦6⟧au-delà de ⟦#5⟧° N vers le pôle : les cellules les plus septentrionales de sa grille sont centrées sur ⟦#6⟧° N.

## c.692b1efa (Unused (English changed or removed))
EN: <strong>Winds (⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧)</strong>: hourly lowest-level winds, temperature and surface pressure of the⟦2⟧Ames⟦3⟧FV3-based Mars Global Climate Model (c48 reference simulation, 6th simulated year), regridded to ⟦#1⟧° × ⟦#2⟧° (a cell is about ⟦#3⟧ km across at the equator, larger than most dune fields): ⟦#4⟧ hourly samples, one Mars year. The map draws each cell as one square, so a field that changes strongly from cell to cell, as⟦4⟧often does at low latitudes, looks blocky. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature (⟦#5⟧–⟦#6⟧ m over all cells and hours; ⟦#7⟧–⟦#8⟧ m in ⟦#9⟧ % of the hours of dune cells; the cell panel gives the range of the selected cell), and the friction velocity⟦5⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#10⟧, eq. ⟦#11⟧) under constant stress at that height (no roughness length).
FR: <strong>Vents (⟦0⟧Mars⟦1⟧, version bêta ⟦#0⟧)</strong> : vents horaires du niveau le plus bas, température et pression de surface du modèle climatique global martien⟦2⟧Ames⟦3⟧fondé sur FV3 (simulation de référence c48, 6e année simulée), rééchantillonnés sur une grille de ⟦#1⟧° × ⟦#2⟧° (une cellule mesure environ ⟦#3⟧ km de côté à l’équateur, soit plus grande que la plupart des champs de dunes) : ⟦#4⟧ échantillons horaires, une année martienne. La carte représente chaque cellule par un carré ; un champ qui varie fortement d’une cellule à l’autre, comme le fait souvent⟦4⟧aux basses latitudes, paraît donc pixellisé. Masse volumique de l’air de la couche la plus basse ρ = p/(R T) ; la hauteur z du vent du niveau le plus bas découle de la pression et de la température horaires (⟦#5⟧–⟦#6⟧ m sur l’ensemble des cellules et des heures ; ⟦#7⟧–⟦#8⟧ m pendant ⟦#9⟧ % des heures des cellules dunaires ; le panneau de la cellule indique la plage de la cellule sélectionnée), et la vitesse de frottement⟦5⟧est obtenue à partir du profil de longueur de mélange en paroi lisse de Pähtz &amp; Durán (⟦#10⟧, éq. ⟦#11⟧) sous contrainte constante à cette hauteur (sans longueur de rugosité).

## c.c4698157 (Unused (English changed or removed))
EN: <strong>Saturated flux divergence</strong> ⟦0⟧: divergence of the resultant drift potential vector (magnitude⟦1⟧, direction⟦2⟧) on the Mars sphere (R = ⟦#0⟧ km), following⟦3⟧, Methods⟦4⟧, with central differences on the grid of the wind dataset (⟦#1⟧°). Negative values (convergence) imply deposition.
FR: <strong>Divergence du flux saturé</strong> ⟦0⟧: divergence du vecteur potentiel de dérive résultant (norme⟦1⟧, direction⟦2⟧) sur la sphère martienne (R = ⟦#0⟧ km), selon⟦3⟧, Methods⟦4⟧, avec des différences centrées sur la grille du jeu de données de vent (⟦#1⟧°). Les valeurs négatives (convergence) indiquent un dépôt.

## c.1ef8a9c4 (Unused (English changed or removed))
EN: αE (elongation direction): ⟦#0⟧° (ENE)
FR: αE (direction d’allongement) : ⟦#0⟧° (ENE)

## c.e9a52542 (Unused (English changed or removed))
EN: αT (transverse migration direction): ⟦#0⟧° (ENE)
FR: αT (direction de migration transverse) : ⟦#0⟧° (ENE)

## c.77cf5f77 (Unused (English changed or removed))
EN: RDD (resultant drift direction): ⟦#0⟧° (ENE)
FR: RDD (direction de dérive résultante) : ⟦#0⟧° (ENE)

## c.4a8617dc (Unused (English changed or removed))
EN: ⟦#0⟧° (ENE)
FR: ⟦#0⟧° (ENE)

## c.4d7bcf52 (Unused (English changed or removed))
EN: αT (transverse migration direction): ⟦#0⟧° (WNW)
FR: αT (direction de migration transverse) : ⟦#0⟧° (ONO)

## c.7752b77c (Unused (English changed or removed))
EN: RDD (resultant drift direction): ⟦#0⟧° (ESE)
FR: RDD (direction de dérive résultante) : ⟦#0⟧° (ESE)

## c.33a5156c (Unused (English changed or removed))
EN: ⟦#0⟧° (WNW)
FR: ⟦#0⟧° (ONO)

## c.4c3ff457 (Unused (English changed or removed))
EN: ⟦#0⟧° (ESE)
FR: ⟦#0⟧° (ESE)

## c.762593af (Unused (English changed or removed))
EN: ⟦0⟧polygons: public domain (U.S. Geological Survey)
FR: Polygones⟦0⟧: domaine public (U.S. Geological Survey)

## c.7a26bd74 (Unused (English changed or removed))
EN: <strong>Dune map</strong>:⟦0⟧⟦1⟧(⟦2⟧;⟦3⟧) plus the small dune fields of Fenton (⟦#0⟧, Icarus ⟦#1⟧, ⟦#2⟧), merged into ⟦#3⟧ dune-field polygons (Mars ⟦#4⟧ sphere);⟦4⟧polygons: public domain (U.S. Geological Survey).
FR: <strong>Carte des dunes</strong> :⟦0⟧⟦1⟧(⟦2⟧;⟦3⟧), complétée par les petits champs de dunes de Fenton (⟦#0⟧, Icarus ⟦#1⟧, ⟦#2⟧), fusionnés en ⟦#3⟧ polygones de champs de dunes (sphère Mars ⟦#4⟧) ; polygones⟦4⟧: domaine public (U.S. Geological Survey).

## c.9ca2c0fc (Unused (English changed or removed))
EN: Concept: The two⟦0⟧wind datasets
FR: Concept : Les deux jeux de données de vent⟦0⟧

## c.f1b21a41 (Unused (English changed or removed))
EN: Concept: Threshold friction velocity
FR: Concept : Vitesse de frottement seuil

## c.a9d65061 (Unused (English changed or removed))
EN: Concept: Migration direction⟦0⟧
FR: Concept : Direction de migration⟦0⟧

## c.3c3fcb95 (Unused (English changed or removed))
EN: Concept: Elongation direction⟦0⟧
FR: Concept : Direction d’allongement⟦0⟧

## c.11f17d85 (Unused (English changed or removed))
EN: Concept: Crest orientation⟦0⟧
FR: Concept : Orientation de la crête⟦0⟧

## c.34d51597 (Unused (English changed or removed))
EN: Concept: Along-crest transport direction⟦0⟧
FR: Concept : Direction du transport le long de la crête⟦0⟧

## c.a9742ddf (Unused (English changed or removed))
EN: Concept: Stability of elongating dunes⟦0⟧
FR: Concept : Stabilité des dunes en allongement⟦0⟧

## c.190c3133 (Unused (English changed or removed))
EN: Concept: Along-crest versus across-crest transport⟦0⟧
FR: Concept : Transport le long de la crête par rapport au transport à travers la crête⟦0⟧

## c.7cc28259 (Unused (English changed or removed))
EN: Concept: Growth in height versus migration⟦0⟧
FR: Concept : Croissance en hauteur par rapport à la migration⟦0⟧

## c.e607dcd2 (Unused (English changed or removed))
EN: Concept: Morphology of elongating dunes⟦0⟧
FR: Concept : Morphologie des dunes en allongement⟦0⟧

## c.ce4fe4b4 (Unused (English changed or removed))
EN: Concept: Drift potential (⟦0⟧)
FR: Concept : Potentiel de dérive (⟦0⟧)

## c.6a117912 (Unused (English changed or removed))
EN: Concept: Resultant drift potential (⟦0⟧)
FR: Concept : Potentiel de dérive résultant (⟦0⟧)

## c.bdfc3381 (Unused (English changed or removed))
EN: Concept: Resultant drift direction (⟦0⟧)
FR: Concept : Direction de dérive résultante (⟦0⟧)

## c.3d61687f (Unused (English changed or removed))
EN: Concept: Directionality (⟦0⟧)
FR: Concept : Directionnalité (⟦0⟧)

## c.a85fff80 (Unused (English changed or removed))
EN: Concept: Flux divergence
FR: Concept : Divergence du flux

## c.7f316e8f (Unused (English changed or removed))
EN: Concept: Grain size and threshold
FR: Concept : Taille des grains et seuil

## c.0f656ead (Unused (English changed or removed))
EN: Interactive explorer for aeolian geomorphology<br>Developed by the <a href="https://www.geomorphlab.org/" target="_blank" rel="noopener">⟦0⟧</a>
FR: Explorateur interactif de géomorphologie éolienne<br>Développé par le <a href="https://www.geomorphlab.org/" target="_blank" rel="noopener">⟦0⟧</a>

## c.b053850f (Unused (English changed or removed))
EN: ⟦0⟧Dunes only<span class="visually-hidden">Draw the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in cells with dunes; the other layers and the cell panel are unchanged.</span>
FR: ⟦0⟧Dunes seulement<span class="visually-hidden">Afficher les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) uniquement dans les cellules comportant des dunes ; les autres calques et le panneau de la cellule restent inchangés.</span>

## c.49e605be (Unused (English changed or removed))
EN: Names<span class="visually-hidden">Label named dune fields and features on the map; where names would overlap, some appear only as you zoom in. Click a name for its details.</span>
FR: Noms<span class="visually-hidden">Affiche les noms des champs de dunes et des entités nommées sur la carte ; lorsque des noms se chevaucheraient, certains n’apparaissent qu’en zoomant. Cliquez sur un nom pour afficher ses détails.</span>

## c.c8524dc9 (Unused (English changed or removed))
EN: m²/yr (log scale) · at current ⟦0⟧
FR: m²/yr (échelle logarithmique) · actuellement ⟦0⟧

## c.34de0ec2 (Unused (English changed or removed))
EN: dimensionless · at current ⟦0⟧
FR: sans dimension · actuellement ⟦0⟧

## c.68abf023 (Unused (English changed or removed))
EN: dimensionless (log scale) · at current ⟦0⟧
FR: sans dimension (échelle logarithmique) · actuellement ⟦0⟧

## c.b7c39c7e (Unused (English changed or removed))
EN: Flat-bed sand flux: total (⟦0⟧), net (⟦1⟧), its direction (⟦2⟧) and directionality (⟦3⟧).
FR: Flux de sable sur lit plat : total (⟦0⟧), net (⟦1⟧), sa direction (⟦2⟧) et sa directionnalité (⟦3⟧).

## c.134786ef (Unused (English changed or removed))
EN: m/kyr · at current ⟦0⟧
FR: m/kyr · actuellement ⟦0⟧

## c.e5e3cf0d (Unused (English changed or removed))
EN: dimensionless (log scale)
FR: sans dimension (échelle logarithmique)

## c.7593a9c7 (Unused (English changed or removed))
EN: Dark (⟦0⟧)
FR: Sombre (⟦0⟧)

## c.ba666c84 (Unused (English changed or removed))
EN: Satellite imagery (⟦0⟧)
FR: Imagerie satellite (⟦0⟧)

## c.66b8cf73 (Unused (English changed or removed))
EN: Shaded relief (⟦0⟧, 2D)
FR: Relief ombré (⟦0⟧, 2D)

## c.11b366b1 (Unused (English changed or removed))
EN: Topographic (⟦0⟧)
FR: Topographique (⟦0⟧)

## c.211b69db (Unused (English changed or removed))
EN: Light (⟦0⟧⟦1⟧)
FR: Clair (⟦0⟧⟦1⟧)

## c.58a40f97 (Unused (English changed or removed))
EN: Globe view
FR: Vue en globe

## c.ca17f671 (Unused (English changed or removed))
EN: ━ Atlas⟦0⟧/ Fryberger⟦1⟧(m²/yr per⟦2⟧)
FR: ━⟦0⟧de l’atlas /⟦1⟧de Fryberger (m²/yr par⟦2⟧)

## c.52122a7b (Unused (English changed or removed))
EN: Directionality (⟦0⟧)
FR: Directionnalité (⟦0⟧)

## c.21c06928 (Unused (English changed or removed))
EN: The two⟦0⟧wind datasets
FR: Les deux jeux de données de vent⟦0⟧

## c.a8f9ae9c (Unused (English changed or removed))
EN: Elevation⟦0⟧(⟦1⟧)
FR: Altitude⟦0⟧(⟦1⟧)

## c.8f36579f (Unused (English changed or removed))
EN: Mapped Martian dune fields (⟦0⟧⟦1⟧and⟦2⟧, ⟦#0⟧ polygons, ⟦#1⟧ million km²).
FR: Champs de dunes martiens cartographiés (⟦0⟧⟦1⟧et⟦2⟧, ⟦#0⟧ polygones, ⟦#1⟧ millions de km²).

## c.51af858a (Unused (English changed or removed))
EN: ⟦0⟧Mars (v0.2)
FR: ⟦0⟧Mars (v0.2)

## c.37a7f189 (Unused (English changed or removed))
EN: ⟦0⟧mosaic, ⟦#0⟧ m (⟦1⟧⟦2⟧,⟦3⟧)
FR: Mosaïque⟦0⟧, ⟦#0⟧ m (⟦1⟧⟦2⟧,⟦3⟧)

## c.b00669df (Unused (English changed or removed))
EN: ⟦0⟧, where imaged (⟦1⟧)
FR: ⟦0⟧, là où disponible (⟦1⟧)

## c.64a11039 (Unused (English changed or removed))
EN: ⟦0⟧colour (⟦1⟧)
FR: ⟦0⟧couleur (⟦1⟧)

## c.811007f9 (Unused (English changed or removed))
EN: ⟦0⟧colour shaded relief (⟦1⟧)
FR: Relief ombré en couleur⟦0⟧(⟦1⟧)

## c.81a7ed6e (Unused (English changed or removed))
EN: The opening basemap is a shaded relief of the⟦0⟧blended elevation model (Fergason,⟦1⟧), released under⟦2⟧(derived from⟦3⟧,⟦4⟧, and⟦5⟧,⟦6⟧). Under Basemap you can also choose⟦7⟧and⟦8⟧'s Mars imagery: the global⟦9⟧mosaic (about ⟦#0⟧ m per pixel; The⟦10⟧),⟦11⟧(down to about ⟦#1⟧ cm per pixel), the⟦12⟧colour mosaic and the⟦13⟧colour shaded relief.⟦14⟧covers only the small part of the surface it has imaged; elsewhere the map is dark. Credits are in the map attribution.
FR: Le fond de carte initial est un relief ombré du modèle d’altitude fusionné⟦0⟧(Fergason,⟦1⟧), publié sous⟦2⟧(dérivé de⟦3⟧,⟦4⟧, et de⟦5⟧,⟦6⟧). Dans Fond de carte, vous pouvez aussi choisir⟦7⟧ainsi que l’imagerie de Mars proposée par⟦8⟧: la mosaïque globale⟦9⟧(environ ⟦#0⟧ m par pixel ; The⟦10⟧),⟦11⟧(jusqu’à environ ⟦#1⟧ cm par pixel), la mosaïque en couleur⟦12⟧et le relief ombré en couleur⟦13⟧.⟦14⟧ne couvre que la petite partie de la surface qu’il a imagée ; ailleurs, la carte est sombre. Les crédits figurent dans l’attribution de la carte.

## c.922ef60f (Unused (English changed or removed))
EN: Download &amp; cite in the cell panel saves the hourly wind and air series and all parameters of the cell as⟦0⟧or as a⟦1⟧bundle, with the citation of every data source. Please cite the wind dataset,⟦2⟧for the transport law and⟦3⟧, which outlines the methods.
FR: « Télécharger et citer », dans le panneau de la cellule, enregistre les séries horaires du vent et de l’air ainsi que tous les paramètres de la cellule au format⟦0⟧ou sous forme d’archive⟦1⟧, avec la citation de chaque source de données. Veuillez citer le jeu de données de vent,⟦2⟧pour la loi de transport et⟦3⟧, qui présente les méthodes.
