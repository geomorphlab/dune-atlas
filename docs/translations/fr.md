# Dune Atlas: French text

Edit only the text after `FR:`. Keep each translation on one line. Keep unchanged:
- anything between $ signs (formulas, e.g. $u_{*,th}$), HTML tags such as <br> and <a href="…">…</a>, and {placeholders};
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
EN: Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset; dunes, aridity, vegetation and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Names, in the Dune Fields group, labels named dune fields on the map (where names would overlap, some appear only as you zoom in) and hides the basemap's place names other than countries and states while it is on; click a name to zoom to the field and see its other names, countries and sources.
FR: Cochez un calque pour l’afficher. Le bouton ⓘ donne sa définition, ses unités et sa source de données ; Affichage modifie ses couleurs, ses bornes de couleur et son échelle, ou représente les champs de direction par des flèches ou des lignes de courant, avec un curseur d’espacement allant de Plus fin (lignes plus denses) à Plus grossier. Calques actifs liste ce qui est affiché sur la carte, de haut en bas : faites glisser une ligne ou utilisez les flèches pour changer l’ordre de dessin, réglez l’opacité avec son curseur et retirez un calque avec ×. Dunes seulement (sous le sélecteur Jeu de données de vent) ne dessine tous les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) que dans les cellules contenant des dunes selon le jeu de données ; les dunes, l’aridité, la végétation et les fonds de carte restent inchangés, et le panneau de cellule fonctionne toujours pour n’importe quelle cellule. Ce réglage fait partie du lien. Noms, dans le groupe Champs de dunes, étiquette sur la carte les champs de dunes nommés (là où les noms se chevaucheraient, certains n’apparaissent qu’en zoomant) et masque, tant qu’il est activé, les noms de lieux du fond de carte autres que ceux des pays et des États ; cliquez sur un nom pour zoomer sur le champ et voir ses autres noms, ses pays et ses sources.

## earth.help.concepts.title (Help panel)
EN: Concepts
FR: Concepts

## earth.help.concepts.body (Help panel)
EN: The Concepts button (mortarboard, under the Help button) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
FR: Le bouton Concepts (mortier, sous le bouton Aide) explique les grandeurs de l’atlas, chacune avec ses références. Le lien Concept dans le ⓘ d’un calque ouvre l’entrée correspondante.

## earth.help.search.title (Help panel)
EN: Search
FR: Recherche

## earth.help.search.body (Help panel)
EN: Type a dune-field name (e.g. Namib Sand Sea or Rub' al Khali), a country, or a latitude and a longitude in the box at the top of the layer panel. Names match either line of a label and the other names a field is known by, including its named parts, ignoring accents; the list under the box shows each match with its countries and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. -24.5, 15.2 or 24°30′S 15°12′E). Latitude comes first unless the letters say otherwise. The line under the box shows how the text was read; Enter moves the map there and opens the cell panel when the cell has data.
FR: Saisissez le nom d’un champ de dunes (p. ex. Namib Sand Sea ou Rub' al Khali), un pays, ou une latitude et une longitude dans la zone située en haut du panneau des calques. Les noms correspondent à l’une ou l’autre ligne d’une étiquette ainsi qu’aux autres noms sous lesquels un champ est connu, y compris ses parties nommées, sans tenir compte des accents ; la liste sous la zone affiche chaque correspondance avec ses pays, les meilleures correspondances en premier. Les coordonnées peuvent être données en degrés décimaux ou en degrés, minutes et secondes, avec un signe ou avec N, S, E ou W (p. ex. -24.5, 15.2 ou 24°30′S 15°12′E). La latitude vient en premier, sauf si les lettres indiquent le contraire. La ligne sous la zone montre comment le texte a été interprété ; Entrée déplace la carte à cet endroit et ouvre le panneau de cellule lorsque la cellule contient des données.

## earth.help.cell.title (Help panel)
EN: Clicking a cell
FR: Cliquer sur une cellule

## earth.help.cell.body (Help panel)
EN: Click any land cell to open the cell panel: the wind rose, the sand-flux rose at the current threshold, dune-orientation modes against the threshold, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the Petals switch above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The latitude and longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The crosshair button next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
FR: Cliquez sur n’importe quelle cellule terrestre pour ouvrir le panneau de cellule : la rose des vents, la rose des flux de sable au seuil actuel, les modes d’orientation des dunes en fonction du seuil, la divergence du flux et un tableau de tous les paramètres. Les pétales de la rose des flux de sable pointent vers l’endroit où se déplace le sable ; l’interrupteur Pétales au-dessus de la rose les inverse pour montrer plutôt d’où vient le vent (les flèches pointent toujours vers la direction de transport). Les titres de section se replient et se déplient. Fermez le panneau avec × ou Échap. La latitude et la longitude sous le curseur sont affichées à côté de la barre d’échelle, en bas à gauche (sur écran tactile : le dernier point touché). Le bouton en forme de réticule à côté du titre de la cellule centre la carte sur la cellule (en ne zoomant que si la cellule est trop petite pour être visible).

## earth.help.datasets.title (Help panel)
EN: Wind datasets
FR: Jeux de données de vent

## earth.help.datasets.body (Help panel)
EN: The Wind dataset selector switches between reanalysis wind statistics (ERA5-Land, 0.1°; ERA5, 0.25°; 1950–2024). ERA5-Land, used by Gunn (2026), is a land-surface rerun driven by ERA5 atmospheric fields interpolated to its grid (Muñoz-Sabater et al. 2021), so its winds are not an independent estimate, and the datasets can still differ: e.g., Baas (2026) reports ERA5-Land 10 m wind speeds 20–30 % below those of ERA5. Where the datasets give different results, treat them as uncertain. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
FR: Le sélecteur Jeu de données de vent permet de basculer entre des statistiques de vent issues de réanalyses (ERA5-Land, 0,1° ; ERA5, 0,25° ; 1950–2024). ERA5-Land, utilisé par Gunn (2026), est une réexécution de surface terrestre forcée par les champs atmosphériques d’ERA5 interpolés sur sa grille (Muñoz-Sabater et al. 2021). Ses vents ne constituent donc pas une estimation indépendante, et les jeux de données peuvent malgré tout différer : par exemple, Baas (2026) signale des vitesses du vent à 10 m d’ERA5-Land inférieures de 20 à 30 % à celles d’ERA5. Là où les jeux de données donnent des résultats différents, considérez ces résultats comme incertains. Les calques de vent et de flux de sable ainsi que le panneau de cellule suivent la sélection. Le masque des champs de dunes et les calques d’aridité et de végétation sont les mêmes pour tous les jeux de données.

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
EN: The button below the camera (a dashed box) saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every threshold or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
FR: Le bouton situé sous l’appareil photo (un cadre en pointillés) enregistre toutes les cellules du jeu de données de vent sélectionné comprises dans un cadre en latitude-longitude, sous la forme d’un unique fichier NetCDF accompagné d’un README. Saisissez les limites, ou appuyez sur Dessiner sur la carte et tracez un cadre sur la carte (Échap pour annuler). Cochez les paramètres, puis choisissez tous les seuils ou le seuil actuel. La taille est estimée au fur et à mesure et ne peut dépasser ce qu’un navigateur peut contenir. Pour la grille entière, voir Obtenir la grille complète sous Télécharger et citer.

## earth.help.images.title (Help panel)
EN: Exporting images
FR: Exporter des images

## earth.help.images.body (Help panel)
EN: Export map image (camera button, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
FR: Exporter l’image de la carte (bouton appareil photo, en haut à droite) enregistre la vue actuelle au format PNG, avec une largeur de 1600 à 2400 pixels (1,5 fois sa largeur à l’écran), avec ou sans fond de carte, sur fond blanc ou transparent. Sous la carte figurent les barres de couleur, les légendes, la flèche du nord et la barre d’échelle, puis la vue, le jeu de données de vent et les sources des données. Chaque graphique du panneau de cellule dispose d’un menu Exporter qui produit un PNG (1600 pixels de large) ou un SVG en thème clair, avec la même mise en page.

## earth.help.share.title (Help panel)
EN: Sharing the view
FR: Partager la vue

## earth.help.share.body (Help panel)
EN: The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, wind dataset, threshold, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
FR: Le bouton de partage (en haut à droite) copie un lien court qui restaure cette vue : position, zoom, globe ou carte plane, jeu de données de vent, seuil, fond de carte, calques actifs avec leurs paramètres d’affichage, et cellule sélectionnée. La barre d’adresse contient aussi en permanence un lien complet vers la vue actuelle.

# Guided tour

## earth.tour.help.title (Guided tour)
EN: Welcome to the Dune Atlas
FR: Bienvenue dans le Dune Atlas

## earth.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
FR: Cette courte visite guidée présente les principales commandes. Le bouton Aide (?), mis en évidence ici dans le coin supérieur droit, ouvre un aide-mémoire et relance cette visite à tout moment.

## earth.tour.concepts.title (Guided tour)
EN: Concepts
FR: Concepts

## earth.tour.concepts.body (Guided tour)
EN: The Concepts button (mortarboard) explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
FR: Le bouton Concepts (mortier) explique la signification des grandeurs représentées sur la carte, avec leurs références. Le ⓘ de chaque calque renvoie à l’entrée correspondante.

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
EN: Clicking a land cell opens the cell panel, shown here for a dune cell in the Namib Sand Sea: wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own $u_{*,th}$ slider at the top (outlined), linked to the main one. At the bottom you can download these data in NetCDF or CSV files and access citation information. The crosshair next to its title centres the map on the cell.
FR: Cliquer sur une cellule terrestre ouvre le panneau de cellule, présenté ici pour une cellule de dunes de la Namib Sand Sea : rose des vents, rose des flux de sable, modes d’orientation des dunes et tableau de tous les paramètres. Le panneau possède en haut son propre curseur $u_{*,th}$ (encadré), lié au curseur principal. En bas, vous pouvez télécharger ces données dans des fichiers NetCDF ou CSV et accéder aux informations de citation. Le réticule à côté de son titre centre la carte sur la cellule.

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
EN: Earth and Mars share this atlas: the planet button below the camera swaps between them, and each atlas reopens the view you last had there.
FR: La Terre et Mars partagent cet atlas : le bouton planète, sous l’appareil photo, permet de passer de l’une à l’autre, et chaque atlas rouvre la dernière vue que vous y aviez.

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
EN: Dimensionless flux ratios that discriminate dune morphology and stability.
FR: Rapports de flux adimensionnels qui permettent de discriminer la morphologie et la stabilité des dunes.

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
EN: For a wind blowing at one speed for the whole year. Atlas DP: the saturated flux of Martin & Kok (2017) from $u_* = \kappa U_{10} / \ln(z/z_0)$ with $z_0$ = 1 mm, at the threshold set above. Fryberger DP: $V^2(V - V_t)$ with $V$ in knots, $V_t$ = 12 knots and the wind blowing 100 % of the time. Dashed lines: the two thresholds; between them only one DP is above zero. The ratio changes with wind speed, so there is no fixed conversion factor: for a real wind record, the ratio of the two DPs depends on its mix of wind speeds. Hours above 20 m/s are not counted by the atlas.
FR: Pour un vent soufflant à une vitesse unique toute l’année. DP de l’atlas : le flux saturé de Martin & Kok (2017), calculé à partir de $u_* = \kappa U_{10} / \ln(z/z_0)$ avec $z_0$ = 1 mm, au seuil défini ci-dessus. DP de Fryberger : $V^2(V - V_t)$, avec $V$ en nœuds, $V_t$ = 12 nœuds et un vent soufflant 100 % du temps. Lignes en tirets : les deux seuils ; entre eux, un seul des deux DP est non nul. Le rapport varie avec la vitesse du vent, si bien qu’il n’existe pas de facteur de conversion fixe. Pour une série de vent réelle, le rapport des deux DP dépend de sa distribution des vitesses de vent. Les heures au-dessus de 20 m/s ne sont pas prises en compte par l’atlas.

## concept.drift-potential-dp.title (Concepts)
EN: Drift potential (DP)
FR: Potentiel de dérive (DP)

## concept.drift-potential-dp.p1 (Concepts)
EN: DP is the saturated sand flux averaged over every hour of the record, whatever its direction: how much sand the wind could move in a year over a flat sandy bed, in m²/yr. Higher DP means a windier, more energetic sand-transport environment. The name follows Fryberger & Dean (1979), whose drift potential also measures transport capacity, but the two are different quantities. Fryberger's DP is in vector units, computed from 10 m wind speeds in knots as V²(V − Vt) with a 12-knot threshold. The atlas DP is a physical flux computed from the friction velocity. Because the two formulas grow differently with wind speed, there is no fixed conversion factor, and Fryberger's low, intermediate and high-energy classes (below 200, 200–400 and above 400 vector units) do not apply to atlas values.
FR: Le DP est le flux de sable saturé moyenné sur toutes les heures de la série, quelle que soit sa direction. Il exprime la quantité de sable que le vent pourrait déplacer en un an sur un lit sableux plat, en m²/yr. Un DP plus élevé traduit un environnement de transport sableux plus venteux et plus énergétique. Le nom reprend celui de Fryberger & Dean (1979), dont le potentiel de dérive mesure lui aussi une capacité de transport, mais il s’agit de deux grandeurs différentes. Le DP de Fryberger s’exprime en unités vectorielles (VU) et se calcule à partir des vitesses du vent à 10 m en nœuds, selon V²(V − Vt), avec un seuil de 12 nœuds. Le DP de l’atlas est un flux physique calculé à partir de la vitesse de frottement. Comme les deux formules croissent différemment avec la vitesse du vent, il n’existe pas de facteur de conversion fixe. Les classes de faible, moyenne et forte énergie de Fryberger (inférieur à 200, de 200 à 400 et supérieur à 400 unités vectorielles) ne s’appliquent donc pas aux valeurs de l’atlas.

## concept.resultant-drift-potential-rdp.title (Concepts)
EN: Resultant drift potential (RDP)
FR: Potentiel de dérive résultant (RDP)

## concept.resultant-drift-potential-rdp.p1 (Concepts)
EN: RDP is the net sand flux: the hourly fluxes added as vectors, so that transport in opposite directions cancels, then averaged over the record (m²/yr). It equals DP only if all transport goes the same way. A cell with high DP but low RDP has strong winds that move sand back and forth with little net displacement; a cell with RDP close to DP moves sand steadily in one direction. RDP is the magnitude of the vector whose direction is the resultant drift direction (RDD), and the divergence of this vector gives the flux divergence layer.
FR: Le RDP est le flux de sable net : les flux horaires sont additionnés comme des vecteurs, de sorte que les transports de sens opposés s’annulent, puis moyennés sur la série (m²/yr). Il n’est égal au DP que si tout le transport s’effectue dans la même direction. Une cellule à DP élevé mais à RDP faible connaît des vents forts qui déplacent le sable dans un sens puis dans l’autre, avec un faible déplacement net ; une cellule dont le RDP est proche du DP déplace le sable de façon régulière dans une seule direction. Le RDP est la norme du vecteur dont la direction est la direction de dérive résultante (RDD), et la divergence de ce vecteur fournit le calque de divergence du flux.

## concept.resultant-drift-direction-rdd.title (Concepts)
EN: Resultant drift direction (RDD)
FR: Direction de dérive résultante (RDD)

## concept.resultant-drift-direction-rdd.p1 (Concepts)
EN: RDD is the direction of the net sand flux, given as the compass bearing toward which sand moves (0° = north, 90° = east). It summarises the direction of net sand transport over the whole record and is often compared with the migration direction of dunes and the trend of linear dunes. RDD is only meaningful when there is a clear net transport: where RDP/DP is low, opposing fluxes nearly cancel, and a small change of threshold (or grain diameter), wind dataset or neighbouring cell can turn RDD by up to 180°. The dune-orientation modes (αT, αE) use the whole distribution of flux directions, including the speed-up of the wind over dune crests, and can differ from RDD.
FR: La RDD est la direction du flux de sable net, exprimée comme l’azimut vers lequel le sable se déplace (0° = nord, 90° = est). Elle résume la direction du transport net de sable sur l’ensemble de la série et est souvent comparée à la direction de migration des dunes et à l’orientation des dunes linéaires. La RDD n’a de sens que lorsqu’il existe un transport net bien marqué : là où RDP/DP est faible, les flux opposés s’annulent presque, et une petite modification du seuil (ou du diamètre des grains), du jeu de données de vent ou de la cellule voisine peut faire tourner la RDD jusqu’à 180°. Les modes d’orientation des dunes (αT, αE) utilisent l’ensemble de la distribution des directions de flux, y compris l’accélération du vent au-dessus des crêtes des dunes, et peuvent différer de la RDD.

## concept.directionality-rdp-dp.title (Concepts)
EN: Directionality (RDP/DP)
FR: Directionnalité (RDP/DP)

## concept.directionality-rdp-dp.p1 (Concepts)
EN: RDP/DP is the ratio of net to total sand flux. It is 1 when all transport goes in one direction and approaches 0 when transport from several directions cancels. Fryberger & Dean (1979) used the ratio to classify wind regimes: below 0.3 low (complex or obtuse bimodal winds), 0.3–0.8 intermediate (obtuse to acute bimodal winds), above 0.8 high (unimodal winds). Use these classes as a guide only: the atlas ratio counts only transport above the selected threshold (Gunn 2026) and uses a different flux law, so it changes with the threshold or grain-diameter setting. Wasson & Hyde (1983) related dune type to this ratio together with sand availability.
FR: RDP/DP est le rapport entre le flux de sable net et le flux de sable total. Il vaut 1 lorsque tout le transport s’effectue dans une seule direction et tend vers 0 lorsque les transports provenant de plusieurs directions s’annulent. Fryberger & Dean (1979) ont utilisé ce rapport pour classer les régimes de vent : en dessous de 0,3, faible (vents complexes ou bimodaux obtus) ; de 0,3 à 0,8, intermédiaire (vents bimodaux obtus à aigus) ; au-dessus de 0,8, élevé (vents unimodaux). N’utilisez ces classes qu’à titre indicatif : le rapport calculé par l’atlas ne prend en compte que le transport au-dessus du seuil sélectionné (Gunn 2026) et utilise une loi de flux différente, de sorte qu’il varie avec le réglage du seuil ou du diamètre des grains. Wasson & Hyde (1983) ont relié le type de dune à ce rapport ainsi qu’à la disponibilité en sable.

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
EN: Sand moves when the friction velocity u* of the wind, a measure of the shear stress the wind exerts on the surface, exceeds a threshold u*,th. The default of 0.15 m/s is the value used for the global analysis of Gunn (2026): a common global approximation used in place of more accurate local values, not calibrated for any site. Values between 0.1 and 0.4 m/s are typical, and for loose, dry sand the threshold depends mainly on grain size and density. With the atlas's wind profile, 0.15 m/s equals a 3.4 m/s wind at 10 m (6.6 knots), and Fryberger's 12 knots equals about 0.27 m/s. Raising the threshold lowers DP and can change directions.
FR: Le sable se met en mouvement lorsque la vitesse de frottement u* du vent, mesure de la contrainte de cisaillement que le vent exerce sur la surface, dépasse un seuil u*,th. La valeur par défaut de 0,15 m/s est celle utilisée pour l’analyse globale de Gunn (2026) : il s’agit d’une approximation globale courante, employée à la place de valeurs locales plus précises, et non calibrée pour un site particulier. Les valeurs comprises entre 0,1 et 0,4 m/s sont typiques, et pour un sable sec et meuble, le seuil dépend principalement de la taille et de la masse volumique des grains. Avec le profil de vent de l’atlas, 0,15 m/s correspond à un vent de 3,4 m/s à 10 m (6,6 nœuds), et les 12 nœuds de Fryberger correspondent à environ 0,27 m/s. Relever le seuil diminue le DP et peut modifier les directions.

## concept.two-ways-dunes-orient-bed-instability-and-elongation.title (Concepts)
EN: Two ways dunes orient: bed instability and elongation
FR: Deux modes d’orientation des dunes : instabilité du lit et allongement

## concept.two-ways-dunes-orient-bed-instability-and-elongation.p1 (Concepts)
EN: Dunes can grow in two ways that give different orientations in the same wind regime. Where loose sand covers the bed, dunes grow in height from the bed itself (the bed instability): crests align so that the gross sand transport across them is as large as possible (Rubin & Hunter 1987), and the dunes migrate. Where sand is scarce over a non-erodible bed, dunes can instead grow in length from a sand source (the elongation mode): they extend in the direction of the net sand flux on the dune, where the net flux across the crest is zero. Elongating dunes need winds from more than one direction, and in approximately bi-directional winds the two orientations often differ more than 90°. Comparing mapped crests with both predictions indicates which mode likely formed a dune field.
FR: Les dunes peuvent croître de deux manières, qui donnent des orientations différentes sous un même régime de vent. Là où du sable meuble recouvre le lit, les dunes croissent en hauteur à partir du lit lui-même (l’instabilité du lit) : les crêtes s’alignent de sorte que le transport brut de sable qui les traverse soit le plus grand possible (Rubin & Hunter 1987), et les dunes migrent. Là où le sable est rare sur un lit non érodable, les dunes peuvent au contraire croître en longueur à partir d’une source de sable (le mode d’allongement) : elles s’étendent dans la direction du flux net de sable sur la dune, là où le flux net à travers la crête est nul. Les dunes en allongement nécessitent des vents provenant de plus d’une direction, et sous des vents approximativement bidirectionnels, les deux orientations diffèrent souvent de plus de 90°. La comparaison des crêtes cartographiées avec les deux prédictions indique quel mode a probablement formé un champ de dunes.

## concept.migration-direction-αt.title (Concepts)
EN: Migration direction αT
FR: Direction de migration αT

## concept.migration-direction-αt.p1 (Concepts)
EN: αT is the direction in which dunes with the bed-instability crest orientation αH migrate, as a compass bearing (toward). It is perpendicular to αH, on the side toward which the net sand flux across the crest points. Because αH depends on the gross crest transport from all directions, αT reflects the whole flux rose and can differ from RDD, especially in bimodal winds. Barchan dunes migrate in the direction their horns point, so αT can be compared with mapped barchans; Gunn (2026) does this and shows that in some places the predicted direction changes strongly with the threshold, that is, with grain size or other factors such as vegetation.
FR: αT est la direction dans laquelle migrent les dunes dont la crête a l’orientation αH issue de l’instabilité du lit, exprimée sous forme d’azimut (vers). Elle est perpendiculaire à αH, du côté vers lequel pointe le flux net de sable à travers la crête. Comme αH dépend du transport brut sur la crête provenant de toutes les directions, αT reflète l’ensemble de la rose des flux et peut différer de la RDD, en particulier sous des vents bimodaux. Les barkhanes migrent dans la direction vers laquelle pointent leurs cornes, de sorte que αT peut être comparée aux barkhanes cartographiées ; Gunn (2026) effectue cette comparaison et montre qu’en certains endroits la direction prédite varie fortement avec le seuil, c’est-à-dire avec la taille des grains ou d’autres facteurs tels que la végétation.

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
EN: Q̂∥/⊥,H divides the net sand flux along crests of the bed-instability orientation by the net flux across them. Across-crest transport makes dunes migrate and tends to make crests sinuous; along-crest transport tends to keep them straight (Rubin 2012). Higher values therefore suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures how far the migration direction departs from the direction of the sand flux on the dune, an asymmetry that makes dunes such as barchans asymmetric. In examples of long-crested dunes on sand-covered beds, it is about 0.03 for transverse, 0.4 for oblique and 22 for longitudinal dunes.
FR: Q̂∥/⊥,H est le flux net de sable le long des crêtes correspondant à l’orientation d’instabilité du lit, divisé par le flux net à travers celles-ci. Le transport à travers la crête fait migrer les dunes et tend à rendre les crêtes sinueuses. Le transport le long de la crête tend au contraire à les maintenir rectilignes (Rubin 2012). Des valeurs plus élevées suggèrent donc des dunes à crête longue plus rectilignes sur des lits couverts de sable. Pour les dunes migrant sur des lits pauvres en sable, le rapport mesure l’écart entre la direction de migration et la direction du flux de sable sur la dune. Cette asymétrie rend asymétriques des dunes telles que les barkhanes. Dans des exemples de dunes à crête longue sur des lits couverts de sable, il vaut environ 0,03 pour les dunes transverses, 0,4 pour les dunes obliques et 22 pour les dunes longitudinales.

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
EN: Q̂|⊥|/∥,E divides the gross sand transport across crests in the elongation orientation αE by the net transport along them: the balance between growth in height and elongation. For dunes that elongate without migrating, it is the parameter expected to distinguish their shapes. On a starved bed, comparing it with Q̂|⊥|/⊥,H indicates whether elongation or migration is more likely to set dune shape and orientation: each ratio measures how strongly growth in height outweighs one of the two dynamics, and the dynamic with the larger ratio is expected to prevail. In examples of dunes on Earth it ranges from about 0.5 to 16. These parameters are still being tested against observed dune fields.
FR: Q̂|⊥|/∥,E est le rapport entre le transport brut de sable à travers les crêtes orientées selon la direction d’allongement αE et le transport net le long de ces crêtes : il traduit l’équilibre entre croissance en hauteur et allongement. Pour les dunes qui s’allongent sans migrer, c’est le paramètre censé distinguer leurs formes. Sur un lit pauvre en sable, sa comparaison avec Q̂|⊥|/⊥,H indique si l’allongement ou la migration est le plus susceptible de déterminer la forme et l’orientation des dunes : chaque rapport mesure dans quelle mesure la croissance en hauteur l’emporte sur l’une des deux dynamiques, et la dynamique dont le rapport est le plus élevé est censée prévaloir. Dans des exemples de dunes terrestres, il varie d’environ 0,5 à 16. Ces paramètres sont encore en cours de validation par comparaison avec des champs de dunes observés.

## concept.flux-divergence.title (Concepts)
EN: Flux divergence
FR: Divergence du flux

## concept.flux-divergence.p1 (Concepts)
EN: Flux divergence measures whether more sand leaves a place than arrives. It is the divergence of the net saturated flux vector (magnitude RDP, direction RDD) on the sphere, in metres of bed level per thousand years, and by conservation of sand mass it gives the rate at which the bed would be lowered or raised. Negative values (convergence) mean deposition; positive values (divergence) mean erosion. Gunn (2026) found dunes more common where flux converges. The values assume a saturated flux everywhere, that is, an unlimited supply of loose sand. On rock, gravel, crusted or vegetated surfaces the wind cannot erode sand that is not there, so positive values there indicate potential, not actual, erosion.
FR: La divergence du flux indique si davantage de sable quitte un lieu qu’il n’en arrive. Il s’agit de la divergence, sur la sphère, du vecteur flux saturé net (de norme RDP et de direction RDD), exprimée en mètres de niveau du lit par millier d’années ; par conservation de la masse de sable, elle donne la vitesse à laquelle le lit s’abaisserait ou s’exhausserait. Les valeurs négatives (convergence) correspondent à un dépôt ; les valeurs positives (divergence) à une érosion. Gunn (2026) a constaté que les dunes sont plus fréquentes là où le flux converge. Ces valeurs supposent un flux saturé partout, c’est-à-dire un apport illimité de sable meuble. Sur des surfaces rocheuses, graveleuses, encroûtées ou végétalisées, le vent ne peut pas éroder un sable absent ; les valeurs positives y indiquent donc une érosion potentielle, et non effective.

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
EN: Sand moves when the friction velocity of the wind exceeds a threshold that depends on the grain size and on the thin Martian air. The slider at the top of the layer panel sets the median grain diameter d (50–1000 µm, default 200 µm) for every grain-size-dependent map layer and for the cell panel. For every hour of the Mars year the threshold $u_{*,th}$ is computed from d and that hour's air density and temperature (Pähtz & Durán 2023).
FR: Le sable se met en mouvement lorsque la vitesse de frottement du vent dépasse un seuil qui dépend de la taille des grains et de l’air martien raréfié. Le curseur en haut du panneau des calques fixe le diamètre médian des grains d (50–1000 µm, 200 µm par défaut) pour tous les calques cartographiques dépendant de la taille des grains et pour le panneau de cellule. Pour chaque heure de l’année martienne, le seuil $u_{*,th}$ est calculé à partir de d ainsi que de la masse volumique et de la température de l’air à cette heure (Pähtz & Durán 2023).

## mars.help.layers.title (Help panel)
EN: Layers and Active layers
FR: Calques et calques actifs

## mars.help.layers.body (Help panel)
EN: Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset; dunes, elevation, air density and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Names, in the Dune Fields group, labels named dune fields and features on the map (where names would overlap, some appear only as you zoom in); click a name to zoom to the feature and see its type, other names and sources.
FR: Cochez un calque pour l’afficher. Le bouton ⓘ en donne la définition, les unités et la source des données ; Affichage modifie ses couleurs, les bornes de couleur et l’échelle, ou représente les champs de direction par des flèches ou des lignes de courant, avec un curseur d’espacement allant de Plus fin (lignes plus denses) à Plus grossier. Calques actifs liste ce qui figure sur la carte, de haut en bas : faites glisser une ligne ou utilisez les flèches pour modifier l’ordre d’affichage, réglez l’opacité avec son curseur et retirez un calque avec ×. Dunes seulement (sous le sélecteur Jeu de données de vent) n’affiche tous les calques dérivés du vent (champs de flux de sable, divergence du flux, flèches et lignes de courant) que dans les cellules contenant des dunes du jeu de données ; les dunes, l’altitude, la masse volumique de l’air et les fonds de carte restent inchangés, et le panneau de cellule fonctionne toujours pour n’importe quelle cellule. Ce réglage fait partie du lien. Noms, dans le groupe Champs de dunes, affiche sur la carte les noms des champs de dunes et des entités nommés (là où les noms se chevaucheraient, certains n’apparaissent qu’en zoomant) ; cliquez sur un nom pour zoomer sur l’entité et voir son type, ses autres noms et ses sources.

## mars.help.concepts.title (Help panel)
EN: Concepts
FR: Concepts

## mars.help.concepts.body (Help panel)
EN: The Concepts button (mortarboard, under the Help button) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
FR: Le bouton Concepts (mortier, sous le bouton Aide) explique les grandeurs de l’atlas, chacune avec ses références. Le lien Concept dans le ⓘ d’un calque ouvre l’entrée correspondante.

## mars.help.search.title (Help panel)
EN: Search
FR: Recherche

## mars.help.search.body (Help panel)
EN: Type a feature name (e.g. Gale crater or Olympia Undae) or a latitude and a longitude in the box at the top of the layer panel. Names are IAU-approved feature names from the Gazetteer of Planetary Nomenclature, with a few informal aliases (e.g. Bagnold Dunes); the list under the box shows each match with its feature type and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. 4.5, 137.4 or 4°30′N 137°24′E). Latitude comes first unless the letters say otherwise. Longitudes are planetocentric and east-positive, from −180° to 180°; a longitude typed as 0–360° E (e.g. 354.8) is converted (to −5.2). The line under the box shows how the text was read; Enter moves the map there and opens the cell panel when the cell has data.
FR: Saisissez le nom d’une entité (p. ex. Gale crater ou Olympia Undae) ou une latitude et une longitude dans le champ en haut du panneau des calques. Les noms sont les noms d’entités approuvés par l’IAU issus du Gazetteer of Planetary Nomenclature, avec quelques alias informels (p. ex. Bagnold Dunes) ; la liste sous le champ présente chaque correspondance avec son type d’entité, les meilleures correspondances en premier. Les coordonnées peuvent être exprimées en degrés décimaux ou en degrés, minutes et secondes, signées ou accompagnées de N, S, E ou W (p. ex. 4.5, 137.4 ou 4°30′N 137°24′E). La latitude vient en premier, sauf si les lettres indiquent le contraire. Les longitudes sont planétocentriques et positives vers l’est, de −180° à 180° ; une longitude saisie entre 0 et 360° E (p. ex. 354.8) est convertie (en −5.2). La ligne sous le champ indique comment le texte a été interprété ; Entrée déplace la carte à cet endroit et ouvre le panneau de cellule lorsque la cellule contient des données.

## mars.help.cell.title (Help panel)
EN: Clicking a cell
FR: Cliquer sur une cellule

## mars.help.cell.body (Help panel)
EN: Click any cell to open the cell panel: the wind rose, the sand-flux rose at the current grain diameter, dune-orientation modes against the grain diameter, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the Petals switch above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The planetocentric latitude and east longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The crosshair button next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
FR: Cliquez sur une cellule pour ouvrir le panneau de cellule : la rose des vents, la rose des flux de sable au diamètre de grain actuel, les modes d’orientation des dunes en fonction du diamètre des grains, la divergence du flux et un tableau de tous les paramètres. Les pétales de la rose des flux de sable pointent vers la direction où se déplace le sable ; le commutateur Pétales au-dessus de la rose permet de leur faire indiquer plutôt la direction d’où vient le vent (les flèches pointent toujours « vers »). Les titres de section se replient et se déplient. Fermez le panneau avec × ou Échap. La latitude planétocentrique et la longitude est sous le curseur sont affichées à côté de la barre d’échelle, en bas à gauche (sur écran tactile : le dernier point touché). Le bouton à réticule à côté du titre de la cellule centre la carte sur la cellule (en zoomant uniquement si la cellule était trop petite pour être visible).

## mars.help.datasets.title (Help panel)
EN: Wind dataset
FR: Jeu de données de vent

## mars.help.datasets.body (Help panel)
EN: The winds are the hourly lowest-level winds of a Mars climate model over one Mars year (e.g., the MCMC FV3-based Mars Global Climate Model, beta release 1: 2° grid, 16,032 hourly samples). The wind and sand-flux layers and the cell panel use the dataset shown in the Wind dataset selector.
FR: Les vents sont les vents horaires du niveau le plus bas d’un modèle climatique martien sur une année martienne (par exemple, le Mars Global Climate Model fondé sur MCMC FV3, version bêta 1 : grille de 2°, 16 032 échantillons horaires). Les calques de vent et de flux de sable ainsi que le panneau de cellule utilisent le jeu de données affiché dans le sélecteur Jeu de données de vent.

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
EN: Download & cite in the cell panel saves the hourly wind and air series and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite the wind dataset, Pähtz & Durán (2023) for the transport law and Gunn (2026), which outlines the methods.
FR: Télécharger et citer, dans le panneau de cellule, enregistre les séries horaires du vent et de l’air ainsi que tous les paramètres de la cellule au format NetCDF ou sous forme d’archive CSV, avec la citation de chaque source de données. Veuillez citer le jeu de données de vent, Pähtz & Durán (2023) pour la loi de transport et Gunn (2026), qui présente les méthodes.

## mars.help.region.title (Help panel)
EN: Downloading a region
FR: Télécharger une région

## mars.help.region.body (Help panel)
EN: The button below the camera (a dashed box) saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every grain diameter or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
FR: Le bouton situé sous l’appareil photo (un cadre en pointillés) enregistre toutes les cellules du jeu de données de vent sélectionné comprises dans un cadre en latitude-longitude, sous la forme d’un unique fichier NetCDF accompagné d’un README. Saisissez les limites, ou appuyez sur Dessiner sur la carte et tracez un cadre sur la carte (Échap pour annuler). Cochez les paramètres et choisissez tous les diamètres de grain ou le diamètre actuel ; la taille est estimée au fur et à mesure et limitée à ce qu’un navigateur peut contenir. Pour la grille entière, voir Obtenir la grille complète dans Télécharger et citer.

## mars.help.images.title (Help panel)
EN: Exporting images
FR: Exporter des images

## mars.help.images.body (Help panel)
EN: Export map image (camera button, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
FR: Exporter l’image de la carte (bouton appareil photo, en haut à droite) enregistre la vue actuelle au format PNG, avec une largeur de 1600 à 2400 pixels (1,5 fois sa largeur à l’écran), avec ou sans fond de carte, sur fond blanc ou transparent. Sous la carte figurent les barres de couleur, les légendes, la flèche du nord et la barre d’échelle, puis la vue, le jeu de données de vent et les sources des données. Chaque graphique du panneau de cellule dispose d’un menu Exporter qui produit un PNG (1600 pixels de large) ou un SVG en thème clair, avec la même mise en page.

## mars.help.share.title (Help panel)
EN: Sharing the view
FR: Partager la vue

## mars.help.share.body (Help panel)
EN: The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, grain diameter, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
FR: Le bouton de partage (en haut à droite) copie un lien court qui restaure cette vue : position, zoom, globe ou carte plane, diamètre des grains, fond de carte, calques actifs avec leurs paramètres d’affichage, et cellule sélectionnée. La barre d’adresse contient en outre toujours un lien complet vers la vue actuelle.

# Guided tour

## mars.tour.help.title (Guided tour)
EN: Welcome to the Mars Dune Atlas
FR: Bienvenue dans le Mars Dune Atlas

## mars.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
FR: Cette courte visite guidée présente les principales commandes. Le bouton Aide (?), mis en évidence ici dans le coin supérieur droit, ouvre un aide-mémoire et relance cette visite à tout moment.

## mars.tour.concepts.title (Guided tour)
EN: Concepts
FR: Concepts

## mars.tour.concepts.body (Guided tour)
EN: The Concepts button (mortarboard) explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
FR: Le bouton Concepts (mortier) explique la signification des grandeurs représentées sur la carte, avec leurs références. Le ⓘ de chaque calque renvoie à l’entrée correspondante.

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
EN: This slider sets the grain diameter. The threshold friction velocity is computed for every hour from d and the hour's air density and temperature; every grain-size-dependent layer and the cell panel update as you move it.
FR: Ce curseur règle le diamètre des grains. La vitesse de frottement seuil est calculée pour chaque heure à partir de d ainsi que de la masse volumique et de la température de l’air à cette heure ; tous les calques dépendant de la taille des grains et le panneau de la cellule se mettent à jour lorsque vous le déplacez.

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
EN: Clicking a cell opens the cell panel, shown here for the dune field of Nili Patera (9° N, 67° E): wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own grain-diameter slider at the top (outlined), linked to the main one. At the bottom you can download these data in NetCDF or CSV files and access citation information. The crosshair next to its title centres the map on the cell.
FR: Cliquer sur une cellule ouvre le panneau de la cellule, présenté ici pour le champ de dunes de Nili Patera (9° N, 67° E) : rose des vents, rose des flux de sable, modes d’orientation des dunes et tableau de l’ensemble des paramètres. Le panneau possède son propre curseur de diamètre des grains en haut (encadré), lié au curseur principal. En bas, vous pouvez télécharger ces données sous forme de fichiers NetCDF ou CSV et accéder aux informations de citation. Le réticule à côté de son titre centre la carte sur la cellule.

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
EN: Earth and Mars share this atlas: the planet button below the camera swaps between them, and each atlas reopens the view you last had there.
FR: La Terre et Mars partagent cet atlas : le bouton planète, sous l’appareil photo, permet de passer de l’une à l’autre, et chaque atlas rouvre la dernière vue que vous y aviez.

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
EN: Dimensionless flux ratios that discriminate dune morphology and stability.
FR: Rapports de flux adimensionnels qui permettent de discriminer la morphologie et la stabilité des dunes.

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
EN: Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. On Mars the atlas uses the transport law of Pähtz & Durán (2023), derived from numerical simulations for planetary conditions. For every hour, the friction velocity u* comes from the lowest-level wind of the climate model through a smooth-wall profile, and the threshold from the grain diameter and that hour's air density and temperature. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per Earth year (m²/yr), as on Earth. Real transport is lower wherever sand is scarce or indurated.
FR: Le flux de sable saturé est le débit auquel le vent déplacerait le sable sur un lit plat entièrement recouvert de sable meuble et sec : c’est la capacité de transport du vent, et pas nécessairement le transport qui a effectivement lieu. Sur Mars, l’atlas utilise la loi de transport de Pähtz & Durán (2023), établie à partir de simulations numériques pour des conditions planétaires. Pour chaque heure, la vitesse de frottement u* est obtenue à partir du vent au niveau le plus bas du modèle climatique au moyen d’un profil de paroi lisse. Le seuil est obtenu à partir du diamètre des grains ainsi que de la masse volumique et de la température de l’air à cette heure. Les flux sont exprimés en volumes de sable compacté (compacité 0,6, espace poreux inclus) par mètre de largeur et par année terrestre (m²/yr), comme sur Terre. Le transport réel est plus faible partout où le sable est rare ou induré.

## concept.mars.grain-size-and-threshold.title (Concepts)
EN: Grain size and threshold
FR: Taille des grains et seuil

## concept.mars.grain-size-and-threshold.p1 (Concepts)
EN: On Mars the slider sets the median grain diameter d rather than the threshold. The threshold friction velocity is computed for every hour from d and that hour's air density and temperature with the law of Pähtz & Durán (2023), because the thin, cold Martian air changes from hour to hour and season to season. Martian air near the surface is only about 1–2 % as dense as Earth's, so a much higher friction velocity is needed to move the same grains. The cell panel shows the median threshold over the year, its 5–95 % range, the equivalent wind at the lowest model level and the share of hours above threshold.
FR: Sur Mars, le curseur règle le diamètre médian des grains d plutôt que le seuil. La vitesse de frottement seuil est calculée pour chaque heure à partir de d ainsi que de la masse volumique et de la température de l’air à cette heure, selon la loi de Pähtz & Durán (2023). Ce calcul horaire est nécessaire car l’air martien, ténu et froid, varie d’heure en heure et de saison en saison. Près de la surface, l’air martien n’a qu’environ 1–2 % de la masse volumique de l’air terrestre, si bien qu’une vitesse de frottement bien plus élevée est nécessaire pour mettre en mouvement les mêmes grains. Le panneau de la cellule indique le seuil médian sur l’année, son intervalle 5–95 %, le vent équivalent au niveau le plus bas du modèle et la proportion d’heures au-dessus du seuil.

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
