# Dune Atlas: Simplified Chinese text

Edit only the text after `ZH:`. Keep each translation on one line. Keep unchanged:
- anything between $ signs (formulas, e.g. $u_{*,th}$), HTML tags such as <br> and <a href="…">…</a>, and {placeholders};
- the markers ⟦0⟧, ⟦1⟧ … (a formula, a name, a number or a control is put there; it already carries its own
  spaces, so write it exactly as in the English, with no space added) and ⟦#0⟧, ⟦#1⟧ … (numbers);
- names of datasets, products and people, acronyms (DP, RDD, ERA5-Land …) and references.
An empty `ZH:` line shows the English on the site. **STALE** after a heading: the English was changed after it
was translated; check the translation against the new English, then delete the word STALE.
Glossary of agreed terms: translation-glossary.csv.

# Interface

## ui.language (Interface)
EN: Language
ZH: 语言

## header.subtitle (Interface)
EN: Interactive explorer for aeolian geomorphology<br>Developed by the <a href="https://www.geomorphlab.org/" target="_blank" rel="noopener">Monash Geomorphology Lab</a>
ZH: 风沙地貌交互式浏览器<br>由 <a href="https://www.geomorphlab.org/" target="_blank" rel="noopener">Monash Geomorphology Lab</a> 开发

## header.layers (Interface)
EN: Layers
ZH: 图层

## header.layersTitle (Interface)
EN: Show / hide layers
ZH: 显示 / 隐藏图层

## basemap.legend (Interface)
EN: Basemap
ZH: 底图

## tools.help (Interface)
EN: Help and tour
ZH: 帮助与导览

## tools.concepts (Interface)
EN: Concepts
ZH: 概念

## bubble.text (Interface)
EN: Help and Tour
ZH: 帮助与导览

## bubble.label (Interface)
EN: Start the guided tour of the atlas
ZH: 开始图集引导式导览

## tour.back (Interface)
EN: Back
ZH: 上一步

## tour.next (Interface)
EN: Next
ZH: 下一步

## tour.done (Interface)
EN: Done
ZH: 完成

## tour.skip (Interface)
EN: Skip tour
ZH: 跳过导览

## tour.step (Interface)
EN: Step {i} of {n}
ZH: 第 {i} 步，共 {n} 步

## concepts.references (Interface)
EN: References:
ZH: 参考文献：

## concepts.link (Interface)
EN: Concept
ZH: 概念

## legend.log (Interface)
EN: (log scale)
ZH: （对数刻度）

## legend.symlog (Interface)
EN: (symlog, linear within ±{x})
ZH: （对称对数刻度，±{x} 范围内为线性）

## legend.atCurrent (Interface)
EN: at current
ZH: 按当前

## legend.axis (Interface)
EN: orientation axis (headless)
ZH: 走向轴（无箭头）

## legend.toward (Interface)
EN: direction of transport (toward)
ZH: 输沙方向（指向）

## legend.arrows (Interface)
EN: Arrows
ZH: 箭头

## legend.streamlines (Interface)
EN: Streamlines
ZH: 流线

## legend.arrowLength (Interface)
EN: Arrow length and opacity scale with the paired flux magnitude where available.
ZH: 在有数据时，箭头长度和不透明度随配对的输沙通量大小缩放。

## basemap.failed (Interface)
EN: The basemap “{title}” could not be loaded from its provider. It may be blocked on your network or temporarily unavailable. Please choose another basemap.
ZH: 无法从提供方加载底图“{title}”。该底图可能在您的网络中被屏蔽，或暂时不可用。请选择其他底图。

# Help panel

## help.title (Help panel)
EN: Help
ZH: 帮助

## help.restart (Help panel)
EN: Restart tour
ZH: 重新开始导览

## help.aboutLink (Help panel)
EN: About, data sources & citation
ZH: 关于、数据来源与引用

## earth.help.threshold.title (Help panel)
EN: Threshold friction velocity $u_{*,th}$
ZH: 临界摩阻风速 $u_{*,th}$

## earth.help.threshold.body (Help panel)
EN: Sand moves when the friction velocity of the wind exceeds a threshold. The slider at the top of the layer panel sets this threshold for every threshold-dependent map layer and for the cell panel (default 0.15 m/s). A lower threshold counts weaker winds as sand-moving.
ZH: 当摩阻风速超过临界值时，沙粒开始运动。图层面板顶部的滑块是为所有依赖临界摩阻风速的地图图层以及网格单元数据设定的该临界值大小（默认 0.15 m/s）。临界值越低，越弱的风也会被计为起沙风。

## earth.help.layers.title (Help panel)
EN: Layers and Active layers
ZH: 图层与当前图层

## earth.help.layers.body (Help panel)
EN: Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset; dunes, aridity, vegetation and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Names, in the Dune Fields group, labels named dune fields on the map (where names would overlap, some appear only as you zoom in) and hides the basemap's place names other than countries and states while it is on; click a name to zoom to the field and see its other names, countries and sources.
ZH: 勾选图层即可将其显示。ⓘ 按钮给出该图层的定义、单位和数据来源；“显示”可更改其颜色、颜色范围和标度，或将方向场显示为箭头或流线，并提供从“更细”（线条更密）到“更粗”的间距滑块。“当前图层”列出地图上显示的内容，顶层排在最前：拖动某一行或使用箭头可更改绘制顺序，用其滑块设置不透明度，点击 × 可移除图层。“仅沙丘”（位于“风场数据集”选择器下方）使所有由风场派生的图层（输沙通量场、输沙通量散度、箭头和流线）仅在该数据集中有沙丘的网格单元内绘制；沙丘、干旱度、植被和底图不受影响，网格单元面板仍适用于任何网格单元。该设置包含在链接中。“沙丘区”组中的“名称”在地图上标注已命名的沙丘区（名称会重叠之处，部分名称仅在放大后才显示），开启时会隐藏底图中除国家和州以外的地名；点击某一名称可缩放至该沙丘区，并查看其其他名称、所属国家和来源。

## earth.help.concepts.title (Help panel)
EN: Concepts
ZH: 概念

## earth.help.concepts.body (Help panel)
EN: The Concepts button {icon_concepts} (under the Help button {icon_help}) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
ZH: “概念”按钮 {icon_concepts}（位于“帮助”按钮 {icon_help} 下方）解释本图集中的各个物理量，并附参考文献。图层 ⓘ 中的“概念”链接可直接打开相应条目。

## earth.help.search.title (Help panel)
EN: Search
ZH: 搜索

## earth.help.search.body (Help panel)
EN: Type a dune-field name (e.g. Namib Sand Sea or Rub' al Khali), a country, or a latitude and a longitude in the box at the top of the layer panel. Names match either line of a label and the other names a field is known by, including its named parts, ignoring accents; the list under the box shows each match with its countries and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. -24.5, 15.2 or 24°30′S 15°12′E). Latitude comes first unless the letters say otherwise. While you type coordinates, the line under the box shows the position they were read as (“Go to …”); Enter moves the map there and opens the cell panel when the cell has data.
ZH: 在图层面板顶部的输入框中键入沙丘区名称（如 Namib Sand Sea 或 Rub' al Khali）、国家名称，或纬度和经度。名称可与标签的任意一行以及该沙丘区的其他名称（包括其已命名的组成部分）匹配，并忽略重音符号；输入框下方的列表显示每个匹配项及其所属国家，最佳匹配排在最前。坐标可采用十进制度，或度、分、秒格式，可带正负号，也可带 N、S、E 或 W（如 -24.5, 15.2 或 24°30′S 15°12′E）。除非字母另有说明，纬度在前。输入坐标时，输入框下方的一行会显示系统解析出的位置（“前往…”）；按 Enter 键可将地图移至该处，若该网格单元有数据，则同时打开网格单元面板。

## earth.help.cell.title (Help panel)
EN: Clicking a cell
ZH: 点击网格单元

## earth.help.cell.body (Help panel)
EN: Click any land cell to open the cell panel: the wind rose, the sand-flux rose at the current threshold, dune-orientation modes against the threshold, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the “Petals: toward / from” choice above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The latitude and longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The button {icon_centre} next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
ZH: 点击任意陆地网格单元即可打开网格单元面板：风玫瑰图、当前临界值下的输沙玫瑰图、沙丘走向模式随临界值的变化、输沙通量散度以及所有参数的表格。输沙玫瑰图的扇区指向沙粒运动的去向；玫瑰图上方的“扇区：去向／来向”选项可将其改为显示风的来向（箭头始终指向去向）。各节标题可折叠和展开。点击 × 或按 Esc 键可关闭面板。光标所在位置的纬度和经度显示在左下角比例尺旁（触摸屏上为最后点击的位置）。网格单元标题旁的 {icon_centre} 按钮可使地图以该网格单元为中心（仅当该网格单元过小而无法看清时才会放大）。

## earth.help.datasets.title (Help panel)
EN: Wind datasets
ZH: 风场数据集

## earth.help.datasets.body (Help panel)
EN: The Wind dataset selector switches between wind datasets (ERA5-Land, 0.1°, 1950–2024; ERA5, 0.25°, 1950–2024). ERA5-Land, used by Gunn (2026), re-runs ECMWF's land-surface model driven by ERA5 atmospheric fields interpolated to its 0.1° grid (Muñoz-Sabater et al. 2021); Baas (2026) reports its 10 m wind speeds 20–30 % below those of ERA5. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
ZH: “风场数据集”选择器可在不同的风场数据集之间切换（ERA5-Land，0.1°，1950–2024 年；ERA5，0.25°，1950–2024 年）。Gunn (2026) 所用的 ERA5-Land 是由插值到其 0.1° 网格上的 ERA5 大气场驱动的 ECMWF 陆面模型重运行产品（Muñoz-Sabater et al. 2021）；Baas (2026) 报告其 10 m 风速比 ERA5 低 20–30 %。风场与输沙通量图层以及网格单元面板随所选数据集变化；沙丘区掩膜、干旱指数与植被图层对所有数据集均相同。

## earth.help.downloads.title (Help panel)
EN: Downloads and citation
ZH: 下载与引用

## earth.help.downloads.body (Help panel)
EN: Download & cite in the cell panel saves the wind histogram and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite Gunn (2026) and the wind dataset you use.
ZH: 网格单元面板中的“下载与引用”可将该网格单元的风速直方图及全部参数保存为 NetCDF 文件或 CSV 文件包，并附每个数据来源的引用信息。请引用 Gunn (2026) 及您所用的风场数据集。

## earth.help.region.title (Help panel)
EN: Downloading a region
ZH: 下载区域数据

## earth.help.region.body (Help panel)
EN: The region button {icon_region}, below the camera button {icon_camera}, saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every threshold or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
ZH: 相机按钮 {icon_camera} 下方的区域按钮 {icon_region}可将所选风场数据集在某一经纬度范围框内的所有网格单元保存为一个 NetCDF 文件，并附 README。输入边界，或按“在地图上绘制”并在地图上拖出一个框（按 Esc 取消）。勾选所需参数，并选择全部临界值或当前临界值；文件大小会随操作实时估算，且以浏览器可容纳的大小为上限。如需完整网格，请参见“下载与引用”下的“获取完整网格”。

## earth.help.images.title (Help panel)
EN: Exporting images
ZH: 导出图像

## earth.help.images.body (Help panel)
EN: Export map image (camera button {icon_camera}, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
ZH: “导出地图图像”（右上角相机按钮 {icon_camera}）将当前视图保存为宽 1600–2400 像素（屏幕显示宽度的 1.5 倍）的 PNG，可选择是否包含底图，背景为白色或透明。地图下方依次为色标、图例、指北针和比例尺，然后是视图、风场数据集和数据来源信息。网格单元面板中的每幅图都有“导出”菜单，可导出 PNG（宽 1600 像素）或采用浅色主题、版式相同的 SVG。

## earth.help.share.title (Help panel)
EN: Sharing the view
ZH: 分享视图

## earth.help.share.body (Help panel)
EN: The share button {icon_share} (top right) copies a short link that restores this view: position, zoom, globe or flat map, wind dataset, threshold, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
ZH: 分享按钮 {icon_share}（右上角）复制一个可恢复当前视图的短链接，包括：位置、缩放级别、地球仪或平面地图、风场数据集、临界值、底图、当前图层及其显示设置，以及所选网格单元。地址栏中也始终保存着指向当前视图的完整链接。

# Guided tour

## earth.tour.help.title (Guided tour)
EN: Welcome to the Dune Atlas
ZH: 欢迎使用 Dune Atlas

## earth.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button {icon_help} highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
ZH: 本简短导览介绍主要控件。右上角此处高亮显示的“帮助”按钮 {icon_help}可打开快速参考，并可随时重新开始本导览。

## earth.tour.concepts.title (Guided tour)
EN: Concepts
ZH: 概念

## earth.tour.concepts.body (Guided tour)
EN: The Concepts button {icon_concepts} explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
ZH: “概念”按钮 {icon_concepts}解释地图上各物理量的含义，并附参考文献。每个图层的 ⓘ 均链接到其相应条目。

## earth.tour.map.title (Guided tour)
EN: The map
ZH: 地图

## earth.tour.map.body (Guided tour)
EN: Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map.
ZH: 拖动以平移；滚动滚轮、双指缩放或使用 + 和 − 进行缩放。“底图”下的“球面视图”可在地球仪与平面地图之间切换。

## earth.tour.threshold.title (Guided tour)
EN: Threshold friction velocity $u_{*,th}$
ZH: 临界摩阻风速 $u_{*,th}$

## earth.tour.threshold.body (Guided tour)
EN: This slider sets the friction velocity above which the wind moves sand. Every threshold-dependent layer and the cell panel update as you move it.
ZH: 此滑块设定临界摩阻风速，即风开始搬运沙粒时的摩阻风速。移动滑块时，所有依赖临界摩阻风速的图层及网格单元面板都会随之更新。

## earth.tour.layers.title (Guided tour)
EN: Layers and their display
ZH: 图层及其显示

## earth.tour.layers.body (Guided tour)
EN: Tick layers to add them to the map; ⓘ explains a layer. Display, opened here for the resultant drift direction (RDD), changes a layer's colours and colour limits and, for direction fields, draws a colour map, arrows or streamlines in the line colour and spacing you choose. Dunes only, under the Wind dataset selector, keeps the wind-derived layers to the cells with dunes.
ZH: 勾选图层即可将其添加到地图；ⓘ 用于说明图层。“显示”（此处为合成输沙方向（RDD）打开）可更改图层的颜色及颜色范围；对于方向场，还可按所选线条颜色和间距绘制色图、箭头或流线。“风场数据集”选择器下方的“仅沙丘”将由风场导出的图层限制在有沙丘的网格单元内。

## earth.tour.active.title (Guided tour)
EN: Active layers
ZH: 当前图层

## earth.tour.active.body (Guided tour)
EN: The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.
ZH: 地图上的图层，最上层排在首位。拖动某一行或使用箭头可更改哪个图层绘制在最上层，使用滑块调节不透明度，点击 × 可移除图层。

## earth.tour.cell.title (Guided tour)
EN: Click a land cell
ZH: 点击陆地网格单元

## earth.tour.cell.body (Guided tour)
EN: Clicking a land cell opens the cell panel, shown here for a dune cell in the Namib Sand Sea: wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own $u_{*,th}$ slider at the top (outlined), linked to the main one. At the bottom, Download & cite saves these data as NetCDF or CSV, with the citations. The button {icon_centre} next to its title centres the map on the cell.
ZH: 点击陆地网格单元会打开网格单元面板，此处显示的是 Namib Sand Sea 中的一个沙丘网格单元：风玫瑰图、输沙玫瑰图、沙丘走向模式以及所有参数的表格。面板顶部有其自身的 $u_{*,th}$ 滑块（带轮廓线），与主滑块联动。在面板底部，“下载与引用”可将这些数据保存为 NetCDF 或 CSV 格式，并附带引用信息。标题旁的 {icon_centre} 按钮可将地图居中到该网格单元。

## earth.tour.dataset.title (Guided tour)
EN: Wind dataset
ZH: 风场数据集

## earth.tour.dataset.body (Guided tour)
EN: Switch between the wind datasets; each option names the dataset and its grid. The map layers and the cell panel follow the selection.
ZH: 在各风场数据集之间切换；每个选项均标明数据集名称及其网格。地图图层和网格单元面板会随所选数据集更新。

## earth.tour.tools.title (Guided tour)
EN: Share and export
ZH: 分享与导出

## earth.tour.tools.body (Guided tour)
EN: Copy a short link to this view, export the map as an image with colour bars, scale and data sources, or download the data of a region you draw on the map. Plots in the cell panel have their own Export menus.
ZH: 复制指向当前视图的短链接，将地图连同色标、比例尺和数据来源导出为图像，或下载您在地图上绘制区域的数据。网格单元面板中的图件有各自的“导出”菜单。

## earth.tour.planet.title (Guided tour)
EN: Switch planet
ZH: 切换行星

## earth.tour.planet.body (Guided tour)
EN: Earth and Mars share this atlas: the planet button {icon_planet}, below the camera button {icon_camera}, swaps between them, and each atlas reopens the view you last had there.
ZH: 地球与火星共用本图集：相机按钮 {icon_camera} 下方的行星按钮 {icon_planet}可在两者之间切换，且每个图集都会恢复您上次在该处的视图。

# Layer groups

## earth.group.dunes (Layer groups)
EN: Dune Fields
ZH: 沙丘区

## earth.group.dunes.desc (Layer groups)
EN: Global aeolian dune map on the 0.1° ERA5-Land grid (106,540 cells, 7.8 % of land area).
ZH: 基于 0.1° ERA5-Land 网格的全球风成沙丘分布图（106,540 个网格单元，占陆地面积的 7.8 %）。

# Layers and legends

## earth.layer.dunes.title (Layers and legends)
EN: Dune-field mask
ZH: 沙丘区掩膜

## earth.layer.dunes.short (Layers and legends)
EN: Mask
ZH: 掩膜

# Layer groups

## earth.group.orientation (Layer groups)
EN: Bedform orientation
ZH: 床面形态走向

## earth.group.orientation.desc (Layer groups)
EN: Predicted dune orientations: crest orientation and migration direction of the bed-instability mode, elongation direction and along-crest transport direction.
ZH: 预测的沙丘走向：床面失稳模式的脊线走向与迁移方向，以及伸长方向和沿脊线输沙方向。

# Layers and legends

## earth.layer.at.title (Layers and legends)
EN: Transverse migration direction $\alpha_T$
ZH: 横向迁移方向 $\alpha_T$

## earth.layer.at.units (Layers and legends)
EN: °
ZH: °

## earth.layer.ae.title (Layers and legends)
EN: Elongation direction $\alpha_E$
ZH: 伸长方向 $\alpha_E$

## earth.layer.ae.units (Layers and legends)
EN: °
ZH: °

## earth.layer.ab.title (Layers and legends)
EN: Crest orientation, bed-instability mode $\alpha_H$
ZH: 脊线走向，床面失稳模式 $\alpha_H$

## earth.layer.ab.units (Layers and legends)
EN: °
ZH: °

## earth.layer.ao.title (Layers and legends)
EN: Along-crest transport direction $\alpha_O$
ZH: 沿脊线输沙方向 $\alpha_O$

## earth.layer.ao.units (Layers and legends)
EN: °
ZH: °

# Layer groups

## earth.group.crest-fluxes (Layer groups)
EN: Crest-normal/parallel fluxes
ZH: 垂直与平行于脊线的输沙通量

## earth.group.crest-fluxes.desc (Layer groups)
EN: Net and absolute sand flux resolved across (normal to) and along (parallel to) predicted crests.
ZH: 净输沙通量与绝对输沙通量，分解为横跨（垂直于）和沿着（平行于）预测脊线方向的分量。

# Layers and legends

## earth.layer.qacb.title (Layers and legends)
EN: Absolute across-crest flux, bed-instability mode $\langle |Q_{\bot}(\alpha_H)|\rangle$
ZH: 垂直于脊线的绝对输沙通量，床面失稳模式 $\langle |Q_{\bot}(\alpha_H)|\rangle$

## earth.layer.qacb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qncb.title (Layers and legends)
EN: Net across-crest flux, bed-instability mode $\langle Q_{\bot}(\alpha_H)\rangle$
ZH: 垂直于脊线的净输沙通量，床面失稳模式 $\langle Q_{\bot}(\alpha_H)\rangle$

## earth.layer.qncb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qnlb.title (Layers and legends)
EN: Net along-crest flux, bed-instability mode $\langle Q_{\parallel}(\alpha_H)\rangle$
ZH: 沿脊线的净输沙通量，床面失稳模式 $\langle Q_{\parallel}(\alpha_H)\rangle$

## earth.layer.qnlb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qalb.title (Layers and legends)
EN: Absolute along-crest flux, bed-instability mode $\langle |Q_{\parallel}(\alpha_H)|\rangle$
ZH: 沿脊线的绝对输沙通量，床面失稳模式 $\langle |Q_{\parallel}(\alpha_H)|\rangle$

## earth.layer.qalb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qnle.title (Layers and legends)
EN: Net along-crest flux, elongation mode $\langle Q_{\parallel}(\alpha_E)\rangle$
ZH: 沿脊线的净输沙通量，伸长模式 $\langle Q_{\parallel}(\alpha_E)\rangle$

## earth.layer.qnle.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qale.title (Layers and legends)
EN: Absolute along-crest flux, elongation mode $\langle |Q_{\parallel}(\alpha_E)|\rangle$
ZH: 沿脊线的绝对输沙通量，伸长模式 $\langle |Q_{\parallel}(\alpha_E)|\rangle$

## earth.layer.qale.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qace.title (Layers and legends)
EN: Absolute across-crest flux, elongation mode $\langle |Q_{\bot}(\alpha_E)|\rangle$
ZH: 垂直于脊线的绝对输沙通量，伸长模式 $\langle |Q_{\bot}(\alpha_E)|\rangle$

## earth.layer.qace.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

# Layer groups

## earth.group.morphology (Layer groups)
EN: Ratios & morphology indices
ZH: 比值与形态指数

## earth.group.morphology.desc (Layer groups)
EN: Dimensionless flux ratios related to dune morphology and stability.
ZH: 与沙丘形态及稳定性相关的无量纲输沙通量比值。

# Layers and legends

## earth.layer.sige_sigh.title (Layers and legends)
EN: Stability of elongating dunes on starved beds $\sigma_E/\sigma_H$
ZH: 沙源不足的床面上伸长沙丘的稳定性 $\sigma_E/\sigma_H$

## earth.layer.sige_sigh.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qhab_nl_nc.title (Layers and legends)
EN: Crest straightness vs sinuosity, bed-instability mode $\hat{Q}_{\parallel/\bot,H}$
ZH: 脊线平直度与弯曲度对比，床面失稳模式 $\hat{Q}_{\parallel/\bot,H}$

## earth.layer.qhab_nl_nc.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qhab_ac_nc.title (Layers and legends)
EN: Growth-in-height vs migration balance $\hat{Q}_{|\bot|/\bot,H}$
ZH: 高度增长与迁移的平衡 $\hat{Q}_{|\bot|/\bot,H}$

## earth.layer.qhab_ac_nc.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qhne_ac_nl.title (Layers and legends)
EN: Morphology of elongating dunes $\hat{Q}_{|\bot|/\parallel,E}$
ZH: 伸长沙丘的形态 $\hat{Q}_{|\bot|/\parallel,E}$

## earth.layer.qhne_ac_nl.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

# Layer groups

## earth.group.wind (Layer groups)
EN: Wind statistics
ZH: 风况统计

## earth.group.wind.desc (Layer groups)
EN: How often and how strongly the flat-bed friction velocity exceeds the threshold.
ZH: 平坦床面摩阻风速超过临界值的频率与程度。

# Layers and legends

## earth.layer.uft.title (Layers and legends)
EN: Fraction of time above threshold $T|u_{\ast,f}>u_{\ast,th}/T$
ZH: 超过临界值的时间比例 $T|u_{\ast,f}>u_{\ast,th}/T$

## earth.layer.uft.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.ufm.title (Layers and legends)
EN: Mean above-threshold friction velocity / threshold $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$
ZH: 超过临界值时的平均摩阻风速 / 临界值 $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$

## earth.layer.ufm.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qhbf.title (Layers and legends)
EN: Fraction of bed-instability-mode flux while flat bed above threshold
ZH: 平坦床面超过临界值期间床面失稳模式输沙通量所占比例

## earth.layer.qhbf.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qhef.title (Layers and legends)
EN: Fraction of elongation-mode flux while flat bed above threshold
ZH: 平坦床面超过临界值期间伸长模式输沙通量所占比例

## earth.layer.qhef.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

# Layer groups

## earth.group.drift (Layer groups)
EN: Drift potential
ZH: 输沙势

## earth.group.drift.desc (Layer groups)
EN: Flat-bed sand flux: total (DP), net (RDP), its direction (RDD) and directionality (RDP/DP).
ZH: 平坦床面输沙通量：总输沙（DP）、合成输沙势（RDP）、其方向（RDD）及方向变率指数（RDP/DP）。

# Layers and legends

## earth.layer.dpm.title (Layers and legends)
EN: Drift potential $DP$
ZH: 输沙势 $DP$

## earth.layer.dpm.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.rdpm.title (Layers and legends)
EN: Resultant drift potential $RDP$
ZH: 合成输沙势 $RDP$

## earth.layer.rdpm.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.rdpa.title (Layers and legends)
EN: Resultant drift direction $RDD$
ZH: 合成输沙方向 $RDD$

## earth.layer.rdpa.units (Layers and legends)
EN: °
ZH: °

## earth.layer.qha_rdp_dp.title (Layers and legends)
EN: Flux directionality $RDP/DP$
ZH: 输沙通量方向变率 $RDP/DP$

## earth.layer.qha_rdp_dp.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qsdiv.title (Layers and legends)
EN: Saturated flux divergence $\nabla\cdot\vec{q}_s$
ZH: 饱和输沙通量散度 $\nabla\cdot\vec{q}_s$

## earth.layer.qsdiv.units (Layers and legends)
EN: m/kyr
ZH: m/kyr

# Layer groups

## earth.group.climate (Layer groups)
EN: Related data
ZH: 相关数据

## earth.group.climate.desc (Layer groups)
EN: Surface conditions from external datasets: aridity and vegetation cover. These do not depend on the wind dataset or on u*,th.
ZH: 来自外部数据集的地表条件：干旱度与植被覆盖度。它们不依赖于风场数据集，也不依赖于 u*,th。

# Layers and legends

## earth.layer.aridity.title (Layers and legends)
EN: Aridity index $\mathrm{AI}$
ZH: 干旱指数 $\mathrm{AI}$

## earth.layer.aridity.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.vegetation.title (Layers and legends)
EN: Total vegetation cover $V$
ZH: 总植被覆盖度 $V$

## earth.layer.vegetation.units (Layers and legends)
EN: %
ZH: %

## earth.invert.legend (Layers and legends)
EN: Land without mapped dunes
ZH: 未标绘/没有沙丘的陆地

# Basemaps

## earth.basemap.openfreemap-dark (Basemaps)
EN: Dark (OpenFreeMap)
ZH: 深色（OpenFreeMap）

## earth.basemap.esri-imagery (Basemaps)
EN: Satellite imagery (Esri)
ZH: 卫星影像（Esri）

## earth.basemap.hillshade (Basemaps)
EN: Shaded relief (Mapterhorn, 2D)
ZH: 阴影地形（Mapterhorn，2D）

## earth.basemap.opentopomap (Basemaps)
EN: Topographic (OpenTopoMap)
ZH: 地形图（OpenTopoMap）

## earth.basemap.openfreemap-light (Basemaps)
EN: Light (OpenFreeMap Positron)
ZH: 浅色（OpenFreeMap Positron）

# Concepts

## concept.earth.saturated-sand-flux-and-the-transport-law.title (Concepts)
EN: Saturated sand flux and the transport law
ZH: 饱和输沙率与输沙定律

## concept.earth.saturated-sand-flux-and-the-transport-law.p1 (Concepts)
EN: Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. It is zero below the threshold friction velocity and grows with the excess wind stress above it. The Earth atlas uses the transport law of Martin & Kok (2017), which is linear in the excess shear stress, with the friction velocity u* derived from the hourly 10 m wind by a logarithmic profile with a roughness length of 1 mm. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per year (m²/yr). Real transport is lower wherever sand is scarce, wet, crusted or vegetated.
ZH: 饱和输沙率是风在完全覆盖松散干沙的平坦床面上搬运沙的速率，即风的输沙能力，而不一定是实际发生的输沙。摩阻风速低于临界摩阻风速时，饱和输沙率为零；高于临界值时，饱和输沙率随超出临界值的风应力增大而增大。地球图集采用 Martin & Kok (2017) 的输沙定律，该定律与超额剪切应力呈线性关系，其中摩阻风速 u* 由逐小时 10 m 风速按对数廓线推算，空气动力学粗糙度取 1 mm。输沙通量以每米宽度每年搬运的堆积沙体积表示（堆积体积分数 0.6，含孔隙），单位为 m²/yr。在沙源匮乏、潮湿、结皮或有植被覆盖的地方，实际输沙量更低。

## fry.heading (Concepts)
EN: Atlas DP and Fryberger DP for a steady wind
ZH: 稳态风条件下的图集 DP 与 Fryberger DP

## fry.slider (Concepts)
EN: Atlas threshold $u_{*,th}$
ZH: 图集临界摩阻风速 $u_{*,th}$

## fry.atlas (Concepts)
EN: Atlas DP (m²/yr)
ZH: 图集 DP（m²/yr）

## fry.fryberger (Concepts)
EN: Fryberger DP (VU)
ZH: Fryberger DP（VU）

## fry.ratio (Concepts)
EN: Atlas DP / Fryberger DP
ZH: 图集 DP / Fryberger DP

## fry.ratioUnits (Concepts)
EN: (m²/yr per VU)
ZH: （m²/yr 每 VU）

## fry.xAxis (Concepts)
EN: 10 m wind speed $U_{10}$ (m/s)
ZH: 10 m 风速 $U_{10}$（m/s）

## fry.knots (Concepts)
EN: knots
ZH: 节

## fry.hint (Concepts)
EN: Point at the plot to read off the values.
ZH: 将指针指向图中即可读取数值。

## fry.mapValue (Concepts)
EN: map value
ZH: 地图值

## fry.mapValueTitle (Concepts)
EN: Back to the threshold of the map
ZH: 恢复为地图所用临界值

## fry.readU (Concepts)
EN: $U_{10}$:
ZH: $U_{10}$：

## fry.readAtlas (Concepts)
EN: Atlas DP:
ZH: 图集 DP：

## fry.readFry (Concepts)
EN: Fryberger DP:
ZH: Fryberger DP：

## fry.readRatio (Concepts)
EN: Ratio:
ZH: 比值：

## fry.caption (Concepts)
EN: For a wind blowing at one speed for the whole year. Atlas DP: the saturated flux of Martin & Kok (2017) from $u_* = \kappa U_{10} / \ln(z/z_0)$ with $z_0$ = 1 mm, at the threshold set above. Fryberger DP: $V^2(V - V_t)$ with $V$ in knots, $V_t$ = 12 knots and the wind blowing 100 % of the time. Dashed lines: the two thresholds; between them only one DP is above zero. The ratio changes with wind speed, so there is no fixed conversion factor; for a real wind record it depends on the mix of wind speeds. Hours above 20 m/s are not counted by the atlas.
ZH: 假设风全年风速唯一。图集 DP：按上方设定的临界值，由 $u_* = \kappa U_{10} / \ln(z/z_0)$（$z_0$ = 1 mm）计算 Martin & Kok (2017) 的饱和输沙率。Fryberger DP：$V^2(V - V_t)$，其中 $V$ 以节为单位，$V_t$ = 12 节，风吹刮时间占 100 %。虚线表示两个临界值；在两者之间只有一种 DP 大于零。比值随风速变化，因此不存在固定的换算系数；对于实际风速序列，两种 DP 之比取决于其风速组成。风速超过 20 m/s 的时间段不计入图集。

## concept.drift-potential-dp.title (Concepts)
EN: Drift potential (DP)
ZH: 输沙势（DP）

## concept.drift-potential-dp.p1 (Concepts)
EN: DP is the saturated sand flux averaged over each time step of the record, whatever its direction: how much sand the wind could move in a year over a flat sandy bed, in m²/yr. Higher DP means a windier, more energetic sand-transport environment. The name follows Fryberger & Dean (1979), whose drift potential also measures transport capacity, but the two are different quantities. Fryberger's DP is in vector units, computed from 10 m wind speeds in knots as V²(V − Vt) with a 12-knot threshold. The atlas DP is a physical flux computed from the friction velocity. Because the two formulas grow differently with wind speed, there is no fixed conversion factor between them; Fryberger's low, intermediate and high-energy classes (below 200, 200–400 and above 400 vector units) are defined in vector units.
ZH: DP 是记录中每个时间步饱和输沙率（无论其方向）的平均值，即风在一年内可在平坦沙质床面上搬运的沙量，单位为 m²/yr。DP 越高，表示风力越强、风沙输运环境能量越高。该名称沿用 Fryberger & Dean (1979)，其输沙势同样衡量输沙能力，但两者是不同的物理量。Fryberger 的 DP 以矢量单位表示，由以节为单位的 10 m 风速按 V²(V − Vt) 计算，临界风速为 12 节。图集 DP 则是由摩阻风速计算得到的物理通量。由于两个公式随风速增长的方式不同，两者之间不存在固定的换算系数；Fryberger 的低、中、高能量等级（低于 200、200–400 和高于 400 矢量单位）是以矢量单位定义的。

## concept.resultant-drift-potential-rdp.title (Concepts)
EN: Resultant drift potential (RDP)
ZH: 合成输沙势（RDP）

## concept.resultant-drift-potential-rdp.p1 (Concepts)
EN: RDP is the net sand flux: the fluxes of each time step added as vectors, so that transport in opposite directions cancels, then averaged over the record (m²/yr). It equals DP only if all transport goes the same way. A cell with high DP but low RDP has strong winds that move sand back and forth with little net displacement; a cell with RDP close to DP moves sand steadily in one direction. RDP is the magnitude of the vector whose direction is the resultant drift direction (RDD), and the divergence of this vector gives the flux divergence layer.
ZH: RDP 为合成输沙势：将各时间步的输沙通量按矢量相加，使相反方向的输沙相互抵消，再对整个序列求平均（m²/yr）。只有当所有输沙方向一致时，RDP 才等于 DP。DP 高而 RDP 低的网格单元，强风使沙物质来回搬运而净位移很小；RDP 接近 DP 的网格单元，沙物质持续向同一方向移动。RDP 是一个矢量的模，该矢量的方向即合成输沙方向（RDD），该矢量的散度即为输沙通量散度图层。

## concept.resultant-drift-direction-rdd.title (Concepts)
EN: Resultant drift direction (RDD)
ZH: 合成输沙方向（RDD）

## concept.resultant-drift-direction-rdd.p1 (Concepts)
EN: RDD is the direction of the net sand flux, given as the compass bearing toward which sand moves (0° = north, 90° = east). It summarises the direction of net sand transport over the whole record and is often compared with the migration direction of dunes and the trend of linear dunes. Where RDP/DP is low, opposing fluxes nearly cancel, and a small change of threshold (or grain diameter), wind dataset or neighbouring cell can turn RDD by up to 180°. The dune-orientation modes (αT, αE) use the whole distribution of flux directions, including the speed-up of the wind over dune crests, and can differ from RDD.
ZH: RDD 为净输沙通量的方向，以沙物质移动所指向的方位角表示（0° = 正北，90° = 正东）。它概括了整个序列中净输沙的方向，常与沙丘迁移方向及线形沙丘的走向进行比较。在 RDP/DP 较低之处，相反方向的输沙通量几乎相互抵消，临界值（或粒径）、风场数据集或相邻网格单元的微小变化都可使 RDD 偏转达 180°。沙丘走向模式（αT、αE）利用输沙通量方向的完整分布，包括风在沙丘脊线上的加速效应，因而可能与 RDD 不同。

## concept.directionality-rdp-dp.title (Concepts)
EN: Directionality (RDP/DP)
ZH: 方向变率（RDP/DP）

## concept.directionality-rdp-dp.p1 (Concepts)
EN: RDP/DP is the ratio of net to total sand flux. It is 1 when all transport goes in one direction and approaches 0 when transport from several directions cancels. Fryberger & Dean (1979) used the ratio to classify wind regimes: below 0.3 low (complex or obtuse bimodal winds), 0.3–0.8 intermediate (obtuse to acute bimodal winds), above 0.8 high (unimodal winds). The atlas ratio counts only transport above the selected threshold (Gunn 2026) and uses a different flux law, so it changes with the threshold or grain-diameter setting. Wasson & Hyde (1983) related dune type to this ratio together with sand availability.
ZH: RDP/DP 为净输沙通量与总输沙通量之比。当所有输沙均沿同一方向时，其值为 1；当来自多个方向的输沙相互抵消时，其值趋近于 0。Fryberger & Dean (1979) 用该比值划分风况类型：低于 0.3 为低（复杂风况或钝角双峰风况），0.3–0.8 为中等（钝角至锐角双峰风况），高于 0.8 为高（单峰风况）。本图集中的比值只计入超过所选临界值的输沙（Gunn 2026），且采用不同的输沙率公式，因此会随临界值或粒径设置而变化。Wasson & Hyde (1983) 将沙丘类型与该比值及沙源供应状况联系起来。

## concept.wind-from-sand-toward.title (Concepts)
EN: Wind FROM, sand TOWARD
ZH: 风“来自”，沙“去往”

## concept.wind-from-sand-toward.p1 (Concepts)
EN: The atlas uses two opposite conventions, as is usual in each field. Wind roses are meteorological: a petal pointing north shows wind blowing from the north. Sand-flux roses, RDD and the dune-orientation modes show the direction sand or dunes move toward: a petal pointing south shows sand moving to the south. So a north wind appears as a north petal on the wind rose and a south petal on the sand rose. The Petals switch above the sand-flux rose in the cell panel can turn its petals to show the direction the wind comes from instead, as on the wind rose; the arrows on the rose, the bearing values, the map and the downloaded data keep the toward convention. The crest orientation αH is an axis (0–180°), not a direction of motion, and has neither "from" nor "toward".
ZH: 本图集采用两种相反的约定，分别沿用各自领域的惯例。风玫瑰图采用气象学约定：指向北的扇区表示风从北方吹来。输沙玫瑰图、RDD 和沙丘走向模式表示沙物质或沙丘移动所指向的方向：指向南的扇区表示沙物质向南移动。因此，北风在风玫瑰图上显示为指向北的扇区，在输沙玫瑰图上显示为指向南的扇区。网格单元面板中输沙玫瑰图上方的“扇区”开关可将其扇区改为显示风的来向，与风玫瑰图一致；玫瑰图上的箭头、方位角数值、地图及下载的数据仍保持“去往”约定。脊线走向 αH 是一条轴线（0–180°），而非运动方向，因此既无“来自”也无“去往”之分。

## concept.earth.threshold-friction-velocity.title (Concepts)
EN: Threshold friction velocity
ZH: 临界摩阻风速

## concept.earth.threshold-friction-velocity.p1 (Concepts)
EN: Sand moves when the friction velocity u* of the wind, a measure of the shear stress the wind exerts on the surface, exceeds a threshold u*,th. The default of 0.15 m/s is the value used for the global analysis of Gunn (2026), one value for the whole globe, not calibrated for any site. Values between 0.1 and 0.4 m/s are typical, and for loose, dry sand the threshold depends mainly on grain size and density. With the atlas's wind profile, 0.15 m/s equals a 3.4 m/s wind at 10 m (6.6 knots), and Fryberger's 12 knots equals about 0.27 m/s. Raising the threshold lowers DP and can change directions.
ZH: 当摩阻风速 u*（衡量风对地表所施加剪切应力的量）超过临界值 u*,th 时，沙粒开始运动。默认值 0.15 m/s 为 Gunn (2026) 全球分析所采用的值，是适用于整个全球的单一数值，并未针对任何地点进行校准。典型值介于 0.1 与 0.4 m/s 之间；对于松散干燥的沙，临界值主要取决于粒径和颗粒密度。按本图集采用的风速廓线，0.15 m/s 相当于 10 m 高度处 3.4 m/s 的风速（6.6 节），而 Fryberger 的 12 节约相当于 0.27 m/s。提高临界值会降低 DP，并可能改变方向。

## concept.two-ways-dunes-orient-bed-instability-and-elongation.title (Concepts)
EN: Two ways dunes orient: bed instability and elongation
ZH: 沙丘朝向的两种方式：床面失稳与伸长

## concept.two-ways-dunes-orient-bed-instability-and-elongation.p1 (Concepts)
EN: Dunes can grow in two ways that give different orientations in the same wind regime. Where loose sand covers the bed, dunes grow in height from the bed itself (the bed instability): crests align so that the gross sand transport across them is as large as possible (Rubin & Hunter 1987), and the dunes migrate. Where sand is scarce over a non-erodible bed, dunes can instead grow in length from a sand source (the elongation mode): they extend in the direction of the net sand flux on the dune, where the net flux across the crest is zero. Elongating dunes need winds from more than one direction, and in approximately bi-directional winds the two orientations often differ by more than 90°. Mapped crest orientations can be compared with both predictions.
ZH: 在同一风况下，沙丘可通过两种方式生长，并形成不同的走向。在松散沙覆盖床面的地方，沙丘由床面本身发育而实现高度增长（床面失稳）：脊线的排列方式使跨越脊线的总输沙量尽可能大（Rubin & Hunter 1987），沙丘随之迁移。在沙源不足、下伏不可侵蚀床面的地方，沙丘则可从沙源出发实现长度增长（伸长模式）：它们沿沙丘上净输沙通量的方向延伸，此时跨越脊线的净输沙通量为零。伸长型沙丘需要来自多个方向的风；在近似双向风况下，两种走向之差往往超过90°。可将制图得到的脊线走向与两种预测结果进行比较。

## concept.migration-direction-αt.title (Concepts)
EN: Migration direction αT
ZH: 迁移方向 αT

## concept.migration-direction-αt.p1 (Concepts)
EN: αT is the direction in which dunes with the bed-instability crest orientation αH migrate, as a compass bearing (toward). It is perpendicular to αH, on the side toward which the net sand flux across the crest points. Because αH depends on the gross crest transport from all directions, αT reflects the whole flux rose and can differ from RDD, especially in bimodal winds. Barchan dunes migrate in the direction their horns point. Gunn (2026) compares αT with mapped barchans and shows that in some places the predicted direction changes strongly with the threshold, that is, with grain size or other factors such as vegetation.
ZH: αT 是具有床面失稳脊线走向 αH 的沙丘的迁移方向，以方位角（指向）表示。它垂直于 αH，位于跨越脊线的净输沙通量所指向的一侧。由于 αH 取决于来自所有方向的跨脊线总输沙，αT 反映的是整个输沙玫瑰图，可能与 RDD 不同，在双峰风况下尤其如此。新月形沙丘沿其两翼尖角所指方向迁移。Gunn (2026) 将 αT 与制图得到的新月形沙丘进行了比较，并表明在某些地区，预测方向随阈值（即随粒径或植被等其他因素）发生显著变化。

## concept.crest-orientation-αh.title (Concepts)
EN: Crest orientation αH
ZH: 脊线走向 αH

## concept.crest-orientation-αh.p1 (Concepts)
EN: αH is the orientation of dune crests formed by the bed instability: the axis along which crests receive the largest gross sand transport across them, because transport from both sides builds a dune up (Rubin & Hunter 1987). The atlas computes it with the speed-up of the wind over a dune crest, which is largest when the wind crosses the crest at a right angle. αH is also the expected crest orientation of migrating dunes such as barchans. It is an axis between 0° and 180°, not a direction of motion: e.g., 128° and 308° describe the same line. Dunes with this orientation migrate perpendicular to it, in direction αT.
ZH: αH 是由床面失稳形成的沙丘脊线走向：即脊线所受跨越脊线的总输沙量最大的轴线，因为来自两侧的输沙均会使沙丘增高（Rubin & Hunter 1987）。本图集利用风在沙丘脊线上的加速效应计算 αH，当风以直角穿越脊线时加速最大。αH 也是新月形沙丘等迁移型沙丘的预期脊线走向。它是介于 0° 与 180° 之间的轴向，而非运动方向：例如，128° 和 308° 表示同一条直线。具有该走向的沙丘沿垂直于它的方向迁移，即 αT 方向。

## concept.elongation-direction-αe.title (Concepts)
EN: Elongation direction αE
ZH: 伸长方向 αE

## concept.elongation-direction-αe.p1 (Concepts)
EN: αE is the direction in which dunes of the elongation mode extend, as a compass bearing (toward). These dunes form where sand is limited over a non-erodible bed, typically growing from a fixed source such as sand trapped behind an obstacle. A dune elongates where the net sand flux across its crest is zero and the net flux along it is positive; this direction is stable, because transport turns a dune that deviates from it back toward it. Because the dune itself changes the winds it feels, αE can be longitudinal or oblique to RDD. An elongating dune needs winds from more than one direction. Where several elongation directions exist, as for star dunes, the atlas shows the most stable one.
ZH: αE 是伸长模式沙丘的伸长方向，以方位角（指向）表示。这类沙丘形成于不可侵蚀床面上沙量有限的地区，通常从固定沙源（如被障碍物拦截在其后方的沙）开始生长。当跨越沙丘脊线的净输沙通量为零、沿脊线的净输沙通量为正时，沙丘发生伸长；这一方向是稳定的，因为偏离该方向的沙丘会在输沙作用下转回该方向。由于沙丘本身会改变其所受的风，αE 相对于 RDD 可以是纵向的，也可以是斜交的。伸长沙丘需要来自不止一个方向的风。当存在多个伸长方向时（如星状沙丘），本图集显示最稳定的方向。

## concept.along-crest-transport-direction-αo.title (Concepts)
EN: Along-crest transport direction αO
ZH: 沿脊线输沙方向 αO

## concept.along-crest-transport-direction-αo.p1 (Concepts)
EN: αO is a direction along the crests of the bed-instability orientation αH: the way the net sand flux along those crests points, as a compass bearing (toward). Where crests are transverse to the net transport, sand crosses them with little along-crest movement; where they are oblique or longitudinal, part of the transport runs along the crest, and αO shows which way. Along-crest transport tends to keep crests straight, and superimposed features such as small dunes and crest sinuosities that migrate along a main crest reveal the direction of along-crest transport on imagery.
ZH: αO 是沿床面失稳走向 αH 的脊线的方向，即沿这些脊线的净输沙通量的指向，以方位角（指向）表示。当脊线与净输沙方向垂直（横向）时，沙越过脊线，沿脊线的运移很少；当脊线为斜向或纵向时，部分输沙沿脊线进行，αO 指示其方向。沿脊线输沙倾向于使脊线保持平直；叠置于主脊线之上并沿其迁移的小沙丘和脊线弯曲等次级形态，可在影像上揭示沿脊线输沙的方向。

## concept.stability-of-elongating-dunes-σe-σh.title (Concepts)
EN: Stability of elongating dunes σE/σH
ZH: 伸长沙丘的稳定性 σE/σH

## concept.stability-of-elongating-dunes-σe-σh.p1 (Concepts)
EN: σE/σH compares how fast dunes grow in height in the two orientations: the gross sand transport across a crest in the elongation orientation αE divided by that across a crest in the bed-instability orientation αH. It lies between 0 and 1. A dune can exist only if winds cross its crest and build it up, whatever its orientation. In numerical simulations of dunes elongating from a sand source on a starved bed, and in dunes around the Tibesti Massif, elongating linear dunes form where σE/σH is above about 0.6; below it, the source instead produces a train of migrating barchans.
ZH: σE/σH 比较两种走向下沙丘高度增长的快慢：伸长走向 αE 上跨越脊线的总输沙除以床面失稳走向 αH 上跨越脊线的总输沙。其取值介于 0 和 1 之间。无论走向如何，沙丘只有在风越过其脊线并使其堆积增高时才能存在。在沙源不足的床面上由沙源伸长的沙丘数值模拟中，以及在 Tibesti Massif 周边的沙丘中，伸长的线形沙丘形成于 σE/σH 大于约 0.6 的地区；低于该值时，沙源则形成一列迁移的新月形沙丘。

## concept.along-crest-versus-across-crest-transport-q-h.title (Concepts)
EN: Along-crest versus across-crest transport Q̂∥/⊥,H
ZH: 沿脊线输沙与跨脊线输沙之比 Q̂∥/⊥,H

## concept.along-crest-versus-across-crest-transport-q-h.p1 (Concepts)
EN: Q̂∥/⊥,H divides the net sand flux along crests of the bed-instability orientation by the net flux across them. Across-crest transport makes dunes migrate and tends to make crests sinuous; along-crest transport tends to keep them straight (Rubin 2012). Higher values therefore suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures how far the migration direction departs from the direction of the sand flux on the dune, a departure that makes dunes such as barchans asymmetric. In examples of long-crested dunes on sand-covered beds, it is about 0.03 for transverse, 0.4 for oblique and 22 for longitudinal dunes.
ZH: Q̂∥/⊥,H 为沿床面失稳走向脊线的净输沙通量除以跨越这些脊线的净输沙通量。跨脊线输沙使沙丘迁移，并倾向于使脊线弯曲；沿脊线输沙则倾向于使脊线保持平直（Rubin 2012）。因此，该值越高，表明沙质覆盖床面上的长脊沙丘越平直。对于在沙源不足的床面上迁移的沙丘，该比值衡量迁移方向偏离沙丘上输沙方向的程度，这种偏离使新月形沙丘等沙丘变得不对称。在沙质覆盖床面上的长脊沙丘实例中，横向沙丘的该值约为 0.03，斜向沙丘约为 0.4，纵向沙丘约为 22。

## concept.growth-in-height-versus-migration-q-h.title (Concepts)
EN: Growth in height versus migration Q̂|⊥|/⊥,H
ZH: 高度增长与迁移之比 Q̂|⊥|/⊥,H

## concept.growth-in-height-versus-migration-q-h.p1 (Concepts)
EN: Q̂|⊥|/⊥,H divides the gross sand transport across crests of the bed-instability orientation by the net transport across them. It is never below 1. A value close to 1 means that transport across the crest goes one way, so the dunes mainly migrate. Large values mean that transport reverses across the crest and sand is piled up from both sides: the dunes grow in height and migrate little, as reversing dunes do. Because growth in height builds the coherence of a dune, larger values may also favour straighter crests. In examples of long-crested dunes on sand-covered beds, it is about 1.1 for transverse, 5 for oblique and 49 for longitudinal dunes.
ZH: Q̂|⊥|/⊥,H 为穿越床面失稳走向脊线的总输沙与穿越脊线的净输沙之比，其值始终不小于 1。数值接近 1 表示穿越脊线的输沙朝同一方向进行，因此沙丘以迁移为主。数值较大则表示穿越脊线的输沙方向发生反转，沙从两侧堆积：沙丘以高度增长为主而迁移很少，与反向沙丘相同。由于高度增长有助于增强沙丘的整体连贯性，较大的数值也可能有利于形成更平直的脊线。在沙质覆盖床面上的长脊沙丘实例中，横向沙丘该值约为 1.1，斜向沙丘约为 5，纵向沙丘约为 49。

## concept.morphology-of-elongating-dunes-q-e.title (Concepts)
EN: Morphology of elongating dunes Q̂|⊥|/∥,E
ZH: 伸长沙丘的形态 Q̂|⊥|/∥,E

## concept.morphology-of-elongating-dunes-q-e.p1 (Concepts)
EN: Q̂|⊥|/∥,E divides the gross sand transport across crests in the elongation orientation αE by the net transport along them: the balance between growth in height and elongation. For dunes that elongate without migrating, it is the parameter expected to distinguish their shapes. On a starved bed, comparing it with Q̂|⊥|/⊥,H indicates whether elongation or migration is more likely to set dune shape and orientation: each ratio measures how strongly growth in height outweighs one of the two dynamics, and the dynamic with the larger ratio is expected to prevail. In examples of dunes on Earth it ranges from about 0.5 to 16.
ZH: Q̂|⊥|/∥,E 为伸长方向 αE 上穿越脊线的总输沙与沿脊线的净输沙之比，反映高度增长与伸长之间的平衡。对于只伸长而不迁移的沙丘，该参数预期可区分其形态。在沙源不足的床面上，将其与 Q̂|⊥|/⊥,H 进行比较，可判断伸长还是迁移更可能决定沙丘的形态与走向：每个比值衡量高度增长相对于两种动力过程之一的优势程度，比值较大的动力过程预期占主导。在地球沙丘实例中，其范围约为 0.5 至 16。

## concept.flux-divergence.title (Concepts)
EN: Flux divergence
ZH: 输沙通量散度

## concept.flux-divergence.p1 (Concepts)
EN: Flux divergence measures whether more sand leaves a place than arrives. It is the divergence of the net saturated flux vector (magnitude RDP, direction RDD) on the sphere, in metres of bed level per thousand years, and by conservation of sand mass it gives the rate at which the bed would be lowered or raised. Negative values (convergence) mean deposition; positive values (divergence) mean erosion. Gunn (2026) found dunes more common where flux converges. The values assume a saturated flux everywhere, that is, an unlimited supply of loose sand; on rock, gravel, crusted or vegetated surfaces, positive values give potential erosion.
ZH: 输沙通量散度衡量某处流出的沙是否多于流入的沙。它是球面上净饱和输沙通量矢量（大小为 RDP，方向为 RDD）的散度，单位为每千年床面高程变化的米数；根据沙质量守恒，它给出床面降低或抬升的速率。负值（汇）表示沉积；正值（源）表示侵蚀。Gunn (2026) 发现沙丘在输沙通量汇处更为常见。这些数值假定各处均为饱和输沙率，即松散沙的供应不受限制；在基岩、砾石、结皮或植被覆盖的地表上，正值表示潜在侵蚀。

## concept.earth.the-two-era5-wind-datasets.title (Concepts)
EN: The two ERA5 wind datasets
ZH: 两套 ERA5 风场数据集

## concept.earth.the-two-era5-wind-datasets.p1 (Concepts)
EN: The Earth atlas offers two hourly 10 m wind records for 1950–2024. ERA5 is ECMWF's global atmospheric reanalysis on a 0.25° grid (about 28 km). ERA5-Land re-runs ECMWF's land-surface model at 0.1° (about 9–11 km), driven by ERA5 atmospheric fields interpolated to the finer grid, so its winds are not an independent estimate. Baas (2026) reports that ERA5-Land 10 m wind speeds are systematically 20–30 % lower than those of ERA5. Gunn (2026) used ERA5-Land, and the dune map is on its grid. Neither dataset resolves winds around individual dunes or small hills. Where the two datasets give different directions, ratios or fluxes, treat the result as uncertain.
ZH: 地球图集提供 1950–2024 年两套逐小时 10 m 风速序列。ERA5 是 ECMWF 的全球大气再分析数据集，网格分辨率为 0.25°（约 28 km）。ERA5-Land 以 0.1°（约 9–11 km）的分辨率重新运行 ECMWF 的陆面模型，其驱动场为插值到更细网格上的 ERA5 大气场，因此其风场并非独立的估计。Baas (2026) 指出，ERA5-Land 的 10 m 风速系统性地比 ERA5 低 20–30 %。Gunn (2026) 使用的是 ERA5-Land，沙丘分布图也基于其网格。两套数据集均无法分辨单个沙丘或小山丘周围的风场。若两套数据集给出的方向、比值或通量不同，应将结果视为不确定。

# Help panel

## mars.help.threshold.title (Help panel)
EN: Median grain diameter $d$
ZH: 沙粒中值粒径 $d$

## mars.help.threshold.body (Help panel)
EN: Sand moves when the friction velocity of the wind exceeds a threshold that depends on the grain size and on the thin Martian air. The slider at the top of the layer panel sets the median grain diameter d (50–1000 µm, default 200 µm) for every grain-size-dependent map layer and for the cell panel. For each time step of the wind dataset, the threshold $u_{*,th}$ is computed from d and that step's air density and temperature (Pähtz & Durán 2023).
ZH: 当摩阻风速超过某一临界值时，沙粒开始运动，该临界风速取决于粒径以及稀薄的火星大气。图层面板顶部的滑块用于设定中值粒径 d（50–1000 µm，默认 200 µm），该值适用于所有依赖粒径的地图图层以及网格单元面板。对于风场数据集的每个时间步，临界值 $u_{*,th}$ 均由 d 以及该时间步的空气密度和温度计算得出（Pähtz & Durán 2023）。

## mars.help.layers.title (Help panel)
EN: Layers and Active layers
ZH: 图层与当前图层

## mars.help.layers.body (Help panel)
EN: Tick a layer to show it. The ⓘ button gives its definition, units and data source; Display changes its colours, colour limits and scale, or shows direction fields as arrows or streamlines, with a spacing slider from Finer (denser lines) to Coarser. Active layers lists what is on the map, top first: drag a row or use the arrows to change the drawing order, set the opacity with its slider, and remove a layer with ×. Dunes only (under the Wind dataset selector) draws every wind-derived layer (sand-flux fields, flux divergence, arrows and streamlines) only in the cells with dunes of the dataset; dunes, elevation, air density and the basemaps are unchanged, and the cell panel still works for any cell. The setting is part of the link. Names, in the Dune Fields group, labels named dune fields and features on the map (where names would overlap, some appear only as you zoom in); click a name to zoom to the feature and see its type, other names and sources.
ZH: 勾选某一图层即可显示。ⓘ 按钮给出其定义、单位和数据来源；“显示”用于更改其配色、颜色范围与标度，或将方向场显示为箭头或流线，并可通过间距滑块在“更细”（线条更密）与“更粗”之间调节。“当前图层”列出地图上显示的内容，最上层排在最前：拖动某一行或使用箭头可改变绘制顺序，用其滑块设置不透明度，点击 × 移除图层。“仅沙丘”（位于“风场数据集”选择器下方）使所有由风场衍生的图层（输沙通量场、输沙通量散度、箭头和流线）仅在该数据集中有沙丘的网格单元内绘制；沙丘、高程、空气密度和底图不受影响，网格单元面板对任何网格单元仍然可用。该设置会包含在链接中。“沙丘区”组中的“名称”在地图上标注已命名的沙丘区和地物（名称重叠时，部分名称仅在放大后才显示）；点击名称可缩放至该地物，并查看其类型、其他名称和来源。

## mars.help.concepts.title (Help panel)
EN: Concepts
ZH: 概念

## mars.help.concepts.body (Help panel)
EN: The Concepts button {icon_concepts} (under the Help button {icon_help}) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
ZH: “概念”按钮 {icon_concepts}（位于“帮助”按钮 {icon_help} 下方）解释本图集中的各个物理量，并附参考文献。图层 ⓘ 中的“概念”链接可直接打开相应条目。

## mars.help.search.title (Help panel)
EN: Search
ZH: 搜索

## mars.help.search.body (Help panel)
EN: Type a feature name (e.g. Gale crater or Olympia Undae) or a latitude and a longitude in the box at the top of the layer panel. Names are IAU-approved feature names from the Gazetteer of Planetary Nomenclature, with a few informal aliases (e.g. Bagnold Dunes); the list under the box shows each match with its feature type and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. 4.5, 137.4 or 4°30′N 137°24′E). Latitude comes first unless the letters say otherwise. Longitudes are planetocentric and east-positive, from −180° to 180°; a longitude typed as 0–360° E (e.g. 354.8) is converted (to −5.2). While you type coordinates, the line under the box shows the position they were read as (“Go to …”); Enter moves the map there and opens the cell panel when the cell has data.
ZH: 在图层面板顶部的输入框中键入地物名称（如 Gale crater 或 Olympia Undae）或纬度和经度。名称为 Gazetteer of Planetary Nomenclature 中经 IAU 批准的地物名称，另有少量非正式别名（如 Bagnold Dunes）；输入框下方的列表显示每个匹配项及其地物类型，最佳匹配排在最前。坐标可采用十进制度或度、分、秒格式，可带正负号或 N、S、E、W（如 4.5, 137.4 或 4°30′N 137°24′E）。除非字母另有说明，纬度在前。经度为行星中心经度，以东为正，范围为 −180° 至 180°；以 0–360° E 输入的经度（如 354.8）会被换算（为 −5.2）。在输入坐标时，输入框下方的一行会显示系统解析出的位置（“前往…”）；按 Enter 键可将地图移至该处，若该网格单元有数据则同时打开网格单元面板。

## mars.help.cell.title (Help panel)
EN: Clicking a cell
ZH: 点击网格单元

## mars.help.cell.body (Help panel)
EN: Click any cell to open the cell panel: the wind rose, the sand-flux rose at the current grain diameter, dune-orientation modes against the grain diameter, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the “Petals: toward / from” choice above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The planetocentric latitude and east longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The button {icon_centre} next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
ZH: 点击任意网格单元即可打开网格单元面板：其中包括风玫瑰图、当前粒径下的输沙玫瑰图、沙丘走向模式随粒径的变化、输沙通量散度以及全部参数表。输沙玫瑰图的扇区指向沙粒移动的去向；玫瑰图上方的“扇区：去往／来自”选项可将其改为显示风的来向（箭头始终指向去向）。各节标题可折叠和展开。按 × 或 Esc 关闭面板。光标处的行星中心纬度和东经显示在左下角比例尺旁（触摸屏上为最后点击的点）。网格单元标题旁的 {icon_centre} 按钮可使地图以该网格单元为中心（仅当网格单元过小而难以看清时才放大）。

## mars.help.datasets.title (Help panel)
EN: Wind dataset
ZH: 风场数据集

## mars.help.datasets.body (Help panel)
EN: The Wind dataset selector switches between Mars wind datasets (MCMC FV3, 2°; EMARS, 6° × 5.14°; MACDA, 5°), each one Mars year of lowest-level winds on its own grid (MCMC FV3: free-running climate-model simulation; EMARS and MACDA: reanalysis of Mars Year 30, with spacecraft observations of the atmosphere assimilated into a climate model). The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. No EMARS data poleward of 87.43° N: the northernmost cells of its grid are centred at 84.86° N.
ZH: “风场数据集”选择器可在不同的火星风场数据集之间切换（MCMC FV3，2°；EMARS，6°×5.14°；MACDA，5°），每个数据集均为各自网格上一个火星年的最低层风（MCMC FV3：自由运行的气候模型模拟；EMARS 和 MACDA：第 30 个火星年的再分析数据集，将航天器对大气的观测同化到气候模型中）。风场与输沙通量图层以及网格单元面板随所选数据集而变；沙丘图和高程对所有数据集都相同。87.43° N 以北无 EMARS 数据：其网格最北一行单元的中心位于 84.86° N。

## mars.help.basemaps.title (Help panel)
EN: Basemaps
ZH: 底图

## mars.help.basemaps.body (Help panel)
EN: The opening basemap is a shaded relief of the MOLA–HRSC blended elevation model (Fergason, Hare & Laura 2018), released under CC BY-SA 3.0 IGO (derived from HRSC, CC BY-SA 3.0 IGO, and MOLA, CC0). Under Basemap you can also choose OpenPlanetaryMap and Esri's Mars imagery: the global CTX mosaic (about 5 m per pixel; The Murray Lab), HiRISE (down to about 25 cm per pixel), the Viking MDIM 2.1 colour mosaic and the MOLA–HRSC colour shaded relief. HiRISE covers only the small part of the surface it has imaged; elsewhere the map is dark. Credits are in the map attribution.
ZH: 初始底图为 MOLA–HRSC 融合高程模型的阴影地形（Fergason, Hare & Laura 2018），以 CC BY-SA 3.0 IGO 许可发布（源自 HRSC，CC BY-SA 3.0 IGO；以及 MOLA，CC0）。在“底图”中还可选择 OpenPlanetaryMap 与 Esri 的火星影像：全球 CTX 拼接图（约 5 m/像素；The Murray Lab）、HiRISE（最高约 25 cm/像素）、Viking MDIM 2.1 彩色拼接图以及 MOLA–HRSC 彩色阴影地形。HiRISE 仅覆盖其已成像的一小部分地表，其他区域地图显示为暗色。版权信息见地图署名。

## mars.help.downloads.title (Help panel)
EN: Downloads and citation
ZH: 下载与引用

## mars.help.downloads.body (Help panel)
EN: Download & cite in the cell panel saves the wind and air series and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite the wind dataset, Pähtz & Durán (2023) for the transport law and Gunn (2026), which outlines the methods.
ZH: 网格单元面板中的“下载与引用”可将该网格单元的风与大气序列及全部参数保存为 NetCDF 文件或 CSV 文件包，并附每个数据来源的引用信息。请引用所用风场数据集、输沙定律的出处 Pähtz & Durán (2023)，以及概述方法的 Gunn (2026)。

## mars.help.region.title (Help panel)
EN: Downloading a region
ZH: 下载区域数据

## mars.help.region.body (Help panel)
EN: The region button {icon_region}, below the camera button {icon_camera}, saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every grain diameter or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
ZH: 相机按钮 {icon_camera} 下方的区域按钮 {icon_region}可将所选风场数据集在某一经纬度范围内的所有网格单元保存为一个 NetCDF 文件，并附 README。可输入边界，或点击“在地图上绘制”后在地图上拖出一个矩形框（按 Esc 取消）。勾选所需参数，并选择全部粒径或当前粒径；文件大小会随操作实时估算，并以浏览器可容纳的数据量为上限。如需完整网格，请参见“下载与引用”中的“获取完整网格”。

## mars.help.images.title (Help panel)
EN: Exporting images
ZH: 导出图像

## mars.help.images.body (Help panel)
EN: Export map image (camera button {icon_camera}, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
ZH: “导出地图图像”（右上角相机按钮 {icon_camera}）将当前视图保存为宽 1600–2400 像素（屏幕显示宽度的 1.5 倍）的 PNG，可选择是否包含底图，背景为白色或透明。地图下方依次为色标、图例、指北针和比例尺，然后是视图、风场数据集和数据来源信息。网格单元面板中的每幅图都有“导出”菜单，可导出 PNG（宽 1600 像素）或采用浅色主题、版式相同的 SVG。

## mars.help.share.title (Help panel)
EN: Sharing the view
ZH: 分享视图

## mars.help.share.body (Help panel)
EN: The share button {icon_share} (top right) copies a short link that restores this view: position, zoom, globe or flat map, grain diameter, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
ZH: 分享按钮 {icon_share}（右上角）可复制一个短链接，用于恢复当前视图：位置、缩放级别、球面或平面地图、粒径、底图、当前图层及其显示设置，以及所选网格单元。地址栏中也始终保存着指向当前视图的完整链接。

# Guided tour

## mars.tour.help.title (Guided tour)
EN: Welcome to the Mars Dune Atlas
ZH: 欢迎使用 Mars Dune Atlas

## mars.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button {icon_help} highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
ZH: 本简短导览介绍主要控件。右上角此处高亮显示的“帮助”按钮 {icon_help}可打开快速参考，并可随时重新开始本导览。

## mars.tour.concepts.title (Guided tour)
EN: Concepts
ZH: 概念

## mars.tour.concepts.body (Guided tour)
EN: The Concepts button {icon_concepts} explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
ZH: “概念”按钮 {icon_concepts}解释地图上各物理量的含义，并附参考文献。每个图层的 ⓘ 均链接到其相应条目。

## mars.tour.map.title (Guided tour)
EN: The map
ZH: 地图

## mars.tour.map.body (Guided tour)
EN: Drag to pan; scroll, pinch or use + and − to zoom. Globe view under Basemap switches between the globe and a flat map. Coordinates are planetocentric latitude and east longitude (−180° to 180°).
ZH: 拖动以平移地图；滚动鼠标滚轮、双指捏合或使用 + 和 − 进行缩放。“底图”下的“球体视图”可在球体与平面地图之间切换。坐标为行星中心纬度和东经（−180° 至 180°）。

## mars.tour.threshold.title (Guided tour)
EN: Median grain diameter $d$
ZH: 中值粒径 $d$

## mars.tour.threshold.body (Guided tour)
EN: This slider sets the grain diameter. The threshold friction velocity is computed for each time step from d and that step's air density and temperature; every grain-size-dependent layer and the cell panel update as you move it.
ZH: 此滑块用于设置粒径。临界摩阻风速根据 d 以及该时间步的空气密度和温度逐时间步计算；移动滑块时，所有依赖粒径的图层及网格单元面板都会随之更新。

## mars.tour.layers.title (Guided tour)
EN: Layers and their display
ZH: 图层及其显示

## mars.tour.layers.body (Guided tour)
EN: Tick layers to add them to the map; ⓘ explains a layer. Display, opened here for the resultant drift direction (RDD), changes a layer's colours and colour limits and, for direction fields, draws a colour map, arrows or streamlines in the line colour and spacing you choose. Dunes only, under the Wind dataset selector, keeps the wind-derived layers to the cells with dunes.
ZH: 勾选图层即可将其添加到地图；ⓘ 用于说明图层。“显示”（此处为合成输沙方向（RDD）打开）可更改图层的颜色及颜色范围；对于方向场，还可按所选线条颜色和间距绘制色图、箭头或流线。“风场数据集”选择器下方的“仅沙丘”将由风场导出的图层限制在有沙丘的网格单元内。

## mars.tour.active.title (Guided tour)
EN: Active layers
ZH: 当前图层

## mars.tour.active.body (Guided tour)
EN: The layers on the map, top first. Drag a row or use the arrows to change which layer is drawn on top, use the slider for opacity, and × to remove a layer.
ZH: 地图上的图层，最上层排在首位。拖动某一行或使用箭头可更改哪个图层绘制在最上层，使用滑块调节不透明度，点击 × 可移除图层。

## mars.tour.cell.title (Guided tour)
EN: Click a cell
ZH: 点击网格单元

## mars.tour.cell.body (Guided tour)
EN: Clicking a cell opens the cell panel, shown here for the dune field of Nili Patera (9° N, 67° E): wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own grain-diameter slider at the top (outlined), linked to the main one. At the bottom, Download & cite saves these data as NetCDF or CSV, with the citations. The button {icon_centre} next to its title centres the map on the cell.
ZH: 点击网格单元会打开网格单元面板，此处以 Nili Patera（9° N, 67° E）的沙丘区为例：包括风玫瑰图、输沙玫瑰图、沙丘走向模式以及全部参数表。面板顶部有独立的粒径滑块（以框线标出），与主滑块联动。在面板底部，“下载与引用”可将这些数据保存为 NetCDF 或 CSV 文件，并提供引用信息。标题旁的 {icon_centre} 按钮可将地图居中到该网格单元。

## mars.tour.tools.title (Guided tour)
EN: Share and export
ZH: 分享与导出

## mars.tour.tools.body (Guided tour)
EN: Copy a short link to this view, export the map as an image with colour bars, scale and data sources, or download the data of a region you draw on the map. Plots in the cell panel have their own Export menus.
ZH: 复制指向当前视图的短链接，将地图连同色标、比例尺和数据来源导出为图像，或下载您在地图上绘制区域的数据。网格单元面板中的图件有各自的“导出”菜单。

## mars.tour.planet.title (Guided tour)
EN: Switch planet
ZH: 切换行星

## mars.tour.planet.body (Guided tour)
EN: Earth and Mars share this atlas: the planet button {icon_planet}, below the camera button {icon_camera}, swaps between them, and each atlas reopens the view you last had there.
ZH: 地球与火星共用本图集：相机按钮 {icon_camera} 下方的行星按钮 {icon_planet}可在两者之间切换，且每个图集都会恢复您上次在该处的视图。

# Layer groups

## mars.group.dunes (Layer groups)
EN: Dune Fields
ZH: 沙丘区

## mars.group.dunes.desc (Layer groups)
EN: Mapped Martian dune fields (USGS Mars Global Digital Dune Database and Fenton 2020, 3,514 polygons, 1.05 million km²).
ZH: 火星沙丘区制图结果（USGS Mars Global Digital Dune Database 与 Fenton 2020，共 3,514 个多边形，面积 105 万 km²）。

# Layers and legends

## mars.layer.dunes.title (Layers and legends)
EN: Dune-field mask
ZH: 沙丘区掩膜

## mars.layer.dunes.short (Layers and legends)
EN: Mask
ZH: 掩膜

# Layer groups

## mars.group.orientation (Layer groups)
EN: Bedform orientation
ZH: 床面形态走向

## mars.group.orientation.desc (Layer groups)
EN: Predicted dune orientations: crest orientation and migration direction of the bed-instability mode, elongation direction and along-crest transport direction.
ZH: 预测的沙丘走向：床面失稳模式的脊线走向与迁移方向，以及伸长方向和沿脊线输沙方向。

# Layers and legends

## mars.layer.at.title (Layers and legends)
EN: Transverse migration direction $\alpha_T$
ZH: 横向迁移方向 $\alpha_T$

## mars.layer.at.units (Layers and legends)
EN: °
ZH: °

## mars.layer.ae.title (Layers and legends)
EN: Elongation direction $\alpha_E$
ZH: 伸长方向 $\alpha_E$

## mars.layer.ae.units (Layers and legends)
EN: °
ZH: °

## mars.layer.ab.title (Layers and legends)
EN: Crest orientation, bed-instability mode $\alpha_H$
ZH: 脊线走向，床面失稳模式 $\alpha_H$

## mars.layer.ab.units (Layers and legends)
EN: °
ZH: °

## mars.layer.ao.title (Layers and legends)
EN: Along-crest transport direction $\alpha_O$
ZH: 沿脊线输沙方向 $\alpha_O$

## mars.layer.ao.units (Layers and legends)
EN: °
ZH: °

# Layer groups

## mars.group.crest-fluxes (Layer groups)
EN: Crest-normal/parallel fluxes
ZH: 垂直与平行于脊线的输沙通量

## mars.group.crest-fluxes.desc (Layer groups)
EN: Net and absolute sand flux resolved across (normal to) and along (parallel to) predicted crests.
ZH: 净输沙通量与绝对输沙通量，分解为横跨（垂直于）和沿着（平行于）预测脊线方向的分量。

# Layers and legends

## mars.layer.qacb.title (Layers and legends)
EN: Absolute across-crest flux, bed-instability mode $\langle |Q_{\bot}(\alpha_H)|\rangle$
ZH: 垂直于脊线的绝对输沙通量，床面失稳模式 $\langle |Q_{\bot}(\alpha_H)|\rangle$

## mars.layer.qacb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qncb.title (Layers and legends)
EN: Net across-crest flux, bed-instability mode $\langle Q_{\bot}(\alpha_H)\rangle$
ZH: 垂直于脊线的净输沙通量，床面失稳模式 $\langle Q_{\bot}(\alpha_H)\rangle$

## mars.layer.qncb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qnlb.title (Layers and legends)
EN: Net along-crest flux, bed-instability mode $\langle Q_{\parallel}(\alpha_H)\rangle$
ZH: 沿脊线的净输沙通量，床面失稳模式 $\langle Q_{\parallel}(\alpha_H)\rangle$

## mars.layer.qnlb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qalb.title (Layers and legends)
EN: Absolute along-crest flux, bed-instability mode $\langle |Q_{\parallel}(\alpha_H)|\rangle$
ZH: 沿脊线的绝对输沙通量，床面失稳模式 $\langle |Q_{\parallel}(\alpha_H)|\rangle$

## mars.layer.qalb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qnle.title (Layers and legends)
EN: Net along-crest flux, elongation mode $\langle Q_{\parallel}(\alpha_E)\rangle$
ZH: 沿脊线的净输沙通量，伸长模式 $\langle Q_{\parallel}(\alpha_E)\rangle$

## mars.layer.qnle.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qale.title (Layers and legends)
EN: Absolute along-crest flux, elongation mode $\langle |Q_{\parallel}(\alpha_E)|\rangle$
ZH: 沿脊线的绝对输沙通量，伸长模式 $\langle |Q_{\parallel}(\alpha_E)|\rangle$

## mars.layer.qale.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qace.title (Layers and legends)
EN: Absolute across-crest flux, elongation mode $\langle |Q_{\bot}(\alpha_E)|\rangle$
ZH: 垂直于脊线的绝对输沙通量，伸长模式 $\langle |Q_{\bot}(\alpha_E)|\rangle$

## mars.layer.qace.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

# Layer groups

## mars.group.morphology (Layer groups)
EN: Ratios & morphology indices
ZH: 比值与形态指数

## mars.group.morphology.desc (Layer groups)
EN: Dimensionless flux ratios related to dune morphology and stability.
ZH: 与沙丘形态和稳定性相关的无量纲输沙通量比值。

# Layers and legends

## mars.layer.sige_sigh.title (Layers and legends)
EN: Stability of elongating dunes on starved beds $\sigma_E/\sigma_H$
ZH: 沙源不足的床面上伸长沙丘的稳定性 $\sigma_E/\sigma_H$

## mars.layer.sige_sigh.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qhab_nl_nc.title (Layers and legends)
EN: Crest straightness vs sinuosity, bed-instability mode $\hat{Q}_{\parallel/\bot,H}$
ZH: 脊线平直度与弯曲度对比，床面失稳模式 $\hat{Q}_{\parallel/\bot,H}$

## mars.layer.qhab_nl_nc.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qhab_ac_nc.title (Layers and legends)
EN: Growth-in-height vs migration balance $\hat{Q}_{|\bot|/\bot,H}$
ZH: 高度增长与迁移的平衡 $\hat{Q}_{|\bot|/\bot,H}$

## mars.layer.qhab_ac_nc.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qhne_ac_nl.title (Layers and legends)
EN: Morphology of elongating dunes $\hat{Q}_{|\bot|/\parallel,E}$
ZH: 伸长沙丘的形态 $\hat{Q}_{|\bot|/\parallel,E}$

## mars.layer.qhne_ac_nl.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

# Layer groups

## mars.group.wind (Layer groups)
EN: Wind statistics
ZH: 风况统计

## mars.group.wind.desc (Layer groups)
EN: How often and how strongly the flat-bed friction velocity exceeds the threshold.
ZH: 平坦床面摩阻风速超过临界值的频率与程度。

# Layers and legends

## mars.layer.uft.title (Layers and legends)
EN: Fraction of time above threshold $T|u_{\ast,f}>u_{\ast,th}/T$
ZH: 超过临界值的时间比例 $T|u_{\ast,f}>u_{\ast,th}/T$

## mars.layer.uft.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.ufm.title (Layers and legends)
EN: Mean above-threshold friction velocity / threshold $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$
ZH: 超过临界值时的平均摩阻风速 / 临界值 $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$

## mars.layer.ufm.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qhbf.title (Layers and legends)
EN: Fraction of bed-instability-mode flux while flat bed above threshold
ZH: 平坦床面超过临界值期间床面失稳模式输沙通量所占比例

## mars.layer.qhbf.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qhef.title (Layers and legends)
EN: Fraction of elongation-mode flux while flat bed above threshold
ZH: 平坦床面超过临界值期间伸长模式输沙通量所占比例

## mars.layer.qhef.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

# Layer groups

## mars.group.drift (Layer groups)
EN: Drift potential
ZH: 输沙势

## mars.group.drift.desc (Layer groups)
EN: Flat-bed sand flux: total (DP), net (RDP), its direction (RDD) and directionality (RDP/DP).
ZH: 平坦床面输沙通量：总输沙（DP）、合成输沙势（RDP）、其方向（RDD）及方向变率指数（RDP/DP）。

# Layers and legends

## mars.layer.dpm.title (Layers and legends)
EN: Drift potential $DP$
ZH: 输沙势 $DP$

## mars.layer.dpm.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.rdpm.title (Layers and legends)
EN: Resultant drift potential $RDP$
ZH: 合成输沙势 $RDP$

## mars.layer.rdpm.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.rdpa.title (Layers and legends)
EN: Resultant drift direction $RDD$
ZH: 合成输沙方向 $RDD$

## mars.layer.rdpa.units (Layers and legends)
EN: °
ZH: °

## mars.layer.qha_rdp_dp.title (Layers and legends)
EN: Flux directionality $RDP/DP$
ZH: 输沙通量方向变率 $RDP/DP$

## mars.layer.qha_rdp_dp.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qsdiv.title (Layers and legends)
EN: Saturated flux divergence $\nabla\cdot\vec{q}_s$
ZH: 饱和输沙通量散度 $\nabla\cdot\vec{q}_s$

## mars.layer.qsdiv.units (Layers and legends)
EN: m/kyr
ZH: m/kyr

# Layer groups

## mars.group.environment (Layer groups)
EN: Related data
ZH: 相关数据

## mars.group.environment.desc (Layer groups)
EN: Near-surface air density (from the wind dataset, mean over the year) and elevation (MOLA–HRSC). These do not depend on the grain diameter d.
ZH: 近地表空气密度（取自风场数据集，为全年平均值）和高程（MOLA–HRSC）。这两项与颗粒粒径 d 无关。

# Layers and legends

## mars.layer.rho_mean.title (Layers and legends)
EN: Near-surface air density $\overline{\rho_f}$
ZH: 近地表空气密度 $\overline{\rho_f}$

## mars.layer.rho_mean.units (Layers and legends)
EN: kg/m³
ZH: kg/m³

## mars.layer.elevation.title (Layers and legends)
EN: Elevation $z$ (MOLA–HRSC)
ZH: 高程 $z$（MOLA–HRSC）

## mars.layer.elevation.units (Layers and legends)
EN: m
ZH: m

## mars.invert.legend (Layers and legends)
EN: Areas without mapped dunes
ZH: 无已制图沙丘的区域

# Basemaps

## mars.basemap.hrsc-mola-hillshade (Basemaps)
EN: Shaded relief (MOLA–HRSC, 2D)
ZH: 阴影地形（MOLA–HRSC，2D）

## mars.basemap.opm-mars (Basemaps)
EN: OpenPlanetaryMap Mars (v0.2)
ZH: OpenPlanetaryMap Mars（v0.2）

## mars.basemap.esri-ctx1 (Basemaps)
EN: CTX mosaic, 5 m (Murray Lab V01, Esri)
ZH: CTX 拼接图，5 m（Murray Lab V01，Esri）

## mars.basemap.esri-hirise (Basemaps)
EN: HiRISE, where imaged (Esri)
ZH: HiRISE（仅限已成像区域）（Esri）

## mars.basemap.esri-mdim (Basemaps)
EN: Viking MDIM 2.1 colour (Esri)
ZH: Viking MDIM 2.1 彩色（Esri）

## mars.basemap.esri-mcolordem (Basemaps)
EN: MOLA–HRSC colour shaded relief (Esri)
ZH: MOLA–HRSC 彩色阴影地形（Esri）

# Concepts

## concept.mars.saturated-sand-flux-and-the-transport-law.title (Concepts)
EN: Saturated sand flux and the transport law
ZH: 饱和输沙率与输沙定律

## concept.mars.saturated-sand-flux-and-the-transport-law.p1 (Concepts)
EN: Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. On Mars the atlas uses the transport law of Pähtz & Durán (2023), derived from numerical simulations for planetary conditions. For each time step, the friction velocity u* comes from the lowest-level wind of the wind dataset through a smooth-wall profile, and the threshold from the grain diameter and that step's air density and temperature. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per Earth year (m²/yr), as on Earth. Real transport is lower wherever sand is scarce or indurated.
ZH: 饱和输沙率是指风在完全覆盖松散干沙的平坦床面上搬运沙粒的速率：即风的输沙能力，而不一定是实际发生的输沙。在火星上，本图集采用 Pähtz & Durán (2023) 的输沙定律，该定律由针对行星条件的数值模拟推导得出。对于每个时间步，摩阻风速 u* 由风场数据集最低层的风速通过光滑壁面廓线求得，临界值则由颗粒粒径以及该时间步的空气密度和温度求得。输沙率以每米宽度每地球年搬运的密实沙体积表示（堆积体积分数 0.6，含孔隙空间），单位为 m²/yr，与地球相同。在沙源稀少或沙面固结的地方，实际输沙量较低。

## concept.mars.grain-size-and-threshold.title (Concepts)
EN: Grain size and threshold
ZH: 粒径与临界值

## concept.mars.grain-size-and-threshold.p1 (Concepts)
EN: On Mars the slider sets the median grain diameter d rather than the threshold. The threshold friction velocity is computed for each time step from d and that step's air density and temperature with the law of Pähtz & Durán (2023), because the thin, cold Martian air changes from hour to hour and season to season. Martian air near the surface is only about 1–2 % as dense as Earth's, so the threshold friction velocity of the same grains is much higher. The cell panel shows the median threshold over the year, its 5–95 % range, the equivalent wind at the lowest model level and the share of time steps above threshold.
ZH: 在火星上，滑块设定的是中值粒径 d，而非临界值。临界摩阻风速根据 d 以及该时间步的空气密度和温度，采用 Pähtz & Durán (2023) 的定律逐时间步计算，因为稀薄、寒冷的火星大气会随小时和季节不断变化。火星近地表大气密度仅约为地球的 1–2 %，因此同样颗粒的临界摩阻风速要高得多。网格单元面板显示全年临界值的中位数、其 5–95 % 范围、模型最低层的等效风速，以及超过临界值的时间步占比。

# Interface

## panel.dunesOnly (Interface)
EN: Dunes only
ZH: 仅沙丘

## panel.names (Interface)
EN: Names
ZH: 名称

## panel.display (Interface)
EN: Display
ZH: 显示

## panel.finer (Interface)
EN: Finer
ZH: 更细

## panel.coarser (Interface)
EN: Coarser
ZH: 更粗

## panel.active (Interface)
EN: Active layers
ZH: 当前图层

## tools.share (Interface)
EN: Share / copy link
ZH: 分享 / 复制链接

## tools.export (Interface)
EN: Export map image
ZH: 导出地图图像

## cell.downloads (Interface)
EN: Download & cite
ZH: 下载与引用

## cell.petals (Interface)
EN: Petals:
ZH: 扇区：

## cell.petalsToward (Interface)
EN: toward
ZH: 去向

## cell.petalsFrom (Interface)
EN: from
ZH: 来向

# Screen-reader labels and tooltips

## c.cbf0821a (Screen-reader labels and tooltips)
EN: About {title}
ZH: 关于 {title}

## c.e7dc4699 (Screen-reader labels and tooltips)
EN: Move {title} up
ZH: 上移 {title}

## c.ecdb15e0 (Screen-reader labels and tooltips)
EN: Move {title} down
ZH: 下移 {title}

## c.2ff214e6 (Screen-reader labels and tooltips)
EN: Remove {title} from the map
ZH: 从地图中移除 {title}

## c.33ff2167 (Screen-reader labels and tooltips)
EN: Opacity of {title}
ZH: {title} 的不透明度

## c.a2de8b84 (Screen-reader labels and tooltips)
EN: Show {title}
ZH: 显示 {title}

## c.32a4672f (Screen-reader labels and tooltips)
EN: Fill colour for {title}
ZH: {title} 的填充颜色

# Other

## c.9e5e6896 (Other)
EN: Dune-field names
ZH: 沙丘区名称

# Screen-reader labels and tooltips

## c.ce3f61ab (Screen-reader labels and tooltips)
EN: Display {title} as
ZH: {title}的显示方式

## c.1b597f46 (Screen-reader labels and tooltips)
EN: Arrow / streamline colour for {title}
ZH: {title}的箭头／流线颜色

## c.7e0bca77 (Screen-reader labels and tooltips)
EN: Line spacing for {title}, finer to coarser
ZH: {title}的线条间距（由细到粗）

## c.cf77fd20 (Screen-reader labels and tooltips)
EN: Colour map for {title}
ZH: {title}的色带

## c.30453a2a (Screen-reader labels and tooltips)
EN: Reverse colour map for {title}
ZH: 反转{title}的色带

## c.149cfa70 (Screen-reader labels and tooltips)
EN: Colour scale minimum for {title}
ZH: {title}的色标最小值

## c.8b6b1072 (Screen-reader labels and tooltips)
EN: Colour scale maximum for {title}
ZH: {title}的色标最大值

## c.8c096bed (Screen-reader labels and tooltips)
EN: Logarithmic colour scale for {title}
ZH: {title}的对数色标

## c.e85083b1 (Screen-reader labels and tooltips)
EN: ERA5-Land ⟦#0⟧°, ⟦#1⟧–⟦#2⟧; land cells: land–sea mask fraction > ⟦#3⟧
ZH: ERA5-Land ⟦#0⟧°，⟦#1⟧–⟦#2⟧；陆地网格单元：陆海掩膜比例 > ⟦#3⟧

## c.c66b4f99 (Screen-reader labels and tooltips)
EN: Draw the wind-derived layers (sand-flux fields, flux divergence, arrows and streamlines) only in cells with dunes; the other layers and the cell panel are unchanged.
ZH: 仅在有沙丘的网格单元中绘制由风场导出的图层（输沙通量场、输沙通量散度、箭头和流线）；其他图层和网格单元面板保持不变。

## c.e801d9a2 (Screen-reader labels and tooltips)
EN: Reset to the default ⟦#0⟧ m/s
ZH: 重置为默认值⟦#0⟧m/s

# Layer panel

## c.72156bc9 (Layer panel)
EN: default ⟦#0⟧ m/s
ZH: 默认值⟦#0⟧m/s

## c.95919b83 (Layer panel)
EN: Applies to the map layers and the cell panel.
ZH: 适用于地图图层和网格单元面板。

# Layer popovers

## c.bf84b28e (Layer popovers)
EN: The friction velocity ⟦0⟧ above which the wind moves sand. Every threshold-dependent map layer (its ⓘ says so) and the cell panel use the value set here.
ZH: 摩阻风速 ⟦0⟧，超过此值时风即可搬运沙粒。所有依赖临界值的地图图层（其 ⓘ 中有说明）以及网格单元面板均使用此处设定的值。

## c.5b6d3e3c (Layer popovers)
EN: With the roughness length of ⟦#0⟧ mm used here, ⟦#1⟧ m/s corresponds to a ⟦#2⟧ m wind of ⟦#3⟧ m/s (⟦#4⟧ knots); the ⟦#5⟧-knot threshold of⟦0⟧corresponds to about ⟦#6⟧ m/s.
ZH: 在此采用的空气动力学粗糙度为 ⟦#0⟧ mm 时，⟦#1⟧ m/s 对应于 ⟦#2⟧ m 高度处 ⟦#3⟧ m/s（⟦#4⟧ 节）的风速；⟦0⟧的 ⟦#5⟧ 节临界值约对应于 ⟦#6⟧ m/s。

## c.842a7a09 (Layer popovers)
EN: ⟦#0⟧ values from ⟦#1⟧ m/s to ⟦#2⟧ m/s; default ⟦#3⟧ m/s (the mark under the slider). The compact copy at the top of the cell panel sets the same value.
ZH: 共 ⟦#0⟧ 个取值，从 ⟦#1⟧ m/s 到 ⟦#2⟧ m/s；默认值为 ⟦#3⟧ m/s（滑块下方的标记）。网格单元面板顶部的简化控件设定的是同一个值。

# Screen-reader labels and tooltips

## c.e764d433 (Screen-reader labels and tooltips)
EN: Active layers, drawing order (top is drawn on top)
ZH: 当前图层，绘制顺序（位于顶部的图层绘制在最上层）

## c.fce503d3 (Screen-reader labels and tooltips)
EN: Drag to reorder
ZH: 拖动以调整顺序

# Layer panel

## c.3f0212fb (Layer panel)
EN: Fill ⟦0⟧
ZH: 填充⟦0⟧

# Screen-reader labels and tooltips

## c.82a20f6e (Screen-reader labels and tooltips)
EN: Invert: colour the land WITHOUT mapped dunes instead of the dunes. Latitudes beyond ±⟦#0⟧° (interior Antarctica) are not coloured.
ZH: 反转：对未标绘/没有沙丘的陆地着色，而非对沙丘本身着色。纬度超过 ±⟦#0⟧°（南极洲内陆）的区域不着色。

# Layer panel

## c.c158f449 (Layer panel)
EN: ⟦0⟧ invert (land without dunes)
ZH: ⟦0⟧反转（无沙丘陆地）

# Screen-reader labels and tooltips

## c.4422e95b (Screen-reader labels and tooltips)
EN: Invert: colour land without dunes
ZH: 反转：为无沙丘陆地着色

# Layer popovers

## c.2be0d726 (Layer popovers)
EN: Displayed dune field names are derived from previously published academic research and data, regional knowledge, and internet searches. Naming conventions (language, jurisdiction, spelling, merging, etc.) were chosen for clarity but may be wrong or offend certain peoples. Please contact Andrew Gunn at <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> if you have any suggestions for changes, removals, or additions.
ZH: 图中显示的沙丘区名称来自已发表的学术研究与数据、区域知识以及网络检索。命名方式（语言、行政归属、拼写、合并等）的选择旨在清晰明了，但可能有误，或冒犯某些民族。如有任何修改、删除或增补建议，请通过 <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> 联系 Andrew Gunn。

## c.1226fbb4 (Layer popovers)
EN: Citation
ZH: 引用

# Screen-reader labels and tooltips

## c.ec7be404 (Screen-reader labels and tooltips)
EN: Label named dune fields and features on the map; where names would overlap, some appear only as you zoom in. Click a name for its details.
ZH: 在地图上标注已命名的沙丘区及地貌特征；若名称会相互重叠，部分名称仅在放大后显示。点击名称可查看详细信息。

# Layer panel

## c.1e62d767 (Layer panel)
EN: Show as ⟦0⟧
ZH: 显示为⟦0⟧

## c.c739a747 (Layer panel)
EN: colour map
ZH: 色彩图

## c.8b3f7f3a (Layer panel)
EN: Line colour ⟦0⟧
ZH: 线条颜色⟦0⟧

# Screen-reader labels and tooltips

## c.f9cf5751 (Screen-reader labels and tooltips)
EN: Spacing between arrows / streamlines: left finer (denser lines), right coarser
ZH: 箭头／流线的间距：左侧更细（线条更密），右侧更粗

# Layer panel

## c.bc8b4ab6 (Layer panel)
EN: Spacing <span class="spacing-end">Finer</span>⟦0⟧<span class="spacing-end">Coarser</span>
ZH: 间距<span class="spacing-end">更细</span>⟦0⟧<span class="spacing-end">更粗</span>

## c.02860b5d (Layer panel)
EN: Colours ⟦0⟧
ZH: 颜色⟦0⟧

## c.9fbef08a (Layer panel)
EN: ⟦0⟧ reversed
ZH: ⟦0⟧反转

## c.a9812c14 (Layer panel)
EN: min ⟦0⟧
ZH: 最小值⟦0⟧

## c.c728f056 (Layer panel)
EN: max ⟦0⟧
ZH: 最大值⟦0⟧

## c.650d33c0 (Layer panel)
EN: reset
ZH: 重置

# Screen-reader labels and tooltips

## c.f5ecdead (Screen-reader labels and tooltips)
EN: Colour scale from ⟦#0⟧ to ⟦#1⟧
ZH: 色标范围：从 ⟦#0⟧ 到 ⟦#1⟧

## c.8fd4b665 (Screen-reader labels and tooltips)
EN: values outside the range are shown at the end colours
ZH: 超出范围的数值以两端颜色显示

# Layer popovers

## c.40b6e257 (Layer popovers)
EN: Migration direction⟦0⟧of dunes whose crests have the bed-instability orientation⟦1⟧: perpendicular to⟦2⟧, toward the side of the net sand flux across the crest (⟦3⟧;⟦4⟧).
ZH: 迁移方向⟦0⟧：对于脊线走向为床面失稳模式⟦1⟧的沙丘，其迁移方向垂直于⟦2⟧，并指向穿越脊线的净输沙通量所在的一侧（⟦3⟧；⟦4⟧）。

## c.6ed4163c (Layer popovers)
EN: Units
ZH: 单位

## c.d7ff288f (Layer popovers)
EN: ° (compass bearing, clockwise from north, toward which sand moves)
ZH: °（方位角，自正北顺时针量测，指向沙粒移动的方向）

## c.56c1f3e5 (Layer popovers)
EN: Wind data
ZH: 风场数据

## c.9b74c01c (Layer popovers)
EN: Slider
ZH: 滑块

## c.fc8f6378 (Layer popovers)
EN: Updates with the ⟦0⟧ control.
ZH: 随⟦0⟧控件更新。

## c.cb6596aa (Layer popovers)
EN: Citing the map fields (in About)
ZH: 引用地图沙丘区数据（见“关于”）

## c.27cf9488 (Layer popovers)
EN: Elongation direction⟦0⟧: the direction in which a dune grows in length without migrating, where the net sand flux across its crest is zero and the net flux along it is positive (⟦1⟧). It applies to dunes on beds with limited sand, typically growing from a fixed sand source. Where a wind regime allows several such directions, the atlas shows the most stable one.
ZH: 伸长方向⟦0⟧：沙丘在不发生迁移的情况下沿长度方向增长的方向，此时穿过脊线的净输沙通量为零，而沿脊线方向的净输沙通量为正（⟦1⟧）。该概念适用于沙源有限的床面上的沙丘，这类沙丘通常从固定沙源处生长。当某一风况下存在多个这样的方向时，图集显示其中最稳定的一个。

## c.e2c0f300 (Layer popovers)
EN: Crest orientation⟦0⟧of the bed-instability mode: the axis (⟦#0⟧–⟦#1⟧°) of crests that receive the largest gross sand transport across them, including the speed-up of the wind over the crest (⟦1⟧;⟦2⟧). It is also the expected crest orientation of migrating dunes such as barchans. Dunes with this orientation migrate perpendicular to it, in direction⟦3⟧. As an axis it has no compass direction: e.g., ⟦#2⟧° and ⟦#3⟧° are the same line.
ZH: 脊线走向⟦0⟧，床面失稳模式：穿过脊线的总输沙通量（计入风经过脊线时产生的加速效应）达到最大时的脊线轴向（⟦#0⟧–⟦#1⟧°）（⟦1⟧；⟦2⟧）。该走向也是新月形沙丘等迁移性沙丘的预期脊线走向。具有这一走向的沙丘沿与其垂直的方向迁移，即方向⟦3⟧。作为轴向，它没有方位之别：例如，⟦#2⟧°与 ⟦#3⟧°表示同一条直线。

## c.96a1a48e (Layer popovers)
EN: ° (crest axis, ⟦#0⟧–⟦#1⟧°)
ZH: °（脊线轴向，⟦#0⟧–⟦#1⟧°）

## c.bc48cc14 (Layer popovers)
EN: Direction⟦0⟧along crests of the bed-instability orientation⟦1⟧in which the net sand flux along the crest points, as a compass bearing. Where crests are oblique to the net transport, sand moves along them as well as across them;⟦2⟧shows which way along the crest it moves.
ZH: 方向⟦0⟧：对于脊线走向为床面失稳模式⟦1⟧的沙丘，沿脊线方向的净输沙通量所指向的方位角。当脊线与净输沙方向斜交时，沙既沿脊线移动，也穿过脊线移动；⟦2⟧给出的是沙沿脊线移动的方向。

# Screen-reader labels and tooltips

## c.9887f73f (Screen-reader labels and tooltips)
EN: Colour scale (logarithmic) from ⟦#0⟧ to ⟦#1⟧
ZH: 色标范围（对数刻度）：从 ⟦#0⟧ 到 ⟦#1⟧

## c.e7135998 (Screen-reader labels and tooltips)
EN: Limits span zero: symmetric log scale, linear close to zero
ZH: 限值跨越零点：对称对数刻度，接近零处为线性

## c.69ce2e68 (Screen-reader labels and tooltips)
EN: Log scale needs min > ⟦#0⟧, or min < ⟦#1⟧ < max (symmetric log)
ZH: 对数刻度要求最小值 > ⟦#0⟧，或最小值 < ⟦#1⟧ < 最大值（对称对数）

# Layer popovers

## c.8dcaa52f (Layer popovers)
EN: Ratio of the growth rates in height of dunes in the elongation and bed-instability orientations,⟦0⟧, between ⟦#0⟧ and ⟦#1⟧. It assesses whether dunes elongating from a sand source on a starved bed are stable: in numerical simulations and in dunes around the Tibesti Massif, elongating linear dunes form where the ratio is above about ⟦#2⟧ and trains of barchans form below it (⟦1⟧;⟦2⟧). It does not take bed mobility or other boundary conditions into account.
ZH: 沙丘在伸长模式与床面失稳模式方向上的高度增长速率之比⟦0⟧（介于 ⟦#0⟧ 与 ⟦#1⟧ 之间），用于评估沙源不足的床面上由沙源发育而成的伸长沙丘是否稳定：在数值模拟及提贝斯提山地周边的沙丘中，当该比值大于约 ⟦#2⟧ 时形成伸长的线形沙丘，低于该值时则形成新月形沙丘链（⟦1⟧；⟦2⟧）。该指标未考虑床面可动性或其他边界条件。

## c.b4eb3711 (Layer popovers)
EN: Gross over net across-crest sand flux for crests of the bed-instability orientation,⟦0⟧, never below ⟦#0⟧: the balance between growth in height and migration. Values near ⟦#1⟧ mean that transport across the crest goes one way and the dunes mainly migrate; large values mean that it reverses, building the dunes up with little net migration, which may also favour straighter crests (⟦1⟧). In the sand-covered-bed examples of⟦2⟧it is about ⟦#2⟧ for transverse, ⟦#3⟧ for oblique and ⟦#4⟧ for longitudinal dunes. The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#5⟧).
ZH: 床面失稳模式⟦0⟧走向脊线的总跨脊线输沙量与净跨脊线输沙量之比，恒不小于 ⟦#0⟧：反映高度增长与迁移之间的平衡。接近 ⟦#1⟧ 的值表示跨脊线输沙单向进行，沙丘以迁移为主；较大的值表示输沙方向往复反转，使沙丘不断增高而净迁移很小，这也可能有利于形成更平直的脊线（⟦1⟧）。在⟦2⟧给出的沙源充足床面示例中，横向沙丘约为 ⟦#2⟧，斜向沙丘约为 ⟦#3⟧，纵向沙丘约为 ⟦#4⟧。当其分母（净输沙量）趋于零时该比值趋于无穷大（图中截断显示为 ±⟦#5⟧）。

## c.e3ecff1e (Layer popovers)
EN: Gross across-crest over net along-crest sand flux for dunes in the elongation orientation,⟦0⟧: the balance between growth in height and elongation. For dunes that elongate without migrating, it is the parameter expected to distinguish their shapes. Compared with⟦1⟧, it indicates whether elongation or migration is more likely to set dune shape and orientation on a starved bed: the dynamic with the larger ratio favours growth in height more and is expected to prevail (⟦2⟧). The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#0⟧).
ZH: 伸长模式走向⟦0⟧沙丘的总跨脊线输沙量与沿脊线净输沙量之比：反映高度增长与伸长之间的平衡。对于不发生迁移而仅伸长的沙丘，该参数预计可用于区分其形态。与⟦1⟧相比，它指示的是在沙源不足的床面上，伸长还是迁移更可能决定沙丘形态与走向：比值较大的动力过程更有利于高度增长，预计将占主导（⟦2⟧）。当其分母（净输沙量）趋于零时该比值趋于无穷大（图中截断显示为 ±⟦#0⟧）。

## c.e5c17d00 (Layer popovers)
EN: Fraction of time flat-bed friction velocity is above threshold⟦0⟧.
ZH: 平坦床面摩阻风速超过临界值的时间比例⟦0⟧。

## c.e68c470c (Layer popovers)
EN: fraction (⟦#0⟧–⟦#1⟧)
ZH: 比例（⟦#0⟧–⟦#1⟧）

## c.d66d70dc (Layer popovers)
EN: Average above-threshold flat-bed friction velocity, normalised by threshold⟦0⟧.
ZH: 平坦床面超过临界值期间的平均摩阻风速，以临界值归一化⟦0⟧。

## c.7aed9ffd (Layer popovers)
EN: Fraction of bed-instability-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux.
ZH: 床面失稳模式（⟦0⟧）脊线输沙中、发生在平坦床面摩阻风速超过临界值期间的比例，⟦1⟧。当脊线输沙仅发生在平坦床面低于临界值期间时为 ⟦#0⟧；若无脊线输沙则无定义。

## c.0d2dc35f (Layer popovers)
EN: Fraction of elongation-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux.
ZH: 伸长模式（⟦0⟧）脊线输沙中、发生在平坦床面摩阻风速超过临界值期间的比例，⟦1⟧。当脊线输沙仅发生在平坦床面低于临界值期间时为 ⟦#0⟧；若无脊线输沙则无定义。

## c.40039fa4 (Layer popovers)
EN: Magnitude of the time-averaged flat-bed flux vector,⟦0⟧: the net volume of packed sand per metre width per year after transport in opposing directions has cancelled. Same units as⟦1⟧;⟦2⟧≤⟦3⟧, with equality only when all transport is in one direction.
ZH: 时间平均平坦床面输沙通量矢量⟦0⟧的量值：反向输沙相互抵消后，每年每米宽度的净堆积沙体积。单位与⟦1⟧相同；⟦2⟧≤⟦3⟧，仅当全部输沙为单一方向时取等号。

## c.d590db9a (Layer popovers)
EN: Divergence of the time-averaged saturated sand-flux vector (magnitude⟦0⟧, direction⟦1⟧) on the sphere, following⟦2⟧, Methods⟦3⟧:⟦4⟧with⟦5⟧,⟦6⟧. By conservation of sand mass, negative values (flux convergence) imply deposition and positive values (flux divergence) erosion. The values assume a saturated flux and an unlimited supply of loose sand, so on rock, crusted or vegetated surfaces actual erosion is limited by the sand available. No data at coasts (a neighbouring cell has no wind data) and on the ±⟦#0⟧° rows.
ZH: 球面上时间平均饱和输沙通量矢量（量值⟦0⟧，方向⟦1⟧）的散度，依据⟦2⟧，方法⟦3⟧：⟦4⟧，其中⟦5⟧，⟦6⟧。根据沙量守恒，负值（输沙通量汇）意味着堆积，正值（输沙通量源）意味着侵蚀。这些数值假定输沙已饱和且松散沙供应不受限，因此在岩石、结皮或植被覆盖的地表上，实际侵蚀受限于可用沙量。海岸处（相邻网格单元无风场数据）及 ±⟦#0⟧° 纬度行无数据。

## c.925905dc (Layer popovers)
EN: Global Aridity Index v3.1 (⟦#0⟧–⟦#1⟧): mean annual precipitation divided by reference evapotranspiration, native ⟦#2⟧″ (~⟦#3⟧ km) grid.⟦0⟧classes: &lt; ⟦#4⟧ hyper-arid, ⟦#5⟧–⟦#6⟧ arid, ⟦#7⟧–⟦#8⟧ semi-arid, ⟦#9⟧–⟦#10⟧ dry sub-humid, &gt; ⟦#11⟧ humid. Values of ⟦#12⟧ mean⟦1⟧≥ ⟦#13⟧ (source saturation). Ocean, Antarctica (south of ⟦#14⟧° S) and polar ice with zero⟦2⟧have no data.
ZH: 全球干旱指数 v3.1（⟦#0⟧–⟦#1⟧）：年均降水量除以参考蒸散量，原生 ⟦#2⟧″（约 ⟦#3⟧ km）网格。⟦0⟧等级：&lt; ⟦#4⟧ 极端干旱，⟦#5⟧–⟦#6⟧ 干旱，⟦#7⟧–⟦#8⟧ 半干旱，⟦#9⟧–⟦#10⟧ 干旱半湿润，&gt; ⟦#11⟧ 湿润。值为 ⟦#12⟧ 表示⟦1⟧≥ ⟦#13⟧（源数据饱和）。海洋、南极洲（⟦#14⟧° S 以南）及⟦2⟧为零的极地冰盖无数据。

## c.ab99d29d (Layer popovers)
EN: not used (the same for every wind dataset)
ZH: 未使用（各风场数据集相同）

## c.71f5da7c (Layer popovers)
EN: Threshold-independent: not affected by the ⟦0⟧ control.
ZH: 与临界值无关：不受⟦0⟧控件影响。

## c.61e2a3f8 (Layer popovers)
EN: Source
ZH: 来源

## c.f9f78e2c (Layer popovers)
EN: ⟦0⟧, Version ⟦#0⟧ (⟦1⟧; Zomer &amp; Trabucco), annual aridity index ai_v31_yr, ⟦#1⟧-⟦#2⟧, ⟦#3⟧ arc-seconds
ZH: ⟦0⟧，版本 ⟦#0⟧（⟦1⟧；Zomer 和 Trabucco），年干旱指数 ai_v31_yr，⟦#1⟧-⟦#2⟧，⟦#3⟧ 角秒

## c.735cb604 (Layer popovers)
EN: Data⟦0⟧
ZH: 数据⟦0⟧

## c.58c031d4 (Layer popovers)
EN: Licence
ZH: 许可协议

## c.8e08e589 (Layer popovers)
EN: Link
ZH: 链接

## c.7ec50eea (Layer popovers)
EN: Changes
ZH: 变更说明

## c.ac8f9d91 (Layer popovers)
EN: Processed for the atlas: source integers (⟦0⟧x ⟦#0⟧^⟦#1⟧) converted to decimal⟦1⟧; ocean (no⟦2⟧data) and⟦3⟧= ⟦#2⟧ pixels set to no data; the source maximum ⟦#3⟧ kept as ⟦#4⟧ (⟦4⟧&gt;= ⟦#5⟧); zoomed-out map views show means of the valid native pixels; values rounded to a relative precision of ⟦#6⟧.2e-⟦#7⟧.
ZH: 为图集处理：源数据整数（⟦0⟧x ⟦#0⟧^⟦#1⟧）已换算为十进制⟦1⟧；海洋（无⟦2⟧数据）及⟦3⟧= ⟦#2⟧ 像元设为无数据；源数据最大值 ⟦#3⟧ 保留为 ⟦#4⟧（⟦4⟧&gt;= ⟦#5⟧）；缩小视图下地图显示有效原生像元的均值；数值四舍五入至相对精度 ⟦#6⟧.2e-⟦#7⟧。

## c.e467a70d (Layer popovers)
EN: Fractional cover -⟦0⟧,⟦1⟧algorithm, Version ⟦#0⟧ (⟦2⟧;⟦3⟧collection ⟦#1⟧/⟦#2⟧, monthly medoid, ⟦#3⟧ m): total vegetation cover (photosynthetic + non-photosynthetic vegetation), ⟦#4⟧–⟦#5⟧; the vegetation product of⟦4⟧Rangeland and Pasture Productivity (⟦5⟧), hosted by⟦6⟧
ZH: Fractional cover——⟦0⟧、⟦1⟧算法，版本 ⟦#0⟧（⟦2⟧；⟦3⟧collection ⟦#1⟧/⟦#2⟧，逐月中值合成，⟦#3⟧ m）：总植被覆盖度（光合植被 + 非光合植被），⟦#4⟧–⟦#5⟧；为⟦4⟧Rangeland and Pasture Productivity（⟦5⟧）的植被产品，托管于⟦6⟧

## c.8e5d4620 (Layer popovers)
EN: Processed for the atlas: monthly ⟦#0⟧ m tiles averaged to ⟦#1⟧° and over ⟦#2⟧–⟦#3⟧ (valid tot_cov ≤ ⟦#4⟧ %; months without valid data skipped); zoomed-out map views show means of the valid ⟦#5⟧° cells; values rounded to a relative precision of ⟦#6⟧.2e-⟦#7⟧.
ZH: 为图集处理：逐月 ⟦#0⟧ m 瓦片平均至 ⟦#1⟧°，时段为 ⟦#2⟧–⟦#3⟧（有效 tot_cov ≤ ⟦#4⟧ %；无有效数据的月份跳过）；缩小视图显示有效 ⟦#5⟧° 网格单元的均值；数值按相对精度 ⟦#6⟧.2e-⟦#7⟧ 四舍五入。

## c.42e7477f (Layer popovers)
EN: Dark vector basemap of⟦0⟧roads, places, water and land cover, styled to sit under the atlas colours.
ZH: 深色矢量底图，展示⟦0⟧道路、地名、水体与土地覆盖，配色经调整以衬托图集色彩。

## c.5018e106 (Layer popovers)
EN: ⟦0⟧, from⟦1⟧data (⟦2⟧schema), dark style
ZH: ⟦0⟧，基于⟦1⟧数据（⟦2⟧模式），深色样式

## c.aee818af (Layer popovers)
EN: Resolution
ZH: 分辨率

## c.c432f449 (Layer popovers)
EN: Vector map, sharp at every zoom (street-level detail)
ZH: 矢量地图，在任意缩放级别均清晰锐利（街道级细节）

## c.9f1c6cab (Layer popovers)
EN: Map data ©⟦0⟧contributors (⟦1⟧); ©⟦2⟧
ZH: 地图数据 © ⟦0⟧贡献者（⟦1⟧）；© ⟦2⟧

## c.0fce76d6 (Layer popovers)
EN: Mosaic of satellite and aerial imagery of the land surface.
ZH: 地表卫星与航拍影像拼接图。

## c.7a9c10bd (Layer popovers)
EN: ⟦0⟧(⟦1⟧,⟦2⟧,⟦3⟧and the⟦4⟧)
ZH: ⟦0⟧（⟦1⟧、⟦2⟧、⟦3⟧及⟦4⟧）

## c.243e42f5 (Layer popovers)
EN: ⟦#0⟧ m worldwide, ⟦#1⟧ m or finer in many regions
ZH: 全球 ⟦#0⟧ m，在许多地区达 ⟦#1⟧ m 或更精细

## c.5d6289ac (Layer popovers)
EN: ⟦0⟧service under the⟦1⟧/ Terms of Use
ZH: ⟦0⟧服务，依据⟦1⟧使用条款

## c.e32b80e2 (Layer popovers)
EN: Shaded relief of an open global elevation model (⟦0⟧).
ZH: 基于开放全球高程模型（⟦0⟧）的阴影地形。

## c.22335d7a (Layer popovers)
EN: ⟦0⟧open elevation data:⟦1⟧worldwide and national open elevation models where available
ZH: ⟦0⟧开放高程数据：在可获取处使用⟦1⟧全球及各国开放高程模型

## c.a5298609 (Layer popovers)
EN: About ⟦#0⟧ m worldwide, finer in some countries
ZH: 全球约 ⟦#0⟧ m，部分国家更精细

## c.a9596935 (Layer popovers)
EN: Each source's open licence (for example the⟦0⟧licence), listed by⟦1⟧
ZH: 各数据源的开放许可（例如⟦0⟧许可），列于⟦1⟧

## c.d7137982 (Layer popovers)
EN: Topographic map with contour lines and hill shading.
ZH: 带等高线与山体阴影的地形图。

## c.45fc789b (Layer popovers)
EN: ⟦0⟧, from⟦1⟧data and⟦2⟧elevation
ZH: ⟦0⟧，基于⟦1⟧数据及⟦2⟧高程

## c.b47179e7 (Layer popovers)
EN: About ⟦#0⟧ m per pixel at the equator at the closest zoom
ZH: 在最接近的缩放级别下，赤道处每像素约 ⟦#0⟧ m

## c.816ba161 (Layer popovers)
EN: Map data ©⟦0⟧contributors (⟦1⟧); map style ©⟦2⟧(⟦3⟧)
ZH: 地图数据 © ⟦0⟧贡献者（⟦1⟧）；地图样式 © ⟦2⟧（⟦3⟧）

## c.84e91972 (Layer popovers)
EN: Light vector basemap of⟦0⟧roads, places, water and land cover (⟦1⟧style).
ZH: 浅色矢量底图，展示⟦0⟧道路、地名、水体与土地覆盖（⟦1⟧样式）。

## c.6bc2c76c (Layer popovers)
EN: ⟦0⟧, from⟦1⟧data (⟦2⟧schema),⟦3⟧style
ZH: ⟦0⟧，基于⟦1⟧数据（⟦2⟧模式），⟦3⟧样式

# Layer panel

## c.dfaf4b2e (Layer panel)
EN: To see the imagery under the colour layers, lower their opacity in Active layers.
ZH: 若需查看色彩图层下方的影像，请在“当前图层”中降低其不透明度。

# About

## c.76b65eed (About)
EN: This page was created with assistance from Claude⟦0⟧. I have reviewed the functionality and underlying data but if you notice any issues or errors please contact me at <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a>.
ZH: 本页面在 Claude⟦0⟧的协助下创建。我已审核其功能与基础数据，但如发现任何问题或错误，请通过 <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> 与我联系。

## c.a8714914 (About)
EN: Click any land cell to see its wind rose over the record of the wind dataset chosen with the Wind dataset selector, the sand-flux rose at the selected threshold, dune-orientation modes and all wind-regime parameters.
ZH: 点击任意陆地网格单元，即可查看其在“风场数据集”选择器所选风场记录时段内的风玫瑰图、所选临界值下的输沙玫瑰图、沙丘朝向模式以及全部风况参数。

## c.51f21a4b (About)
EN: Data sources
ZH: 数据来源

## c.706c74d2 (About)
EN: <strong>Wind histograms and sand-flux fields (⟦0⟧⟦#0⟧°)</strong>:⟦1⟧⟦#1⟧–⟦#2⟧ hourly ⟦#3⟧ m winds on the ⟦#4⟧° grid (⟦2⟧;⟦3⟧,⟦4⟧, accessed via the⟦5⟧Australia replica); the histograms and the ⟦#5⟧ sand-flux fields are computed for the atlas with the methods outlined in⟦6⟧. Cells with an⟦7⟧land–sea mask fraction above ⟦#6⟧ (any land in the cell) carry wind data; a ⟦#7⟧° cell counts as a dune cell where it overlaps a mapped ⟦#8⟧° dune cell.
ZH: <strong>风况直方图与输沙通量场（⟦0⟧⟦#0⟧°）</strong>：⟦1⟧⟦#1⟧–⟦#2⟧ 逐小时 ⟦#3⟧ m 风速，基于 ⟦#4⟧° 网格（⟦2⟧；⟦3⟧、⟦4⟧，经⟦5⟧澳大利亚镜像访问）；直方图与 ⟦#5⟧ 输沙通量场按⟦6⟧所述方法为图集计算。⟦7⟧陆海掩膜比例高于 ⟦#6⟧（网格单元内含任意陆地）的单元载有风场数据；⟦#7⟧° 网格单元在与已制图的 ⟦#8⟧° 沙丘网格单元重叠时计为沙丘单元。

## c.a7651e74 (About)
EN: <strong>Sand-flux fields</strong>: for every hour, the friction velocity⟦0⟧= κ U₁₀ / ln(z/z₀) from the ⟦#0⟧ m wind speed U₁₀ (logarithmic wind profile; κ = ⟦#1⟧, z = ⟦#2⟧ m, roughness length z₀ = ⟦#3⟧ mm) and the saturated transport rate of⟦1⟧, q = C ρ<sub>f</sub>⟦2⟧(u*² − u*,th²) / (g ρ<sub>s</sub> φ) for⟦3⟧&gt;⟦4⟧, with C = ⟦#4⟧, air density ρ<sub>f</sub> = ⟦#5⟧ kg/m³, grain density ρ<sub>s</sub> = ⟦#6⟧ kg/m³, packing fraction φ = ⟦#7⟧ and g = ⟦#8⟧ m/s², at the selected threshold⟦5⟧, averaged over ⟦#9⟧–⟦#10⟧ (⟦6⟧, Methods⟦7⟧). Fluxes are volumes of packed sand (pore space included) per metre width per year of ⟦#11⟧ days (m²/yr). Drift potentials, crest fluxes and dune-orientation modes follow the methods reviewed in⟦8⟧.
ZH: <strong>输沙通量场</strong>：对每一小时，根据 ⟦#0⟧ m 风速 U₁₀（对数风速廓线；κ = ⟦#1⟧，z = ⟦#2⟧ m，空气动力学粗糙度 z₀ = ⟦#3⟧ mm）计算摩阻风速⟦0⟧= κ U₁₀ / ln(z/z₀)，并按⟦1⟧的饱和输沙率公式 q = C ρ<sub>f</sub>⟦2⟧(u*² − u*,th²) / (g ρ<sub>s</sub> φ)（当⟦3⟧&gt;⟦4⟧时成立，其中 C = ⟦#4⟧，空气密度 ρ<sub>f</sub> = ⟦#5⟧ kg/m³，颗粒密度 ρ<sub>s</sub> = ⟦#6⟧ kg/m³，堆积体积分数 φ = ⟦#7⟧，g = ⟦#8⟧ m/s²）在所选临界值⟦5⟧下计算，并在 ⟦#9⟧–⟦#10⟧ 期间取平均（⟦6⟧，方法⟦7⟧）。输沙通量为每米宽度每年（以 ⟦#11⟧ 天计）堆积沙体（含孔隙）的体积（m²/yr）。输沙势、脊线输沙通量与沙丘朝向模式均遵循⟦8⟧所综述的方法。

## c.38fc33d0 (About)
EN: <strong>Dune map</strong>:⟦0⟧from the⟦1⟧record (⟦2⟧,⟦3⟧), vectorised into dune fields.
ZH: <strong>沙丘分布图</strong>：⟦0⟧源自⟦1⟧记录（⟦2⟧、⟦3⟧），经矢量化得到沙丘区。

## c.2bc3ff20 (About)
EN: <strong>Saturated flux divergence</strong> ⟦0⟧: divergence of the time-averaged saturated sand-flux vector (magnitude⟦1⟧, direction⟦2⟧) on the sphere, ∇·q = [∂(q cos θ)/∂λ + ∂(q sin θ cos φ)/∂φ] / (R cos φ) with q =⟦3⟧, θ =⟦4⟧, latitude φ, longitude λ and R = ⟦#0⟧ km, computed with central differences on the grid of the selected wind dataset (⟦#1⟧° or ⟦#2⟧°), following⟦5⟧, Methods⟦6⟧. By conservation of sand mass, negative values (convergence) imply deposition and positive values erosion, in metres of bed level per thousand years. The values assume a saturated flux and an unlimited supply of loose sand.
ZH: <strong>饱和输沙通量散度</strong> ⟦0⟧：球面上时间平均饱和输沙通量矢量（大小⟦1⟧，方向⟦2⟧）的散度，∇·q = [∂(q cos θ)/∂λ + ∂(q sin θ cos φ)/∂φ] / (R cos φ)，其中 q =⟦3⟧，θ =⟦4⟧，纬度为 φ，经度为 λ，R = ⟦#0⟧ km，在所选风场数据集的网格（⟦#1⟧° 或 ⟦#2⟧°）上以中心差分计算，方法依据⟦5⟧，方法⟦6⟧。根据沙量守恒，负值（汇）表示堆积，正值（源）表示侵蚀，单位为床面高程变化（米）每千年。该数值假定输沙通量已饱和且松散沙源供应不受限。

## c.c117cfda (About)
EN: <strong>Dune-field names</strong>: Displayed dune field names are derived from previously published academic research and data, regional knowledge, and internet searches. Naming conventions (language, jurisdiction, spelling, merging, etc.) were chosen for clarity but may be wrong or offend certain peoples. Please contact Andrew Gunn at <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> if you have any suggestions for changes, removals, or additions.
ZH: <strong>沙丘区名称</strong>：所显示的沙丘区名称来自已发表的学术研究与数据、区域知识及网络检索。命名方式（语言、行政归属、拼写、合并等）力求清晰，但可能有误或冒犯相关族群。如有任何修改、删除或新增建议，请通过 <a href="mailto:a.gunn@monash.edu">a.gunn@monash.edu</a> 与 Andrew Gunn 联系。

## c.e1abc281 (About)
EN: Both atlases compute the same quantities with the methods outlined in⟦0⟧: the time-averaged saturated sand flux over a flat bed fully covered by loose sand (⟦1⟧), its resultant (⟦2⟧,⟦3⟧,⟦4⟧), crest fluxes, dune-orientation modes and flux divergence. Both report fluxes as volumes of packed sand (packing fraction ⟦#0⟧, pore space included) per metre width per Earth year of ⟦#1⟧ days (m²/yr), and both show wind roses as the direction the wind blows from and sand roses as the direction sand moves toward. They differ in four ways.
ZH: 两套图集均采用⟦0⟧所述方法计算相同的物理量：平坦床面完全被松散沙覆盖时的时间平均饱和输沙率（⟦1⟧）、其合成量（⟦2⟧、⟦3⟧、⟦4⟧）、脊线输沙通量、沙丘朝向模式及输沙通量散度。两者均以单位宽度、以 ⟦#1⟧ 天为一个地球年计的堆积沙体积（堆积体积分数 ⟦#0⟧，含孔隙空间）（m²/yr）报告输沙通量，并均以风来向绘制风玫瑰图、以沙去向绘制输沙玫瑰图。二者在四个方面有所不同。

## c.8726a129 (About)
EN: Citing the map fields
ZH: 引用地图数据

## c.dd3ddd79 (About)
EN: <strong>⟦0⟧⟦#0⟧°</strong>: ⟦1⟧. Licence: ⟦2⟧.
ZH: <strong>⟦0⟧⟦#0⟧°</strong>：⟦1⟧。许可协议：⟦2⟧。

## c.ac07bd37 (About)
EN: ⟦0⟧/ dune map
ZH: ⟦0⟧／沙丘分布图

## c.935e4396 (About)
EN: Paper: ⟦0⟧
ZH: 论文：⟦0⟧

## c.b35fcfde (About)
EN: Data (wind histograms and sand-flux fields): ⟦0⟧
ZH: 数据（风况直方图与输沙通量数据）：⟦0⟧

## c.11b8f814 (About)
EN: Data (dune map:⟦0⟧, contained in the⟦1⟧record): ⟦2⟧
ZH: 数据（沙丘分布图：⟦0⟧，收录于⟦1⟧数据集中）：⟦2⟧

## c.e43657ea (About)
EN: Data: ⟦0⟧
ZH: 数据：⟦0⟧

## c.85811cee (About)
EN: Contains modified⟦0⟧information (⟦1⟧, ⟦#0⟧–⟦#1⟧). Neither the European Commission nor⟦2⟧is responsible for any use that may be made of the⟦3⟧information or data it contains.
ZH: 含经修改的⟦0⟧信息（⟦1⟧，⟦#0⟧–⟦#1⟧）。对于因使用⟦3⟧信息或其所含数据而产生的任何后果，欧盟委员会及⟦2⟧概不负责。

## c.5b675aea (About)
EN: Global Aridity Index (⟦0⟧)
ZH: 全球干旱指数（⟦0⟧）

## c.a60116c4 (About)
EN: Vegetation cover (⟦0⟧Fractional Cover v3.1)
ZH: 植被覆盖度（⟦0⟧Fractional Cover v3.1）

## c.6aa0a68b (About)
EN: Full monthly time series:⟦0⟧Map, <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">⟦1⟧</a>
ZH: 完整逐月时间序列：⟦0⟧Map，<a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">⟦1⟧</a>

## c.1a6f67b1 (About)
EN: Contains modified⟦0⟧information. Basemap credits are shown in the map attribution.
ZH: 含经修改的⟦0⟧信息。底图版权信息见地图署名处。

## c.3884b372 (About)
EN: To understand how the atlas is used, we count page visits and downloads by country, with Cloudflare Web Analytics and a small counter of our own. No cookies are set and no⟦0⟧addresses are kept.
ZH: 为了解图集的使用情况，我们使用 Cloudflare Web Analytics 及自建的小型计数器按国家统计页面访问量与下载量。系统不设置 Cookie，也不保留任何⟦0⟧地址。

# Screen-reader labels and tooltips

## c.ff5ee14a (Screen-reader labels and tooltips)
EN: Resize panel (drag, or use the arrow keys)
ZH: 调整面板大小（可拖动，或使用方向键）

## c.a89ab2ab (Screen-reader labels and tooltips)
EN: Close cell panel
ZH: 关闭网格单元面板

# Cell panel

## c.ed60e8c1 (Cell panel)
EN: Loading⟦0⟧data for this cell…
ZH: 正在加载该网格单元的⟦0⟧数据……

## c.cd275e7b (Cell panel)
EN: Dunes present
ZH: 存在沙丘

## c.f9cfdc68 (Cell panel)
EN: Threshold ⟦0⟧: <strong>⟦1⟧</strong>
ZH: 临界值⟦0⟧：<strong>⟦1⟧</strong>

## c.ea559417 (Cell panel)
EN: Wind at ⟦#0⟧ m at the threshold: ≈ ⟦0⟧
ZH: ⟦#0⟧ m 高度处临界风速：约⟦0⟧

## c.a5650846 (Cell panel)
EN: Wind rose
ZH: 风玫瑰图

## c.2632e454 (Cell panel)
EN: Sectors
ZH: 扇区

## c.fcba0503 (Cell panel)
EN: Frequency of hourly ⟦#0⟧ m winds by the direction they blow from, ⟦#1⟧ sectors, stacked by speed class; ⟦#2⟧–⟦#3⟧; sums to ⟦#4⟧ %.
ZH: 逐小时 ⟦#0⟧ m 风速按来向统计的频率，共 ⟦#1⟧ 个扇区，按风速等级堆叠；⟦#2⟧–⟦#3⟧；合计为 ⟦#4⟧ %。

## c.5d9e5efa (Cell panel)
EN: % of hours
ZH: 小时数占比 %

## c.9f03a7d2 (Cell panel)
EN: Direction the wind blows FROM (meteorological), ⟦#0⟧ sectors of ⟦#1⟧°; radius = % of the ⟦#2⟧ counted hourly samples (sums to ⟦#3⟧ %; hours &gt; ⟦#4⟧ m/s are not in the histogram).⟦0⟧⟦#5⟧ m wind ⟦#6⟧–⟦#7⟧.
ZH: 风的来向（气象学定义），共 ⟦#0⟧ 个扇区，每扇区 ⟦#1⟧°；半径为所统计 ⟦#2⟧ 逐小时样本数的百分比（合计为 ⟦#3⟧ %；大于 ⟦#4⟧ m/s 的小时未计入该直方图）。⟦0⟧⟦#5⟧ m 风速 ⟦#6⟧–⟦#7⟧。

# Screen-reader labels and tooltips

## c.aab9a2de (Screen-reader labels and tooltips)
EN: Export this plot (light theme, with data source and link)
ZH: 导出该图（浅色主题，含数据来源与链接）

# Cell panel

## c.e86349d3 (Cell panel)
EN: Export
ZH: 导出

## c.7193769a (Cell panel)
EN: ⟦0⟧ Transparent background
ZH: ⟦0⟧透明背景

## c.29c9bdfd (Cell panel)
EN: Sand flux rose (time-averaged, transport toward)
ZH: 输沙玫瑰图（时间平均，输沙方向：去向）

## c.7789ddf5 (Cell panel)
EN: Flux ⟦0⟧
ZH: 输沙通量⟦0⟧

# Screen-reader labels and tooltips

## c.6da97f0c (Screen-reader labels and tooltips)
EN: Flux rose mode
ZH: 输沙玫瑰图模式

# Cell panel

## c.58919355 (Cell panel)
EN: Flat bed
ZH: 平坦床面

## c.1eeb99cc (Cell panel)
EN: Elongation (αE)
ZH: 伸长（αE）

## c.36c18d9e (Cell panel)
EN: Transverse migration (αH)
ZH: 横向迁移（αH）

# Screen-reader labels and tooltips

## c.0530e499 (Screen-reader labels and tooltips)
EN: Flux rose radial axis
ZH: 输沙玫瑰图径向轴

# Cell panel

## c.6d1a8a4e (Cell panel)
EN: ⟦0⟧ % of total
ZH: 占总量的⟦0⟧ %

# Screen-reader labels and tooltips

## c.1b0fc3f0 (Screen-reader labels and tooltips)
EN: Flux rose petal direction
ZH: 输沙玫瑰图扇区方向

# Cell panel

## c.e71fb327 (Cell panel)
EN: Time-averaged flat-bed sand flux by the direction sand moves toward, ⟦#0⟧ sectors of ⟦#1⟧ degrees, stacked by excess shear u*f/u*,th, percent of total flux, at u*,th ⟦#2⟧ m/s.
ZH: 按沙去往的方向划分的时间平均平坦床面输沙率，共 ⟦#0⟧ 个扇区，每个扇区 ⟦#1⟧ 度，按超额剪切 u*f/u*,th 分层叠加，为总输沙率的百分比，取 u*,th 为 ⟦#2⟧ m/s。

## c.04e86ff9 (Cell panel)
EN: αH (crest orientation, bed-instability mode): ⟦#0⟧° (axis)
ZH: αH（脊线走向，床面失稳模式）：⟦#0⟧°（轴）

## c.58e2a84e (Cell panel)
EN: % of total flux
ZH: 占总输沙量的百分比

## c.8656e567 (Cell panel)
EN: ⟦#0⟧° (axis)
ZH: ⟦#0⟧°（轴）

## c.531a7c8d (Cell panel)
EN: <span class="cap-lead"><strong>Flat bed</strong>: ⟦0⟧ = ⟦1⟧</span> Direction sand moves TOWARD; ⟦#0⟧ sectors of ⟦#1⟧°. Radius = % of the total flux in each sector (sums to ⟦#2⟧ %). Time-averaged saturated flat-bed flux (q from ⟦2⟧), Σ<sub>speed</sub> n·q / Σ<sub>all</sub> n from the wind histogram. Colours split each sector by the excess shear ⟦3⟧ of the winds carrying the flux (only ⟦4⟧ transports sand).⟦5⟧,⟦6⟧,⟦7⟧,⟦8⟧and the arrows are the map fields at this threshold; a direction is hidden where the flux defining it is zero.
ZH: <span class="cap-lead"><strong>平坦床面</strong>：⟦0⟧ = ⟦1⟧</span>沙去往的方向；共 ⟦#0⟧ 个扇区，每个扇区 ⟦#1⟧°。半径为各扇区占总输沙量的百分比（总和为 ⟦#2⟧ %）。时间平均饱和平坦床面输沙率（q 来自⟦2⟧），由风况直方图计算得出 Σ<sub>speed</sub> n·q / Σ<sub>all</sub> n。颜色按搬运该输沙量的风的超额剪切⟦3⟧对每个扇区进行划分（仅⟦4⟧搬运沙）。⟦5⟧、⟦6⟧、⟦7⟧、⟦8⟧及箭头均为该临界值下的地图场；若定义某方向的输沙量为零，则不显示该方向。

## c.85f6094f (Cell panel)
EN: Modes vs threshold (polar: angle = direction, radius = ⟦0⟧)
ZH: 模式与临界值的关系（极坐标：角度为方向，半径为⟦0⟧）

# Screen-reader labels and tooltips

## c.2dbc70d1 (Screen-reader labels and tooltips)
EN: Polar plot of dune-orientation mode bearings (angle) against threshold friction velocity (radius, ⟦#0⟧ m/s at the centre to ⟦#1⟧ m/s at the rim)
ZH: 沙丘朝向模式方位角（角度）与临界摩阻风速（半径，中心为 ⟦#0⟧ m/s，外缘为 ⟦#1⟧ m/s）的极坐标图

# Cell panel

## c.068b4cfe (Cell panel)
EN: radius: u*,th (m/s)
ZH: 半径：u*,th（m/s）

## c.6e844047 (Cell panel)
EN: Drift potential⟦0⟧ vs threshold
ZH: 输沙势⟦0⟧与临界值的关系

## c.dc80e435 (Cell panel)
EN: Plot ⟦0⟧
ZH: 绘图⟦0⟧

# Screen-reader labels and tooltips

## c.5c96f403 (Screen-reader labels and tooltips)
EN: Quantity plotted against the threshold
ZH: 与临界值绘制的物理量

# Cell panel

## c.c4d7f978 (Cell panel)
EN: Flux directionality (RDP/DP)
ZH: 输沙通量方向变率（RDP/DP）

# Screen-reader labels and tooltips

## c.985d469b (Screen-reader labels and tooltips)
EN: Drift potential (DP) vs threshold
ZH: 输沙势（DP）与临界值的关系

# Cell panel

## c.dd4757c8 (Cell panel)
EN: <span class="cap-lead">At the current threshold: ⟦0⟧</span> Drift potential (⟦1⟧) of this cell for every threshold; dot and dashed line: current threshold. Triangles at the top or bottom edge: infinite ratio (its denominator, a net flux, is zero; ±⟦#0⟧ in the data), not plotted.
ZH: <span class="cap-lead">按当前临界值：⟦0⟧</span>该网格单元在各临界值下的输沙势（⟦1⟧）；圆点与虚线：当前临界值。位于上边缘或下边缘的三角形：比值为无穷大（其分母，即净输沙量，为零；数据中为 ±⟦#0⟧），未绘出。

## c.a4c54ba4 (Cell panel)
EN: Cell summary at ⟦0⟧ = ⟦1⟧
ZH: ⟦0⟧ = ⟦1⟧时的网格单元概要

## c.3a105ef1 (Cell panel)
EN: Symbol
ZH: 符号

## c.2bf732f8 (Cell panel)
EN: Quantity
ZH: 物理量

## c.d147f96a (Cell panel)
EN: Value
ZH: 数值

## c.81062dcd (Cell panel)
EN: ⟦#0⟧° <span class="unit">(bearing, toward)</span>
ZH: ⟦#0⟧° <span class="unit">（方位角，指向）</span>

## c.8ebe5564 (Cell panel)
EN: ⟦#0⟧ <span class="unit">fraction (⟦#1⟧–⟦#2⟧)</span>
ZH: ⟦#0⟧ <span class="unit">比例（⟦#1⟧–⟦#2⟧）</span>

# Screen-reader labels and tooltips

## c.d9da59dc (Screen-reader labels and tooltips)
EN: Negative values (flux convergence) imply deposition
ZH: 负值（输沙通量汇）表示堆积

# Cell panel

## c.d169cc9f (Cell panel)
EN: ⟦#0⟧° <span class="unit">(axis, ⟦#1⟧–⟦#2⟧)</span>
ZH: ⟦#0⟧° <span class="unit">（轴，⟦#1⟧–⟦#2⟧）</span>

# Screen-reader labels and tooltips

## c.6382f602 (Screen-reader labels and tooltips)
EN: Cell mean, threshold-independent; ⟦#0⟧ % of cell valid, ⟦#1⟧ % saturated
ZH: 网格单元平均值，与临界值无关；该网格单元中 ⟦#0⟧ % 有效，⟦#1⟧ % 饱和

## c.3d735122 (Screen-reader labels and tooltips)
EN: Some pixels are at the source saturation value ⟦#0⟧, so the mean is a lower bound
ZH: 部分像元处于数据源饱和值 ⟦#0⟧，因此该平均值为下限值

# Cell panel

## c.7b8c5d3b (Cell panel)
EN: ≥ ⟦#0⟧ <span class="unit">(arid)</span>
ZH: ≥ ⟦#0⟧ <span class="unit">（干旱）</span>

## c.e90a7bd5 (Cell panel)
EN: Cell
ZH: 网格单元

# Screen-reader labels and tooltips

## c.14e8021b (Screen-reader labels and tooltips)
EN: Yes: the cell overlaps at least one ⟦#0⟧° dune cell of the dune map (Gunn ⟦#1⟧)
ZH: 是：该网格单元与沙丘图（Gunn ⟦#1⟧）中至少一个 ⟦#0⟧° 沙丘网格单元重叠

# Cell panel

## c.4e9f3590 (Cell panel)
EN: yes
ZH: 是

# Screen-reader labels and tooltips

## c.2410610b (Screen-reader labels and tooltips)
EN: Latitude, longitude of the cell centre
ZH: 网格单元中心的纬度、经度

# Cell panel

## c.7a7dbf8c (Cell panel)
EN: Cell centre
ZH: 网格单元中心

## c.f42590f9 (Cell panel)
EN: Angles are compass bearings of the transport direction; fluxes converted from m²/s to m²/yr; — = not defined (e.g. no crest flux).
ZH: 角度为输沙方向的方位角；输沙率已由 m²/s 换算为 m²/yr；— 表示未定义（例如无脊线输沙量）。

# Screen-reader labels and tooltips

## c.4598f0fa (Screen-reader labels and tooltips)
EN: Wind histogram, all fields vs threshold, flux roses and metadata in one NetCDF-⟦#0⟧ file (CF-⟦#1⟧)
ZH: 风况直方图、各场与临界值的关系、输沙玫瑰图及元数据，均存于一个 NetCDF-⟦#0⟧ 文件中（CF-⟦#1⟧）

## c.f163afcc (Screen-reader labels and tooltips)
EN: wind_histogram.csv, fields_by_threshold.csv, flux_rose.csv, rose_16_sectors.csv (⟦#0⟧ sectors, degrees), metadata.json and README.txt
ZH: wind_histogram.csv、fields_by_threshold.csv、flux_rose.csv、rose_16_sectors.csv（⟦#0⟧ 个扇区，角度制）、metadata.json 和 README.txt

# Cell panel

## c.b46e7304 (Cell panel)
EN: ⟦0⟧bundle (.zip)
ZH: ⟦0⟧数据包（.zip）

# Screen-reader labels and tooltips

## c.a15445e7 (Screen-reader labels and tooltips)
EN: Citation text file
ZH: 引用文本文件

# Cell panel

## c.3d8b79ca (Cell panel)
EN: Citation (⟦0⟧)
ZH: 引用（⟦0⟧）

# Screen-reader labels and tooltips

## c.94cd08c5 (Screen-reader labels and tooltips)
EN: Copy the citation text to the clipboard
ZH: 将引用文本复制到剪贴板

# Cell panel

## c.e4f8fbe5 (Cell panel)
EN: Copy citation
ZH: 复制引用

## c.9a9cfc21 (Cell panel)
EN: Get the whole grid
ZH: 获取整个网格数据

## c.94880c62 (Cell panel)
EN: The atlas reads public⟦0⟧(v3) stores on <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a>, which anyone can read, e.g. with Python. The map fields of⟦1⟧⟦#0⟧° are one store per variable, each holding the field against the threshold friction velocity (⟦2⟧, ⟦#1⟧ values) and latitude ⟦3⟧ and longitude ⟦4⟧ (cell centres in degrees; x from ⟦#2⟧ to ⟦#3⟧°, east positive). Level ⟦5⟧ of each store is the full-resolution grid; levels ⟦#4⟧, ⟦#5⟧, … are coarser copies for the map.
ZH: 本图集读取存储于 <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a> 上的公开⟦0⟧（v3）存储库，任何人都可以读取，例如使用 Python。⟦1⟧⟦#0⟧°的地图数据场每个变量对应一个存储库，各自保存该字段相对于临界摩阻风速（⟦2⟧，共 ⟦#1⟧ 个取值）以及纬度⟦3⟧和经度⟦4⟧（网格单元中心，单位为度；x 范围从 ⟦#2⟧ 到 ⟦#3⟧°，东为正）的数据。每个存储库的⟦5⟧级为全分辨率网格；⟦#4⟧、⟦#5⟧ 等级为供地图使用的粗化副本。

## c.826bac69 (Cell panel)
EN: Copy code
ZH: 复制代码

## c.c7598ba3 (Cell panel)
EN: Variables (replace ⟦0⟧ in the⟦1⟧): ⟦2⟧, ⟦3⟧, ⟦4⟧, ⟦5⟧, ⟦6⟧, ⟦7⟧, ⟦8⟧, ⟦9⟧, ⟦10⟧, ⟦11⟧, ⟦12⟧, ⟦13⟧, ⟦14⟧, ⟦15⟧, ⟦16⟧, ⟦17⟧, ⟦18⟧, ⟦19⟧, ⟦20⟧, ⟦21⟧, ⟦22⟧, ⟦23⟧, ⟦24⟧, ⟦25⟧. Per-cell data of the cell panel: ⟦26⟧ (layout: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦27⟧</a>).
ZH: 变量（替换⟦1⟧中的⟦0⟧）：⟦2⟧、⟦3⟧、⟦4⟧、⟦5⟧、⟦6⟧、⟦7⟧、⟦8⟧、⟦9⟧、⟦10⟧、⟦11⟧、⟦12⟧、⟦13⟧、⟦14⟧、⟦15⟧、⟦16⟧、⟦17⟧、⟦18⟧、⟦19⟧、⟦20⟧、⟦21⟧、⟦22⟧、⟦23⟧、⟦24⟧、⟦25⟧。网格单元面板的逐单元数据：⟦26⟧（结构说明：<a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦27⟧</a>）。

## c.ce1afc80 (Cell panel)
EN: Licence of these map fields:⟦0⟧(⟦1⟧Supplementary Data). Licences of every store: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦2⟧</a>. Please cite the sources listed under Download &amp; cite.
ZH: 这些地图数据场的许可协议：⟦0⟧（⟦1⟧补充数据）。各存储库的许可协议：<a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦2⟧</a>。请引用“下载与引用”下列出的数据来源。

## c.bf82bd88 (Cell panel)
EN: infinite (⟦#0⟧ in the data).
ZH: 无穷大（数据中为 ⟦#0⟧）。

## c.4d123ca2 (Cell panel)
EN: Cell ⟦#0⟧, ⟦#1⟧
ZH: 网格单元 ⟦#0⟧，⟦#1⟧

# Other interface

## c.b316e3ad (Other interface)
EN: Outside the⟦0⟧land mask
ZH: ⟦0⟧陆地掩膜之外

## c.3d5c01ad (Other interface)
EN: ⟦#0⟧° cell: row ⟦#1⟧, column ⟦#2⟧; centre ⟦#3⟧°S, ⟦#4⟧°E.
ZH: ⟦#0⟧°网格单元：第 ⟦#1⟧ 行，第 ⟦#2⟧ 列；中心位于南纬 ⟦#3⟧°、东经 ⟦#4⟧°。

# Other

## c.4f6e56eb (Other)
EN: Switch to Mars
ZH: 切换到火星

# Screen-reader labels and tooltips

## c.cd86acc3 (Screen-reader labels and tooltips)
EN: Close
ZH: 关闭

# Tool panels

## c.3be5a9ed (Tool panels)
EN: Share this view
ZH: 分享此视图

# Screen-reader labels and tooltips

## c.b03ebc37 (Screen-reader labels and tooltips)
EN: Link to this view
ZH: 此视图的链接

# Tool panels

## c.23f990dc (Tool panels)
EN: Copy link
ZH: 复制链接

## c.db531243 (Tool panels)
EN: The link restores the position, zoom, wind dataset, threshold, basemap, active layers and the selected cell.
ZH: 该链接会恢复位置、缩放级别、风场数据集、临界值、底图、当前图层及所选网格单元。

# Other interface

## c.3887d7d3 (Other interface)
EN: Link copied
ZH: 链接已复制

# Tool panels

## c.46af3291 (Tool panels)
EN: ⟦0⟧ Include basemap
ZH: ⟦0⟧包含底图

## c.e695bc35 (Tool panels)
EN: ⟦0⟧ Transparent background (default white)
ZH: ⟦0⟧透明背景（默认白色）

## c.963b6004 (Tool panels)
EN: ⟦0⟧of the current view, ⟦#0⟧–⟦#1⟧ pixels wide, without the panels, on a white background unless Transparent background is ticked. Colour bars, legends, scale and data sources are added below the map.
ZH: ⟦0⟧当前视图，宽度为 ⟦#0⟧–⟦#1⟧ 像素，不含面板；除非勾选透明背景，否则背景为白色。色带、图例、比例尺与数据来源将附加在地图下方。

## c.f1d747de (Tool panels)
EN: Export⟦0⟧
ZH: 导出⟦0⟧

# Screen-reader labels and tooltips

## c.76ffaf4f (Screen-reader labels and tooltips)
EN: Rendering…
ZH: 渲染中……

## c.30a14bad (Screen-reader labels and tooltips)
EN: Best viewed full screen: opens this view in a new tab
ZH: 建议全屏查看：在新标签页中打开此视图

# Other interface

## c.a09f6b17 (Other interface)
EN: Open full screen ↗
ZH: 全屏打开 ↗

## c.84ba782e (Other interface)
EN: Best viewed full screen
ZH: 建议全屏查看

# Screen-reader labels and tooltips

## c.0ba4b6a4 (Screen-reader labels and tooltips)
EN: MCMC FV3 ⟦#0⟧°, one Mars year (6th simulated year, ⟦#1⟧ sols)
ZH: MCMC FV3 ⟦#0⟧°，一个火星年（第 6 个模拟年，⟦#1⟧ 个火星日）

## c.5b8eff97 (Screen-reader labels and tooltips)
EN: Reset to the default ⟦#0⟧ µm
ZH: 重置为默认值 ⟦#0⟧ µm

# Layer panel

## c.f2de880e (Layer panel)
EN: default ⟦#0⟧ µm
ZH: 默认值 ⟦#0⟧ µm

# Layer popovers

## c.01554ec1 (Layer popovers)
EN: ⟦#0⟧ log-spaced values from ⟦#1⟧ µm to ⟦#2⟧ µm; default ⟦#3⟧ µm (the mark under the slider). The compact copy at the top of the cell panel sets the same value.
ZH: 共 ⟦#0⟧ 个对数间隔取值，从 ⟦#1⟧ µm 到 ⟦#2⟧ µm；默认值为 ⟦#3⟧ µm（滑块下方的标记）。网格单元面板顶部的简化控件设定的是同一个值。

# Screen-reader labels and tooltips

## c.0068eba5 (Screen-reader labels and tooltips)
EN: Invert: colour the areas WITHOUT mapped dunes instead of the dunes.
ZH: 反转：对无已制图沙丘的区域而非沙丘本身着色。

# Layer panel

## c.a524d750 (Layer panel)
EN: ⟦0⟧ invert (areas without dunes)
ZH: ⟦0⟧反转（无沙丘区域）

# Screen-reader labels and tooltips

## c.227e780e (Screen-reader labels and tooltips)
EN: Invert: colour areas without dunes
ZH: 反转：对无沙丘区域着色

# Layer popovers

## c.5e016412 (Layer popovers)
EN: Mapped aeolian dune fields of Mars: the⟦0⟧⟦1⟧(⟦2⟧; equatorial⟦3⟧, north polar⟦4⟧, south polar⟦5⟧;⟦6⟧) plus the small dune fields of⟦7⟧, merged into ⟦#0⟧ polygons (⟦#1⟧ km²).⟦8⟧maps fields larger than ⟦#2⟧ km²; ⟦#3⟧ polygons are smaller (⟦9⟧). Equatorward of ⟦#4⟧°: ⟦#5⟧ polygons, ⟦#6⟧ km² (⟦10⟧and⟦11⟧).
ZH: 火星风成沙丘区制图：⟦0⟧⟦1⟧（⟦2⟧；赤道区⟦3⟧、北极区⟦4⟧、南极区⟦5⟧；⟦6⟧）加上⟦7⟧的小型沙丘区，合并为 ⟦#0⟧ 个多边形（⟦#1⟧ km²）。⟦8⟧制图范围为大于 ⟦#2⟧ km² 的沙丘区；⟦#3⟧ 个多边形较小（⟦9⟧）。⟦#4⟧° 以内（赤道一侧）：⟦#5⟧ 个多边形，⟦#6⟧ km²（⟦10⟧和⟦11⟧）。

## c.2cb30509 (Layer popovers)
EN: Dune fields are named after the IAU-approved names of the features they lie in, from the <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">Gazetteer of Planetary Nomenclature</a> (⟦0⟧); undae are⟦1⟧names for dune fields themselves. A few informal names are included as aliases.
ZH: 沙丘区以其所在地貌单元经国际天文学联合会（IAU）批准的名称命名，源自 <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">行星命名辞典</a>（⟦0⟧）；undae 是⟦1⟧对沙丘区本身的称呼。另收录了少量非正式名称作为别名。

## c.b0aa5392 (Layer popovers)
EN: ⟦0⟧⟦1⟧(⟦2⟧) and⟦3⟧, merged, compiled by A. Gunn
ZH: ⟦0⟧⟦1⟧（⟦2⟧）和⟦3⟧，合并，由 A. Gunn 编制

## c.7c3bca61 (Layer popovers)
EN: ⟦0⟧and⟦1⟧merged into one polygon layer; invalid geometries repaired; coordinates rounded to 1e-⟦#0⟧°.
ZH: ⟦0⟧和⟦1⟧合并为单一多边形图层；修复了无效几何；坐标四舍五入至 1e-⟦#0⟧°。

## c.bf621ba4 (Layer popovers)
EN: ⟦0⟧⟦#0⟧°, one Mars year (6th simulated year, ⟦#1⟧ sols)
ZH: ⟦0⟧⟦#0⟧°，一个火星年（模拟第 6 年，共 ⟦#1⟧ 个火星日）

## c.7fc88287 (Layer popovers)
EN: Updates with the grain-diameter ⟦0⟧ control.
ZH: 随粒径⟦0⟧控件更新。

## c.2a037b62 (Layer popovers)
EN: Independent of the grain diameter: not affected by the ⟦0⟧ control.
ZH: 与粒径无关：不受⟦0⟧控件影响。

## c.9ebf3d9d (Layer popovers)
EN: ⟦0⟧Ames⟦1⟧output; no licence stated (⟦2⟧open data)
ZH: ⟦0⟧Ames⟦1⟧输出；未注明许可协议（⟦2⟧开放数据）

## c.eec05683 (Layer popovers)
EN: Elevation⟦0⟧of the surface relative to the Mars areoid (⟦1⟧datum), from the Mars⟦2⟧–⟦3⟧Blended⟦4⟧Global 200m v2. The colour scale saturates beyond its ends (Olympus Mons ⟦#0⟧ km, Hellas ⟦#1⟧ km).
ZH: 相对于火星大地水准面（⟦1⟧基准）的地表高程⟦0⟧，数据来自 Mars⟦2⟧–⟦3⟧混合⟦4⟧全球 200m v2。色标在两端之外饱和（奥林匹斯山 ⟦#0⟧ km，希腊平原 ⟦#1⟧ km）。

## c.1c27de48 (Layer popovers)
EN: Mars⟦0⟧–⟦1⟧Blended⟦2⟧Global 200m v2 (⟦3⟧; originators⟦4⟧,⟦5⟧,⟦6⟧; publication date ⟦#0⟧-⟦#1⟧-⟦#2⟧)
ZH: Mars⟦0⟧–⟦1⟧混合⟦2⟧全球 200m v2（⟦3⟧；原作者⟦4⟧、⟦5⟧、⟦6⟧；发布日期 ⟦#0⟧-⟦#1⟧-⟦#2⟧）

## c.e98bd889 (Layer popovers)
EN: ⟦0⟧(⟦1⟧),⟦2⟧(⟦3⟧). Derived elevation and relief tiles:⟦4⟧.
ZH: ⟦0⟧（⟦1⟧），⟦2⟧（⟦3⟧）。派生高程与地形阴影瓦片：⟦4⟧。

## c.eee562e1 (Layer popovers)
EN: Area mean over ⟦#0⟧/⟦#1⟧° (~⟦#2⟧ km) pixels of the ⟦#3⟧ m⟦0⟧, rounded to ⟦#4⟧ m; zoomed-out map views show means (≤ ⟦#5⟧ m rounding).
ZH: ⟦#0⟧/⟦#1⟧°（约 ⟦#2⟧ km）像元范围内 ⟦#3⟧ m⟦0⟧的区域平均值，四舍五入至 ⟦#4⟧ m；缩小视图下的地图显示的是平均值（舍入精度 ≤ ⟦#5⟧ m）。

## c.3704a8f0 (Layer popovers)
EN: Shaded relief of the⟦0⟧blended elevation model.
ZH: ⟦0⟧混合高程模型的阴影地形。

## c.db6c76a7 (Layer popovers)
EN: Mars⟦0⟧–⟦1⟧Blended⟦2⟧Global 200m v2 (⟦3⟧; Fergason,⟦4⟧)
ZH: Mars⟦0⟧–⟦1⟧混合⟦2⟧全球 200m v2（⟦3⟧；Fergason，⟦4⟧）

## c.2d12b94c (Layer popovers)
EN: ⟦#0⟧ m⟦0⟧, shown at up to about ⟦#1⟧ m per pixel at the equator
ZH: ⟦#0⟧ m⟦0⟧，赤道处显示精度最高可达约每像素 ⟦#1⟧ m

## c.2e1c0f7e (Layer popovers)
EN: ⟦0⟧basemap of Mars: shaded relief and colour with feature names.
ZH: ⟦0⟧火星底图：阴影地形与彩色地貌名称标注。

## c.644998c7 (Layer popovers)
EN: ⟦0⟧/⟦1⟧; data⟦2⟧(⟦3⟧),⟦4⟧(⟦5⟧),⟦6⟧
ZH: ⟦0⟧/⟦1⟧；数据⟦2⟧（⟦3⟧），⟦4⟧（⟦5⟧），⟦6⟧

## c.8540dd31 (Layer popovers)
EN: ⟦0⟧terms (see link);⟦1⟧and⟦2⟧data in the public domain
ZH: ⟦0⟧条款（见链接）；⟦1⟧和⟦2⟧数据属公有领域

## c.ee2e3cf3 (Layer popovers)
EN: Global greyscale mosaic of Context Camera (⟦0⟧) images of⟦1⟧.
ZH: ⟦1⟧的全球灰阶 Context Camera（⟦0⟧）影像拼接图。

## c.dcf459d8 (Layer popovers)
EN: ⟦0⟧⟦1⟧(The⟦2⟧, Caltech;⟦3⟧),⟦4⟧service⟦5⟧
ZH: ⟦0⟧⟦1⟧（⟦2⟧，加州理工学院；⟦3⟧），⟦4⟧服务⟦5⟧

## c.4bee0614 (Layer popovers)
EN: About ⟦#0⟧ m per pixel
ZH: 每像素约 ⟦#0⟧ m

## c.297b433e (Layer popovers)
EN: Free use for all purposes, credit NASA/JPL/MSSS/The⟦0⟧;⟦1⟧service under the⟦2⟧/ Terms of Use
ZH: 可自由用于任何用途，须注明 NASA/JPL/MSSS/⟦0⟧；⟦1⟧服务依据⟦2⟧/使用条款提供

## c.2624acaf (Layer popovers)
EN: ⟦0⟧images of⟦1⟧, where⟦2⟧has imaged (a small part of the surface); elsewhere the map is dark.
ZH: ⟦1⟧的⟦0⟧影像，仅覆盖⟦2⟧已成像的区域（地表的一小部分）；其余区域地图显示为深色。

## c.95f469ee (Layer popovers)
EN: ⟦0⟧(⟦1⟧/⟦2⟧/⟦3⟧),⟦4⟧service⟦5⟧
ZH: ⟦0⟧（⟦1⟧/⟦2⟧/⟦3⟧），⟦4⟧服务⟦5⟧

## c.56370639 (Layer popovers)
EN: Down to about ⟦#0⟧ cm per pixel; sparse coverage
ZH: 可至约每像素 ⟦#0⟧ cm；覆盖范围稀疏

## c.c549e23b (Layer popovers)
EN: Coverage
ZH: 覆盖范围

## c.81e9bb01 (Layer popovers)
EN: ⟦0⟧footprints between about ⟦#0⟧° S and ⟦#1⟧° N; no imagery at higher latitudes in this mosaic (⟦1⟧).
ZH: ⟦0⟧覆盖范围在南纬 ⟦#0⟧° 至北纬 ⟦#1⟧° 之间；该拼接图在更高纬度无影像（⟦1⟧）。

## c.4a0cf606 (Layer popovers)
EN: Public domain (⟦0⟧images);⟦1⟧service under the⟦2⟧/ Terms of Use
ZH: 公有领域（⟦0⟧影像）；⟦1⟧服务依据⟦2⟧／使用条款提供

## c.e7debcd9 (Layer popovers)
EN: Colorized global mosaic of Viking Orbiter images.
ZH: 维京号轨道卫星影像的彩色影像全球拼接图。

## c.8ec61eb6 (Layer popovers)
EN: ⟦0⟧Colorized Global Mosaic (⟦1⟧/⟦2⟧/⟦3⟧),⟦4⟧service⟦5⟧
ZH: ⟦0⟧彩色全球拼接图（⟦1⟧/⟦2⟧/⟦3⟧），⟦4⟧服务⟦5⟧

## c.773da507 (Layer popovers)
EN: About ⟦#0⟧ m per pixel (⟦#1⟧/⟦#2⟧°)
ZH: 约每像素 ⟦#0⟧ m（⟦#1⟧/⟦#2⟧°）

## c.a5d6c844 (Layer popovers)
EN: Public domain (⟦0⟧);⟦1⟧service under the⟦2⟧/ Terms of Use
ZH: 公有领域（⟦0⟧）；⟦1⟧服务依据⟦2⟧／使用条款提供

## c.d62fb31c (Layer popovers)
EN: Colour-coded shaded relief of the⟦0⟧blended elevation model.
ZH: ⟦0⟧融合高程模型的彩色编码阴影地形。

## c.7ab4f976 (Layer popovers)
EN: ⟦0⟧colorized shaded relief (⟦1⟧, from the Mars⟦2⟧–⟦3⟧Blended⟦4⟧Global 200m v2),⟦5⟧service MColorDEM
ZH: ⟦0⟧彩色阴影地形（⟦1⟧，源自 Mars⟦2⟧–⟦3⟧融合⟦4⟧全球 200 m v2 数据），⟦5⟧服务 MColorDEM

## c.6022c5f5 (Layer popovers)
EN: ⟦#0⟧ m⟦0⟧, shown at up to about ⟦#1⟧ m per pixel
ZH: ⟦#0⟧ m⟦0⟧，最高可至约每像素 ⟦#1⟧ m 显示

## c.5dbbfa26 (Layer popovers)
EN: Public domain (⟦0⟧); cite the⟦1⟧(Fergason,⟦2⟧);⟦3⟧service under the⟦4⟧/ Terms of Use
ZH: 公有领域（⟦0⟧）；引用⟦1⟧（Fergason，⟦2⟧）；⟦3⟧服务依据⟦4⟧／使用条款提供

# About

## c.63c884fd (About)
EN: Click any cell to see its wind rose over the Mars year of the wind dataset, the sand-flux rose at the selected grain diameter, dune-orientation modes and all wind-regime parameters.
ZH: 点击任意网格单元，即可查看其在该风场数据集所对应火星年内的风玫瑰图、所选粒径下的输沙玫瑰图、沙丘朝向模式及全部风况参数。

## c.5d754cff (About)
EN: <strong>Elevation and shaded relief</strong>:⟦0⟧–⟦1⟧blended⟦2⟧, ⟦#0⟧ m, v2 (Fergason,⟦3⟧,⟦4⟧); licence:⟦5⟧(⟦6⟧) and⟦7⟧(⟦8⟧). Derived elevation and relief tiles:⟦9⟧.
ZH: <strong>高程与阴影地形</strong>：⟦0⟧–⟦1⟧融合⟦2⟧，⟦#0⟧ m，v2（Fergason，⟦3⟧，⟦4⟧）；许可协议：⟦5⟧（⟦6⟧）与⟦7⟧（⟦8⟧）。派生的高程与地形阴影瓦片：⟦9⟧。

## c.530a3afd (About)
EN: <strong>Dune-field names</strong>: Dune fields are named after the IAU-approved names of the features they lie in, from the <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">Gazetteer of Planetary Nomenclature</a> (⟦0⟧); undae are⟦1⟧names for dune fields themselves. A few informal names are included as aliases.
ZH: <strong>沙丘区名称</strong>：沙丘区以其所在地貌单元经国际天文学联合会（IAU）批准的名称命名，来源为 <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">行星命名地名辞典</a>（⟦0⟧）；undae 是⟦1⟧对沙丘区本身的命名用语。另收录少量非正式名称作为别名。

## c.50055b7f (About)
EN: Mars⟦0⟧(method)
ZH: Mars⟦0⟧（方法）

## c.89d524a5 (About)
EN: Method (wind-regime and dune-orientation fields): ⟦0⟧
ZH: 方法（风况与沙丘朝向场）：⟦0⟧

## c.72a649e1 (About)
EN: Mars wind series, sand-flux fields and flux divergence computed for the Mars⟦0⟧from the⟦1⟧lowest-level winds with the transport law of⟦2⟧and the methods outlined in⟦3⟧.
ZH: 火星风场序列、输沙通量场与输沙通量散度，基于⟦1⟧最低层风速、采用⟦2⟧的输沙定律并按⟦3⟧所述方法，针对 Mars⟦0⟧计算得出。

## c.a9bc77d4 (About)
EN: ⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧
ZH: ⟦0⟧Mars⟦1⟧，测试版 ⟦#0⟧

## c.c020e5a4 (About)
EN: Model physics: ⟦0⟧
ZH: 模型物理过程：⟦0⟧

## c.8311cdd3 (About)
EN: Sediment transport law
ZH: 输沙定律

## c.ba79a508 (About)
EN: Mars dune map (⟦0⟧⟦1⟧and⟦2⟧, merged)
ZH: 火星沙丘分布图（⟦0⟧⟦1⟧与⟦2⟧合并）

## c.4f0fafb8 (About)
EN: Topography (⟦0⟧blended⟦1⟧)
ZH: 地形（⟦0⟧融合⟦1⟧）

## c.900a3648 (About)
EN: Basemap credits are shown in the map attribution.
ZH: 底图版权信息见地图署名栏。

# Cell panel

## c.4a5374ef (Cell panel)
EN: Grain diameter ⟦0⟧: <strong>⟦1⟧</strong>
ZH: 粒径⟦0⟧：<strong>⟦1⟧</strong>

## c.85102ae2 (Cell panel)
EN: Threshold ⟦0⟧, median over the hours: <strong>⟦1⟧</strong>
ZH: 临界值⟦0⟧，各时间段中位数：<strong>⟦1⟧</strong>

## c.8d0e4128 (Cell panel)
EN: ⟦0⟧, ⟦#0⟧–⟦#1⟧ % of the hours: ⟦1⟧
ZH: ⟦0⟧，占全部时间段的 ⟦#0⟧–⟦#1⟧ %：⟦1⟧

## c.51b43106 (Cell panel)
EN: Lowest-level wind at threshold (median height ⟦#0⟧ m): ≈ ⟦0⟧
ZH: 临界值处的最低层风速（中位高度 ⟦#0⟧ m）：≈ ⟦0⟧

## c.de02b143 (Cell panel)
EN: Hours above threshold: ⟦0⟧
ZH: 超过临界值的时间段数：⟦0⟧

## c.bd1de494 (Cell panel)
EN: Frequency of the hourly lowest-level winds by the direction they blow from, ⟦#0⟧ sectors, stacked by speed class; one Mars year; sums to ⟦#1⟧ %.
ZH: 逐小时最低层风速按来向统计的频率，共 ⟦#0⟧ 个扇区，按风速等级叠加；为期一个火星年；合计为 ⟦#1⟧ %。

## c.55fb0a53 (Cell panel)
EN: m/s, lowest model level
ZH: m/s，最低模型层

## c.54424ba2 (Cell panel)
EN: Direction the wind blows FROM (meteorological), ⟦#0⟧ sectors of ⟦#1⟧°; radius = % of the ⟦#2⟧ hourly samples (sums to ⟦#3⟧ %).⟦0⟧lowest-level wind (height in this cell ⟦#4⟧–⟦#5⟧ m), one Mars year (6th simulated year, ⟦#6⟧ sols).
ZH: 风的来向（气象学定义），共 ⟦#0⟧ 个扇区，每个 ⟦#1⟧°；半径 = 占 ⟦#2⟧ 个逐小时样本的百分比（合计为 ⟦#3⟧ %）。⟦0⟧最低层风速（该网格单元高度为 ⟦#4⟧–⟦#5⟧ m），为期一个火星年（第 6 个模拟年，⟦#6⟧ 个火星日）。

## c.705e31ee (Cell panel)
EN: Time-averaged flat-bed sand flux by the direction sand moves toward, ⟦#0⟧ sectors of ⟦#1⟧ degrees, stacked by excess shear u*/u*,th of each hour, percent of total flux, at grain diameter d = ⟦#2⟧ µm.
ZH: 按沙的去向统计的时间平均平坦床面输沙通量，共 ⟦#0⟧ 个扇区，每个 ⟦#1⟧ 度，按各小时超临界剪切量 u*/u*,th 叠加，为总输沙通量的百分比，粒径 d = ⟦#2⟧ µm。

## c.94bd0d74 (Cell panel)
EN: <span class="cap-lead"><strong>Flat bed</strong>: ⟦0⟧ = ⟦1⟧</span> Direction sand moves TOWARD; ⟦#0⟧ sectors of ⟦#1⟧°. Radius = % of the total flux in each sector (sums to ⟦#2⟧ %). Time-averaged saturated flat-bed flux (q from ⟦2⟧), Σ<sub>hours</sub> q / N over the ⟦#3⟧ hourly samples, with ⟦3⟧ of each hour from the lowest-level wind at its height z (smooth-wall mixing-length profile,⟦4⟧eq. ⟦#4⟧) and the threshold ⟦5⟧ of each hour from ⟦6⟧ and that hour's air density and temperature. Colours split each sector by the excess shear ⟦7⟧ of the hours carrying the flux (only ⟦8⟧ transports sand).⟦9⟧,⟦10⟧,⟦11⟧,⟦12⟧and the arrows are the map fields at this grain diameter; a direction is hidden where the flux defining it is zero.
ZH: <span class="cap-lead"><strong>平坦床面</strong>：⟦0⟧ = ⟦1⟧</span> 沙去往的方向；⟦#0⟧ 个扇区，每个 ⟦#1⟧°。半径为该扇区输沙量占总输沙量的百分比（总和为 ⟦#2⟧ %）。时间平均饱和平坦床面输沙通量（q 来自⟦2⟧），即 ⟦#3⟧ 个逐小时样本上的 Σ<sub>hours</sub> q / N，其中每小时的⟦3⟧取自其高度 z 处的最底层风（光滑壁面混合长度廓线，⟦4⟧式 ⟦#4⟧），每小时的临界值⟦5⟧取自⟦6⟧及该小时的空气密度和温度。颜色按搬运该输沙通量的各小时的超额剪切⟦7⟧对每个扇区进行划分（仅⟦8⟧搬运沙粒）。⟦9⟧、⟦10⟧、⟦11⟧、⟦12⟧与箭头均为该粒径下的地图字段；若定义某方向的输沙通量为零，则不显示该方向。

## c.92c30d6e (Cell panel)
EN: Modes vs grain diameter (polar: angle = direction, radius = ⟦0⟧, log scale)
ZH: 模式与粒径的关系（极坐标：角度 = 方向，半径 = ⟦0⟧，对数刻度）

# Screen-reader labels and tooltips

## c.0741b547 (Screen-reader labels and tooltips)
EN: Polar plot of dune-orientation mode bearings (angle) against median grain diameter (radius, log scale, ⟦#0⟧ µm at the centre to ⟦#1⟧ µm at the rim)
ZH: 沙丘朝向模式方位角（角度）与中值粒径（半径，对数刻度，中心为 ⟦#0⟧ µm，边缘为 ⟦#1⟧ µm）的极坐标图

# Cell panel

## c.830d966e (Cell panel)
EN: radius: d (µm, log scale)
ZH: 半径：d（µm，对数刻度）

## c.78ee9922 (Cell panel)
EN: Drift potential⟦0⟧ vs grain diameter
ZH: 输沙势⟦0⟧与粒径的关系

# Screen-reader labels and tooltips

## c.d092fe06 (Screen-reader labels and tooltips)
EN: Quantity plotted against the grain diameter
ZH: 与粒径对应绘制的量

# Cell panel

## c.28791e51 (Cell panel)
EN: Median threshold friction velocity (u*,th)
ZH: 临界摩阻风速（u*,th）中值

# Screen-reader labels and tooltips

## c.20d1128e (Screen-reader labels and tooltips)
EN: Drift potential (DP) vs grain diameter
ZH: 输沙势（DP）与粒径的关系

# Cell panel

## c.50a517f6 (Cell panel)
EN: <span class="cap-lead">At the current grain diameter: ⟦0⟧</span> Drift potential (⟦1⟧) of this cell for every grain diameter; dot and dashed line: current grain diameter.
ZH: <span class="cap-lead">当前粒径下：⟦0⟧</span> 该网格单元在各粒径下的输沙势（⟦1⟧）；圆点与虚线：当前粒径。

## c.2b98c4b5 (Cell panel)
EN: ⟦#0⟧×⟦#1⟧<sup>⟦#2⟧</sup> <span class="unit">ratio</span>
ZH: ⟦#0⟧×⟦#1⟧<sup>⟦#2⟧</sup> <span class="unit">比值</span>

## c.e89e84ed (Cell panel)
EN: Median threshold friction velocity
ZH: 临界摩阻风速中值

# Screen-reader labels and tooltips

## c.08f8c08d (Screen-reader labels and tooltips)
EN: Lowest-layer air density, median over the hours
ZH: 最底层空气密度，各小时的中值

# Cell panel

## c.aef2a8bb (Cell panel)
EN: Median air density
ZH: 空气密度中值

# Screen-reader labels and tooltips

## c.701879e8 (Screen-reader labels and tooltips)
EN: Near-surface air density, mean over the year; grain-size independent
ZH: 近地表空气密度，全年平均值；与粒径无关

# Cell panel

## c.c898e618 (Cell panel)
EN: Mean air density
ZH: 空气密度均值

# Screen-reader labels and tooltips

## c.db547236 (Screen-reader labels and tooltips)
EN: Cell mean of the MOLA–HRSC DEM
ZH: MOLA–HRSC 数字高程模型的网格单元均值

# Cell panel

## c.1059d6e4 (Cell panel)
EN: Elevation
ZH: 高程

# Screen-reader labels and tooltips

## c.dcbbdd2f (Screen-reader labels and tooltips)
EN: Yes: the cell overlaps at least one dune polygon of the merged dune map (USGS Mars Global Digital Dune Database and Fenton ⟦#0⟧); value in brackets: dune area fraction of the cell
ZH: 是：该网格单元与合并沙丘图（USGS 火星全球数字沙丘数据库与 Fenton ⟦#0⟧）中至少一个沙丘多边形重叠；括号中数值为该网格单元的沙丘面积比例

# Cell panel

## c.f2400fd6 (Cell panel)
EN: yes <span class="unit">(⟦#0⟧ %)</span>
ZH: 是 <span class="unit">（⟦#0⟧ %）</span>

# Screen-reader labels and tooltips

## c.52fc6f74 (Screen-reader labels and tooltips)
EN: Hourly wind and air series, all fields vs grain size, flux roses and metadata in one NetCDF-⟦#0⟧ file (CF-⟦#1⟧)
ZH: 逐小时风场与大气序列、各字段与粒径的关系、输沙玫瑰图及元数据，整合于单个 NetCDF-⟦#0⟧ 文件中（CF-⟦#1⟧）

## c.d4fc85c9 (Screen-reader labels and tooltips)
EN: wind_series.csv, fields_by_grain_size.csv, flux_rose.csv, rose_16_sectors.csv (⟦#0⟧ sectors, degrees), metadata.json and README.txt
ZH: wind_series.csv、fields_by_grain_size.csv、flux_rose.csv、rose_16_sectors.csv（⟦#0⟧ 个扇区，角度制）、metadata.json 与 README.txt

# Cell panel

## c.da36bb60 (Cell panel)
EN: The atlas reads public⟦0⟧(v3) stores on <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a>, which anyone can read, e.g. with Python. The map fields of⟦1⟧⟦#0⟧° are one store per variable, each holding the field against the median grain diameter (⟦2⟧, ⟦#1⟧ values) and latitude ⟦3⟧ and longitude ⟦4⟧ (cell centres in degrees; x from ⟦#2⟧ to ⟦#3⟧°, east positive). Level ⟦5⟧ of each store is the full-resolution grid; levels ⟦#4⟧, ⟦#5⟧, … are coarser copies for the map.
ZH: 本图集读取 <a href="https://data.geomorphlab.org/" target="_blank" rel="noopener">data.geomorphlab.org</a> 上公开的⟦0⟧（v3）存储，任何人均可读取，例如使用 Python。⟦1⟧⟦#0⟧° 的地图字段每个变量各占一个存储，各自保存该字段相对于中值粒径（⟦2⟧，共 ⟦#1⟧ 个取值）、纬度⟦3⟧与经度⟦4⟧（网格单元中心，单位为度；x 从 ⟦#2⟧ 到 ⟦#3⟧°，东为正）的数据。每个存储的⟦5⟧级为全分辨率网格；⟦#4⟧、⟦#5⟧ 等级为用于地图显示的更粗分辨率副本。

## c.d732de78 (Cell panel)
EN: Variables (replace ⟦0⟧ in the⟦1⟧): ⟦2⟧, ⟦3⟧, ⟦4⟧, ⟦5⟧, ⟦6⟧, ⟦7⟧, ⟦8⟧, ⟦9⟧, ⟦10⟧, ⟦11⟧, ⟦12⟧, ⟦13⟧, ⟦14⟧, ⟦15⟧, ⟦16⟧, ⟦17⟧, ⟦18⟧, ⟦19⟧, ⟦20⟧, ⟦21⟧, ⟦22⟧, ⟦23⟧, ⟦24⟧, ⟦25⟧, ⟦26⟧. Per-cell data of the cell panel: ⟦27⟧ (layout: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦28⟧</a>).
ZH: 变量（将⟦1⟧中的⟦0⟧替换）：⟦2⟧、⟦3⟧、⟦4⟧、⟦5⟧、⟦6⟧、⟦7⟧、⟦8⟧、⟦9⟧、⟦10⟧、⟦11⟧、⟦12⟧、⟦13⟧、⟦14⟧、⟦15⟧、⟦16⟧、⟦17⟧、⟦18⟧、⟦19⟧、⟦20⟧、⟦21⟧、⟦22⟧、⟦23⟧、⟦24⟧、⟦25⟧、⟦26⟧。网格单元面板的逐单元数据：⟦27⟧（布局参见：<a href="https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md" target="_blank" rel="noopener">⟦28⟧</a>）。

## c.930d7584 (Cell panel)
EN: Licence of these map fields:⟦0⟧Ames⟦1⟧output; no licence stated (⟦2⟧open data). Licences of every store: <a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦3⟧</a>. Please cite the sources listed under Download &amp; cite.
ZH: 这些地图字段的许可：⟦0⟧Ames⟦1⟧输出；未声明许可（⟦2⟧开放数据）。各存储的许可见：<a href="https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md" target="_blank" rel="noopener">⟦3⟧</a>。请引用“下载与引用”下列出的数据来源。

# Other

## c.a77cf12e (Other)
EN: Switch to Earth
ZH: 切换到地球

# Tool panels

## c.e638d1ea (Tool panels)
EN: The link restores the position, zoom, grain diameter, basemap, active layers and the selected cell.
ZH: 该链接可恢复位置、缩放级别、粒径、底图、当前图层及所选网格单元。

# Exported images

## c.dae8c832 (Exported images)
EN: north up at view centre
ZH: 视图中心处正北朝上

## c.1aa05d8b (Exported images)
EN: Scale bar omitted: the scale varies strongly across this view
ZH: 未显示比例尺：该视图范围内比例尺差异过大

## c.28660749 (Exported images)
EN: Dune Atlas · map.geomorphlab.org
ZH: Dune Atlas · map.geomorphlab.org

## c.fa0a24f0 (Exported images)
EN: Globe (perspective view)
ZH: 地球仪（透视视图）

## c.e4bb6ec6 (Exported images)
EN: centre
ZH: 中心

## c.df92e232 (Exported images)
EN: zoom
ZH: 缩放级别

## c.83822b4f (Exported images)
EN: Exported {date} from {site}.
ZH: 导出于 {date}，来自 {site}。

## c.776a3af5 (Exported images)
EN: Sand flux rose
ZH: 输沙玫瑰图

# Search and messages

## c.709b1f1a (Search and messages)
EN: Search coordinates
ZH: 搜索坐标

## c.8ec38caf (Search and messages)
EN: Search places or coordinates
ZH: 搜索地点或坐标

## c.d66567e4 (Search and messages)
EN: Cannot read:
ZH: 无法读取：

## c.11705e3e (Search and messages)
EN: No place or coordinates match.
ZH: 未找到匹配的地点或坐标。

# Other

## c.09abd476 (Other)
EN: Download a region
ZH: 下载区域数据

# Search and messages

## c.ab8fe15e (Search and messages)
EN: All cells of the selected wind dataset in a latitude-longitude box, in one NetCDF file (CF-⟦#0⟧) with a README.
ZH: 所选风场数据集中位于某经纬度范围内的所有网格单元，整合为一个带有 README 的 NetCDF 文件（CF-⟦#0⟧）。

## c.9cbd6922 (Search and messages)
EN: Draw on map
ZH: 在地图上绘制

## c.9e7eb071 (Search and messages)
EN: Drag on the map to draw the box; Esc cancels.
ZH: 在地图上拖动以绘制方框；按 Esc 取消。

## c.675e4fa4 (Search and messages)
EN: North
ZH: 北

## c.b3e29f1a (Search and messages)
EN: South
ZH: 南

## c.6b1595ce (Search and messages)
EN: West
ZH: 西

## c.6733095c (Search and messages)
EN: East
ZH: 东

## c.fd7f93f9 (Search and messages)
EN: Parameters
ZH: 参数

## c.0bc7157e (Search and messages)
EN: Sand-flux fields
ZH: 输沙通量场

## c.13254bc4 (Search and messages)
EN: all
ZH: 全部

## c.ada7afdb (Search and messages)
EN: none
ZH: 无

## c.6c5af3c3 (Search and messages)
EN: Dune flag
ZH: 沙丘标记

## c.c718d127 (Search and messages)
EN: Download (.zip)
ZH: 下载（.zip）

## c.35afca3b (Search and messages)
EN: Cancel
ZH: 取消

## c.9c36b560 (Search and messages)
EN: Fetching cells
ZH: 正在获取网格单元

## c.77b19672 (Search and messages)
EN: Type the bounds or draw a box on the map.
ZH: 输入边界，或在地图上绘制方框。

## c.144cc106 (Search and messages)
EN: Loading the grid of the wind dataset…
ZH: 正在加载风场数据集的网格……

## c.971fcc50 (Search and messages)
EN: The grid of the wind dataset could not be loaded.
ZH: 无法加载风场数据集的网格。

## c.bb7426bc (Search and messages)
EN: Wind histogram (hours per speed and direction bin)
ZH: 风况直方图（按风速与风向区间统计的小时数）

## c.cc7fcd2b (Search and messages)
EN: Also called
ZH: 又称

## c.c9ae189c (Search and messages)
EN: Includes
ZH: 包括

## c.3b5a9bd1 (Search and messages)
EN: About these names
ZH: 关于这些名称

## c.a2c773d1 (Search and messages)
EN: Sources
ZH: 来源

## c.2062dc6d (Search and messages)
EN: Countries
ZH: 国家

## c.1bb7f195 (Search and messages)
EN: Feature names
ZH: 地物名称

## c.e45d16ba (Search and messages)
EN: Drawing the map at export resolution (loading tiles; this can take up to a minute)…
ZH: 正在以导出分辨率绘制地图（加载瓦片，最长可能需要一分钟）……

## c.eb69782d (Search and messages)
EN: Adding colour bars, keys and sources…
ZH: 正在添加色标、图例与数据来源……

## c.3c511e52 (Search and messages)
EN: Encoding the PNG…
ZH: 正在编码 PNG……

# Tool panels

## c.a19a24ae (Tool panels)
EN: Include basemap
ZH: 包含底图

## c.81360998 (Tool panels)
EN: Export PNG
ZH: 导出 PNG

## c.5d7718d4 (Tool panels)
EN: Transparent background (default white)
ZH: 透明背景（默认白色）

## c.fb00fe74 (Tool panels)
EN: PNG of the current view, ⟦#0⟧–⟦#1⟧ pixels wide, without the panels, on a white background unless Transparent background is ticked. Colour bars, legends, scale and data sources are added below the map.
ZH: 当前视图的 PNG 图像，宽度为 ⟦#0⟧–⟦#1⟧ 像素，不含面板；除非勾选“透明背景”，否则背景为白色。色标、图例、比例尺与数据来源将添加在地图下方。

## c.c20ad87a (Tool panels)
EN: Saved:
ZH: 已保存：

## c.513b2f5e (Tool panels)
EN: Download started:
ZH: 下载已开始：

## c.aceadefc (Tool panels)
EN: PNG
ZH: PNG

## c.2a21a5c1 (Tool panels)
EN: SVG
ZH: SVG

## c.be3c479f (Tool panels)
EN: Transparent background
ZH: 透明背景

# Search and messages

## c.8092ebfc (Search and messages)
EN: The example cell could not be loaded. Click any land cell on the map to open its panel.
ZH: 无法加载示例网格单元。请点击地图上任意陆地网格单元以打开其面板。

## c.0489b765 (Search and messages)
EN: Loading map…
ZH: 正在加载地图……

# Exported images

## c.78a767a8 (Exported images)
EN: at view centre
ZH: 位于视图中心

## c.eb82bb19 (Exported images)
EN: Mars Dune Atlas
ZH: Mars Dune Atlas

## c.70583d0e (Exported images)
EN: Dunes only: wind-derived layers shown in cells with dunes.
ZH: 仅沙丘：风场导出图层仅在有沙丘的网格单元中显示。

# Search and messages

## c.b72a8db3 (Search and messages)
EN: The example cell could not be loaded. Click any cell on the map to open its panel.
ZH: 无法加载示例网格单元。请点击地图上任意网格单元以打开其面板。

# Layer popovers

## c.cb7f6eba (Layer popovers)
EN: ⟦0⟧polygons: public domain (U.S. Geological Survey);⟦1⟧dune fields:⟦2⟧
ZH: ⟦0⟧多边形：公有领域（美国地质调查局）；⟦1⟧沙丘区：⟦2⟧

# About

## c.2905fdb9 (About)
EN: <strong>Dune map</strong>:⟦0⟧⟦1⟧(⟦2⟧;⟦3⟧) plus the small dune fields of Fenton (⟦#0⟧, Icarus ⟦#1⟧, ⟦#2⟧), merged into ⟦#3⟧ dune-field polygons (Mars ⟦#4⟧ sphere);⟦4⟧polygons: public domain (U.S. Geological Survey);⟦5⟧dune fields:⟦6⟧.
ZH: <strong>沙丘分布图</strong>：⟦0⟧⟦1⟧（⟦2⟧；⟦3⟧）加上 Fenton（⟦#0⟧，Icarus ⟦#1⟧，⟦#2⟧）所测绘的小型沙丘区，合并为 ⟦#3⟧ 个沙丘区多边形（Mars ⟦#4⟧ 球体）；⟦4⟧多边形：公有领域（美国地质调查局）；⟦5⟧沙丘区：⟦6⟧。

# Other

## c.15ee00d5 (Other)
EN: Centre map on this cell
ZH: 将地图居中到该网格单元

# Cell panel

## c.3f2cdfbd (Cell panel)
EN: αE (elongation direction): ⟦#0⟧° (⟦#1⟧)
ZH: αE（伸长方向）：⟦#0⟧°（⟦#1⟧）

## c.b36b7be7 (Cell panel)
EN: αT (transverse migration direction): ⟦#0⟧° (⟦#1⟧)
ZH: αT（横向迁移方向）：⟦#0⟧°（⟦#1⟧）

## c.7c7e35d8 (Cell panel)
EN: RDD (resultant drift direction): ⟦#0⟧° (⟦#1⟧)
ZH: RDD（合成输沙方向）：⟦#0⟧°（⟦#1⟧）

# About

## c.9192f9b0 (About)
EN: <strong>Winds (⟦0⟧v2.0 reanalysis, Mars Year ⟦#0⟧)</strong>: lowest-level winds, temperature and surface pressure, one sample every two Mars hours, of the Mars Analysis Correction Data Assimilation (⟦1⟧) v2.0 reanalysis (⟦2⟧,⟦3⟧Centre for Environmental Data Analysis; read from the analysis-ready⟦4⟧copy), Mars Year ⟦#1⟧, on its native ⟦#2⟧° grid (⟦#3⟧ × ⟦#4⟧ cells, about ⟦#5⟧ km across at the equator; the first column is centred on ⟦#6⟧°). The winds are those of the lowest model level (σ = ⟦#7⟧); air density ρ = p/(R T) with p = σ p<sub>s</sub>, the height of that level z = (R T/g) ln(⟦#8⟧/σ), and the friction velocity⟦5⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#9⟧, eq. ⟦#10⟧) under constant stress at that height (no roughness length); that level is ⟦#11⟧–⟦#12⟧ m above the surface (⟦6⟧⟦#13⟧–⟦#14⟧ m). In Mars Year ⟦#15⟧ the first ⟦#16⟧ samples (Ls ⟦#17⟧–⟦#18⟧°) assimilate Mars Odyssey⟦7⟧column dust, the others⟦8⟧⟦9⟧temperature and dust profiles. Data, documentation and file browser: <a href="https://catalogue.ceda.ac.uk/uuid/cd037a9ea387438fabf4d674dbe53088/" target="_blank" rel="noopener noreferrer">⟦10⟧v2.0 in the⟦11⟧Archive</a>; the analysis-ready copy read by the atlas: <a href="https://huggingface.co/datasets/ananyo01/ARCO-MACDA" target="_blank" rel="noopener noreferrer">⟦12⟧</a>. Contains public sector information licensed under the Open Government Licence v3.0 (⟦13⟧v2.0,⟦14⟧Centre for Environmental Data Analysis).
ZH: <strong>风场（⟦0⟧v2.0 再分析数据集，第 ⟦#0⟧ 个火星年）</strong>：Mars Analysis Correction Data Assimilation（⟦1⟧）v2.0 再分析数据集（⟦2⟧，⟦3⟧Centre for Environmental Data Analysis；读取自可直接分析的⟦4⟧副本）第 ⟦#1⟧ 个火星年的最低层风、温度与地面气压，每两个火星小时一个样本，位于其原生 ⟦#2⟧° 网格上（⟦#3⟧ × ⟦#4⟧ 个网格单元，在赤道处约 ⟦#5⟧ km 宽；第一列的中心位于 ⟦#6⟧°）。风速取模型最低层（σ = ⟦#7⟧）；空气密度 ρ = p/(R T)，其中 p = σ p<sub>s</sub>，该层高度 z = (R T/g) ln(⟦#8⟧/σ)，摩阻风速⟦5⟧由 Pähtz 与 Durán（⟦#9⟧，式 ⟦#10⟧）在该高度恒定应力条件下的光滑壁面混合长廓线求得（不含空气动力学粗糙度）；该层位于地表以上 ⟦#11⟧–⟦#12⟧ m（⟦6⟧⟦#13⟧–⟦#14⟧ m）。第 ⟦#15⟧ 个火星年的前 ⟦#16⟧ 个样本（Ls ⟦#17⟧–⟦#18⟧°）同化 Mars Odyssey⟦7⟧柱尘量，其余样本同化⟦8⟧⟦9⟧温度和尘埃廓线。数据、文档与文件浏览：<a href="https://catalogue.ceda.ac.uk/uuid/cd037a9ea387438fabf4d674dbe53088/" target="_blank" rel="noopener noreferrer">⟦10⟧v2.0（⟦11⟧Archive）</a>；本图集读取的可直接分析副本：<a href="https://huggingface.co/datasets/ananyo01/ARCO-MACDA" target="_blank" rel="noopener noreferrer">⟦12⟧</a>。Contains public sector information licensed under the Open Government Licence v3.0 (⟦13⟧v2.0,⟦14⟧Centre for Environmental Data Analysis).

## c.912ef7dd (About)
EN: <strong>Saturated flux divergence</strong> ⟦0⟧: divergence of the resultant drift potential vector (magnitude⟦1⟧, direction⟦2⟧) on the Mars sphere (R = ⟦#0⟧ km), following⟦3⟧, Methods⟦4⟧, with central differences on the grid of the wind dataset (⟦#1⟧° or ⟦#2⟧° × ⟦#3⟧° or ⟦#4⟧°). Negative values (convergence) imply deposition.
ZH: <strong>饱和输沙通量散度</strong> ⟦0⟧：合成输沙势矢量（大小⟦1⟧，方向⟦2⟧）在火星球面（R = ⟦#0⟧ km）上的散度，按⟦3⟧方法编号⟦4⟧，在风场数据集网格（⟦#1⟧° 或 ⟦#2⟧°×⟦#3⟧° 或 ⟦#4⟧°）上以中心差分计算。负值（汇）意味着堆积。

## c.c682ba25 (About)
EN: <strong>⟦0⟧⟦#0⟧° × ⟦#1⟧°</strong>: ⟦1⟧. Licence: ⟦2⟧.
ZH: <strong>⟦0⟧⟦#0⟧°×⟦#1⟧°</strong>：⟦1⟧。许可协议：⟦2⟧。

## c.48251db8 (About)
EN: Web interface (explore the model output): ⟦0⟧
ZH: 网页界面（浏览模型输出）：⟦0⟧

## c.251cd18d (About)
EN: ⟦0⟧v1.0 reanalysis (Mars Year ⟦#0⟧)
ZH: ⟦0⟧v1.0 再分析数据集（第 ⟦#0⟧ 个火星年）

## c.19395603 (About)
EN: Data (analysis-ready copy read by the atlas): ⟦0⟧
ZH: 数据（本图集读取的可直接分析副本）：⟦0⟧

## c.8227d6a0 (About)
EN: ⟦0⟧v2.0 reanalysis (Mars Year ⟦#0⟧)
ZH: ⟦0⟧v2.0 再分析数据集（第 ⟦#0⟧ 个火星年）

## c.db5eb4dc (About)
EN: Contains public sector information licensed under the Open Government Licence v3.0 (⟦0⟧v2.0,⟦1⟧Centre for Environmental Data Analysis).
ZH: Contains public sector information licensed under the Open Government Licence v3.0 (⟦0⟧v2.0,⟦1⟧Centre for Environmental Data Analysis).

## c.b5eabe06 (About)
EN: <strong>Transport law and wind profile</strong>: Earth uses the transport law of⟦0⟧, with⟦1⟧from the ⟦#0⟧ m wind and a roughness length of ⟦#1⟧ mm; Mars uses the transport law of⟦2⟧, with⟦3⟧from the wind at the lowest level of the wind dataset (its height above the surface differs between datasets) and a smooth-wall profile without a roughness length.
ZH: <strong>输沙定律与风廓线</strong>：地球图集采用⟦0⟧的输沙定律，⟦1⟧由 ⟦#0⟧ m 高度的风速及 ⟦#1⟧ mm 的空气动力学粗糙度求得；火星图集采用⟦2⟧的输沙定律，⟦3⟧由风场数据集最低层的风速求得（该层离地高度因数据集而异），并采用不含粗糙度的光滑壁面风廓线。

## c.c9e11e84 (About)
EN: <strong>Downloads</strong>: Earth cells provide a wind histogram and the fields against threshold (⟦0⟧,⟦1⟧); Mars cells provide the wind and air series and the fields against grain diameter (⟦2⟧,⟦3⟧).
ZH: <strong>下载内容</strong>：地球网格单元提供风况直方图及随临界值变化的各物理量（⟦0⟧、⟦1⟧）；火星网格单元提供风速与大气序列，以及随粒径变化的各物理量（⟦2⟧、⟦3⟧）。

# Search and messages

## c.3cfbf3ce (Search and messages)
EN: Wind and air series (u, v, T, ρ, z)
ZH: 风场与大气序列（u、v、T、ρ、z）

# Layer popovers

## c.1e0c1012 (Layer popovers)
EN: Fraction of time flat-bed friction velocity is above threshold⟦0⟧. The threshold is the cessation threshold⟦1⟧of each sample, from⟦2⟧.
ZH: 平坦床面摩阻风速超过临界值⟦0⟧的时间比例。该临界值为每个样本的⟦1⟧终止临界值，取自⟦2⟧。

## c.fb4c6ed6 (Layer popovers)
EN: Average above-threshold flat-bed friction velocity, normalised by threshold⟦0⟧. The threshold is the cessation threshold⟦1⟧of each sample, from⟦2⟧.
ZH: 超过临界值的平坦床面摩阻风速均值，按临界值⟦0⟧归一化。该临界值为每个样本的⟦1⟧终止临界值，取自⟦2⟧。

## c.b451b9c7 (Layer popovers)
EN: Fraction of bed-instability-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is the cessation threshold⟦2⟧of each sample, from⟦3⟧.
ZH: 床面失稳模式（⟦0⟧）脊线输沙通量中、发生在平坦床面摩阻风速超过临界值⟦1⟧期间的比例。⟦#0⟧ 表示脊线输沙仅发生在平坦床面低于临界值时；若无脊线输沙则无定义。该临界值为每个样本的⟦2⟧终止临界值，取自⟦3⟧。

## c.3c46d0c1 (Layer popovers)
EN: Fraction of elongation-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is the cessation threshold⟦2⟧of each sample, from⟦3⟧.
ZH: 伸长模式（⟦0⟧）脊线输沙通量中、发生在平坦床面摩阻风速超过临界值⟦1⟧期间的比例。⟦#0⟧ 表示脊线输沙仅发生在平坦床面低于临界值时；若无脊线输沙则无定义。该临界值为每个样本的⟦2⟧终止临界值，取自⟦3⟧。

## c.bbd07d73 (Layer popovers)
EN: Mean over the samples of the Mars year of the lowest-layer air density⟦0⟧of the wind dataset (one sample per Mars hour;⟦1⟧= mid pressure of the lowest layer,⟦2⟧= lowest-level temperature).
ZH: 风场数据集最底层空气密度⟦0⟧在火星年全部样本上的平均值（每个火星小时一个样本；⟦1⟧= 最底层的中间气压，⟦2⟧= 最底层温度）。

# Screen-reader labels and tooltips

## c.1803468a (Screen-reader labels and tooltips)
EN: Threshold friction velocity at this d, median over the samples of the Mars year
ZH: 该粒径下的临界摩阻风速，火星年全部样本的中值

# Concepts

## concept.earth.the-wind-datasets.title (Concepts)
EN: The wind datasets
ZH: 风场数据集

## concept.earth.the-wind-datasets.p1 (Concepts)
EN: The Earth atlas offers two hourly 10 m wind records for 1950–2024. ERA5 is ECMWF's global atmospheric reanalysis on a 0.25° grid (about 28 km). ERA5-Land re-runs ECMWF's land-surface model at 0.1° (about 9–11 km), driven by ERA5 atmospheric fields interpolated to the finer grid. Baas (2026) reports ERA5-Land 10 m wind speeds 20–30 % below those of ERA5. Gunn (2026) used ERA5-Land, and the dune map is on its grid. Neither dataset resolves winds around individual dunes or small hills.
ZH: 地球图集提供 1950–2024 年两套逐小时10米风速序列。ERA5 是 ECMWF 的全球大气再分析数据集，网格分辨率为 0.25°（约 28 km）。ERA5-Land 以 0.1°（约 9–11 km）的分辨率重新运行 ECMWF 的陆面模型，其驱动场为插值到更细网格上的 ERA5 大气场。Baas (2026) 指出，ERA5-Land 的 10 m 风速比 ERA5 低 20–30 %。Gunn (2026) 使用的是 ERA5-Land，沙丘分布图也基于其网格。两套数据集均无法分辨单个沙丘或小山丘周围的风场。

# About

## c.d62ef04b (About)
EN: <strong>Control</strong>: on Earth the slider sets one threshold friction velocity⟦0⟧for the whole record (default ⟦#0⟧ m/s); on Mars it sets the median grain diameter d (default ⟦#1⟧ µm), and the threshold is computed for each time step of the wind record from d and that step's air density and temperature.
ZH: <strong>控制量</strong>：在地球图集中，滑块设定的是适用于整个记录的单一临界摩阻风速⟦0⟧（默认值 ⟦#0⟧ m/s）；在火星图集中，滑块设定的是中值粒径 d（默认值 ⟦#1⟧ µm），临界值则根据 d 及每个时间步的空气密度和温度，对风场记录逐时间步计算。

## c.238c1534 (About)
EN: <strong>Sand-flux fields</strong>: for each time step of the wind dataset, the threshold and the saturated transport rate of⟦0⟧at the selected median grain diameter d (grain density ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), averaged over the year; drift potentials, crest fluxes and dune-orientation modes follow the methods outlined in⟦1⟧. Fluxes are volumes of packed sand (packing fraction ⟦#2⟧, pore space included) per metre width per Earth year (⟦#3⟧ days), in m²/yr, as on Earth.
ZH: <strong>输沙通量场</strong>：对风场数据集的每个时间步，按所选中值粒径 d（颗粒密度 ⟦#0⟧ kg/m³，g = ⟦#1⟧ m/s²）计算⟦0⟧的临界值与饱和输沙率，并取年平均；输沙势、脊线输沙通量与沙丘朝向模式按⟦1⟧所述方法计算。输沙通量为单位宽度、单位地球年（⟦#3⟧ 天）内堆积沙的体积（堆积体积分数 ⟦#2⟧，含孔隙空间），单位为 m²/yr，与地球上相同。

# Layer popovers

## c.2c67fa30 (Layer popovers)
EN: The Wind dataset selector switches between wind datasets (⟦0⟧, ⟦#0⟧°, ⟦#1⟧–⟦#2⟧;⟦1⟧, ⟦#3⟧°, ⟦#4⟧–⟦#5⟧).⟦2⟧, used by⟦3⟧, re-runs⟦4⟧'s land-surface model driven by⟦5⟧atmospheric fields interpolated to its ⟦#6⟧° grid (Muñoz-Sabater et al. ⟦#7⟧);⟦6⟧reports its ⟦#8⟧ m wind speeds ⟦#9⟧–⟦#10⟧ % below those of⟦7⟧. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
ZH: 风速数据集选择器用于在不同风速数据集之间切换（⟦0⟧，⟦#0⟧°，⟦#1⟧–⟦#2⟧；⟦1⟧，⟦#3⟧°，⟦#4⟧–⟦#5⟧）。⟦2⟧由⟦3⟧使用，依据⟦5⟧插值到其⟦#6⟧°网格的大气场（Muñoz-Sabater et al. ⟦#7⟧），重新运行⟦4⟧的陆面模型；⟦6⟧报告其⟦#8⟧米风速比⟦7⟧低⟦#9⟧–⟦#10⟧%。风速和输沙通量图层以及单元格面板会随所选数据集变化；沙丘区掩膜、干旱指数和植被图层对所有数据集均相同。

## c.e5c7b256 (Layer popovers)
EN: The default, ⟦#0⟧ m/s, is the value used for the global analysis of⟦0⟧, one value for the whole globe, not calibrated for any site. Values between ⟦#1⟧ and ⟦#2⟧ m/s are typical; for loose, dry sand the threshold depends mainly on grain size and density.
ZH: 默认值 ⟦#0⟧ m/s 是⟦0⟧全球分析所采用的值，即全球统一使用的一个值，并未针对任何地点进行率定。介于 ⟦#1⟧ 与 ⟦#2⟧ m/s 之间的值较为典型；对于松散、干燥的沙，临界值主要取决于粒径和密度。

## c.00a48377 (Layer popovers)
EN: The ⟦#0⟧° dune cells of the dune map grouped into ⟦#1⟧ dune fields of touching cells (sharing an edge or a corner); polygon edges follow the grid-cell boundaries. Area is the sum of spherical cell areas.
ZH: 沙丘图中的 ⟦#0⟧° 沙丘网格单元按相邻关系（共享边或共享角）归并为 ⟦#1⟧ 个沙丘区；多边形边界与网格单元边界一致。面积为各球面网格单元面积之和。

## c.bf48091d (Layer popovers)
EN: Net along-crest over net across-crest sand flux for crests of the bed-instability orientation,⟦0⟧. Along-crest transport tends to keep crests straight, while across-crest transport, which drives migration, tends to make them sinuous (⟦1⟧), so higher values suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures how far the migration direction departs from the direction of the sand flux on the dune, which makes dunes such as barchans asymmetric (⟦2⟧). In the sand-covered-bed examples of⟦3⟧it is about ⟦#0⟧ for transverse, ⟦#1⟧ for oblique and ⟦#2⟧ for longitudinal dunes. The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#3⟧).
ZH: 床面失稳模式⟦0⟧走向脊线的沿脊线净输沙量与垂直脊线净输沙量之比。沿脊线输沙倾向于使脊线保持平直，而驱动迁移的跨脊线输沙则倾向于使脊线变得弯曲（⟦1⟧），因此较高的值意味着沙源充足床面上的长脊沙丘更为平直。对于在沙源不足床面上迁移的沙丘，该比值衡量的是迁移方向偏离沙丘上输沙方向的程度，这种偏离使新月形沙丘等呈现不对称形态（⟦2⟧）。在⟦3⟧给出的沙源充足床面示例中，横向沙丘约为 ⟦#0⟧，斜向沙丘约为 ⟦#1⟧，纵向沙丘约为 ⟦#2⟧。当其分母（净输沙量）趋于零时该比值趋于无穷大（图中截断显示为 ±⟦#3⟧）。

## c.6816201a (Layer popovers)
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all speed and direction bins: the volume of packed sand per metre width that the wind could move per year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with the threshold set by the slider. The ratio of the two depends on the wind-speed distribution, and Fryberger's energy classes (below ⟦#2⟧, ⟦#3⟧–⟦#4⟧ and above ⟦#5⟧ vector units) are in vector units.
ZH: 全部风速与风向区间上的时间平均平坦床面饱和输沙率⟦0⟧：指在完全被松散沙覆盖的平坦床面上，风每年每米宽度可搬运的堆积沙体积（⟦1⟧）。与⟦2⟧的输沙势类似，它衡量的是风的输沙能力，但二者是不同的量：Fryberger 的⟦3⟧以矢量单位表示，由以节为单位的 ⟦#0⟧ m 风速按⟦4⟧计算，采用 ⟦#1⟧ 节的临界值；而此处的⟦5⟧是由摩阻风速计算得到的物理输沙率，其临界值由滑块设定。二者之比取决于风速分布，且 Fryberger 的能量等级（低于 ⟦#2⟧、⟦#3⟧–⟦#4⟧ 及高于 ⟦#5⟧ 矢量单位）以矢量单位表示。

## c.c7e3069a (Layer popovers)
EN: Direction of the time-averaged flat-bed flux vector,⟦0⟧, the direction sand moves, as a compass bearing (clockwise from north). Where⟦1⟧is low, transport in opposing directions nearly cancels, and a small change of the threshold or the winds can turn this direction by up to ⟦#0⟧°.
ZH: 时间平均平床输沙通量矢量⟦0⟧的方向，即沙的移动方向，以罗盘方位角表示（从正北顺时针量起）。当⟦1⟧较低时，相反方向的输沙几乎相互抵消，临界值或风的微小变化就可能使该方向改变多达⟦#0⟧°。

## c.b2c9170b (Layer popovers)
EN: Directional variability of sand flux: ratio of resultant to total drift potential,⟦0⟧(⟦#0⟧ = multidirectional, ⟦#1⟧ = unidirectional). Undefined where there is no sand flux (⟦1⟧).⟦2⟧classes: below ⟦#2⟧ low (complex or obtuse bimodal winds), ⟦#3⟧–⟦#4⟧ intermediate (obtuse to acute bimodal winds), above ⟦#5⟧ high (unimodal winds). Here only transport above the threshold counts, and the flux law differs from Fryberger's.
ZH: 输沙的方向变率：合成输沙势与总输沙势之比，⟦0⟧（⟦#0⟧ = 多向，⟦#1⟧ = 单向）。若无输沙则无定义（⟦1⟧）。⟦2⟧等级：低于 ⟦#2⟧ 为低（复合型或钝角双峰风况），⟦#3⟧–⟦#4⟧ 为中等（钝角至锐角双峰风况），高于 ⟦#5⟧ 为高（单峰风况）。此处仅计入超过临界值的输沙，且输沙定律与 Fryberger 的不同。

## c.eb846f21 (Layer popovers)
EN: Mean total vegetation cover (green plus dry vegetation, including trees; % of the ground), ⟦#0⟧–⟦#1⟧, from the⟦0⟧Fractional Cover v3.1 (⟦#2⟧ m, monthly) averaged onto the ⟦#3⟧° cells over the months with valid data. Calibrated against Australian field sites; saturates under closed canopies. Total cover includes non-photosynthetic vegetation (dry and dead plant material) as well as green vegetation, so it can be substantial where little green vegetation is visible. No data over ocean, Antarctica, land north of ⟦#4⟧° N and the ⟦#5⟧° meridian cells. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full monthly time series at⟦1⟧</a>.
ZH: 总植被覆盖度（绿色植被与干枯植被之和，含树木；占地表的 %），⟦#0⟧–⟦#1⟧，来自⟦0⟧Fractional Cover v3.1（⟦#2⟧ m，逐月），在有有效数据的月份上平均至 ⟦#3⟧° 网格。该数据针对澳大利亚野外站点标定；在郁闭冠层下会饱和。总覆盖度既包含绿色植被也包含非光合植被（干枯死亡的植物质），因此在可见绿色植被很少的地方其值仍可能较大。海洋、南极洲、⟦#4⟧° N 以北的陆地以及 ⟦#5⟧° 经线网格无数据。<a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">在⟦1⟧查看完整的逐月时间序列</a>。

# About

## c.d98fa964 (About)
EN: <strong>Wind histograms and sand-flux fields (⟦0⟧⟦#0⟧°)</strong>:⟦1⟧⟦#1⟧–⟦#2⟧ hourly ⟦#3⟧ m winds (⟦#4⟧°;⟦2⟧,⟦3⟧) and the saturated sand-flux (qsat) parameters of⟦4⟧, Supplementary Data (⟦5⟧,⟦6⟧). Drift potentials (⟦7⟧,⟦8⟧,⟦9⟧,⟦10⟧) and crest fluxes are averages over the hourly record.
ZH: <strong>风况直方图与输沙通量场（⟦0⟧⟦#0⟧°）</strong>：⟦1⟧⟦#1⟧–⟦#2⟧ 逐小时 ⟦#3⟧ m 风速（⟦#4⟧°；⟦2⟧、⟦3⟧）及⟦4⟧的饱和输沙率（qsat）参数，补充数据（⟦5⟧、⟦6⟧）。输沙势（⟦7⟧、⟦8⟧、⟦9⟧、⟦10⟧）与脊线输沙通量均为逐小时记录的平均值。

## c.a8ad2f3b (About)
EN: <strong>Aridity index</strong>: Global Aridity Index v3.1 (⟦0⟧; Zomer,⟦1⟧), ⟦#0⟧–⟦#1⟧, native ⟦#2⟧″ grid,⟦2⟧; ocean and Antarctica (south of ⟦#3⟧° S) have no data, values ≥ ⟦#4⟧ are at the top of the source range. The cell panel shows the mean over the cell of the selected wind dataset.
ZH: <strong>干旱指数</strong>：Global Aridity Index v3.1（⟦0⟧；Zomer，⟦1⟧），⟦#0⟧–⟦#1⟧，原生 ⟦#2⟧″ 网格，⟦2⟧；海洋与南极洲（⟦#3⟧° S 以南）无数据，数值 ≥ ⟦#4⟧ 时取数据源范围的上限。单元格面板显示所选风场数据集网格单元内的均值。

## c.aa472bb2 (About)
EN: <strong>Vegetation cover</strong>:⟦0⟧Fractional Cover v3.1 (⟦1⟧;⟦2⟧), total vegetation cover (photosynthetic + non-photosynthetic vegetation), mean of the monthly ⟦#0⟧ m values ⟦#1⟧–⟦#2⟧ on the ⟦#3⟧° grid,⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧, hosted by⟦5⟧; the vegetation product of⟦6⟧. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full time series at⟦7⟧</a>. The cell panel shows the cell mean and the number of valid months.
ZH: <strong>植被覆盖度</strong>：⟦0⟧Fractional Cover v3.1（⟦1⟧；⟦2⟧），总植被覆盖度（光合植被 + 非光合植被），为 ⟦#0⟧ m 逐月数据在 ⟦#1⟧–⟦#2⟧ 期间于 ⟦#3⟧° 网格上的均值，⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧，托管于⟦5⟧；为⟦6⟧的植被产品。<a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">在⟦7⟧查看完整时间序列</a>。网格单元面板显示网格单元均值及有效月份数。

## c.500b2800 (About)
EN: Earth and Mars: methods and data
ZH: 地球与火星：方法与数据

## c.2ebf7276 (About)
EN: <strong>Winds and grid</strong>: Earth uses decades of hourly reanalysis winds (e.g.,⟦0⟧, ⟦#0⟧° grid, ⟦#1⟧–⟦#2⟧); Mars uses one Mars year (⟦#3⟧ sols, about ⟦#4⟧ Earth years) of winds from a climate-model simulation or a reanalysis (e.g.,⟦1⟧, ⟦#5⟧° grid, about ⟦#6⟧ km at the equator), with no year-to-year variation.
ZH: <strong>风场与网格</strong>：地球图集使用数十年的逐小时再分析风场（例如⟦0⟧，⟦#0⟧° 网格，⟦#1⟧–⟦#2⟧）；火星图集使用一个火星年（⟦#3⟧ 个火星日，约合 ⟦#4⟧ 个地球年）的风场，来自气候模型模拟或再分析数据集（例如⟦1⟧，⟦#5⟧° 网格，赤道附近约 ⟦#6⟧ 千米），且未能采样年际变化。

## c.cadf63de (About)
EN: On both planets,⟦0⟧,⟦1⟧,⟦2⟧and the mode directions depend on the threshold or grain-diameter setting.
ZH: 在两颗行星上，⟦0⟧、⟦1⟧、⟦2⟧以及模式方向都取决于阈值或粒径的设定。

# Cell panel

## c.974526cd (Cell panel)
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ m/s (centre) to ⟦#1⟧ m/s (rim); ⟦1⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current threshold. Where⟦2⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, and⟦3⟧can turn by up to ⟦#3⟧° with a small change of threshold or wind dataset. The modes depend on the whole flux rose rather than on its resultant: ⟦4⟧ follows the crest orientation ⟦5⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦6⟧.
ZH: 模式方位角（指向），⟦0⟧从 ⟦#0⟧ m/s（中心）到 ⟦#1⟧ m/s（外缘）；⟦1⟧为一条轴线，两端均绘出。某模式无定义（无相应输沙量）处曲线中断。虚线圆环与圆点：当前临界值。当⟦2⟧较低（低于约 ⟦#2⟧）时，相反方向的输沙几乎相互抵消，⟦3⟧可因临界值或风场数据集的微小变化而摆动达 ⟦#3⟧°。这些模式取决于整个输沙玫瑰图，而非其合成结果：⟦4⟧遵循使跨脊线总输沙量最大化的脊线走向⟦5⟧，因此可保持稳定，并可能与⟦6⟧不同。

# Other interface

## c.557bb11b (Other interface)
EN: Wind roses and sand-flux statistics are computed for land cells (land–sea mask fraction above ⟦#0⟧). This cell is mainly water. Choose a nearby land cell.
ZH: 风玫瑰图与输沙统计量仅针对陆地网格单元（陆海掩膜比例大于 ⟦#0⟧）计算。该网格单元以水体为主。请选择附近的陆地网格单元。

## c.53215ad6 (Other interface)
EN: Wind roses and sand-flux statistics are computed for land cells (land–sea mask fraction above ⟦#0⟧, i.e. any land in the cell). This cell has no land (land–sea mask fraction ⟦#1⟧). Choose a nearby land cell.
ZH: 仅针对陆地网格单元（陆海掩膜比例大于 ⟦#0⟧，即网格单元内有任何陆地）计算风玫瑰图与输沙统计量。该网格单元没有陆地（陆海掩膜比例为 ⟦#1⟧）。请选择附近的陆地网格单元。

# Layer popovers

## c.fb1d1176 (Layer popovers)
EN: The Wind dataset selector switches between Mars wind datasets (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧° × ⟦#2⟧°;⟦2⟧, ⟦#3⟧°), each one Mars year of lowest-level winds on its own grid (⟦3⟧: free-running climate-model simulation;⟦4⟧and⟦5⟧: reanalysis of Mars Year ⟦#4⟧, with spacecraft observations of the atmosphere assimilated into a climate model). The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. No⟦6⟧data poleward of ⟦#5⟧° N: the northernmost cells of its grid are centred at ⟦#6⟧° N.
ZH: “风场数据集”选择器可在不同的火星风场数据集之间切换（⟦0⟧，⟦#0⟧°；⟦1⟧，⟦#1⟧°×⟦#2⟧°；⟦2⟧，⟦#3⟧°），每个数据集均为各自网格上一个火星年的最低层风（⟦3⟧：自由运行的气候模型模拟；⟦4⟧和⟦5⟧：第 ⟦#4⟧ 个火星年的再分析数据集，将航天器对大气的观测同化到气候模型中）。风场与输沙通量图层以及网格单元面板随所选数据集而变；沙丘图和高程对所有数据集都相同。⟦#5⟧° N 以北无⟦6⟧数据：其网格最北一行单元的中心位于 ⟦#6⟧° N。

## c.59fd3775 (Layer popovers)
EN: The median diameter ⟦0⟧ of the sand grains. Every grain-size-dependent map layer (its ⓘ says so) and the cell panel use the value set here. The threshold friction velocity ⟦1⟧ is computed for each time step from ⟦2⟧ and that step's air density and temperature (⟦3⟧).
ZH: 沙粒的中值粒径⟦0⟧。所有依赖粒径的地图图层（其 ⓘ 中有说明）以及网格单元面板均使用此处设定的值。临界摩阻风速⟦1⟧按每个时间段的⟦2⟧及该时间段的空气密度与温度（⟦3⟧）计算得出。

## c.df0d9fab (Layer popovers)
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all N samples of the Mars year: the volume of packed sand per metre width that the wind could move per Earth year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with a threshold computed from the grain diameter. There is no fixed ratio between the two, and Fryberger's energy classes (below ⟦#2⟧, ⟦#3⟧–⟦#4⟧ and above ⟦#5⟧ vector units) are in vector units.
ZH: 整个火星年全部 N 个样本的平坦床面饱和输沙率的时间平均值⟦0⟧：在完全被松散沙覆盖的平坦床面上，风每地球年可搬运的单位宽度堆积沙体积（⟦1⟧）。与⟦2⟧的输沙势类似，它衡量的也是风的输沙能力，但二者并非同一物理量：Fryberger 的⟦3⟧以矢量单位给出，由 ⟦#0⟧ m 处以节为单位的风速按⟦4⟧计算，临界值取 ⟦#1⟧ 节；而此处的⟦5⟧是由摩阻风速计算得到的物理通量，其临界值由粒径计算得出。二者之间没有固定的换算比例，Fryberger 的能量等级（低于 ⟦#2⟧、⟦#3⟧–⟦#4⟧ 以及高于 ⟦#5⟧ 矢量单位）均以矢量单位给出。

## c.0b10586c (Layer popovers)
EN: Divergence of the time-averaged saturated sand-flux vector (magnitude⟦0⟧, direction⟦1⟧) on the Mars sphere, following⟦2⟧, Methods⟦3⟧:⟦4⟧with⟦5⟧,⟦6⟧. By conservation of sand mass, negative values (flux convergence) imply deposition and positive values (flux divergence) erosion. The values assume a saturated flux and an unlimited supply of loose sand, so on rock or crusted surfaces actual erosion is limited by the sand available.
ZH: 火星球面上时间平均饱和输沙通量矢量（大小⟦0⟧，方向⟦1⟧）的散度，依据⟦2⟧方法⟦3⟧计算：⟦4⟧，其中⟦5⟧，⟦6⟧。根据沙质量守恒，负值（输沙通量汇）意味着堆积，正值（输沙通量源）意味着侵蚀。这些数值假设输沙通量已饱和且松散沙供应不受限，因此在裸岩或结皮地表上，实际侵蚀会受限于可用沙源。

# About

## c.ca9b878e (About)
EN: <strong>Winds (⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧)</strong>: hourly lowest-level winds, temperature and surface pressure of the⟦2⟧Ames⟦3⟧FV3-based Mars Global Climate Model (c48 reference simulation, 6th simulated year), regridded to ⟦#1⟧° × ⟦#2⟧° (a cell is about ⟦#3⟧ km across at the equator): ⟦#4⟧ hourly samples, one Mars year. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature (⟦#5⟧–⟦#6⟧ m over all cells and hours; ⟦#7⟧–⟦#8⟧ m in ⟦#9⟧ % of the hours of dune cells; the cell panel gives the range of the selected cell), and the friction velocity⟦4⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#10⟧, eq. ⟦#11⟧) under constant stress at that height (no roughness length). Explore and download the full model output in the <a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦5⟧Ames⟦6⟧Data Portal web interface</a>.
ZH: <strong>风场（⟦0⟧Mars⟦1⟧，测试版 ⟦#0⟧）</strong>：⟦2⟧Ames⟦3⟧基于 FV3 的火星全球气候模型（c48 参考模拟，第 6 个模拟年）逐小时最低模型层风速、温度与地面气压，重新网格化至 ⟦#1⟧°×⟦#2⟧°（一个网格单元在赤道处约 ⟦#3⟧ km 宽）：共 ⟦#4⟧ 个逐小时样本，为期一个火星年。最低层的空气密度 ρ = p/(R T)；最低层风速所在高度 z 由逐小时气压和温度求得（全部网格单元和时间段范围为 ⟦#5⟧–⟦#6⟧ m；在沙丘区网格单元 ⟦#9⟧ % 的时间段中为 ⟦#7⟧–⟦#8⟧ m；网格单元面板给出所选单元的范围），摩阻风速⟦4⟧由 Pähtz 与 Durán（⟦#10⟧，式 ⟦#11⟧）在该高度恒定应力条件下的光滑壁面混合长廓线求得（不含空气动力学粗糙度）。可在<a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦5⟧Ames⟦6⟧Data Portal 网页界面</a>中浏览并下载完整的模型输出。

## c.82f006f8 (About)
EN: <strong>Winds (⟦0⟧v1.0 reanalysis, Mars Year ⟦#0⟧)</strong>: hourly analysis ensemble mean of the lowest-level winds, temperature and surface pressure of the Ensemble Mars Atmosphere Reanalysis System (⟦1⟧) v1.0 (⟦2⟧; read from the analysis-ready⟦3⟧copy), Mars Year ⟦#1⟧, on its native grid of ⟦#2⟧° in longitude × ⟦#3⟧° in latitude (⟦#4⟧ × ⟦#5⟧ cells, about ⟦#6⟧ km × ⟦#7⟧ km at the equator). The two half-width polar rows of⟦4⟧are not used, so the grid ends at ±⟦#8⟧°. The winds are averaged from the staggered⟦5⟧grid onto the cell centres. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature, and the friction velocity⟦6⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#9⟧, eq. ⟦#10⟧) under constant stress at that height (no roughness length). The lowest⟦7⟧layer is thick, so that height is ⟦#11⟧–⟦#12⟧ m above the surface (median ⟦#13⟧ m;⟦8⟧⟦#14⟧–⟦#15⟧ m,⟦9⟧⟦#16⟧–⟦#17⟧ m). Data and documentation: <a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">⟦10⟧v1.0 at the Penn State Data Commons</a>; the analysis-ready copy read by the atlas, <a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦11⟧</a>, with <a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">Python examples for reading and plotting it</a>.
ZH: <strong>风场（⟦0⟧v1.0 再分析数据集，第 ⟦#0⟧ 个火星年）</strong>：火星大气集合再分析系统（Ensemble Mars Atmosphere Reanalysis System，⟦1⟧）v1.0（⟦2⟧；读取自可直接分析的⟦3⟧副本）第 ⟦#1⟧ 个火星年最低层风、温度与地面气压的逐小时分析集合平均值，位于其原生网格上：经度 ⟦#2⟧° × 纬度 ⟦#3⟧°（⟦#4⟧ × ⟦#5⟧ 个网格单元，在赤道处约 ⟦#6⟧ km × ⟦#7⟧ km）。未使用⟦4⟧的两行半宽极区网格，因此网格止于 ±⟦#8⟧°。风速由⟦5⟧交错网格平均到网格单元中心。最低层的空气密度 ρ = p/(R T)；最低层风速所在高度 z 由逐小时气压和温度求得，摩阻风速⟦6⟧由 Pähtz 与 Durán（⟦#9⟧，式 ⟦#10⟧）在该高度恒定应力条件下的光滑壁面混合长廓线求得（不含空气动力学粗糙度）。⟦7⟧最低层较厚，因此该高度为地表以上 ⟦#11⟧–⟦#12⟧ m（中位数 ⟦#13⟧ m；⟦8⟧⟦#14⟧–⟦#15⟧ m，⟦9⟧⟦#16⟧–⟦#17⟧ m）。数据与文档：<a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">Penn State Data Commons 上的⟦10⟧v1.0</a>；本图集读取的可直接分析副本：<a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦11⟧</a>，并附有<a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">读取和绘图的 Python 示例</a>。

# Cell panel

## c.771e2d74 (Cell panel)
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ µm (centre) to ⟦#1⟧ µm (rim), radius logarithmic in ⟦1⟧; ⟦2⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current grain diameter. Where⟦3⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, and⟦4⟧can turn by up to ⟦#3⟧° with a small change of grain diameter. The modes depend on the whole flux rose rather than on its resultant: ⟦5⟧ follows the crest orientation ⟦6⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦7⟧.
ZH: ⟦0⟧ = ⟦#0⟧ µm（中心）至 ⟦#1⟧ µm（边缘）的模式方位角（指向），半径按⟦1⟧对数缩放；⟦2⟧为一条轴线，两端均绘出。当某模式无定义（无定义其的输沙通量）时，轨迹中断。虚线圆环与圆点：当前粒径。当⟦3⟧较低时（约低于 ⟦#2⟧），相反方向的输沙几乎相互抵消，⟦4⟧可随粒径的微小变化而偏转达 ⟦#3⟧°。这些模式取决于整个输沙玫瑰图，而非其合成矢量：⟦5⟧遵循使跨脊线总输沙最大化的脊线走向⟦6⟧，因而可以保持稳定并与⟦7⟧不同。

# Interface

## search.goTo (Interface)
EN: Go to
ZH: 前往

# Unused (English changed or removed)

## c.037dc143 (Unused (English changed or removed))
EN: The default, ⟦#0⟧ m/s, is the value used for the global analysis of⟦0⟧: a common global approximation used in place of more accurate local values, not calibrated for any site. Values between ⟦#1⟧ and ⟦#2⟧ m/s are typical; for loose, dry sand the threshold depends mainly on grain size and density.
ZH: 默认值 ⟦#0⟧ m/s 是⟦0⟧全球分析所采用的值：这是一种常用的全球近似值，用于代替更精确的当地值，并未针对任何地点进行率定。介于 ⟦#1⟧ 与 ⟦#2⟧ m/s 之间的值较为典型；对于松散、干燥的沙，临界值主要取决于粒径和密度。

## c.785bb05c (Unused (English changed or removed))
EN: The ⟦#0⟧° dune cells of the dune map grouped into ⟦#1⟧ dune fields of ⟦#2⟧-connected cells; polygon edges follow the grid-cell boundaries exactly. Area is the sum of spherical cell areas.
ZH: 沙丘图中的 ⟦#0⟧° 沙丘网格单元按 ⟦#2⟧-连通关系归并为 ⟦#1⟧ 个沙丘区；多边形边界与网格单元边界完全一致。面积为各球面网格单元面积之和。

## c.a776804c (Unused (English changed or removed))
EN: Net along-crest over net across-crest sand flux for crests of the bed-instability orientation,⟦0⟧. Along-crest transport tends to keep crests straight, while across-crest transport, which drives migration, tends to make them sinuous (⟦1⟧), so higher values suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures the asymmetry of sand fluxes that makes dunes such as barchans asymmetric (⟦2⟧). In the sand-covered-bed examples of⟦3⟧it is about ⟦#0⟧ for transverse, ⟦#1⟧ for oblique and ⟦#2⟧ for longitudinal dunes. The ratio goes to infinity where its denominator (a net flux) goes to zero (shown clipped to ±⟦#3⟧).
ZH: 床面失稳模式⟦0⟧走向脊线的沿脊线净输沙量与垂直脊线净输沙量之比。沿脊线输沙倾向于使脊线保持平直，而驱动迁移的跨脊线输沙则倾向于使脊线变得弯曲（⟦1⟧），因此较高的值意味着沙源充足床面上的长脊沙丘更为平直。对于在沙源不足床面上迁移的沙丘，该比值衡量的是使新月形沙丘等呈现不对称形态的输沙不对称性（⟦2⟧）。在⟦3⟧给出的沙源充足床面示例中，横向沙丘约为 ⟦#0⟧，斜向沙丘约为 ⟦#1⟧，纵向沙丘约为 ⟦#2⟧。当其分母（净输沙量）趋于零时该比值趋于无穷大（图中截断显示为 ±⟦#3⟧）。

## c.4c826ecf (Unused (English changed or removed))
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all speed and direction bins: the volume of packed sand per metre width that the wind could move per year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with the threshold set by the slider. The two cannot be converted into each other without the wind-speed distribution, and Fryberger's energy classes (below ⟦#2⟧, ⟦#3⟧–⟦#4⟧ and above ⟦#5⟧ vector units) do not apply to these values.
ZH: 全部风速与风向区间上的时间平均平坦床面饱和输沙率⟦0⟧：指在完全被松散沙覆盖的平坦床面上，风每年每米宽度可搬运的堆积沙体积（⟦1⟧）。与⟦2⟧的输沙势类似，它衡量的是风的输沙能力，但二者是不同的量：Fryberger 的⟦3⟧以矢量单位表示，由以节为单位的 ⟦#0⟧ m 风速按⟦4⟧计算，采用 ⟦#1⟧ 节的临界值；而此处的⟦5⟧是由摩阻风速计算得到的物理输沙率，其临界值由滑块设定。二者若无风速分布信息则无法相互换算，且 Fryberger 的能量等级（低于 ⟦#2⟧、⟦#3⟧–⟦#4⟧ 及高于 ⟦#5⟧ 矢量单位）不适用于这些数值。

## c.4837126c (Unused (English changed or removed))
EN: Direction of the time-averaged flat-bed flux vector,⟦0⟧, the direction sand moves, as a compass bearing (clockwise from north). Poorly defined where⟦1⟧is low, because transport in opposing directions nearly cancels.
ZH: 时间平均平坦床面输沙通量矢量⟦0⟧的方向，即沙的运移方向，以方位角表示（自北向顺时针）。当⟦1⟧较小时该方向不易确定，因为反向输沙近乎相互抵消。

## c.e214427e (Unused (English changed or removed))
EN: Directional variability of sand flux: ratio of resultant to total drift potential,⟦0⟧(⟦#0⟧ = multidirectional, ⟦#1⟧ = unidirectional). Undefined where there is no sand flux (⟦1⟧).⟦2⟧classes: below ⟦#2⟧ low (complex or obtuse bimodal winds), ⟦#3⟧–⟦#4⟧ intermediate (obtuse to acute bimodal winds), above ⟦#5⟧ high (unimodal winds). Only transport above the threshold counts here, and the flux law differs from Fryberger's, so use the classes as a guide.
ZH: 输沙的方向变率：合成输沙势与总输沙势之比，⟦0⟧（⟦#0⟧ = 多向，⟦#1⟧ = 单向）。若无输沙则无定义（⟦1⟧）。⟦2⟧等级：低于 ⟦#2⟧ 为低（复合型或钝角双峰风况），⟦#3⟧–⟦#4⟧ 为中等（钝角至锐角双峰风况），高于 ⟦#5⟧ 为高（单峰风况）。此处仅计入超过临界值的输沙，且输沙定律与 Fryberger 的不同，因此这些等级仅供参考。

## c.d92bedb9 (Unused (English changed or removed))
EN: Mean total vegetation cover (green plus dry vegetation, including trees; % of the ground), ⟦#0⟧–⟦#1⟧, from the⟦0⟧Fractional Cover v3.1 (⟦#2⟧ m, monthly) averaged onto the ⟦#3⟧° cells over the months with valid data. Calibrated against Australian field sites; saturates under closed canopies. Total cover includes non-photosynthetic vegetation (dry and dead plant material) as well as green vegetation, so it can be substantial where little green vegetation is visible; compare it with the aridity index. No data over ocean, Antarctica, land north of ⟦#4⟧° N and the ⟦#5⟧° meridian cells. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full monthly time series at⟦1⟧</a>.
ZH: 总植被覆盖度（绿色植被与干枯植被之和，含树木；占地表的 %），⟦#0⟧–⟦#1⟧，来自⟦0⟧Fractional Cover v3.1（⟦#2⟧ m，逐月），在有有效数据的月份上平均至 ⟦#3⟧° 网格。该数据针对澳大利亚野外站点标定；在郁闭冠层下会饱和。总覆盖度既包含绿色植被也包含非光合植被（干枯死亡的植物质），因此在可见绿色植被很少的地方其值仍可能较大；可与干旱指数对照。海洋、南极洲、⟦#4⟧° N 以北的陆地以及 ⟦#5⟧° 经线网格无数据。<a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">在⟦1⟧查看完整的逐月时间序列</a>。

## c.edcb7fbe (Unused (English changed or removed))
EN: <strong>Wind histograms and sand-flux fields (⟦0⟧⟦#0⟧°)</strong>:⟦1⟧⟦#1⟧–⟦#2⟧ hourly ⟦#3⟧ m winds (⟦#4⟧°;⟦2⟧,⟦3⟧) and the qsat parameters of⟦4⟧, Supplementary Data (⟦5⟧,⟦6⟧). Drift potentials (⟦7⟧,⟦8⟧,⟦9⟧,⟦10⟧) and crest fluxes are averages over the hourly record.
ZH: <strong>风况直方图与输沙通量场（⟦0⟧⟦#0⟧°）</strong>：⟦1⟧⟦#1⟧–⟦#2⟧ 逐小时 ⟦#3⟧ m 风速（⟦#4⟧°；⟦2⟧、⟦3⟧）及⟦4⟧的 qsat 参数，补充数据（⟦5⟧、⟦6⟧）。输沙势（⟦7⟧、⟦8⟧、⟦9⟧、⟦10⟧）与脊线输沙通量均为逐小时记录的平均值。

## c.79930b39 (Unused (English changed or removed))
EN: <strong>Aridity index</strong>: Global Aridity Index v3.1 (⟦0⟧; Zomer,⟦1⟧), ⟦#0⟧–⟦#1⟧, native ⟦#2⟧″ grid,⟦2⟧; ocean and Antarctica (south of ⟦#3⟧° S) have no data, values ≥ ⟦#4⟧ are at the top of the source range. The click panel shows the mean over the cell of the selected wind dataset.
ZH: <strong>干旱指数</strong>：Global Aridity Index v3.1（⟦0⟧；Zomer，⟦1⟧），⟦#0⟧–⟦#1⟧，原生 ⟦#2⟧″ 网格，⟦2⟧；海洋与南极洲（⟦#3⟧° S 以南）无数据，数值 ≥ ⟦#4⟧ 时取数据源范围的上限。点击面板显示所选风场数据集网格单元内的均值。

## c.d9d754b4 (Unused (English changed or removed))
EN: <strong>Vegetation cover</strong>:⟦0⟧Fractional Cover v3.1 (⟦1⟧;⟦2⟧), total vegetation cover (photosynthetic + non-photosynthetic vegetation), mean of the monthly ⟦#0⟧ m values ⟦#1⟧–⟦#2⟧ on the ⟦#3⟧° grid,⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧, hosted by⟦5⟧; the vegetation product of⟦6⟧. <a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">Explore the full time series at⟦7⟧</a>. The click panel shows the cell mean and the number of valid months.
ZH: <strong>植被覆盖度</strong>：⟦0⟧Fractional Cover v3.1（⟦1⟧；⟦2⟧），总植被覆盖度（光合植被 + 非光合植被），为 ⟦#0⟧ m 逐月数据在 ⟦#1⟧–⟦#2⟧ 期间于 ⟦#3⟧° 网格上的均值，⟦3⟧© ⟦#4⟧–⟦#5⟧⟦4⟧，托管于⟦5⟧；为⟦6⟧的植被产品。<a href="https://map.geo-rapp.org/" target="_blank" rel="noopener noreferrer">在⟦7⟧查看完整时间序列</a>。点击面板显示网格单元均值及有效月份数。

## c.f43b95cb (Unused (English changed or removed))
EN: Earth and Mars: what can be compared
ZH: 地球与火星：可比较之处

## c.ebb9f8a1 (Unused (English changed or removed))
EN: ⟦0⟧values on the two planets can therefore be compared in order of magnitude, not as precise numbers.⟦1⟧,⟦2⟧and the mode directions compare more directly, but each depends on the threshold or grain-diameter setting.
ZH: 因此，两颗行星上的⟦0⟧值只能在数量级上进行比较，而非精确数值。⟦1⟧、⟦2⟧及各模式方向之间的比较更为直接，但三者均依赖于所设定的临界值或粒径。

## c.6671ac04 (Unused (English changed or removed))
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ m/s (centre) to ⟦#1⟧ m/s (rim); ⟦1⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current threshold. Where⟦2⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, so⟦3⟧is poorly defined and can swing by up to ⟦#3⟧° with a small change of threshold or wind dataset. The modes depend on the whole flux rose rather than on its resultant: ⟦4⟧ follows the crest orientation ⟦5⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦6⟧.
ZH: 模式方位角（指向），⟦0⟧从 ⟦#0⟧ m/s（中心）到 ⟦#1⟧ m/s（外缘）；⟦1⟧为一条轴线，两端均绘出。某模式无定义（无相应输沙量）处曲线中断。虚线圆环与圆点：当前临界值。当⟦2⟧较低（低于约 ⟦#2⟧）时，相反方向的输沙几乎相互抵消，因而⟦3⟧定义不佳，临界值或风场数据集稍有变化即可使其摆动达 ⟦#3⟧°。这些模式取决于整个输沙玫瑰图，而非其合成结果：⟦4⟧遵循使跨脊线总输沙量最大化的脊线走向⟦5⟧，因此可保持稳定，并可能与⟦6⟧不同。

## c.e7c53466 (Unused (English changed or removed))
EN: The median diameter ⟦0⟧ of the sand grains. Every grain-size-dependent map layer (its ⓘ says so) and the cell panel use the value set here. The threshold friction velocity ⟦1⟧ is computed for every hour from ⟦2⟧ and that hour's air density and temperature (⟦3⟧).
ZH: 沙粒的中值粒径⟦0⟧。所有依赖粒径的地图图层（其 ⓘ 中有说明）以及网格单元面板均使用此处设定的值。临界摩阻风速⟦1⟧按每小时的⟦2⟧及该小时的空气密度与温度（⟦3⟧）计算得出。

## c.a2cd8175 (Unused (English changed or removed))
EN: Divergence of the time-averaged saturated sand-flux vector (magnitude⟦0⟧, direction⟦1⟧) on the Mars sphere, following⟦2⟧, Methods⟦3⟧:⟦4⟧with⟦5⟧,⟦6⟧. By conservation of sand mass, negative values (flux convergence) imply deposition and positive values (flux divergence) erosion. The values assume a saturated flux and an unlimited supply of loose sand, so on rock, crusted or vegetated surfaces actual erosion is limited by the sand available.
ZH: 火星球面上时间平均饱和输沙通量矢量（大小⟦0⟧，方向⟦1⟧）的散度，依据⟦2⟧方法⟦3⟧计算：⟦4⟧，其中⟦5⟧，⟦6⟧。根据沙质量守恒，负值（输沙通量汇）意味着堆积，正值（输沙通量源）意味着侵蚀。这些数值假设输沙通量已饱和且松散沙供应不受限，因此在裸岩、结皮或有植被覆盖的地表上，实际侵蚀会受限于可用沙源。

## c.76650ed5 (Unused (English changed or removed))
EN: Mode bearings (toward) for ⟦0⟧ = ⟦#0⟧ µm (centre) to ⟦#1⟧ µm (rim), radius logarithmic in ⟦1⟧; ⟦2⟧ is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current grain diameter. Where⟦3⟧is low (below about ⟦#2⟧), transport in opposing directions nearly cancels, so⟦4⟧is poorly defined and can swing by up to ⟦#3⟧° with a small change of grain diameter. The modes depend on the whole flux rose rather than on its resultant: ⟦5⟧ follows the crest orientation ⟦6⟧ that maximises gross transport across crests, so it can stay steady and differ from⟦7⟧.
ZH: ⟦0⟧ = ⟦#0⟧ µm（中心）至 ⟦#1⟧ µm（边缘）的模式方位角（指向），半径按⟦1⟧对数缩放；⟦2⟧为一条轴线，两端均绘出。当某模式无定义（无定义其的输沙通量）时，轨迹中断。虚线圆环与圆点：当前粒径。当⟦3⟧较低时（约低于 ⟦#2⟧），相反方向的输沙几乎相互抵消，因此⟦4⟧的定义较弱，粒径的微小变化即可使其摆动达 ⟦#3⟧°。这些模式取决于整个输沙玫瑰图，而非其合成矢量：⟦5⟧遵循使跨脊线总输沙最大化的脊线走向⟦6⟧，因而可以保持稳定并与⟦7⟧不同。

## c.6cd16937 (Unused (English changed or removed))
EN: <strong>Winds (⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧)</strong>: hourly lowest-level winds, temperature and surface pressure of the⟦2⟧Ames⟦3⟧FV3-based Mars Global Climate Model (c48 reference simulation, 6th simulated year), regridded to ⟦#1⟧° × ⟦#2⟧° (a cell is about ⟦#3⟧ km across at the equator, larger than most dune fields): ⟦#4⟧ hourly samples, one Mars year. The map draws each cell as one square, so a field that changes strongly from cell to cell, as⟦4⟧often does at low latitudes, looks blocky. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature (⟦#5⟧–⟦#6⟧ m over all cells and hours; ⟦#7⟧–⟦#8⟧ m in ⟦#9⟧ % of the hours of dune cells; the cell panel gives the range of the selected cell), and the friction velocity⟦5⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#10⟧, eq. ⟦#11⟧) under constant stress at that height (no roughness length). Explore and download the full model output in the <a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦6⟧Ames⟦7⟧Data Portal web interface</a>.
ZH: <strong>风场（⟦0⟧Mars⟦1⟧，测试版 ⟦#0⟧）</strong>：⟦2⟧Ames⟦3⟧基于 FV3 的火星全球气候模型（c48 参考模拟，第 6 个模拟年）逐小时最低模型层风速、温度与地面气压，重新网格化至 ⟦#1⟧°×⟦#2⟧°（一个网格单元在赤道处约 ⟦#3⟧ km 宽，大于大多数沙丘区）：共 ⟦#4⟧ 个逐小时样本，为期一个火星年。地图将每个网格单元绘制为一个方块，因此在低纬度地区⟦4⟧常出现网格间剧烈变化的量，看起来呈块状。最低层的空气密度 ρ = p/(R T)；最低层风速所在高度 z 由逐小时气压和温度求得（全部网格单元和时间段范围为 ⟦#5⟧–⟦#6⟧ m；在沙丘区网格单元 ⟦#9⟧ % 的时间段中为 ⟦#7⟧–⟦#8⟧ m；网格单元面板给出所选单元的范围），摩阻风速⟦5⟧由 Pähtz 与 Durán（⟦#10⟧，式 ⟦#11⟧）在该高度恒定应力条件下的光滑壁面混合长廓线求得（不含空气动力学粗糙度）。可在<a href="https://data.nas.nasa.gov/mcmc/portals/web-interface/" target="_blank" rel="noopener noreferrer">⟦6⟧Ames⟦7⟧Data Portal 网页界面</a>中浏览并下载完整的模型输出。

## c.5228f7bf (Unused (English changed or removed))
EN: <strong>Winds (⟦0⟧v1.0 reanalysis, Mars Year ⟦#0⟧)</strong>: hourly analysis ensemble mean of the lowest-level winds, temperature and surface pressure of the Ensemble Mars Atmosphere Reanalysis System (⟦1⟧) v1.0 (⟦2⟧; read from the analysis-ready⟦3⟧copy), Mars Year ⟦#1⟧, on its native grid of ⟦#2⟧° in longitude × ⟦#3⟧° in latitude (⟦#4⟧ × ⟦#5⟧ cells, about ⟦#6⟧ km × ⟦#7⟧ km at the equator). The two half-width polar rows of⟦4⟧are not used, so the grid ends at ±⟦#8⟧°: there is no⟦5⟧cell poleward of it. The winds are averaged from the staggered⟦6⟧grid onto the cell centres. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature, and the friction velocity⟦7⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#9⟧, eq. ⟦#10⟧) under constant stress at that height (no roughness length). The lowest⟦8⟧layer is thick, so that height is ⟦#11⟧–⟦#12⟧ m above the surface (median ⟦#13⟧ m;⟦9⟧⟦#14⟧–⟦#15⟧ m,⟦10⟧⟦#16⟧–⟦#17⟧ m): the wind and⟦11⟧refer to a much higher level than in the other Mars datasets. Data and documentation: <a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">⟦12⟧v1.0 at the Penn State Data Commons</a>; the analysis-ready copy read by the atlas, <a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦13⟧</a>, with <a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">Python examples for reading and plotting it</a>.
ZH: <strong>风场（⟦0⟧v1.0 再分析数据集，第 ⟦#0⟧ 个火星年）</strong>：火星大气集合再分析系统（Ensemble Mars Atmosphere Reanalysis System，⟦1⟧）v1.0（⟦2⟧；读取自可直接分析的⟦3⟧副本）第 ⟦#1⟧ 个火星年最低层风、温度与地面气压的逐小时分析集合平均值，位于其原生网格上：经度 ⟦#2⟧° × 纬度 ⟦#3⟧°（⟦#4⟧ × ⟦#5⟧ 个网格单元，在赤道处约 ⟦#6⟧ km × ⟦#7⟧ km）。未使用⟦4⟧的两行半宽极区网格，因此网格止于 ±⟦#8⟧°：在此以外的极区没有⟦5⟧网格单元。风速由⟦6⟧交错网格平均到网格单元中心。最低层的空气密度 ρ = p/(R T)；最低层风速所在高度 z 由逐小时气压和温度求得，摩阻风速⟦7⟧由 Pähtz 与 Durán（⟦#9⟧，式 ⟦#10⟧）在该高度恒定应力条件下的光滑壁面混合长廓线求得（不含空气动力学粗糙度）。⟦8⟧最低层较厚，因此该高度为地表以上 ⟦#11⟧–⟦#12⟧ m（中位数 ⟦#13⟧ m；⟦9⟧⟦#14⟧–⟦#15⟧ m，⟦10⟧⟦#16⟧–⟦#17⟧ m）：风速和⟦11⟧所对应的高度远高于其他火星数据集。数据与文档：<a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener noreferrer">Penn State Data Commons 上的⟦12⟧v1.0</a>；本图集读取的可直接分析副本：<a href="https://huggingface.co/datasets/ananyo01/ARCO-EMARS" target="_blank" rel="noopener noreferrer">⟦13⟧</a>，并附有<a href="https://github.com/GalacticBobster/ARCO-Mars-Examples" target="_blank" rel="noopener noreferrer">读取和绘图的 Python 示例</a>。

## c.3ae7fe48 (Unused (English changed or removed))
EN: The Wind dataset selector switches between wind datasets (⟦0⟧, ⟦#0⟧°, ⟦#1⟧–⟦#2⟧;⟦1⟧, ⟦#3⟧°, ⟦#4⟧–⟦#5⟧).⟦2⟧, used by⟦3⟧, is a land-surface rerun driven by⟦4⟧atmospheric fields interpolated to its grid (Muñoz-Sabater et al. ⟦#6⟧), so its winds are not an independent estimate, and the datasets can still differ: e.g.,⟦5⟧reports⟦6⟧⟦#7⟧ m wind speeds ⟦#8⟧–⟦#9⟧ % below those of⟦7⟧. Where the datasets give different results, treat them as uncertain. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
ZH: “风场数据集”选择器用于在不同风场数据集之间切换（⟦0⟧，⟦#0⟧°，⟦#1⟧–⟦#2⟧；⟦1⟧，⟦#3⟧°，⟦#4⟧–⟦#5⟧）。⟦2⟧（⟦3⟧所采用）是由插值到其网格上的⟦4⟧大气场驱动的陆面重算产品（Muñoz-Sabater et al. ⟦#6⟧），因此其风场并非独立估计，但两个数据集之间仍可能存在差异：例如，⟦5⟧报告⟦6⟧的 ⟦#7⟧ m 风速比⟦7⟧低 ⟦#8⟧–⟦#9⟧%。若各数据集给出不同结果，应视其为不确定。风场与输沙通量图层以及网格单元面板随所选数据集变化；沙丘区掩膜、干旱度和植被图层对所有数据集均相同。

## c.5cedc7f4 (Unused (English changed or removed))
EN: <strong>Winds and grid</strong>: Earth uses decades of hourly reanalysis winds (e.g.,⟦0⟧, ⟦#0⟧° grid, ⟦#1⟧–⟦#2⟧); Mars uses one Mars year (⟦#3⟧ sols, about ⟦#4⟧ Earth years) of winds from a climate-model simulation or a reanalysis (e.g.,⟦1⟧, ⟦#5⟧° grid), so one Mars cell can span several dune fields and year-to-year variability is not sampled.
ZH: <strong>风场与网格</strong>：地球图集使用数十年的逐小时再分析风场（例如⟦0⟧，⟦#0⟧° 网格，⟦#1⟧–⟦#2⟧）；火星图集使用一个火星年（⟦#3⟧ 个火星日，约合 ⟦#4⟧ 个地球年）的风场，来自气候模型模拟或再分析数据集（例如⟦1⟧，⟦#5⟧° 网格），因此一个火星网格单元可能跨越多个沙丘区，且未能采样年际变化。

## c.2d038d14 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (land–sea mask fraction above ⟦#0⟧). This cell is mainly water, so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦0⟧(coastal cells can differ between the land masks of the datasets).
ZH: 本图集仅针对陆地网格单元（陆海掩膜比例大于 ⟦#0⟧）计算风玫瑰图与输沙统计量。该网格单元以水体为主，因此图集没有其统计数据。请选择附近的陆地网格单元，或切换到⟦0⟧（各数据集的陆海掩膜在沿海网格单元上可能存在差异）。

## c.e5b72715 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (land–sea mask fraction above ⟦#0⟧, i.e. any land in the cell). This cell has no land (land–sea mask fraction ⟦#1⟧), so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦0⟧(coastal cells can differ between the land masks of the datasets).
ZH: 本图集仅针对陆地网格单元（陆海掩膜比例大于 ⟦#0⟧，即网格单元内有任何陆地）计算风玫瑰图与输沙统计量。该网格单元没有陆地（陆海掩膜比例为 ⟦#1⟧），因此图集没有其统计数据。请选择附近的陆地网格单元，或切换到⟦0⟧（各数据集的陆海掩膜在沿海网格单元上可能存在差异）。

## c.8f6fed46 (Unused (English changed or removed))
EN: The Wind dataset selector switches between Mars wind datasets (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧° × ⟦#2⟧°;⟦2⟧, ⟦#3⟧°), each one Mars year of lowest-level winds on its own grid (⟦3⟧: free-running climate-model simulation;⟦4⟧and⟦5⟧: reanalysis of Mars Year ⟦#4⟧, with spacecraft observations of the atmosphere assimilated into a climate model). The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. Where the datasets give different results, treat them as uncertain. No⟦6⟧data poleward of ⟦#5⟧° N: the northernmost cells of its grid are centred at ⟦#6⟧° N.
ZH: “风场数据集”选择器可在不同的火星风场数据集之间切换（⟦0⟧，⟦#0⟧°；⟦1⟧，⟦#1⟧°×⟦#2⟧°；⟦2⟧，⟦#3⟧°），每个数据集均为各自网格上一个火星年的最低层风（⟦3⟧：自由运行的气候模型模拟；⟦4⟧和⟦5⟧：第 ⟦#4⟧ 个火星年的再分析数据集，将航天器对大气的观测同化到气候模型中）。风场与输沙通量图层以及网格单元面板随所选数据集而变；沙丘图和高程对所有数据集都相同。若各数据集给出的结果不同，应将其视为不确定。⟦#5⟧° N 以北无⟦6⟧数据：其网格最北一行单元的中心位于 ⟦#6⟧° N。

## c.350b19fe (Unused (English changed or removed))
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all N samples of the Mars year: the volume of packed sand per metre width that the wind could move per Earth year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with a threshold computed from the grain diameter. The two cannot be converted into each other, and Fryberger's energy classes do not apply to these values.
ZH: 整个火星年全部 N 个样本的平坦床面饱和输沙率的时间平均值⟦0⟧：在完全被松散沙覆盖的平坦床面上，风每地球年可搬运的单位宽度堆积沙体积（⟦1⟧）。与⟦2⟧的输沙势类似，它衡量的也是风的输沙能力，但二者并非同一物理量：Fryberger 的⟦3⟧以矢量单位给出，由 ⟦#0⟧ m 处以节为单位的风速按⟦4⟧计算，临界值取 ⟦#1⟧ 节；而此处的⟦5⟧是由摩阻风速计算得到的物理通量，其临界值由粒径计算得出。二者不可相互换算，Fryberger 的能量等级也不适用于这些数值。

## c.005fdc07 (Unused (English changed or removed))
EN: <strong>Control</strong>: on Earth the slider sets one threshold friction velocity⟦0⟧for the whole record (default ⟦#0⟧ m/s); on Mars it sets the median grain diameter d (default ⟦#1⟧ µm), and the threshold is computed for every time step of the wind record from d and that step's air density and temperature.
ZH: <strong>控制量</strong>：在地球图集中，滑块设定的是适用于整个记录的单一临界摩阻风速⟦0⟧（默认值 ⟦#0⟧ m/s）；在火星图集中，滑块设定的是中值粒径 d（默认值 ⟦#1⟧ µm），临界值则根据 d 及每个时间步的空气密度和温度，对风场记录逐时间步计算。

## c.b8bd4f5a (Unused (English changed or removed))
EN: <strong>Sand-flux fields</strong>: for every time step of the wind dataset, the threshold and the saturated transport rate of⟦0⟧at the selected median grain diameter d (grain density ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), averaged over the year; drift potentials, crest fluxes and dune-orientation modes follow the methods outlined in⟦1⟧. Fluxes are volumes of packed sand (packing fraction ⟦#2⟧, pore space included) per metre width per Earth year (⟦#3⟧ days), in m²/yr, as on Earth.
ZH: <strong>输沙通量场</strong>：对风场数据集的每个时间步，按所选中值粒径 d（颗粒密度 ⟦#0⟧ kg/m³，g = ⟦#1⟧ m/s²）计算⟦0⟧的临界值与饱和输沙率，并取年平均；输沙势、脊线输沙通量与沙丘朝向模式按⟦1⟧所述方法计算。输沙通量为单位宽度、单位地球年（⟦#3⟧ 天）内堆积沙的体积（堆积体积分数 ⟦#2⟧，含孔隙空间），单位为 m²/yr，与地球上相同。

## c.8cfd1c5c (Unused (English changed or removed))
EN: <strong>Control</strong>: on Earth the slider sets one threshold friction velocity⟦0⟧for all hours (default ⟦#0⟧ m/s); on Mars it sets the median grain diameter d (default ⟦#1⟧ µm), and the threshold is computed for every hour from d and that hour's air density and temperature.
ZH: <strong>控制量</strong>：在地球图集中，滑块设定的是适用于所有小时的单一临界摩阻风速⟦0⟧（默认值 ⟦#0⟧ m/s）；在火星图集中，滑块设定的是中值粒径 d（默认值 ⟦#1⟧ µm），临界值则根据 d 及该小时的空气密度和温度逐小时计算。

## c.182e7ab0 (Unused (English changed or removed))
EN: <strong>Transport law and wind profile</strong>: Earth uses the transport law of⟦0⟧, with⟦1⟧from the ⟦#0⟧ m wind and a roughness length of ⟦#1⟧ mm; Mars uses the transport law of⟦2⟧, with⟦3⟧from the lowest-level wind (≈ ⟦#2⟧–⟦#3⟧ m) and a smooth-wall profile without a roughness length.
ZH: <strong>输沙定律与风廓线</strong>：地球图集采用⟦0⟧的输沙定律，⟦1⟧由 ⟦#0⟧ m 高度的风速及 ⟦#1⟧ mm 的空气动力学粗糙度求得；火星图集采用⟦2⟧的输沙定律，⟦3⟧由最低层风速（约 ⟦#2⟧–⟦#3⟧ m）求得，并采用不含粗糙度的光滑壁面风廓线。

## c.3b78ea48 (Unused (English changed or removed))
EN: <strong>Winds and grid</strong>: Earth uses a period of hourly reanalysis winds (e.g.,⟦0⟧, ⟦#0⟧° grid for ⟦#1⟧ years ⟦#2⟧–⟦#3⟧); Mars uses a representative year (⟦#4⟧ sols, about ⟦#5⟧ Earth years) of hourly simulated winds (e.g.,⟦1⟧, ⟦#6⟧° grid), so one Mars cell can span several dune fields and year-to-year variability is not sampled.
ZH: <strong>风场与网格</strong>：地球图集使用一段逐小时再分析数据集（例如⟦0⟧，⟦#0⟧° 网格，时段为 ⟦#1⟧ 年，⟦#2⟧–⟦#3⟧）；火星图集使用代表性一年（⟦#4⟧ 个火星日，约合 ⟦#5⟧ 个地球年）的逐小时模拟风场（例如⟦1⟧，⟦#6⟧° 网格），因此一个火星网格单元可能跨越多个沙丘区，且未能采样年际变化。

## c.6251885f (Unused (English changed or removed))
EN: <strong>Downloads</strong>: Earth cells provide a wind histogram and the fields against threshold (⟦0⟧,⟦1⟧); Mars cells provide the hourly wind and air series and the fields against grain diameter (⟦2⟧,⟦3⟧).
ZH: <strong>下载内容</strong>：地球网格单元提供风况直方图及随临界值变化的各物理量（⟦0⟧、⟦1⟧）；火星网格单元提供逐小时风速与大气序列，以及随粒径变化的各物理量（⟦2⟧、⟦3⟧）。

## c.d0a79f04 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (⟦0⟧land–sea mask fraction &gt; ⟦#0⟧). This cell is mainly water, so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦1⟧(coastal cells can differ between the two land masks).
ZH: 本图集仅针对陆地网格单元（⟦0⟧陆海掩膜比例 &gt; ⟦#0⟧）计算风玫瑰图与输沙统计量。该网格单元以水体为主，因此图集没有其统计数据。请选择附近的陆地网格单元，或切换到⟦1⟧（两种陆海掩膜在沿海网格单元上可能存在差异）。

## c.0f4659f8 (Unused (English changed or removed))
EN: The atlas computes wind roses and sand-flux statistics only for land cells (⟦0⟧land–sea mask fraction &gt; ⟦#0⟧). This cell has no land (land–sea mask fraction ⟦#1⟧), so the atlas has no statistics for it. Choose a nearby land cell, or switch to⟦1⟧(coastal cells can differ between the two land masks).
ZH: 本图集仅针对陆地网格单元（⟦0⟧陆海掩膜比例 &gt; ⟦#0⟧）计算风玫瑰图与输沙统计量。该网格单元没有陆地（陆海掩膜比例为 ⟦#1⟧），因此图集没有其统计数据。请选择附近的陆地网格单元，或切换到⟦1⟧（两种陆海掩膜在沿海网格单元上可能存在差异）。

## c.55593e77 (Unused (English changed or removed))
EN: Fraction of time flat-bed friction velocity is above threshold⟦0⟧. The threshold is that hour's cessation threshold⟦1⟧of⟦2⟧.
ZH: 平坦床面摩阻风速超过临界值⟦0⟧的时间比例。该临界值为当小时的⟦1⟧终止临界值，取自⟦2⟧。

## c.f1591313 (Unused (English changed or removed))
EN: Average above-threshold flat-bed friction velocity, normalised by threshold⟦0⟧. The threshold is that hour's cessation threshold⟦1⟧of⟦2⟧.
ZH: 超过临界值的平坦床面摩阻风速均值，按临界值⟦0⟧归一化。该临界值为当小时的⟦1⟧终止临界值，取自⟦2⟧。

## c.8ab3c2ce (Unused (English changed or removed))
EN: Fraction of bed-instability-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is that hour's cessation threshold⟦2⟧of⟦3⟧.
ZH: 床面失稳模式（⟦0⟧）脊线输沙通量中、发生在平坦床面摩阻风速超过临界值⟦1⟧期间的比例。⟦#0⟧ 表示脊线输沙仅发生在平坦床面低于临界值时；若无脊线输沙则无定义。该临界值为当小时的⟦2⟧终止临界值，取自⟦3⟧。

## c.8843ab2c (Unused (English changed or removed))
EN: Fraction of elongation-mode (⟦0⟧) crest flux that occurs while the flat-bed friction velocity exceeds threshold,⟦1⟧. ⟦#0⟧ where crest flux occurs only while the flat bed is below threshold; undefined where there is no crest flux. The threshold is that hour's cessation threshold⟦2⟧of⟦3⟧.
ZH: 伸长模式（⟦0⟧）脊线输沙通量中、发生在平坦床面摩阻风速超过临界值⟦1⟧期间的比例。⟦#0⟧ 表示脊线输沙仅发生在平坦床面低于临界值时；若无脊线输沙则无定义。该临界值为当小时的⟦2⟧终止临界值，取自⟦3⟧。

## c.5dd4040a (Unused (English changed or removed))
EN: Time-averaged flat-bed saturated sand flux,⟦0⟧over all N hours of the Mars year: the volume of packed sand per metre width that the wind could move per Earth year over a flat bed fully covered by loose sand (⟦1⟧). Like the drift potential of⟦2⟧it measures the wind's capacity to transport sand, but it is a different quantity: Fryberger's⟦3⟧is in vector units, computed from ⟦#0⟧ m wind speeds in knots as⟦4⟧with a ⟦#1⟧-knot threshold, whereas this⟦5⟧is a physical flux computed from the friction velocity with a threshold computed from the grain diameter. The two cannot be converted into each other, and Fryberger's energy classes do not apply to these values.
ZH: 整个火星年共 N 小时内平坦床面饱和输沙率的时间平均值⟦0⟧：在完全被松散沙覆盖的平坦床面上，风每地球年可搬运的单位宽度堆积沙体积（⟦1⟧）。与⟦2⟧的输沙势类似，它衡量的也是风的输沙能力，但二者并非同一物理量：Fryberger 的⟦3⟧以矢量单位给出，由 ⟦#0⟧ m 处以节为单位的风速按⟦4⟧计算，临界值取 ⟦#1⟧ 节；而此处的⟦5⟧是由摩阻风速计算得到的物理通量，其临界值由粒径计算得出。二者不可相互换算，Fryberger 的能量等级也不适用于这些数值。

## c.75d2f7e2 (Unused (English changed or removed))
EN: Mean over the Mars year of the hourly lowest-layer air density⟦0⟧of the wind dataset's climate model (⟦1⟧= mid pressure of the lowest layer,⟦2⟧= lowest-level temperature).
ZH: 风场数据集所用气候模型逐小时最底层空气密度⟦0⟧在整个火星年内的平均值（⟦1⟧= 最底层的中间气压，⟦2⟧= 最底层温度）。

## c.c238d4e5 (Unused (English changed or removed))
EN: <strong>Sand-flux fields</strong>: for every hour, the threshold and the saturated transport rate of⟦0⟧at the selected median grain diameter d (grain density ⟦#0⟧ kg/m³, g = ⟦#1⟧ m/s²), averaged over the year; drift potentials, crest fluxes and dune-orientation modes follow the methods outlined in⟦1⟧. Fluxes are volumes of packed sand (packing fraction ⟦#2⟧, pore space included) per metre width per Earth year (⟦#3⟧ days), in m²/yr, as on Earth.
ZH: <strong>输沙通量场</strong>：对每个小时，按所选中值粒径 d（颗粒密度 ⟦#0⟧ kg/m³，g = ⟦#1⟧ m/s²）计算⟦0⟧的临界值与饱和输沙率，并取年平均；输沙势、脊线输沙通量与沙丘朝向模式按⟦1⟧所述方法计算。输沙通量为单位宽度、单位地球年（⟦#3⟧ 天）内堆积沙的体积（堆积体积分数 ⟦#2⟧，含孔隙空间），单位为 m²/yr，与地球上相同。

## c.a6ed5186 (Unused (English changed or removed))
EN: Threshold friction velocity at this d, median over the hours
ZH: 该粒径下的临界摩阻风速，各小时的中值

## c.b92a021d (Unused (English changed or removed))
EN: Hourly wind and air series (u, v, T, ρ, z)
ZH: 逐小时风场与大气序列（u、v、T、ρ、z）

## c.f17421a6 (Unused (English changed or removed))
EN: The Wind dataset selector switches between reanalysis wind statistics (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧°; ⟦#2⟧–⟦#3⟧).⟦2⟧, used by⟦3⟧, is a land-surface rerun driven by⟦4⟧atmospheric fields interpolated to its grid (Muñoz-Sabater et al. ⟦#4⟧), so its winds are not an independent estimate, and the datasets can still differ: e.g.,⟦5⟧reports⟦6⟧⟦#5⟧ m wind speeds ⟦#6⟧–⟦#7⟧ % below those of⟦7⟧. Where the datasets give different results, treat them as uncertain. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
ZH: “风场数据集”选择器用于在再分析风况统计数据之间切换（⟦0⟧，⟦#0⟧°；⟦1⟧，⟦#1⟧°；⟦#2⟧–⟦#3⟧）。⟦2⟧（⟦3⟧所采用）是由插值到其网格上的⟦4⟧大气场驱动的陆面重算产品（Muñoz-Sabater et al. ⟦#4⟧），因此其风场并非独立估计，但两个数据集之间仍可能存在差异：例如，⟦5⟧报告⟦6⟧的 ⟦#5⟧ m 风速比⟦7⟧低 ⟦#6⟧–⟦#7⟧%。若两个数据集给出不同结果，应视其为不确定。风场与输沙通量图层以及网格单元面板随所选数据集变化；沙丘区掩膜、干旱度和植被图层对所有数据集均相同。

## c.c27adfd9 (Unused (English changed or removed))
EN: The Wind dataset selector switches between Mars wind datasets (⟦0⟧, ⟦#0⟧°;⟦1⟧, ⟦#1⟧° × ⟦#2⟧°;⟦2⟧, ⟦#3⟧°), each one Mars year of lowest-level winds on its own grid:⟦3⟧is a free-running climate-model simulation;⟦4⟧and⟦5⟧are reanalyses of Mars Year ⟦#4⟧, which assimilate spacecraft observations of the atmosphere into a climate model. The wind and sand-flux layers and the cell panel follow the selection; the dune map and the elevation are the same for every dataset. Where the datasets give different results, treat them as uncertain. No⟦6⟧data poleward of ⟦#5⟧° N: the northernmost cells of its grid are centred at ⟦#6⟧° N.
ZH: “风场数据集”选择器可在不同的火星风场数据集之间切换（⟦0⟧，⟦#0⟧°；⟦1⟧，⟦#1⟧°×⟦#2⟧°；⟦2⟧，⟦#3⟧°），每个数据集均为各自网格上一个火星年的最低层风：⟦3⟧是自由运行的气候模型模拟；⟦4⟧和⟦5⟧是第 ⟦#4⟧ 个火星年的再分析数据集，将航天器对大气的观测同化到气候模型中。风场与输沙通量图层以及网格单元面板随所选数据集而变；沙丘图和高程对所有数据集都相同。若各数据集给出的结果不同，应将其视为不确定。⟦#5⟧° N 以北无⟦6⟧数据：其网格最北一行单元的中心位于 ⟦#6⟧° N。

## c.692b1efa (Unused (English changed or removed))
EN: <strong>Winds (⟦0⟧Mars⟦1⟧, beta release ⟦#0⟧)</strong>: hourly lowest-level winds, temperature and surface pressure of the⟦2⟧Ames⟦3⟧FV3-based Mars Global Climate Model (c48 reference simulation, 6th simulated year), regridded to ⟦#1⟧° × ⟦#2⟧° (a cell is about ⟦#3⟧ km across at the equator, larger than most dune fields): ⟦#4⟧ hourly samples, one Mars year. The map draws each cell as one square, so a field that changes strongly from cell to cell, as⟦4⟧often does at low latitudes, looks blocky. Air density of the lowest layer ρ = p/(R T); the height z of the lowest-level wind follows from the hourly pressure and temperature (⟦#5⟧–⟦#6⟧ m over all cells and hours; ⟦#7⟧–⟦#8⟧ m in ⟦#9⟧ % of the hours of dune cells; the cell panel gives the range of the selected cell), and the friction velocity⟦5⟧comes from the smooth-wall mixing-length profile of Pähtz &amp; Durán (⟦#10⟧, eq. ⟦#11⟧) under constant stress at that height (no roughness length).
ZH: <strong>风场（⟦0⟧Mars⟦1⟧，测试版 ⟦#0⟧）</strong>：⟦2⟧Ames⟦3⟧基于 FV3 的火星全球气候模型（c48 参考模拟，第 6 个模拟年）逐小时最低模型层风速、温度与地面气压，重新网格化至 ⟦#1⟧°×⟦#2⟧°（一个网格单元在赤道处约 ⟦#3⟧ km 宽，大于大多数沙丘区）：共 ⟦#4⟧ 个逐小时样本，为期一个火星年。地图将每个网格单元绘制为一个方块，因此在低纬度地区⟦4⟧常出现网格间剧烈变化的量，看起来呈块状。最低层的空气密度 ρ = p/(R T)；最低层风速所在高度 z 由逐小时气压和温度求得（全部网格单元和时间段范围为 ⟦#5⟧–⟦#6⟧ m；在沙丘区网格单元 ⟦#9⟧ % 的时间段中为 ⟦#7⟧–⟦#8⟧ m；网格单元面板给出所选单元的范围），摩阻风速⟦5⟧由 Pähtz 与 Durán（⟦#10⟧，式 ⟦#11⟧）在该高度恒定应力条件下的光滑壁面混合长廓线求得（不含空气动力学粗糙度）。

## c.c4698157 (Unused (English changed or removed))
EN: <strong>Saturated flux divergence</strong> ⟦0⟧: divergence of the resultant drift potential vector (magnitude⟦1⟧, direction⟦2⟧) on the Mars sphere (R = ⟦#0⟧ km), following⟦3⟧, Methods⟦4⟧, with central differences on the grid of the wind dataset (⟦#1⟧°). Negative values (convergence) imply deposition.
ZH: <strong>饱和输沙通量散度</strong> ⟦0⟧：合成输沙势矢量（大小⟦1⟧，方向⟦2⟧）在火星球面（R = ⟦#0⟧ km）上的散度，按⟦3⟧方法编号⟦4⟧，在风场数据集网格（⟦#1⟧°）上以中心差分计算。负值（汇）意味着堆积。

## c.1ef8a9c4 (Unused (English changed or removed))
EN: αE (elongation direction): ⟦#0⟧° (ENE)
ZH: αE（伸长方向）：⟦#0⟧°（东北偏东）

## c.e9a52542 (Unused (English changed or removed))
EN: αT (transverse migration direction): ⟦#0⟧° (ENE)
ZH: αT（横向迁移方向）：⟦#0⟧°（东北偏东）

## c.77cf5f77 (Unused (English changed or removed))
EN: RDD (resultant drift direction): ⟦#0⟧° (ENE)
ZH: RDD（合成输沙方向）：⟦#0⟧°（东北偏东）

## c.4a8617dc (Unused (English changed or removed))
EN: ⟦#0⟧° (ENE)
ZH: ⟦#0⟧°（东北偏东）

## c.4d7bcf52 (Unused (English changed or removed))
EN: αT (transverse migration direction): ⟦#0⟧° (WNW)
ZH: αT（横向迁移方向）：⟦#0⟧°（西西北）

## c.7752b77c (Unused (English changed or removed))
EN: RDD (resultant drift direction): ⟦#0⟧° (ESE)
ZH: RDD（合成输沙方向）：⟦#0⟧°（东东南）

## c.33a5156c (Unused (English changed or removed))
EN: ⟦#0⟧° (WNW)
ZH: ⟦#0⟧°（西西北）

## c.4c3ff457 (Unused (English changed or removed))
EN: ⟦#0⟧° (ESE)
ZH: ⟦#0⟧°（东东南）

## c.762593af (Unused (English changed or removed))
EN: ⟦0⟧polygons: public domain (U.S. Geological Survey)
ZH: ⟦0⟧多边形：公有领域（美国地质调查局）

## c.7a26bd74 (Unused (English changed or removed))
EN: <strong>Dune map</strong>:⟦0⟧⟦1⟧(⟦2⟧;⟦3⟧) plus the small dune fields of Fenton (⟦#0⟧, Icarus ⟦#1⟧, ⟦#2⟧), merged into ⟦#3⟧ dune-field polygons (Mars ⟦#4⟧ sphere);⟦4⟧polygons: public domain (U.S. Geological Survey).
ZH: <strong>沙丘分布图</strong>：⟦0⟧⟦1⟧（⟦2⟧；⟦3⟧）加上 Fenton（⟦#0⟧，Icarus ⟦#1⟧，⟦#2⟧）所测绘的小型沙丘区，合并为 ⟦#3⟧ 个沙丘区多边形（Mars ⟦#4⟧ 球体）；⟦4⟧多边形：公有领域（美国地质调查局）。
