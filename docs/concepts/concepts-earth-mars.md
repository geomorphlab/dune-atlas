# Concepts panel: content (not shipped yet)

Content for the later Concepts panel of both atlases, stored verbatim from the PI-edited text
`earth-physics-text_AG.md` (October 2026), sections 5 and 6. Each entry: title with its planet tag
(Earth, Mars or both), text, references. Do not edit here without the PI; when the panel is built,
the entries are taken from this file unchanged (markup only adapted).

---

## 5. Concepts panel entries

*Where: per-planet content files for the Concepts panel. Each entry: title, planet, text, references.*

### Saturated sand flux and the transport law — Earth

Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. It is zero below the threshold friction velocity and grows with the excess wind stress above it. The Earth atlas uses the transport law of Martin & Kok (2017), which is linear in the excess shear stress, with the friction velocity u* derived from the hourly 10 m wind by a logarithmic profile with a roughness length of 1 mm. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per year (m²/yr). Real transport is lower wherever sand is scarce, wet, crusted or vegetated.

References: Martin & Kok (2017); Gunn (2026).

### Saturated sand flux and the transport law — Mars

Saturated sand flux is the rate at which wind would move sand over a flat bed fully covered by loose, dry sand: the transport capacity of the wind, not necessarily the transport actually taking place. On Mars the atlas uses the transport law of Pähtz & Durán (2023), derived from numerical simulations for planetary conditions. For every hour, the friction velocity u* comes from the lowest-level wind of the climate model through a smooth-wall profile, and the threshold from the grain diameter and that hour's air density and temperature. Fluxes are volumes of packed sand (packing fraction 0.6, pore space included) per metre width per Earth year (m²/yr), as on Earth. Real transport is lower wherever sand is scarce or indurated.

References: Pähtz & Durán (2023); Gunn (2026).

### Drift potential (DP) — both

DP is the saturated sand flux averaged over every hour of the record, whatever its direction: how much sand the wind could move in a year over a flat sandy bed, in m²/yr. Higher DP means a windier, more energetic sand-transport environment. The name follows Fryberger & Dean (1979), whose drift potential also measures transport capacity, but the two are different quantities. Fryberger's DP is in vector units, computed from 10 m wind speeds in knots as V²(V − Vt) with a 12-knot threshold. The atlas DP is a physical flux computed from the friction velocity. Because the two formulas grow differently with wind speed, there is no fixed conversion factor, and Fryberger's low, intermediate and high-energy classes (below 200, 200–400 and above 400 vector units) do not apply to atlas values.

References: Fryberger & Dean (1979); Gunn (2026).

### Resultant drift potential (RDP) — both

RDP is the net sand flux: the hourly fluxes added as vectors, so that transport in opposite directions cancels, then averaged over the record (m²/yr). It equals DP only if all transport goes the same way. A cell with high DP but low RDP has strong winds that move sand back and forth with little net displacement; a cell with RDP close to DP moves sand steadily in one direction. RDP is the magnitude of the vector whose direction is the resultant drift direction (RDD), and the divergence of this vector gives the flux divergence layer.

References: Fryberger & Dean (1979); Gunn (2026).

### Resultant drift direction (RDD) — both

RDD is the direction of the net sand flux, given as the compass bearing toward which sand moves (0° = north, 90° = east). It summarises the direction of net sand transport over the whole record and is often compared with the migration direction of dunes and the trend of linear dunes. RDD is only meaningful when there is a clear net transport: where RDP/DP is low, opposing fluxes nearly cancel, and a small change of threshold (or grain diameter), wind dataset or neighbouring cell can turn RDD by up to 180°. The dune-orientation modes (αT, αE) use the whole distribution of flux directions, including the speed-up of the wind over dune crests, and can differ from RDD.

References: Fryberger & Dean (1979); Courrech du Pont et al. (2024).

### Directionality (RDP/DP) — both

RDP/DP is the ratio of net to total sand flux. It is 1 when all transport goes in one direction and approaches 0 when transport from several directions cancels. Fryberger & Dean (1979) used the ratio to classify wind regimes: below 0.3 low (complex or obtuse bimodal winds), 0.3–0.8 intermediate (obtuse to acute bimodal winds), above 0.8 high (unimodal winds). Use these classes as a guide only: the atlas ratio counts only transport above the selected threshold (Gunn 2026) and uses a different flux law, so it changes with the threshold or grain-diameter setting. Wasson & Hyde (1983) related dune type to this ratio together with sand availability.

References: Fryberger & Dean (1979); Wasson & Hyde (1983); Gunn (2026).

### Wind FROM, sand TOWARD — both

The atlas uses two opposite conventions, as is usual in each field. Wind roses are meteorological: a petal pointing north shows wind blowing from the north. Sand-flux roses, RDD and the dune-orientation modes show the direction sand or dunes move toward: a petal pointing south shows sand moving to the south. So a north wind appears as a north petal on the wind rose and a south petal on the sand rose. The crest orientation αH is an axis (0–180°), not a direction of motion, and has neither "from" nor "toward".

References: none.

### Threshold friction velocity — Earth

Sand moves when the friction velocity u* of the wind, a measure of the shear stress the wind exerts on the surface, exceeds a threshold u*,th. The default of 0.15 m/s is the value used for the global analysis of Gunn (2026): a common global approximation used in place of more accurate local values, not calibrated for any site. Values between 0.1 and 0.4 m/s are typical, and for loose, dry sand the threshold depends mainly on grain size and density. With the atlas's wind profile, 0.15 m/s equals a 3.4 m/s wind at 10 m (6.6 knots), and Fryberger's 12 knots equals about 0.27 m/s. Raising the threshold lowers DP and can change directions.

References: Gunn (2026); Fryberger & Dean (1979); Baas (2026).

### Grain size and threshold — Mars

On Mars the slider sets the median grain diameter d rather than the threshold. The threshold friction velocity is computed for every hour from d and that hour's air density and temperature with the law of Pähtz & Durán (2023), because the thin, cold Martian air changes from hour to hour and season to season. Martian air near the surface is only about 1–2 % as dense as Earth's, so a much higher friction velocity is needed to move the same grains. The cell panel shows the median threshold over the year, its 5–95 % range, the equivalent wind at the lowest model level and the share of hours above threshold.

References: Pähtz & Durán (2023).

### Two ways dunes orient: bed instability and elongation — both

Dunes can grow in two ways that give different orientations in the same wind regime. Where loose sand covers the bed, dunes grow in height from the bed itself (the bed instability): crests align so that the gross sand transport across them is as large as possible (Rubin & Hunter 1987), and the dunes migrate. Where sand is scarce over a non-erodible bed, dunes can instead grow in length from a sand source (the elongation mode): they extend in the direction of the net sand flux on the dune, where the net flux across the crest is zero. Elongating dunes need winds from more than one direction, and in approximately bi-directional winds the two orientations often differ more than 90°. Comparing mapped crests with both predictions indicates which mode likely formed a dune field.

References: Rubin & Hunter (1987); Courrech du Pont et al. (2014); Courrech du Pont et al. (2024).

### Migration direction αT — both

αT is the direction in which dunes with the bed-instability crest orientation αH migrate, as a compass bearing (toward). It is perpendicular to αH, on the side toward which the net sand flux across the crest points. Because αH depends on the gross crest transport from all directions, αT reflects the whole flux rose and can differ from RDD, especially in bimodal winds. Barchan dunes migrate in the direction their horns point, so αT can be compared with mapped barchans; Gunn (2026) does this and shows that in some places the predicted direction changes strongly with the threshold, that is, with grain size or other factors such as vegetation.

References: Gunn (2026); Courrech du Pont et al. (2024).

### Crest orientation αH — both

αH is the orientation of dune crests formed by the bed instability: the axis along which crests receive the largest gross sand transport across them, because transport from both sides builds a dune up (Rubin & Hunter 1987). The atlas computes it with the speed-up of the wind over a dune crest, which is largest when the wind crosses the crest at a right angle. αH is also the expected crest orientation of migrating dunes such as barchans. It is an axis between 0° and 180°, not a direction of motion: e.g., 128° and 308° describe the same line. Dunes with this orientation migrate perpendicular to it, in direction αT.

References: Rubin & Hunter (1987); Courrech du Pont et al. (2024); Gunn (2026).

### Elongation direction αE — both

αE is the direction in which dunes of the elongation mode extend, as a compass bearing (toward). These dunes form where sand is limited over a non-erodible bed, typically growing from a fixed source such as sand trapped behind an obstacle. A dune elongates where the net sand flux across its crest is zero and the net flux along it is positive; this direction is stable, because transport turns a dune that deviates from it back toward it. Because the dune itself changes the winds it feels, αE can be longitudinal or oblique to RDD. An elongating dune needs winds from more than one direction. Where several elongation directions exist, as for star dunes, the atlas shows the most stable one.

References: Courrech du Pont et al. (2014); Courrech du Pont et al. (2024).

### Along-crest transport direction αO — both

αO is a direction along the crests of the bed-instability orientation αH: the way the net sand flux along those crests points, as a compass bearing (toward). Where crests are transverse to the net transport, sand crosses them with little along-crest movement; where they are oblique or longitudinal, part of the transport runs along the crest, and αO shows which way. Along-crest transport tends to keep crests straight, and superimposed features such as small dunes and crest sinuosities that migrate along a main crest reveal the direction of along-crest transport on imagery.

References: Rubin (2012); Courrech du Pont et al. (2024).

### Stability of elongating dunes σE/σH — both

σE/σH compares how fast dunes grow in height in the two orientations: the gross sand transport across a crest in the elongation orientation αE divided by that across a crest in the bed-instability orientation αH. It lies between 0 and 1. A dune can exist only if winds cross its crest and build it up, whatever its orientation. In numerical simulations of dunes elongating from a sand source on a starved bed, and in dunes around the Tibesti Massif, elongating linear dunes form where σE/σH is above about 0.6; below it, the source instead produces a train of migrating barchans.

References: Gao et al. (2015); Courrech du Pont et al. (2024).

### Along-crest versus across-crest transport Q̂∥/⊥,H — both

Q̂∥/⊥,H divides the net sand flux along crests of the bed-instability orientation by the net flux across them. Across-crest transport makes dunes migrate and tends to make crests sinuous; along-crest transport tends to keep them straight (Rubin 2012). Higher values therefore suggest straighter long-crested dunes on sand-covered beds. For dunes migrating on starved beds, the ratio measures how far the migration direction departs from the direction of the sand flux on the dune, an asymmetry that makes dunes such as barchans asymmetric. In examples of long-crested dunes on sand-covered beds, it is about 0.03 for transverse, 0.4 for oblique and 22 for longitudinal dunes.

References: Rubin (2012); Courrech du Pont et al. (2024).

### Growth in height versus migration Q̂|⊥|/⊥,H — both

Q̂|⊥|/⊥,H divides the gross sand transport across crests of the bed-instability orientation by the net transport across them. It is never below 1. A value close to 1 means that transport across the crest goes one way, so the dunes mainly migrate. Large values mean that transport reverses across the crest and sand is piled up from both sides: the dunes grow in height and migrate little, as reversing dunes do. Because growth in height builds the coherence of a dune, larger values may also favour straighter crests. In examples of long-crested dunes on sand-covered beds, it is about 1.1 for transverse, 5 for oblique and 49 for longitudinal dunes.

References: Courrech du Pont et al. (2024).

### Morphology of elongating dunes Q̂|⊥|/∥,E — both

Q̂|⊥|/∥,E divides the gross sand transport across crests in the elongation orientation αE by the net transport along them: the balance between growth in height and elongation. For dunes that elongate without migrating, it is the parameter expected to distinguish their shapes. On a starved bed, comparing it with Q̂|⊥|/⊥,H indicates whether elongation or migration is more likely to set dune shape and orientation: each ratio measures how strongly growth in height outweighs one of the two dynamics, and the dynamic with the larger ratio is expected to prevail. In examples of dunes on Earth it ranges from about 0.5 to 16. These parameters are still being tested against observed dune fields.

References: Courrech du Pont et al. (2024).

### Flux divergence — both

Flux divergence measures whether more sand leaves a place than arrives. It is the divergence of the net saturated flux vector (magnitude RDP, direction RDD) on the sphere, in metres of bed level per thousand years, and by conservation of sand mass it gives the rate at which the bed would be lowered or raised. Negative values (convergence) mean deposition; positive values (divergence) mean erosion. Gunn (2026) found dunes more common where flux converges. The values assume a saturated flux everywhere, that is, an unlimited supply of loose sand. On rock, gravel, crusted or vegetated surfaces the wind cannot erode sand that is not there, so positive values there indicate potential, not actual, erosion.

References: Gunn (2026).

### The two ERA5 wind datasets — Earth

The Earth atlas offers two hourly 10 m wind records for 1950–2024. ERA5 is ECMWF's global atmospheric reanalysis on a 0.25° grid (about 28 km). ERA5-Land re-runs ECMWF's land-surface model at 0.1° (about 9–11 km), driven by ERA5 atmospheric fields interpolated to the finer grid, so its winds are not an independent estimate. Baas (2026) reports that ERA5-Land 10 m wind speeds are systematically 20–30 % lower than those of ERA5. Gunn (2026) used ERA5-Land, and the dune map is on its grid. Neither dataset resolves winds around individual dunes or small hills. Where the two datasets give different directions, ratios or fluxes, treat the result as uncertain.

References: Hersbach et al. (2020); Muñoz-Sabater et al. (2021); Baas (2026); Gunn (2026).

---

## 6. References

Baas, A. C. W. (2026). Systematic under-representation of ERA5 10 m wind speeds in the ERA5-Land product undermines wind energy studies. Applied Energy 412, 127634. doi:10.1016/j.apenergy.2026.127634

Courrech du Pont, S., Narteau, C. and Gao, X. (2014). Two modes for dune orientation. Geology 42, 743–746. doi:10.1130/G35657.1

Courrech du Pont, S., Rubin, D. M., Narteau, C., Lapôtre, M. G. A., Day, M., Claudin, P. et al. (2024). Complementary classifications of aeolian dunes based on morphology, dynamics, and fluid mechanics. Earth-Science Reviews 255, 104772. doi:10.1016/j.earscirev.2024.104772

Fryberger, S. G. and Dean, G. (1979). Dune forms and wind regime. In: McKee, E. D. (ed.), A Study of Global Sand Seas, U.S. Geological Survey Professional Paper 1052, pp. 137–169. United States Government Printing Office, Washington, DC. doi:10.3133/pp1052

Gao, X., Narteau, C., Rozier, O. and Courrech du Pont, S. (2015). Phase diagrams of dune shape and orientation depending on sand availability. Scientific Reports 5, 14677. doi:10.1038/srep14677

Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications 17, 8468. doi:10.1038/s41467-026-75466-y

Hersbach, H. et al. (2020). The ERA5 global reanalysis. Quarterly Journal of the Royal Meteorological Society 146, 1999–2049. doi:10.1002/qj.3803

Martin, R. L. and Kok, J. F. (2017). Wind-invariant saltation heights imply linear scaling of aeolian saltation flux with shear stress. Science Advances 3, e1602569. doi:10.1126/sciadv.1602569

Muñoz-Sabater, J. et al. (2021). ERA5-Land: a state-of-the-art global reanalysis dataset for land applications. Earth System Science Data 13, 4349–4383. doi:10.5194/essd-13-4349-2021

Pähtz, T. and Durán, O. (2023). Scaling laws for planetary sediment transport from DEM-RANS numerical simulations. Journal of Fluid Mechanics 963, A20. doi:10.1017/jfm.2023.343

Rubin, D. M. (2012). A unifying model for planform straightness of ripples and dunes in air and water. Earth-Science Reviews 113, 176–185. doi:10.1016/j.earscirev.2012.03.010

Rubin, D. M. and Hunter, R. E. (1987). Bedform alignment in directionally varying flows. Science 237, 276–278. doi:10.1126/science.237.4812.276

Wasson, R. J. and Hyde, R. (1983). Factors determining desert dune type. Nature 304, 337–339. doi:10.1038/304337a0
