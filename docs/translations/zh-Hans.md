# Dune Atlas: Simplified Chinese text

Edit only the text after `ZH:`. Keep each translation on one line. Keep unchanged:
- anything between $ signs (formulas, e.g. $u_{*,th}$), HTML tags such as <br> and <a href="…">…</a>, and {placeholders};
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
ZH: 当风的摩阻速度超过临界值时，沙粒开始运动。图层面板顶部的滑块为所有依赖临界值的地图图层以及网格单元面板设定该临界值（默认 0.15 m/s）。临界值越低，越弱的风也会被计为起沙风。

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
EN: The Concepts button (mortarboard, under the Help button) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
ZH: “概念”按钮（学士帽图标，位于“帮助”按钮下方）解释本图集中的各个物理量，并附参考文献。图层 ⓘ 中的“概念”链接可直接打开相应条目。

## earth.help.search.title (Help panel)
EN: Search
ZH: 搜索

## earth.help.search.body (Help panel)
EN: Type a dune-field name (e.g. Namib Sand Sea or Rub' al Khali), a country, or a latitude and a longitude in the box at the top of the layer panel. Names match either line of a label and the other names a field is known by, including its named parts, ignoring accents; the list under the box shows each match with its countries and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. -24.5, 15.2 or 24°30′S 15°12′E). Latitude comes first unless the letters say otherwise. The line under the box shows how the text was read; Enter moves the map there and opens the cell panel when the cell has data.
ZH: 在图层面板顶部的输入框中键入沙丘区名称（如 Namib Sand Sea 或 Rub' al Khali）、国家名称，或纬度和经度。名称可与标签的任意一行以及该沙丘区的其他名称（包括其已命名的组成部分）匹配，并忽略重音符号；输入框下方的列表显示每个匹配项及其所属国家，最佳匹配排在最前。坐标可采用十进制度，或度、分、秒格式，可带正负号，也可带 N、S、E 或 W（如 -24.5, 15.2 或 24°30′S 15°12′E）。除非字母另有说明，纬度在前。输入框下方的一行显示文本的解析结果；按 Enter 键可将地图移至该处，若该网格单元有数据，则同时打开网格单元面板。

## earth.help.cell.title (Help panel)
EN: Clicking a cell
ZH: 点击网格单元

## earth.help.cell.body (Help panel)
EN: Click any land cell to open the cell panel: the wind rose, the sand-flux rose at the current threshold, dune-orientation modes against the threshold, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the Petals switch above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The latitude and longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The crosshair button next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
ZH: 点击任意陆地网格单元即可打开网格单元面板：风玫瑰图、当前临界值下的输沙玫瑰图、沙丘走向模式随临界值的变化、输沙通量散度以及所有参数的表格。输沙玫瑰图的花瓣指向沙粒运动的去向；玫瑰图上方的“花瓣”开关可将其改为显示风的来向（箭头始终指向去向）。各节标题可折叠和展开。点击 × 或按 Esc 键可关闭面板。光标所在位置的纬度和经度显示在左下角比例尺旁（触摸屏上为最后点击的位置）。网格单元标题旁的十字准线按钮可使地图以该网格单元为中心（仅当该网格单元过小而无法看清时才会放大）。

## earth.help.datasets.title (Help panel)
EN: Wind datasets
ZH: 风场数据集

## earth.help.datasets.body (Help panel)
EN: The Wind dataset selector switches between reanalysis wind statistics (ERA5-Land, 0.1°; ERA5, 0.25°; 1950–2024). ERA5-Land, used by Gunn (2026), is a land-surface rerun driven by ERA5 atmospheric fields interpolated to its grid (Muñoz-Sabater et al. 2021), so its winds are not an independent estimate, and the datasets can still differ: e.g., Baas (2026) reports ERA5-Land 10 m wind speeds 20–30 % below those of ERA5. Where the datasets give different results, treat them as uncertain. The wind and sand-flux layers and the cell panel follow the selection; the dune-field mask, aridity and vegetation layers are the same for every dataset.
ZH: “风场数据集”选择器可在不同的再分析资料风况统计之间切换（ERA5-Land，0.1°；ERA5，0.25°；1950–2024 年）。Gunn (2026) 所用的 ERA5-Land 是由插值到其网格上的 ERA5 大气场驱动的陆面重运行产品（Muñoz-Sabater et al. 2021），因此其风场并非独立估计，但各数据集之间仍可能存在差异：例如，Baas (2026) 报告 ERA5-Land 的 10 m 风速比 ERA5 低 20–30 %。在各数据集结果不一致之处，应将结果视为不确定。风场与输沙通量图层以及网格单元面板随所选数据集变化；沙丘区掩膜、干旱指数与植被图层对所有数据集均相同。

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
EN: The button below the camera (a dashed box) saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every threshold or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
ZH: 相机按钮下方的按钮（虚线框图标）可将所选风场数据集在某一经纬度范围框内的所有网格单元保存为一个 NetCDF 文件，并附 README。输入边界，或按“在地图上绘制”并在地图上拖出一个框（按 Esc 取消）。勾选所需参数，并选择全部临界值或当前临界值；文件大小会随操作实时估算，且以浏览器可容纳的大小为上限。如需完整网格，请参见“下载与引用”下的“获取完整网格”。

## earth.help.images.title (Help panel)
EN: Exporting images
ZH: 导出图像

## earth.help.images.body (Help panel)
EN: Export map image (camera button, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
ZH: “导出地图图像”（右上角相机按钮）将当前视图保存为宽 1600–2400 像素（屏幕显示宽度的 1.5 倍）的 PNG，可选择是否包含底图，背景为白色或透明。地图下方依次为色标、图例、指北针和比例尺，然后是视图、风场数据集和数据来源信息。网格单元面板中的每幅图都有“导出”菜单，可导出 PNG（宽 1600 像素）或采用浅色主题、版式相同的 SVG。

## earth.help.share.title (Help panel)
EN: Sharing the view
ZH: 分享视图

## earth.help.share.body (Help panel)
EN: The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, wind dataset, threshold, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
ZH: 分享按钮（右上角）复制一个可恢复当前视图的短链接，包括：位置、缩放级别、地球仪或平面地图、风场数据集、临界值、底图、当前图层及其显示设置，以及所选网格单元。地址栏中也始终保存着指向当前视图的完整链接。

# Guided tour

## earth.tour.help.title (Guided tour)
EN: Welcome to the Dune Atlas
ZH: 欢迎使用 Dune Atlas

## earth.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
ZH: 本简短导览介绍主要控件。右上角此处高亮显示的“帮助”按钮（?）可打开快速参考，并可随时重新开始本导览。

## earth.tour.concepts.title (Guided tour)
EN: Concepts
ZH: 概念

## earth.tour.concepts.body (Guided tour)
EN: The Concepts button (mortarboard) explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
ZH: “概念”按钮（学士帽图标）解释地图上各物理量的含义，并附参考文献。每个图层的 ⓘ 均链接到其相应条目。

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
ZH: 此滑块设定临界摩阻风速，即风开始搬运沙粒时的摩阻速度。移动滑块时，所有依赖临界摩阻风速的图层及网格单元面板都会随之更新。

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
EN: Clicking a land cell opens the cell panel, shown here for a dune cell in the Namib Sand Sea: wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own $u_{*,th}$ slider at the top (outlined), linked to the main one. At the bottom you can download these data in NetCDF or CSV files and access citation information. The crosshair next to its title centres the map on the cell.
ZH: 点击陆地网格单元会打开网格单元面板，此处显示的是 Namib Sand Sea 中的一个沙丘网格单元：风玫瑰图、输沙玫瑰图、沙丘走向模式以及所有参数的表格。面板顶部有其自身的 $u_{*,th}$ 滑块（带轮廓线），与主滑块联动。在面板底部可以 NetCDF 或 CSV 文件下载这些数据，并获取引用信息。标题旁的十字准星可将地图居中到该网格单元。

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
EN: Earth and Mars share this atlas: the planet button below the camera swaps between them, and each atlas reopens the view you last had there.
ZH: 地球与火星共用本图集：相机按钮下方的行星按钮可在两者之间切换，且每个图集都会恢复您上次在该处的视图。

# Layer groups

## earth.group.dunes (Layer groups)
EN: Dune Fields
ZH: 沙丘区

## earth.group.dunes.desc (Layer groups)
EN: Global aeolian dune map on the 0.1° ERA5-Land grid (106,540 cells, 7.8 % of land area).
ZH: 基于 0.1° ERA5-Land 网格的全球风沙沙丘分布图（106,540 个网格单元，占陆地面积的 7.8 %）。

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
ZH: 预测的沙丘走向：床面不稳定模式的脊线走向与迁移方向，以及伸长方向和沿脊线输沙方向。

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
ZH: 脊线走向，床面不稳定模式 $\alpha_H$

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
ZH: 垂直于脊线的绝对输沙通量，床面不稳定模式 $\langle |Q_{\bot}(\alpha_H)|\rangle$

## earth.layer.qacb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qncb.title (Layers and legends)
EN: Net across-crest flux, bed-instability mode $\langle Q_{\bot}(\alpha_H)\rangle$
ZH: 垂直于脊线的净输沙通量，床面不稳定模式 $\langle Q_{\bot}(\alpha_H)\rangle$

## earth.layer.qncb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qnlb.title (Layers and legends)
EN: Net along-crest flux, bed-instability mode $\langle Q_{\parallel}(\alpha_H)\rangle$
ZH: 沿脊线的净输沙通量，床面不稳定模式 $\langle Q_{\parallel}(\alpha_H)\rangle$

## earth.layer.qnlb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## earth.layer.qalb.title (Layers and legends)
EN: Absolute along-crest flux, bed-instability mode $\langle |Q_{\parallel}(\alpha_H)|\rangle$
ZH: 沿脊线的绝对输沙通量，床面不稳定模式 $\langle |Q_{\parallel}(\alpha_H)|\rangle$

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
EN: Dimensionless flux ratios that discriminate dune morphology and stability.
ZH: 用于区分沙丘形态与稳定性的无量纲输沙通量比值。

# Layers and legends

## earth.layer.sige_sigh.title (Layers and legends)
EN: Stability of elongating dunes on starved beds $\sigma_E/\sigma_H$
ZH: 沙源不足的床面上伸长沙丘的稳定性 $\sigma_E/\sigma_H$

## earth.layer.sige_sigh.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qhab_nl_nc.title (Layers and legends)
EN: Crest straightness vs sinuosity, bed-instability mode $\hat{Q}_{\parallel/\bot,H}$
ZH: 脊线平直度与弯曲度对比，床面不稳定模式 $\hat{Q}_{\parallel/\bot,H}$

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
ZH: 平坦床面摩阻速度超过临界值的频率与程度。

# Layers and legends

## earth.layer.uft.title (Layers and legends)
EN: Fraction of time above threshold $T|u_{\ast,f}>u_{\ast,th}/T$
ZH: 超过临界值的时间比例 $T|u_{\ast,f}>u_{\ast,th}/T$

## earth.layer.uft.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.ufm.title (Layers and legends)
EN: Mean above-threshold friction velocity / threshold $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$
ZH: 超过临界值时的平均摩阻速度 / 临界值 $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$

## earth.layer.ufm.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## earth.layer.qhbf.title (Layers and legends)
EN: Fraction of bed-instability-mode flux while flat bed above threshold
ZH: 平坦床面超过临界值期间床面不稳定模式输沙通量所占比例

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
ZH: 平坦床面输沙通量：总输沙（DP）、净输沙（RDP）、其方向（RDD）及方向变率指数（RDP/DP）。

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
ZH: 未制图沙丘的陆地

# Basemaps

## earth.basemap.openfreemap-dark (Basemaps)
EN: Dark (OpenFreeMap)
ZH: 深色（OpenFreeMap）

## earth.basemap.esri-imagery (Basemaps)
EN: Satellite imagery (Esri)
ZH: 卫星影像（Esri）

## earth.basemap.hillshade (Basemaps)
EN: Shaded relief (Mapterhorn, 2D)
ZH: 晕渲地形（Mapterhorn，2D）

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
ZH: 饱和输沙率是风在完全覆盖松散干沙的平坦床面上搬运沙的速率，即风的输沙能力，而不一定是实际发生的输沙。摩阻速度低于临界摩阻风速时，饱和输沙率为零；高于临界值时，饱和输沙率随超出临界值的风应力增大而增大。地球图集采用 Martin & Kok (2017) 的输沙定律，该定律与超额剪切应力呈线性关系，其中摩阻速度 u* 由逐小时 10 m 风速按对数廓线推算，空气动力学粗糙度取 1 mm。输沙通量以每米宽度每年搬运的堆积沙体积表示（堆积体积分数 0.6，含孔隙），单位为 m²/yr。在沙源匮乏、潮湿、结皮或有植被覆盖的地方，实际输沙量更低。

## fry.heading (Concepts)
EN: Atlas DP and Fryberger DP for a steady wind
ZH: 恒定风条件下的图集 DP 与 Fryberger DP

## fry.slider (Concepts)
EN: Atlas threshold $u_{*,th}$
ZH: 图集临界值 $u_{*,th}$

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
EN: For a wind blowing at one speed for the whole year. Atlas DP: the saturated flux of Martin & Kok (2017) from $u_* = \kappa U_{10} / \ln(z/z_0)$ with $z_0$ = 1 mm, at the threshold set above. Fryberger DP: $V^2(V - V_t)$ with $V$ in knots, $V_t$ = 12 knots and the wind blowing 100 % of the time. Dashed lines: the two thresholds; between them only one DP is above zero. The ratio changes with wind speed, so there is no fixed conversion factor: for a real wind record, the ratio of the two DPs depends on its mix of wind speeds. Hours above 20 m/s are not counted by the atlas.
ZH: 假设风全年以单一风速吹刮。图集 DP：按上方设定的临界值，由 $u_* = \kappa U_{10} / \ln(z/z_0)$（$z_0$ = 1 mm）计算 Martin & Kok (2017) 的饱和输沙率。Fryberger DP：$V^2(V - V_t)$，其中 $V$ 以节为单位，$V_t$ = 12 节，风吹刮时间占 100 %。虚线表示两个临界值；在两者之间只有一种 DP 大于零。比值随风速变化，因此不存在固定的换算系数：对于实际风速序列，两种 DP 之比取决于其风速组成。风速超过 20 m/s 的时次不计入图集。

## concept.drift-potential-dp.title (Concepts)
EN: Drift potential (DP)
ZH: 输沙势（DP）

## concept.drift-potential-dp.p1 (Concepts)
EN: DP is the saturated sand flux averaged over every hour of the record, whatever its direction: how much sand the wind could move in a year over a flat sandy bed, in m²/yr. Higher DP means a windier, more energetic sand-transport environment. The name follows Fryberger & Dean (1979), whose drift potential also measures transport capacity, but the two are different quantities. Fryberger's DP is in vector units, computed from 10 m wind speeds in knots as V²(V − Vt) with a 12-knot threshold. The atlas DP is a physical flux computed from the friction velocity. Because the two formulas grow differently with wind speed, there is no fixed conversion factor, and Fryberger's low, intermediate and high-energy classes (below 200, 200–400 and above 400 vector units) do not apply to atlas values.
ZH: DP 是记录中每一小时饱和输沙率（无论其方向）的平均值，即风在一年内可在平坦沙质床面上搬运的沙量，单位为 m²/yr。DP 越高，表示风力越强、风沙输运环境能量越高。该名称沿用 Fryberger & Dean (1979)，其输沙势同样衡量输沙能力，但两者是不同的物理量。Fryberger 的 DP 以矢量单位表示，由以节为单位的 10 m 风速按 V²(V − Vt) 计算，临界风速为 12 节。图集 DP 则是由摩阻速度计算得到的物理通量。由于两个公式随风速增长的方式不同，不存在固定的换算系数，Fryberger 的低、中、高能量等级（低于 200、200–400 和高于 400 矢量单位）不适用于图集数值。

## concept.resultant-drift-potential-rdp.title (Concepts)
EN: Resultant drift potential (RDP)
ZH: 合成输沙势（RDP）

## concept.resultant-drift-potential-rdp.p1 (Concepts)
EN: RDP is the net sand flux: the hourly fluxes added as vectors, so that transport in opposite directions cancels, then averaged over the record (m²/yr). It equals DP only if all transport goes the same way. A cell with high DP but low RDP has strong winds that move sand back and forth with little net displacement; a cell with RDP close to DP moves sand steadily in one direction. RDP is the magnitude of the vector whose direction is the resultant drift direction (RDD), and the divergence of this vector gives the flux divergence layer.
ZH: RDP 为净输沙通量：将逐小时输沙通量按矢量相加，使相反方向的输沙相互抵消，再对整个序列求平均（m²/yr）。只有当所有输沙方向一致时，RDP 才等于 DP。DP 高而 RDP 低的网格单元，强风使沙物质来回搬运而净位移很小；RDP 接近 DP 的网格单元，沙物质持续向同一方向移动。RDP 是一个矢量的模，该矢量的方向即合成输沙方向（RDD），该矢量的散度即为输沙通量散度图层。

## concept.resultant-drift-direction-rdd.title (Concepts)
EN: Resultant drift direction (RDD)
ZH: 合成输沙方向（RDD）

## concept.resultant-drift-direction-rdd.p1 (Concepts)
EN: RDD is the direction of the net sand flux, given as the compass bearing toward which sand moves (0° = north, 90° = east). It summarises the direction of net sand transport over the whole record and is often compared with the migration direction of dunes and the trend of linear dunes. RDD is only meaningful when there is a clear net transport: where RDP/DP is low, opposing fluxes nearly cancel, and a small change of threshold (or grain diameter), wind dataset or neighbouring cell can turn RDD by up to 180°. The dune-orientation modes (αT, αE) use the whole distribution of flux directions, including the speed-up of the wind over dune crests, and can differ from RDD.
ZH: RDD 为净输沙通量的方向，以沙物质移动所指向的方位角表示（0° = 正北，90° = 正东）。它概括了整个序列中净输沙的方向，常与沙丘迁移方向及线形沙丘的走向进行比较。只有存在明显的净输沙时，RDD 才有意义：在 RDP/DP 较低之处，相反方向的输沙通量几乎相互抵消，临界值（或粒径）、风场数据集或相邻网格单元的微小变化都可使 RDD 偏转达 180°。沙丘走向模式（αT、αE）利用输沙通量方向的完整分布，包括风在沙丘脊线上的加速效应，因而可能与 RDD 不同。

## concept.directionality-rdp-dp.title (Concepts)
EN: Directionality (RDP/DP)
ZH: 方向变率（RDP/DP）

## concept.directionality-rdp-dp.p1 (Concepts)
EN: RDP/DP is the ratio of net to total sand flux. It is 1 when all transport goes in one direction and approaches 0 when transport from several directions cancels. Fryberger & Dean (1979) used the ratio to classify wind regimes: below 0.3 low (complex or obtuse bimodal winds), 0.3–0.8 intermediate (obtuse to acute bimodal winds), above 0.8 high (unimodal winds). Use these classes as a guide only: the atlas ratio counts only transport above the selected threshold (Gunn 2026) and uses a different flux law, so it changes with the threshold or grain-diameter setting. Wasson & Hyde (1983) related dune type to this ratio together with sand availability.
ZH: RDP/DP 为净输沙通量与总输沙通量之比。当所有输沙均沿同一方向时，其值为 1；当来自多个方向的输沙相互抵消时，其值趋近于 0。Fryberger & Dean (1979) 用该比值划分风况类型：低于 0.3 为低（复杂风况或钝角双峰风况），0.3–0.8 为中等（钝角至锐角双峰风况），高于 0.8 为高（单峰风况）。这些类别仅供参考：本图集中的比值只计入超过所选临界值的输沙（Gunn 2026），且采用不同的输沙率公式，因此会随临界值或粒径设置而变化。Wasson & Hyde (1983) 将沙丘类型与该比值及沙源供应状况联系起来。

## concept.wind-from-sand-toward.title (Concepts)
EN: Wind FROM, sand TOWARD
ZH: 风“来自”，沙“去往”

## concept.wind-from-sand-toward.p1 (Concepts)
EN: The atlas uses two opposite conventions, as is usual in each field. Wind roses are meteorological: a petal pointing north shows wind blowing from the north. Sand-flux roses, RDD and the dune-orientation modes show the direction sand or dunes move toward: a petal pointing south shows sand moving to the south. So a north wind appears as a north petal on the wind rose and a south petal on the sand rose. The Petals switch above the sand-flux rose in the cell panel can turn its petals to show the direction the wind comes from instead, as on the wind rose; the arrows on the rose, the bearing values, the map and the downloaded data keep the toward convention. The crest orientation αH is an axis (0–180°), not a direction of motion, and has neither "from" nor "toward".
ZH: 本图集采用两种相反的约定，分别沿用各自领域的惯例。风玫瑰图采用气象学约定：指向北的花瓣表示风从北方吹来。输沙玫瑰图、RDD 和沙丘走向模式表示沙物质或沙丘移动所指向的方向：指向南的花瓣表示沙物质向南移动。因此，北风在风玫瑰图上显示为指向北的花瓣，在输沙玫瑰图上显示为指向南的花瓣。网格单元面板中输沙玫瑰图上方的“花瓣”开关可将其花瓣改为显示风的来向，与风玫瑰图一致；玫瑰图上的箭头、方位角数值、地图及下载的数据仍保持“去往”约定。脊线走向 αH 是一条轴线（0–180°），而非运动方向，因此既无“来自”也无“去往”之分。

## concept.earth.threshold-friction-velocity.title (Concepts)
EN: Threshold friction velocity
ZH: 临界摩阻风速

## concept.earth.threshold-friction-velocity.p1 (Concepts)
EN: Sand moves when the friction velocity u* of the wind, a measure of the shear stress the wind exerts on the surface, exceeds a threshold u*,th. The default of 0.15 m/s is the value used for the global analysis of Gunn (2026): a common global approximation used in place of more accurate local values, not calibrated for any site. Values between 0.1 and 0.4 m/s are typical, and for loose, dry sand the threshold depends mainly on grain size and density. With the atlas's wind profile, 0.15 m/s equals a 3.4 m/s wind at 10 m (6.6 knots), and Fryberger's 12 knots equals about 0.27 m/s. Raising the threshold lowers DP and can change directions.
ZH: 当风的摩阻速度 u*（衡量风对地表所施加剪切应力的量）超过临界值 u*,th 时，沙粒开始运动。默认值 0.15 m/s 为 Gunn (2026) 全球分析所采用的值：这是一种常用的全球近似值，用以代替更准确的局地值，并未针对任何地点进行校准。典型值介于 0.1 与 0.4 m/s 之间；对于松散干燥的沙，临界值主要取决于粒径和颗粒密度。按本图集采用的风速廓线，0.15 m/s 相当于 10 m 高度处 3.4 m/s 的风速（6.6 节），而 Fryberger 的 12 节约相当于 0.27 m/s。提高临界值会降低 DP，并可能改变方向。

## concept.two-ways-dunes-orient-bed-instability-and-elongation.title (Concepts)
EN: Two ways dunes orient: bed instability and elongation
ZH: 沙丘定向的两种方式：床面不稳定性与伸长

## concept.two-ways-dunes-orient-bed-instability-and-elongation.p1 (Concepts)
EN: Dunes can grow in two ways that give different orientations in the same wind regime. Where loose sand covers the bed, dunes grow in height from the bed itself (the bed instability): crests align so that the gross sand transport across them is as large as possible (Rubin & Hunter 1987), and the dunes migrate. Where sand is scarce over a non-erodible bed, dunes can instead grow in length from a sand source (the elongation mode): they extend in the direction of the net sand flux on the dune, where the net flux across the crest is zero. Elongating dunes need winds from more than one direction, and in approximately bi-directional winds the two orientations often differ more than 90°. Comparing mapped crests with both predictions indicates which mode likely formed a dune field.
ZH: 在同一风况下，沙丘可通过两种方式生长，并形成不同的走向。在松散沙覆盖床面的地方，沙丘由床面本身发育而实现高度增长（床面不稳定性）：脊线的排列方式使跨越脊线的总输沙量尽可能大（Rubin & Hunter 1987），沙丘随之迁移。在沙源不足、下伏不可侵蚀床面的地方，沙丘则可从沙源出发实现长度增长（伸长模式）：它们沿沙丘上净输沙通量的方向延伸，此时跨越脊线的净输沙通量为零。伸长型沙丘需要来自多个方向的风；在近似双向风况下，两种走向之差往往超过 90°。将制图得到的脊线与两种预测结果进行比较，可以判断沙丘区可能由哪种模式形成。

## concept.migration-direction-αt.title (Concepts)
EN: Migration direction αT
ZH: 迁移方向 αT

## concept.migration-direction-αt.p1 (Concepts)
EN: αT is the direction in which dunes with the bed-instability crest orientation αH migrate, as a compass bearing (toward). It is perpendicular to αH, on the side toward which the net sand flux across the crest points. Because αH depends on the gross crest transport from all directions, αT reflects the whole flux rose and can differ from RDD, especially in bimodal winds. Barchan dunes migrate in the direction their horns point, so αT can be compared with mapped barchans; Gunn (2026) does this and shows that in some places the predicted direction changes strongly with the threshold, that is, with grain size or other factors such as vegetation.
ZH: αT 是具有床面不稳定性脊线走向 αH 的沙丘的迁移方向，以方位角（指向）表示。它垂直于 αH，位于跨越脊线的净输沙通量所指向的一侧。由于 αH 取决于来自所有方向的跨脊线总输沙，αT 反映的是整个输沙玫瑰图，可能与 RDD 不同，在双峰风况下尤其如此。新月形沙丘沿其两翼尖角所指方向迁移，因此可将 αT 与制图得到的新月形沙丘进行比较；Gunn (2026) 进行了这一比较，并表明在某些地区，预测方向随临界值（即随粒径或植被等其他因素）发生显著变化。

## concept.crest-orientation-αh.title (Concepts)
EN: Crest orientation αH
ZH: 脊线走向 αH

## concept.crest-orientation-αh.p1 (Concepts)
EN: αH is the orientation of dune crests formed by the bed instability: the axis along which crests receive the largest gross sand transport across them, because transport from both sides builds a dune up (Rubin & Hunter 1987). The atlas computes it with the speed-up of the wind over a dune crest, which is largest when the wind crosses the crest at a right angle. αH is also the expected crest orientation of migrating dunes such as barchans. It is an axis between 0° and 180°, not a direction of motion: e.g., 128° and 308° describe the same line. Dunes with this orientation migrate perpendicular to it, in direction αT.
ZH: αH 是由床面不稳定性形成的沙丘脊线走向：即脊线所受跨越脊线的总输沙量最大的轴线，因为来自两侧的输沙均会使沙丘增高（Rubin & Hunter 1987）。本图集利用风在沙丘脊线上的加速效应计算 αH，当风以直角穿越脊线时加速最大。αH 也是新月形沙丘等迁移型沙丘的预期脊线走向。它是介于 0° 与 180° 之间的轴向，而非运动方向：例如，128° 和 308° 表示同一条直线。具有该走向的沙丘沿垂直于它的方向迁移，即 αT 方向。

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
ZH: αO 是沿床面不稳定走向 αH 的脊线的方向，即沿这些脊线的净输沙通量的指向，以方位角（指向）表示。当脊线与净输沙方向垂直（横向）时，沙越过脊线，沿脊线的运移很少；当脊线为斜向或纵向时，部分输沙沿脊线进行，αO 指示其方向。沿脊线输沙倾向于使脊线保持平直；叠置于主脊线之上并沿其迁移的小沙丘和脊线弯曲等次级形态，可在影像上揭示沿脊线输沙的方向。

## concept.stability-of-elongating-dunes-σe-σh.title (Concepts)
EN: Stability of elongating dunes σE/σH
ZH: 伸长沙丘的稳定性 σE/σH

## concept.stability-of-elongating-dunes-σe-σh.p1 (Concepts)
EN: σE/σH compares how fast dunes grow in height in the two orientations: the gross sand transport across a crest in the elongation orientation αE divided by that across a crest in the bed-instability orientation αH. It lies between 0 and 1. A dune can exist only if winds cross its crest and build it up, whatever its orientation. In numerical simulations of dunes elongating from a sand source on a starved bed, and in dunes around the Tibesti Massif, elongating linear dunes form where σE/σH is above about 0.6; below it, the source instead produces a train of migrating barchans.
ZH: σE/σH 比较两种走向下沙丘高度增长的快慢：伸长走向 αE 上跨越脊线的总输沙除以床面不稳定走向 αH 上跨越脊线的总输沙。其取值介于 0 和 1 之间。无论走向如何，沙丘只有在风越过其脊线并使其堆积增高时才能存在。在沙源不足的床面上由沙源伸长的沙丘数值模拟中，以及在 Tibesti Massif 周边的沙丘中，伸长的线形沙丘形成于 σE/σH 大于约 0.6 的地区；低于该值时，沙源则形成一列迁移的新月形沙丘。

## concept.along-crest-versus-across-crest-transport-q-h.title (Concepts)
EN: Along-crest versus across-crest transport Q̂∥/⊥,H
ZH: 沿脊线输沙与跨脊线输沙之比 Q̂∥/⊥,H

## concept.along-crest-versus-across-crest-transport-q-h.p1 (Concepts)
EN: Q̂∥/⊥,H divides the net sand flux along crests of the bed-instability orientation by the net flux across them. Across-crest transport makes dunes migrate and tends to make crests sinuous; along-crest transport tends to keep them straight (Rubin 2012). Higher values therefore suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures how far the migration direction departs from the direction of the sand flux on the dune, an asymmetry that makes dunes such as barchans asymmetric. In examples of long-crested dunes on sand-covered beds, it is about 0.03 for transverse, 0.4 for oblique and 22 for longitudinal dunes.
ZH: Q̂∥/⊥,H 为沿床面不稳定走向脊线的净输沙通量除以跨越这些脊线的净输沙通量。跨脊线输沙使沙丘迁移，并倾向于使脊线弯曲；沿脊线输沙则倾向于使脊线保持平直（Rubin 2012）。因此，该值越高，表明沙质覆盖床面上的长脊沙丘越平直。对于在沙源不足的床面上迁移的沙丘，该比值衡量迁移方向偏离沙丘上输沙方向的程度，这种不对称性使新月形沙丘等沙丘形态不对称。在沙质覆盖床面上的长脊沙丘实例中，横向沙丘的该值约为 0.03，斜向沙丘约为 0.4，纵向沙丘约为 22。

## concept.growth-in-height-versus-migration-q-h.title (Concepts)
EN: Growth in height versus migration Q̂|⊥|/⊥,H
ZH: 高度增长与迁移之比 Q̂|⊥|/⊥,H

## concept.growth-in-height-versus-migration-q-h.p1 (Concepts)
EN: Q̂|⊥|/⊥,H divides the gross sand transport across crests of the bed-instability orientation by the net transport across them. It is never below 1. A value close to 1 means that transport across the crest goes one way, so the dunes mainly migrate. Large values mean that transport reverses across the crest and sand is piled up from both sides: the dunes grow in height and migrate little, as reversing dunes do. Because growth in height builds the coherence of a dune, larger values may also favour straighter crests. In examples of long-crested dunes on sand-covered beds, it is about 1.1 for transverse, 5 for oblique and 49 for longitudinal dunes.
ZH: Q̂|⊥|/⊥,H 为穿越床面不稳定走向脊线的总输沙与穿越脊线的净输沙之比，其值始终不小于 1。数值接近 1 表示穿越脊线的输沙朝同一方向进行，因此沙丘以迁移为主。数值较大则表示穿越脊线的输沙方向发生反转，沙从两侧堆积：沙丘以高度增长为主而迁移很少，与反向沙丘相同。由于高度增长有助于增强沙丘的整体连贯性，较大的数值也可能有利于形成更平直的脊线。在沙质覆盖床面上的长脊沙丘实例中，横向沙丘该值约为 1.1，斜向沙丘约为 5，纵向沙丘约为 49。

## concept.morphology-of-elongating-dunes-q-e.title (Concepts)
EN: Morphology of elongating dunes Q̂|⊥|/∥,E
ZH: 伸长沙丘的形态 Q̂|⊥|/∥,E

## concept.morphology-of-elongating-dunes-q-e.p1 (Concepts)
EN: Q̂|⊥|/∥,E divides the gross sand transport across crests in the elongation orientation αE by the net transport along them: the balance between growth in height and elongation. For dunes that elongate without migrating, it is the parameter expected to distinguish their shapes. On a starved bed, comparing it with Q̂|⊥|/⊥,H indicates whether elongation or migration is more likely to set dune shape and orientation: each ratio measures how strongly growth in height outweighs one of the two dynamics, and the dynamic with the larger ratio is expected to prevail. In examples of dunes on Earth it ranges from about 0.5 to 16. These parameters are still being tested against observed dune fields.
ZH: Q̂|⊥|/∥,E 为伸长方向 αE 上穿越脊线的总输沙与沿脊线的净输沙之比，反映高度增长与伸长之间的平衡。对于只伸长而不迁移的沙丘，该参数预期可区分其形态。在沙源不足的床面上，将其与 Q̂|⊥|/⊥,H 进行比较，可判断伸长还是迁移更可能决定沙丘的形态与走向：每个比值衡量高度增长相对于两种动力过程之一的优势程度，比值较大的动力过程预期占主导。在地球沙丘实例中，其范围约为 0.5 至 16。这些参数仍在与实际观测的沙丘区进行对比检验。

## concept.flux-divergence.title (Concepts)
EN: Flux divergence
ZH: 输沙通量散度

## concept.flux-divergence.p1 (Concepts)
EN: Flux divergence measures whether more sand leaves a place than arrives. It is the divergence of the net saturated flux vector (magnitude RDP, direction RDD) on the sphere, in metres of bed level per thousand years, and by conservation of sand mass it gives the rate at which the bed would be lowered or raised. Negative values (convergence) mean deposition; positive values (divergence) mean erosion. Gunn (2026) found dunes more common where flux converges. The values assume a saturated flux everywhere, that is, an unlimited supply of loose sand. On rock, gravel, crusted or vegetated surfaces the wind cannot erode sand that is not there, so positive values there indicate potential, not actual, erosion.
ZH: 输沙通量散度衡量某处流出的沙是否多于流入的沙。它是球面上净饱和输沙通量矢量（大小为 RDP，方向为 RDD）的散度，单位为每千年床面高程变化的米数；根据沙质量守恒，它给出床面降低或抬升的速率。负值（辐合）表示沉积；正值（辐散）表示侵蚀。Gunn (2026) 发现沙丘在输沙通量辐合处更为常见。这些数值假定各处均为饱和通量，即松散沙的供应不受限制。在基岩、砾石、结皮或植被覆盖的地表上，风无法侵蚀并不存在的沙，因此这些地方的正值表示潜在侵蚀，而非实际侵蚀。

## concept.earth.the-two-era5-wind-datasets.title (Concepts)
EN: The two ERA5 wind datasets
ZH: 两套 ERA5 风场数据集

## concept.earth.the-two-era5-wind-datasets.p1 (Concepts)
EN: The Earth atlas offers two hourly 10 m wind records for 1950–2024. ERA5 is ECMWF's global atmospheric reanalysis on a 0.25° grid (about 28 km). ERA5-Land re-runs ECMWF's land-surface model at 0.1° (about 9–11 km), driven by ERA5 atmospheric fields interpolated to the finer grid, so its winds are not an independent estimate. Baas (2026) reports that ERA5-Land 10 m wind speeds are systematically 20–30 % lower than those of ERA5. Gunn (2026) used ERA5-Land, and the dune map is on its grid. Neither dataset resolves winds around individual dunes or small hills. Where the two datasets give different directions, ratios or fluxes, treat the result as uncertain.
ZH: 地球图集提供 1950–2024 年两套逐小时 10 m 风速序列。ERA5 是 ECMWF 的全球大气再分析资料，网格分辨率为 0.25°（约 28 km）。ERA5-Land 以 0.1°（约 9–11 km）的分辨率重新运行 ECMWF 的陆面模式，其驱动场为插值到更细网格上的 ERA5 大气场，因此其风场并非独立的估计。Baas (2026) 指出，ERA5-Land 的 10 m 风速系统性地比 ERA5 低 20–30 %。Gunn (2026) 使用的是 ERA5-Land，沙丘分布图也基于其网格。两套数据集均无法分辨单个沙丘或小山丘周围的风场。若两套数据集给出的方向、比值或通量不同，应将结果视为不确定。

# Help panel

## mars.help.threshold.title (Help panel)
EN: Median grain diameter $d$
ZH: 沙粒中值粒径 $d$

## mars.help.threshold.body (Help panel)
EN: Sand moves when the friction velocity of the wind exceeds a threshold that depends on the grain size and on the thin Martian air. The slider at the top of the layer panel sets the median grain diameter d (50–1000 µm, default 200 µm) for every grain-size-dependent map layer and for the cell panel. For every hour of the Mars year the threshold $u_{*,th}$ is computed from d and that hour's air density and temperature (Pähtz & Durán 2023).
ZH: 当风的摩阻速度超过某一临界值时，沙粒开始运动，该临界值取决于粒径以及稀薄的火星大气。图层面板顶部的滑块用于设定中值粒径 d（50–1000 µm，默认 200 µm），该值适用于所有依赖粒径的地图图层以及网格单元面板。对于火星年的每一小时，临界值 $u_{*,th}$ 均由 d 以及该小时的空气密度和温度计算得出（Pähtz & Durán 2023）。

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
EN: The Concepts button (mortarboard, under the Help button) explains the quantities of the atlas, each with its references. The Concept link in a layer's ⓘ opens its entry.
ZH: “概念”按钮（学士帽图标，位于“帮助”按钮下方）解释本图集中的各个物理量，并附参考文献。图层 ⓘ 中的“概念”链接可直接打开相应条目。

## mars.help.search.title (Help panel)
EN: Search
ZH: 搜索

## mars.help.search.body (Help panel)
EN: Type a feature name (e.g. Gale crater or Olympia Undae) or a latitude and a longitude in the box at the top of the layer panel. Names are IAU-approved feature names from the Gazetteer of Planetary Nomenclature, with a few informal aliases (e.g. Bagnold Dunes); the list under the box shows each match with its feature type and the best matches first. Coordinates can be in decimal degrees or in degrees, minutes and seconds, signed or with N, S, E or W (e.g. 4.5, 137.4 or 4°30′N 137°24′E). Latitude comes first unless the letters say otherwise. Longitudes are planetocentric and east-positive, from −180° to 180°; a longitude typed as 0–360° E (e.g. 354.8) is converted (to −5.2). The line under the box shows how the text was read; Enter moves the map there and opens the cell panel when the cell has data.
ZH: 在图层面板顶部的输入框中键入地物名称（如 Gale crater 或 Olympia Undae）或纬度和经度。名称为 Gazetteer of Planetary Nomenclature 中经 IAU 批准的地物名称，另有少量非正式别名（如 Bagnold Dunes）；输入框下方的列表显示每个匹配项及其地物类型，最佳匹配排在最前。坐标可采用十进制度或度、分、秒格式，可带正负号或 N、S、E、W（如 4.5, 137.4 或 4°30′N 137°24′E）。除非字母另有说明，纬度在前。经度为行星中心经度，以东为正，范围为 −180° 至 180°；以 0–360° E 输入的经度（如 354.8）会被换算（为 −5.2）。输入框下方的一行显示文本的解析结果；按 Enter 键可将地图移至该处，若该网格单元有数据则同时打开网格单元面板。

## mars.help.cell.title (Help panel)
EN: Clicking a cell
ZH: 点击网格单元

## mars.help.cell.body (Help panel)
EN: Click any cell to open the cell panel: the wind rose, the sand-flux rose at the current grain diameter, dune-orientation modes against the grain diameter, the flux divergence and a table of all parameters. Sand-flux rose petals point toward where sand moves; the Petals switch above the rose turns them to show where the wind comes from instead (the arrows always point toward). Section headings fold and unfold. Close the panel with × or Esc. The planetocentric latitude and east longitude under the cursor are shown next to the scale bar, bottom left (on touch screens: the last tapped point). The crosshair button next to the cell title centres the map on the cell (zooming in only if the cell would be too small to see).
ZH: 点击任意网格单元即可打开网格单元面板：其中包括风玫瑰图、当前粒径下的输沙玫瑰图、沙丘走向模式随粒径的变化、输沙通量散度以及全部参数表。输沙玫瑰图的花瓣指向沙粒移动的去向；玫瑰图上方的“花瓣”开关可将其改为显示风的来向（箭头始终指向去向）。各节标题可折叠和展开。按 × 或 Esc 关闭面板。光标处的行星中心纬度和东经显示在左下角比例尺旁（触摸屏上为最后点击的点）。网格单元标题旁的十字准线按钮可使地图以该网格单元为中心（仅当网格单元过小而难以看清时才放大）。

## mars.help.datasets.title (Help panel)
EN: Wind dataset
ZH: 风场数据集

## mars.help.datasets.body (Help panel)
EN: The winds are the hourly lowest-level winds of a Mars climate model over one Mars year (e.g., the MCMC FV3-based Mars Global Climate Model, beta release 1: 2° grid, 16,032 hourly samples). The wind and sand-flux layers and the cell panel use the dataset shown in the Wind dataset selector.
ZH: 风场为某一火星气候模式在一个火星年内的逐小时最低层风（例如基于 MCMC FV3 的火星全球气候模式 beta 1 版：2° 网格，16,032 个逐小时样本）。风场与输沙通量图层以及网格单元面板均使用“风场数据集”选择器中显示的数据集。

## mars.help.basemaps.title (Help panel)
EN: Basemaps
ZH: 底图

## mars.help.basemaps.body (Help panel)
EN: The opening basemap is a shaded relief of the MOLA–HRSC blended elevation model (Fergason, Hare & Laura 2018), released under CC BY-SA 3.0 IGO (derived from HRSC, CC BY-SA 3.0 IGO, and MOLA, CC0). Under Basemap you can also choose OpenPlanetaryMap and Esri's Mars imagery: the global CTX mosaic (about 5 m per pixel; The Murray Lab), HiRISE (down to about 25 cm per pixel), the Viking MDIM 2.1 colour mosaic and the MOLA–HRSC colour shaded relief. HiRISE covers only the small part of the surface it has imaged; elsewhere the map is dark. Credits are in the map attribution.
ZH: 初始底图为 MOLA–HRSC 融合高程模型的晕渲地形（Fergason, Hare & Laura 2018），以 CC BY-SA 3.0 IGO 许可发布（源自 HRSC，CC BY-SA 3.0 IGO；以及 MOLA，CC0）。在“底图”中还可选择 OpenPlanetaryMap 与 Esri 的火星影像：全球 CTX 镶嵌图（约 5 m/像素；The Murray Lab）、HiRISE（最高约 25 cm/像素）、Viking MDIM 2.1 彩色镶嵌图以及 MOLA–HRSC 彩色晕渲地形。HiRISE 仅覆盖其已成像的一小部分地表，其他区域地图显示为暗色。版权信息见地图署名。

## mars.help.downloads.title (Help panel)
EN: Downloads and citation
ZH: 下载与引用

## mars.help.downloads.body (Help panel)
EN: Download & cite in the cell panel saves the hourly wind and air series and all parameters of the cell as NetCDF or as a CSV bundle, with the citation of every data source. Please cite the wind dataset, Pähtz & Durán (2023) for the transport law and Gunn (2026), which outlines the methods.
ZH: 网格单元面板中的“下载与引用”可将该网格单元的逐小时风与大气序列及全部参数保存为 NetCDF 文件或 CSV 文件包，并附每个数据来源的引用信息。请引用所用风场数据集、输沙定律的出处 Pähtz & Durán (2023)，以及概述方法的 Gunn (2026)。

## mars.help.region.title (Help panel)
EN: Downloading a region
ZH: 下载区域数据

## mars.help.region.body (Help panel)
EN: The button below the camera (a dashed box) saves every cell of the selected wind dataset in a latitude-longitude box as one NetCDF file with a README. Type the bounds, or press Draw on map and drag a box on the map (Esc cancels). Tick the parameters and choose every grain diameter or the current one; the size is estimated as you go and is limited to what a browser can hold. For the whole grid, see Get the whole grid under Download & cite.
ZH: 相机按钮下方的按钮（虚线框图标）可将所选风场数据集在某一经纬度范围内的所有网格单元保存为一个 NetCDF 文件，并附 README。可输入边界，或点击“在地图上绘制”后在地图上拖出一个矩形框（按 Esc 取消）。勾选所需参数，并选择全部粒径或当前粒径；文件大小会随操作实时估算，并以浏览器可容纳的数据量为上限。如需完整网格，请参见“下载与引用”中的“获取完整网格”。

## mars.help.images.title (Help panel)
EN: Exporting images
ZH: 导出图像

## mars.help.images.body (Help panel)
EN: Export map image (camera button, top right) saves the current view as a PNG 1600–2400 pixels wide (1.5 times its on-screen width), with or without the basemap, on a white or transparent background. Below the map come the colour bars, legends, north arrow and scale bar, then the view, wind dataset and data sources. Each plot in the cell panel has an Export menu for a PNG (1600 pixels wide) or an SVG in a light theme with the same layout.
ZH: “导出地图图像”（右上角相机按钮）将当前视图保存为宽 1600–2400 像素（屏幕显示宽度的 1.5 倍）的 PNG，可选择是否包含底图，背景为白色或透明。地图下方依次为色标、图例、指北针和比例尺，然后是视图、风场数据集和数据来源信息。网格单元面板中的每幅图都有“导出”菜单，可导出 PNG（宽 1600 像素）或采用浅色主题、版式相同的 SVG。

## mars.help.share.title (Help panel)
EN: Sharing the view
ZH: 分享视图

## mars.help.share.body (Help panel)
EN: The share button (top right) copies a short link that restores this view: position, zoom, globe or flat map, grain diameter, basemap, the active layers with their display settings, and the selected cell. The address bar also always holds a full link to the current view.
ZH: 分享按钮（右上角）可复制一个短链接，用于恢复当前视图：位置、缩放级别、球面或平面地图、粒径、底图、当前图层及其显示设置，以及所选网格单元。地址栏中也始终保存着指向当前视图的完整链接。

# Guided tour

## mars.tour.help.title (Guided tour)
EN: Welcome to the Mars Dune Atlas
ZH: 欢迎使用 Mars Dune Atlas

## mars.tour.help.body (Guided tour)
EN: This short tour shows the main controls. The Help button (?) highlighted here, in the top-right corner, opens a quick reference and restarts this tour at any time.
ZH: 本简短导览介绍主要控件。右上角此处高亮显示的“帮助”按钮（?）可打开快速参考，并可随时重新开始本导览。

## mars.tour.concepts.title (Guided tour)
EN: Concepts
ZH: 概念

## mars.tour.concepts.body (Guided tour)
EN: The Concepts button (mortarboard) explains what the quantities on the map mean, with references. Each layer's ⓘ links to its entry.
ZH: “概念”按钮（学士帽图标）解释地图上各物理量的含义，并附参考文献。每个图层的 ⓘ 均链接到其相应条目。

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
EN: This slider sets the grain diameter. The threshold friction velocity is computed for every hour from d and the hour's air density and temperature; every grain-size-dependent layer and the cell panel update as you move it.
ZH: 此滑块用于设置粒径。临界摩阻风速根据 d 以及该小时的空气密度和温度逐小时计算；移动滑块时，所有依赖粒径的图层及网格单元面板都会随之更新。

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
EN: Clicking a cell opens the cell panel, shown here for the dune field of Nili Patera (9° N, 67° E): wind rose, sand-flux rose, dune-orientation modes and a table of all parameters. The panel has its own grain-diameter slider at the top (outlined), linked to the main one. At the bottom you can download these data in NetCDF or CSV files and access citation information. The crosshair next to its title centres the map on the cell.
ZH: 点击网格单元会打开网格单元面板，此处以 Nili Patera（9° N, 67° E）的沙丘区为例：包括风玫瑰图、输沙玫瑰图、沙丘走向模式以及全部参数表。面板顶部有独立的粒径滑块（以框线标出），与主滑块联动。在面板底部可以以 NetCDF 或 CSV 文件下载这些数据，并获取引用信息。标题旁的十字准星可将地图居中到该网格单元。

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
EN: Earth and Mars share this atlas: the planet button below the camera swaps between them, and each atlas reopens the view you last had there.
ZH: 地球与火星共用本图集：相机按钮下方的行星按钮可在两者之间切换，且每个图集都会恢复您上次在该处的视图。

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
ZH: 预测的沙丘走向：床面不稳定模式的脊线走向与迁移方向，以及伸长方向和沿脊线输沙方向。

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
ZH: 脊线走向，床面不稳定模式 $\alpha_H$

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
ZH: 垂直于脊线的绝对输沙通量，床面不稳定模式 $\langle |Q_{\bot}(\alpha_H)|\rangle$

## mars.layer.qacb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qncb.title (Layers and legends)
EN: Net across-crest flux, bed-instability mode $\langle Q_{\bot}(\alpha_H)\rangle$
ZH: 垂直于脊线的净输沙通量，床面不稳定模式 $\langle Q_{\bot}(\alpha_H)\rangle$

## mars.layer.qncb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qnlb.title (Layers and legends)
EN: Net along-crest flux, bed-instability mode $\langle Q_{\parallel}(\alpha_H)\rangle$
ZH: 沿脊线的净输沙通量，床面不稳定模式 $\langle Q_{\parallel}(\alpha_H)\rangle$

## mars.layer.qnlb.units (Layers and legends)
EN: m²/yr
ZH: m²/yr

## mars.layer.qalb.title (Layers and legends)
EN: Absolute along-crest flux, bed-instability mode $\langle |Q_{\parallel}(\alpha_H)|\rangle$
ZH: 沿脊线的绝对输沙通量，床面不稳定模式 $\langle |Q_{\parallel}(\alpha_H)|\rangle$

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
EN: Dimensionless flux ratios that discriminate dune morphology and stability.
ZH: 用于区分沙丘形态与稳定性的无量纲输沙通量比值。

# Layers and legends

## mars.layer.sige_sigh.title (Layers and legends)
EN: Stability of elongating dunes on starved beds $\sigma_E/\sigma_H$
ZH: 沙源不足的床面上伸长沙丘的稳定性 $\sigma_E/\sigma_H$

## mars.layer.sige_sigh.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qhab_nl_nc.title (Layers and legends)
EN: Crest straightness vs sinuosity, bed-instability mode $\hat{Q}_{\parallel/\bot,H}$
ZH: 脊线平直度与弯曲度对比，床面不稳定模式 $\hat{Q}_{\parallel/\bot,H}$

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
ZH: 平坦床面摩阻速度超过临界值的频率与程度。

# Layers and legends

## mars.layer.uft.title (Layers and legends)
EN: Fraction of time above threshold $T|u_{\ast,f}>u_{\ast,th}/T$
ZH: 超过临界值的时间比例 $T|u_{\ast,f}>u_{\ast,th}/T$

## mars.layer.uft.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.ufm.title (Layers and legends)
EN: Mean above-threshold friction velocity / threshold $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$
ZH: 超过临界值时的平均摩阻速度 / 临界值 $\langle u_{\ast,f}|u_{\ast,f}>u_{\ast,th}\rangle/u_{\ast,th}$

## mars.layer.ufm.units (Layers and legends)
EN: dimensionless
ZH: 无量纲

## mars.layer.qhbf.title (Layers and legends)
EN: Fraction of bed-instability-mode flux while flat bed above threshold
ZH: 平坦床面超过临界值期间床面不稳定模式输沙通量所占比例

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
ZH: 平坦床面输沙通量：总输沙（DP）、净输沙（RDP）、其方向（RDD）及方向变率指数（RDP/DP）。

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
ZH: 晕渲地形（MOLA–HRSC，2D）

## mars.basemap.opm-mars (Basemaps)
EN: OpenPlanetaryMap Mars (v0.2)
ZH: OpenPlanetaryMap Mars（v0.2）

## mars.basemap.esri-ctx1 (Basemaps)
EN: CTX mosaic, 5 m (Murray Lab V01, Esri)
ZH: CTX 镶嵌图，5 m（Murray Lab V01，Esri）

## mars.basemap.esri-hirise (Basemaps)
EN: HiRISE, where imaged (Esri)
ZH: HiRISE（仅限已成像区域）（Esri）

## mars.basemap.esri-mdim (Basemaps)
EN: Viking MDIM 2.1 colour (Esri)
ZH: Viking MDIM 2.1 彩色（Esri）

## mars.basemap.esri-mcolordem (Basemaps)
EN: MOLA–HRSC colour shaded relief (Esri)
ZH: MOLA–HRSC 彩色晕渲地形（Esri）

# Concepts

## concept.mars.saturated-sand-flux-and-the-transport-law.title (Concepts)
EN: Saturated sand flux and the transport law
ZH: 饱和输沙率与输沙定律

## concept.mars.saturated-sand-flux-and-the-transport-law.p1 (Concepts)
EN: Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. On Mars the atlas uses the transport law of Pähtz & Durán (2023), derived from numerical simulations for planetary conditions. For every hour, the friction velocity u* comes from the lowest-level wind of the climate model through a smooth-wall profile, and the threshold from the grain diameter and that hour's air density and temperature. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per Earth year (m²/yr), as on Earth. Real transport is lower wherever sand is scarce or indurated.
ZH: 饱和输沙率是指风在完全覆盖松散干沙的平坦床面上搬运沙粒的速率：即风的输沙能力，而不一定是实际发生的输沙。在火星上，本图集采用 Pähtz & Durán (2023) 的输沙定律，该定律由针对行星条件的数值模拟推导得出。对于每一小时，摩阻速度 u* 由气候模式最低层的风速通过光滑壁面廓线求得，临界值则由颗粒粒径以及该小时的空气密度和温度求得。输沙率以每米宽度每地球年搬运的密实沙体积表示（堆积体积分数 0.6，含孔隙空间），单位为 m²/yr，与地球相同。在沙源稀少或沙面固结的地方，实际输沙量较低。

## concept.mars.grain-size-and-threshold.title (Concepts)
EN: Grain size and threshold
ZH: 粒径与临界值

## concept.mars.grain-size-and-threshold.p1 (Concepts)
EN: On Mars the slider sets the median grain diameter d rather than the threshold. The threshold friction velocity is computed for every hour from d and that hour's air density and temperature with the law of Pähtz & Durán (2023), because the thin, cold Martian air changes from hour to hour and season to season. Martian air near the surface is only about 1–2 % as dense as Earth's, so a much higher friction velocity is needed to move the same grains. The cell panel shows the median threshold over the year, its 5–95 % range, the equivalent wind at the lowest model level and the share of hours above threshold.
ZH: 在火星上，滑块设定的是中值粒径 d，而非临界值。临界摩阻风速根据 d 以及该小时的空气密度和温度，采用 Pähtz & Durán (2023) 的定律逐小时计算，因为稀薄、寒冷的火星大气随小时和季节不断变化。火星近地表大气密度仅约为地球的 1–2 %，因此需要高得多的摩阻速度才能搬运同样的颗粒。网格单元面板显示全年临界值的中位数、其 5–95 % 范围、模式最低层的等效风速以及超过临界值的小时占比。

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
ZH: 花瓣：

## cell.petalsToward (Interface)
EN: toward
ZH: 去向

## cell.petalsFrom (Interface)
EN: from
ZH: 来向
