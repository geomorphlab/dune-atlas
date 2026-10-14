"""Per-variable GeoZarr multiscale pyramids for map display (`fields/<var>.zarr`).

One store per variable (each registry layer maps to one store; coarsening differs per
variable). Values are converted to display units and stored float32
(docs/reference/storage-layout.md): fluxes m^2/s -> m^2/yr, angles kept in radians, ratios clipped
to +-6e4 where denominators -> 0. Exact per-cell values for clicks come from cells.zarr.

Layout: topozarr (GeoZarr `multiscales` + `proj` + `spatial` conventions, EPSG:4326,
pixel registration), dims (ut=64, y, x), sharded, inner chunks one `ut` x ~360^2 px.
Level count is chosen so the coarsest level is <= 256 px wide (global: 5 levels,
3600 -> 225 px). Codec: blosc zstd-5 + byte shuffle (as cells.zarr) on values whose float32
mantissa is rounded to 12 bits (rel. error <= 1.2e-4): 2.25x smaller than topozarr's default
zstd-0 at the same chunking (DP, ut=14: 7.97 -> 3.54 MB per threshold slice).

Coarsening (docs/records/validation-fields.md, "Coastal NaN behaviour"). topozarr writes the
store and its metadata, then levels >= 1 are *recomputed from native resolution* here:

* magnitudes / ratios -- **count-weighted nan-mean** over every finite native cell in the
  window (carried as running sum + count). topozarr's own `mean` is skip-NaN but chained
  level-to-level (mean of means), which over-weights isolated coastal cells: up to 11x
  relative error at the 16x level for DP. Full-land windows are identical either way.
* angles (ab, ae, at, ao, rdpa) -- **nearest-finite**: the first finite native cell of the
  window in row-major order (topozarr `nearest` = top-left corner only, which erases 18 % of
  land-bearing windows at the 16x level wherever that corner is ocean). Always an actual
  sampled angle; no averaging across the +-pi wrap.

Both rules give the same footprint: a coarse pixel is finite iff its window contains at
least one finite native cell. All-ocean windows stay NaN (no fabricated values); coastal
land is never erased, but coarse coastal pixels represent their land fraction only.
"""
from __future__ import annotations

import json
import math
import os
import re
import resource
import time
from pathlib import Path

import numpy as np
import xarray as xr

from . import constants as C
from .grid import get_dataset, grid_of

ANGLE_VARS = {"ab", "ae", "at", "ao", "rdpa"}
FLUX_VARS = {"dpm", "rdpm", "qnlb", "qncb", "qalb", "qacb", "qnle", "qale", "qace"}
SIGNED_FLUX_VARS = {"qnlb", "qncb", "qnle"}
F16_MAX = 6.0e4  # clip extreme ratios (denominator -> 0) to keep colour scales sane
MAX_COARSE_PX = 256
DEFAULT_KEEPBITS = 12                 # float32 mantissa bits kept (display store; exact values in cells.zarr)
DEFAULT_CODEC = "blosc-zstd-shuffle"
CITATION = ("Gunn, A. (2026) The distribution of Earth's wind-blown sand dunes. "
            "Nature Communications. doi:10.1038/s41467-026-75466-y. "
            "Data: doi:10.5281/zenodo.20046812")
SOURCE_PREFIX = "dune-atlas/v1/fields"
# Per-dataset text of the field stores and registry fragments (ERA5-Land: the published v1 strings).
# registry sources of the per-dataset field stores: '{dataset}' expands to the selected dataset's
# prefix (ERA5-Land: dune-atlas/v1 -> dune-atlas/v1/fields/<var>.zarr, the existing keys;
# ERA5: dune-atlas/v1/datasets/era5/fields/<var>.zarr)
DATASET_SOURCE_PREFIX = {"era5-land": "{dataset}/fields", "era5": "{dataset}/fields"}


def dataset_citation(dataset=None) -> str:
    ds = get_dataset(dataset)
    if ds.id == "era5-land":
        return CITATION
    return (f"Fields computed for the atlas from {ds.name} hourly 10 m winds ({ds.info['citation']}; data "
            f"{ds.info['data_citation']}) with the methods outlined in Gunn, A. (2026) The distribution of Earth's wind-blown "
            "sand dunes. Nature Communications. doi:10.1038/s41467-026-75466-y")
# Registry (info popover) citation of the atlas-derived fields: one format for every dataset and body,
# "Gunn, A. (2026). ... doi:...; [data: ...;] winds: ..." (the app's cell/citation.ts
# fieldsCitation() returns the same strings and tests compare them). Store attrs keep dataset_citation().
PAPER_CITATION = ("Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications. "
                  "doi:10.1038/s41467-026-75466-y")
ERA5LAND_WINDS = ("ERA5-Land hourly 10 m winds 1950–2024 (Muñoz-Sabater, J. et al. (2021). ERA5-Land: a "
                  "state-of-the-art global reanalysis dataset for land applications. Earth System Science Data 13, "
                  "4349–4383. doi:10.5194/essd-13-4349-2021)")


def fields_citation(dataset=None) -> str:
    ds = get_dataset(dataset)
    if ds.id == "era5-land":
        return (f"{PAPER_CITATION}; data: Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes - "
                f"Supplementary Data. Zenodo. doi:10.5281/zenodo.20046812; winds: {ERA5LAND_WINDS}")
    return f"{PAPER_CITATION}; winds: {ds.name} hourly 10 m winds {ds.period} ({ds.info['citation']}; data: {ds.info['data_citation']})"


def fields_licence(dataset=None) -> str:
    """Licence row of the atlas-derived fields: ERA5-Land fields = the Zenodo Supplementary Data
    licence; fields computed from ERA5 = the Copernicus licence."""
    ds = get_dataset(dataset)
    return "CC BY 4.0 (Zenodo Supplementary Data)" if ds.id == "era5-land" else ds.info["licence"]


def fields_attribution(dataset=None) -> dict:
    return {"citation": fields_citation(dataset), "licence": fields_licence(dataset)}


# Info-popover definitions used instead of
# the source descriptions for the registry layers, the cell table and the CSV / NetCDF descriptions. Both planets
# unless MARS_FIELD_DEFINITIONS gives a Mars text (written by mars.sidecars and field_names.json `descriptionMars`).
FIELD_DEFINITIONS = {
    "dpm": (r"Time-averaged flat-bed saturated sand flux, $DP = \sum n q / \sum n$ over all speed and direction bins: "
            r"the volume of packed sand per metre width that the wind could move per year over a flat bed fully "
            r"covered by loose sand (Gunn 2026). Like the drift potential of Fryberger & Dean (1979) it measures the "
            r"wind's capacity to transport sand, but it is a different quantity: Fryberger's DP is in vector units, "
            r"computed from 10 m wind speeds in knots as $V^2(V - V_t)$ with a 12-knot threshold, whereas this DP is a "
            r"physical flux computed from the friction velocity with the threshold set by the slider. The two cannot "
            r"be converted into each other without the wind-speed distribution, and Fryberger's energy classes (below "
            r"200, 200–400 and above 400 vector units) do not apply to these values."),
    "rdpm": (r"Magnitude of the time-averaged flat-bed flux vector, $RDP = |\sum n q e^{i\theta}| / \sum n$: the net "
             r"volume of packed sand per metre width per year after transport in opposing directions has cancelled. "
             r"Same units as DP; RDP ≤ DP, with equality only when all transport is in one direction."),
    "rdpa": (r"Direction of the time-averaged flat-bed flux vector, $\arg \sum n q e^{i\theta}$, the direction sand "
             r"moves, as a compass bearing (clockwise from north). Poorly defined where RDP/DP is low, because "
             r"transport in opposing directions nearly cancels."),
    "qha_rdp_dp": (r"Directional variability of sand flux: ratio of resultant to total drift potential, $RDP/DP$ "
                   r"(0 = multidirectional, 1 = unidirectional). Undefined where there is no sand flux ($DP = 0$). "
                   r"Fryberger & Dean (1979) classes: below 0.3 low (complex or obtuse bimodal winds), 0.3–0.8 "
                   r"intermediate (obtuse to acute bimodal winds), above 0.8 high (unimodal winds). Only transport "
                   r"above the threshold counts here, and the flux law differs from Fryberger's, so use the classes "
                   r"as a guide."),
    "at": (r"Migration direction $\alpha_T$ of dunes whose crests have the bed-instability orientation $\alpha_H$: "
           r"perpendicular to $\alpha_H$, toward the side of the net sand flux across the crest (Gunn 2026; Courrech "
           r"du Pont et al. 2024)."),
    "ab": (r"Crest orientation $\alpha_H$ of the bed-instability mode: the axis (0–180°) of crests that receive the "
           r"largest gross sand transport across them, including the speed-up of the wind over the crest (Rubin & "
           r"Hunter 1987; Courrech du Pont et al. 2024). It is also the expected crest orientation of migrating dunes "
           r"such as barchans. Dunes with this orientation migrate perpendicular to it, in direction $\alpha_T$. As an "
           r"axis it has no compass direction: e.g., 128° and 308° are the same line."),
    "ae": (r"Elongation direction $\alpha_E$: the direction in which a dune grows in length without migrating, where "
           r"the net sand flux across its crest is zero and the net flux along it is positive (Courrech du Pont et "
           r"al. 2014, 2024). It applies to dunes on beds with limited sand, typically growing from a fixed sand "
           r"source. Where a wind regime allows several such directions, the atlas shows the most stable one."),
    "ao": (r"Direction $\alpha_O$ along crests of the bed-instability orientation $\alpha_H$ in which the net sand "
           r"flux along the crest points, as a compass bearing. Where crests are oblique to the net transport, sand "
           r"moves along them as well as across them; $\alpha_O$ shows which way along the crest it moves."),
    "sige_sigh": (r"Ratio of the growth rates in height of dunes in the elongation and bed-instability orientations, "
                  r"$\langle|Q_{\bot}(\alpha_E)|\rangle/\langle|Q_{\bot}(\alpha_H)|\rangle$, between 0 and 1. It "
                  r"assesses whether dunes elongating from a sand source on a starved bed are stable: in numerical "
                  r"simulations and in dunes around the Tibesti Massif, elongating linear dunes form where the ratio "
                  r"is above about 0.6 and trains of barchans form below it (Gao et al. 2015; Courrech du Pont et al. "
                  r"2024). It does not take bed mobility or other boundary conditions into account."),
    "qhab_nl_nc": (r"Net along-crest over net across-crest sand flux for crests of the bed-instability orientation, "
                   r"$|\langle Q_{\parallel}(\alpha_H)\rangle/\langle Q_{\bot}(\alpha_H)\rangle|$. Along-crest "
                   r"transport tends to keep crests straight, while across-crest transport, which drives migration, "
                   r"tends to make them sinuous (Rubin 2012), so higher values suggest straighter long-crested dunes "
                   r"on sand-covered beds. For dunes migrating on starved beds, the ratio measures the asymmetry of "
                   r"sand fluxes that makes dunes such as barchans asymmetric (Courrech du Pont et al. 2024). In the "
                   r"sand-covered-bed examples of Courrech du Pont et al. (2024) it is about 0.03 for transverse, 0.4 "
                   r"for oblique and 22 for longitudinal dunes. The ratio goes to infinity where its denominator (a "
                   r"net flux) goes to zero (shown clipped to ±60,000)."),
    "qhab_ac_nc": (r"Gross over net across-crest sand flux for crests of the bed-instability orientation, "
                   r"$|\langle |Q_{\bot}(\alpha_H)|\rangle/\langle Q_{\bot}(\alpha_H)\rangle|$, never below 1: the "
                   r"balance between growth in height and migration. Values near 1 mean that transport across the "
                   r"crest goes one way and the dunes mainly migrate; large values mean that it reverses, building "
                   r"the dunes up with little net migration, which may also favour straighter crests (Courrech du "
                   r"Pont et al. 2024). In the sand-covered-bed examples of Courrech du Pont et al. (2024) it is about "
                   r"1.1 for transverse, 5 for oblique and 49 for longitudinal dunes. The ratio goes to infinity where "
                   r"its denominator (a net flux) goes to zero (shown clipped to ±60,000)."),
    "qhne_ac_nl": (r"Gross across-crest over net along-crest sand flux for dunes in the elongation orientation, "
                   r"$\langle |Q_{\bot}(\alpha_E)|\rangle/\langle Q_{\parallel}(\alpha_E)\rangle$: the balance between "
                   r"growth in height and elongation. For dunes that elongate without migrating, it is the parameter "
                   r"expected to distinguish their shapes. Compared with $\hat{Q}_{|\bot|/\bot,H}$, it indicates "
                   r"whether elongation or migration is more likely to set dune shape and orientation on a starved "
                   r"bed: the dynamic with the larger ratio favours growth in height more and is expected to prevail "
                   r"(Courrech du Pont et al. 2024). The ratio goes to infinity where its denominator (a net flux) goes "
                   r"to zero (shown clipped to ±60,000)."),
}
# Mars wording: DP is averaged over the hours of the Mars year with a grain-size threshold.
MARS_FIELD_DEFINITIONS = {
    "dpm": (r"Time-averaged flat-bed saturated sand flux, $DP = \sum q / N$ over all N hours of the Mars year: the "
            r"volume of packed sand per metre width that the wind could move per Earth year over a flat bed fully "
            r"covered by loose sand (Gunn 2026). Like the drift potential of Fryberger & Dean (1979) it measures the "
            r"wind's capacity to transport sand, but it is a different quantity: Fryberger's DP is in vector units, "
            r"computed from 10 m wind speeds in knots as $V^2(V - V_t)$ with a 12-knot threshold, whereas this DP is a "
            r"physical flux computed from the friction velocity with a threshold computed from the grain diameter. "
            r"The two cannot be converted into each other, and Fryberger's energy classes do not apply to these "
            r"values."),
}


def field_name(title: str) -> str:
    """The quantity name of a FIELD_META title without its trailing symbol (a trailing parenthesis, or a trailing
    ⟨...⟩ term), e.g. 'Drift potential', 'Absolute across-crest flux, migration mode'."""
    t = title.strip()
    if t.endswith("⟩") and "⟨" in t:
        return t[:t.rindex("⟨")].rstrip()
    return re.sub(r"\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*$", "", t)


def title_tex(title: str, long_name: str) -> str:
    """The title with its symbol in TeX: the name of `title` plus the (last) math of the source long_name;
    the name alone when the title carries no symbol."""
    name = field_name(title)
    sym = re.findall(r"\$([^$]+)\$", long_name)
    return f"{name} ${sym[-1]}$" if name != title and sym else name


def field_names(meta: dict | None = None) -> dict:
    """{var: {title, titleTex[, description][, descriptionMars]}}: the one name per quantity, for the app's downloads and cell
    table (registry/field_names.json; the registry layers carry the same title / titleTex)."""
    meta = meta or load_metadata()
    mp = REPO / "registry" / "mars" / "qsat_field_metadata.json"
    mars = json.loads(mp.read_text()) if mp.exists() else {}
    out = {}
    for v, fm in FIELD_META.items():
        if v not in meta:
            continue
        e = {"title": fm["title"], "titleTex": title_tex(fm["title"], meta[v]["long_name"])}
        d = FIELD_DEFINITIONS.get(v) or rename_modes(meta[v]["description"])
        if d != meta[v]["description"]:
            e["description"] = d
        dm = MARS_FIELD_DEFINITIONS.get(v) or (rename_modes(mars[v]["description"]) if v in mars and v not in FIELD_DEFINITIONS else None)
        if dm and dm != e.get("description", meta[v]["description"]):
            e["descriptionMars"] = dm
        out[v] = e
    return out


def rename_modes(text: str) -> str:
    """The mode of αH is the bed-instability mode, not the "migration mode", in every name and
    definition; the source metadata (Supplementary Data attributes) keep their wording."""
    return (text.replace("bed-mode (migration-mode, $\\alpha_H$)", "bed-instability-mode ($\\alpha_H$)")
            .replace("migration-mode", "bed-instability-mode").replace("Migration-mode", "Bed-instability-mode")
            .replace("migration mode", "bed-instability mode").replace("Migration mode", "Bed-instability mode"))


def field_definition(var: str, description: str) -> str:
    """Info-popover definition from the source description: TeX kept for the app's KaTeX rendering (the
    `units` row states the display units, so the stored units and radians are dropped); directions in the
    displayed convention (compass bearing; the stored convention stays in the downloads / metadata)."""
    if var in FIELD_DEFINITIONS:
        return FIELD_DEFINITIONS[var]
    d = rename_modes(description).replace(", in m$^2$/s.", ".").replace(" in m$^2$/s.", ".").replace(" in radians.", ".")
    d = d.replace(", radians CCW from east, direction of transport.",
                  ", the direction sand moves, as a compass bearing (clockwise from north).")
    return re.sub(r"\s+", " ", d).strip()


REPO = Path(__file__).resolve().parents[3]
METADATA_JSON = REPO / "registry" / "earth" / "qsat_field_metadata.json"

# Registry groups (order = panel order).
GROUPS = [
    {"id": "drift", "title": "Drift potential",
     "description": "Flat-bed sand flux: total (DP), net (RDP), its direction (RDD) and directionality (RDP/DP)."},
    {"id": "orientation", "title": "Bedform orientation",
     "description": "Predicted dune orientations: crest orientation and migration direction of the bed-instability mode, elongation direction and along-crest transport direction."},
    {"id": "crest-fluxes", "title": "Crest-normal/parallel fluxes", "collapsed": True,
     "description": "Net and absolute sand flux resolved across (normal to) and along (parallel to) predicted crests."},
    {"id": "morphology", "title": "Ratios & morphology indices", "collapsed": True,
     "description": "Dimensionless flux ratios that discriminate dune morphology and stability."},
    {"id": "wind", "title": "Wind statistics", "collapsed": True,
     "description": "How often and how strongly the flat-bed friction velocity exceeds the threshold."},
]

# Per-variable presentation. `title` is plain text (Unicode, no TeX) derived from the source
# long_name/description: THE name of the quantity everywhere (layer list, info title, cell table, rose legend,
# CSV/NetCDF long names). `titleTex` = the same name with the source symbol in TeX (title_tex).
# Order = cellstore.FIELD_VARS.
FIELD_META = {
    "ab":   dict(group="orientation", title="Crest orientation, bed-instability mode (αH)",
                 colormap="twilight", transform="rad-to-axis"),
    "ae":   dict(group="orientation", title="Elongation direction (αE)",
                 colormap="twilight", transform="rad-to-bearing"),
    "at":   dict(group="orientation", title="Transverse migration direction (αT)",
                 colormap="twilight", transform="rad-to-bearing"),
    "ao":   dict(group="orientation", title="Along-crest transport direction (αO)",
                 colormap="twilight", transform="rad-to-bearing"),
    "rdpa": dict(group="drift", title="Resultant drift direction (RDD)",
                 colormap="twilight", transform="rad-to-bearing"),
    "dpm":  dict(group="drift", title="Drift potential (DP)", colormap="magma", log=True),
    "rdpm": dict(group="drift", title="Resultant drift potential (RDP)", colormap="magma", log=True),
    "qnlb": dict(group="crest-fluxes", title="Net along-crest flux, bed-instability mode ⟨Q∥(αH)⟩", colormap="rdbu"),
    "qncb": dict(group="crest-fluxes", title="Net across-crest flux, bed-instability mode ⟨Q⊥(αH)⟩", colormap="rdbu"),
    "qalb": dict(group="crest-fluxes", title="Absolute along-crest flux, bed-instability mode ⟨|Q∥(αH)|⟩",
                 colormap="magma", log=True),
    "qacb": dict(group="crest-fluxes", title="Absolute across-crest flux, bed-instability mode ⟨|Q⊥(αH)|⟩",
                 colormap="magma", log=True),
    "qnle": dict(group="crest-fluxes", title="Net along-crest flux, elongation mode ⟨Q∥(αE)⟩", colormap="rdbu"),
    "qale": dict(group="crest-fluxes", title="Absolute along-crest flux, elongation mode ⟨|Q∥(αE)|⟩",
                 colormap="magma", log=True),
    "qace": dict(group="crest-fluxes", title="Absolute across-crest flux, elongation mode ⟨|Q⊥(αE)|⟩",
                 colormap="magma", log=True),
    "qha_rdp_dp": dict(group="drift", title="Flux directionality (RDP/DP)", colormap="viridis", clim=[0.0, 1.0]),
    "sige_sigh":  dict(group="morphology", title="Stability of elongating dunes on starved beds (σE/σH)",
                       colormap="viridis", clim=[0.0, 1.0]),  # bounded by definition (max 1.004: spline-fitted αH)
    "qhab_nl_nc": dict(group="morphology", title="Crest straightness vs sinuosity, bed-instability mode (Q̂∥/⊥,H)",
                       colormap="viridis", log=True),
    "qhab_ac_nc": dict(group="morphology", title="Growth-in-height vs migration balance (Q̂|⊥|/⊥,H)",
                       colormap="viridis", log=True),
    "qhne_ac_nl": dict(group="morphology", title="Morphology of elongating dunes (Q̂|⊥|/∥,E)",
                       colormap="viridis", log=True),
    "ufm":  dict(group="wind", title="Mean above-threshold friction velocity / threshold (⟨u*f | u*f > u*th⟩ / u*th)",
                 colormap="cividis"),
    "uft":  dict(group="wind", title="Fraction of time above threshold (T | u*f > u*th / T)", colormap="cividis",
                 clim=[0.0, 1.0]),
    "qhbf": dict(group="wind", title="Fraction of bed-instability-mode flux while flat bed above threshold",
                 colormap="cividis", clim=[0.0, 1.0]),
    "qhef": dict(group="wind", title="Fraction of elongation-mode flux while flat bed above threshold",
                 colormap="cividis", clim=[0.0, 1.0]),
}


# Derived threshold-dependent fields that are not qsat_params variables (not in cells.zarr/fields). They are
# stored in their own units (no flux scaling, no ratio clipping); presentation lives here like FIELD_META.
# qsdiv: saturated flux divergence (Gunn (2026), Methods M6) from RDP/RDD, m/yr (qsdiv.py).
DERIVED_UNITS = {"qsdiv": "m/yr"}
FIELD_META["qsdiv"] = dict(group="derived", title="Saturated flux divergence (∇·qs)", colormap="piyg",
                           clim=[-3.0e-4, 3.0e-4])  # stored units m/yr (= ±0.3 m/kyr, extra_layers.QSDIV_CLIM)


# Earth: DP and RDP get one fixed log range (m²/yr, display units) for every wind dataset, so the ERA5-Land and
# ERA5 maps compare by eye (ERA5-Land's p2 of 5e-4 m²/yr, from its many calm land cells, made its
# map almost uniformly bright). Mars keeps its own p2/p98 (registry_fragment(shared_clim=False)).
EARTH_SHARED_CLIM = {"dpm": [0.01, 300.0], "rdpm": [0.01, 300.0]}


# Ratios that actually exceed ±F16_MAX (infinite where the net-flux denominator is 0); measured over all
# 64 thresholds 2026-10-13: qhab_nl_nc 4,172, qhab_ac_nc 5,146, qhne_ac_nl 3,168 values. All other
# dimensionless fields stay within [0, 63] so the clip never acts on them and is not mentioned.
CLIPPED_RATIO_VARS = {"qhab_nl_nc", "qhab_ac_nc", "qhne_ac_nl"}


# Magnitude field paired with each directional field (arrows/streamlines length & opacity in the app).
MAGNITUDE_VAR = {"rdpa": "rdpm", "at": "qacb", "ab": "qacb", "ae": "qace", "ao": "qace"}


# Panel order of layers (within groups).
LAYER_ORDER = ["dpm", "rdpm", "rdpa", "qha_rdp_dp", "at", "ab", "ae", "ao",
               "qncb", "qacb", "qnlb", "qalb", "qnle", "qale", "qace",
               "sige_sigh", "qhab_nl_nc", "qhab_ac_nc", "qhne_ac_nl", "uft", "ufm", "qhbf", "qhef"]


# ----------------------------------------------------------------------------- text helpers
_TEX = [(r"\langle", "⟨"), (r"\rangle", "⟩"), (r"\parallel", "∥"), (r"\bot", "⊥"),
        (r"\alpha", "α"), (r"\sigma", "σ"), (r"\kappa", "κ"), (r"\rho", "ρ"), (r"\beta", "β"),
        (r"\ast", "*"), (r"\hat{Q}", "Q̂"), ("m$^2$", "m²"), ("^2", "²")]


def tex_to_plain(s: str) -> str:
    """Best-effort LaTeX -> plain Unicode (descriptions; titles are curated in FIELD_META)."""
    for a, b in _TEX:
        s = s.replace(a, b)
    s = re.sub(r"_\{([^{}]*)\}", r"\1", s)   # subscripts: drop braces
    s = re.sub(r"_(\w)", r"\1", s)
    s = s.replace("$", "").replace("{", "").replace("}", "").replace("\\", "")
    s = re.sub(r"⟨\s+", "⟨", re.sub(r"\s+⟩", "⟩", s))
    return re.sub(r"\s+", " ", s).strip()


def kind(var: str) -> str:
    if var in ANGLE_VARS:
        return "angle"
    if var in SIGNED_FLUX_VARS:
        return "signed_flux"
    if var in FLUX_VARS:
        return "flux"
    return "ratio"


def display_units(var: str) -> str:
    if var in DERIVED_UNITS:
        return DERIVED_UNITS[var]
    k = kind(var)
    return "m²/yr" if k in ("flux", "signed_flux") else "rad" if k == "angle" else "dimensionless"


def _sig(x: float, n: int = 2) -> float:
    if x == 0 or not math.isfinite(x):
        return float(x)
    return float(f"{x:.{n}g}")


def display_clim(var: str, meta: dict) -> list[float]:
    """Colour limits in *registry display units* (after display.transform).

    Angles: full circle (bearing 0-360 deg) or axis (0-180 deg). Others: robust p2/p98 at
    ut index 14 (registry/earth/qsat_field_metadata.json, source units) converted to display units;
    signed fluxes symmetric about 0 for the diverging map."""
    if var in ANGLE_VARS:
        return [0.0, 180.0] if var == "ab" else [0.0, 360.0]
    if var in FIELD_META and "clim" in FIELD_META[var]:  # fixed limits, e.g. fractions [0, 1]
        return [float(x) for x in FIELD_META[var]["clim"]]
    s = C.S2Y if var in FLUX_VARS else 1.0
    lo, hi = meta[var]["p2"] * s, meta[var]["p98"] * s
    if var in SIGNED_FLUX_VARS:
        m = _sig(max(abs(lo), abs(hi)))
        return [-m, m]
    return [_sig(lo), _sig(hi)]


def stored_clim(var: str, meta: dict) -> list[float]:
    """Colour limits in *stored* units (radians for angles) for the zarr-layer root hint."""
    if var in ANGLE_VARS:
        return [0.0, float(np.pi)] if var == "ab" else [float(-np.pi), float(np.pi)]
    return display_clim(var, meta)


def load_metadata(path=METADATA_JSON) -> dict:
    return json.loads(Path(path).read_text())


# ----------------------------------------------------------------------------- arrays
def display_array(dq: xr.Dataset, var: str, meta: dict | None = None) -> xr.DataArray:
    meta = meta or load_metadata()
    da = dq[var]
    src = dict(da.attrs)
    fm = FIELD_META[var]
    attrs = {
        "long_name": fm["title"],
        "long_name_tex": src.get("long_name", ""),
        "description": tex_to_plain(src.get("description", "")),
        "description_tex": src.get("description", ""),
        "units": display_units(var),
        "source_units_tex": src.get("units", ""),
        "colormap": fm["colormap"],
        "clim": stored_clim(var, meta),
        "cyclic": var in ANGLE_VARS,
        "display_transform": fm.get("transform", "none"),
        "log_scale": bool(fm.get("log", False)),
        "resampling": "nearest-finite" if var in ANGLE_VARS else "count-weighted-mean",
    }
    if var in FLUX_VARS:
        da = da * C.S2Y
        attrs["display_scale_from_source"] = C.S2Y
        attrs["description"] = attrs["description"].replace("m²/s", "m²/yr")
    elif var not in ANGLE_VARS and var not in DERIVED_UNITS:
        da = da.clip(-F16_MAX, F16_MAX)
        attrs["clipped_to"] = F16_MAX
    if var == "ab":
        attrs["angle_convention"] = "axial (0..pi), radians CCW from east"
    elif var in ANGLE_VARS:
        attrs["angle_convention"] = "direction toward, radians CCW from east (-pi..pi); bearing = (90 - deg(a)) mod 360"
    da = da.astype("float32")  # topozarr kernel and browsers lack reliable float16
    da.attrs = attrs
    # float32 source coords are not exactly uniform; rebuild the exact grid values (grid read from the source).
    g = grid_of(dq)
    da = da.assign_coords(latitude=np.round(g.lat0 + g.dlat * np.arange(g.ny), 6),
                          longitude=np.round(g.lon0 + g.dlon * np.arange(g.nx), 6),
                          ut=np.asarray(C.UT_VALUES[: dq.sizes["ut"]], dtype="float64"))
    return da


def choose_levels(nx: int, max_px: int = MAX_COARSE_PX) -> int:
    """Number of 2x levels (incl. native) so the coarsest level is <= max_px wide."""
    n = 1
    while nx // 2 ** (n - 1) > max_px:
        n += 1
    return n


def coarsen_mean_weighted(a2: np.ndarray, nlev: int) -> list[np.ndarray]:
    """Count-weighted nan-mean pyramid (levels 1..nlev-1) of a 2-D array, each level
    computed from native cells (running sum + count), trimming trailing partial windows
    exactly like topozarr/xarray `boundary='trim'`."""
    s = np.where(np.isfinite(a2), a2, 0.0).astype("float64")
    n = np.isfinite(a2).astype("float64")
    out = []
    for _ in range(1, nlev):
        ny, nx = s.shape[0] // 2, s.shape[1] // 2
        s = s[: 2 * ny, : 2 * nx].reshape(ny, 2, nx, 2).sum((1, 3))
        n = n[: 2 * ny, : 2 * nx].reshape(ny, 2, nx, 2).sum((1, 3))
        with np.errstate(invalid="ignore", divide="ignore"):
            out.append(np.where(n > 0, s / n, np.nan).astype("float32"))
    return out


def coarsen_nearest_finite(a2: np.ndarray, nlev: int) -> list[np.ndarray]:
    """Nearest-finite pyramid: each coarse pixel takes the first finite cell of its 2x2
    window (row-major: TL, TR, BL, BR), chained -> always an actual native value."""
    cur = a2.astype("float32")
    out = []
    for _ in range(1, nlev):
        ny, nx = cur.shape[0] // 2, cur.shape[1] // 2
        w = cur[: 2 * ny, : 2 * nx].reshape(ny, 2, nx, 2).transpose(0, 2, 1, 3).reshape(ny, nx, 4)
        fin = np.isfinite(w)
        first = np.argmax(fin, axis=-1)
        pick = np.take_along_axis(w, first[..., None], -1)[..., 0]
        cur = np.where(fin.any(-1), pick, np.nan).astype("float32")
        out.append(cur)
    return out


def coarse_levels(arr3: np.ndarray, var: str, nlev: int) -> list[np.ndarray]:
    """(ut, y, x) -> list of (ut, y_l, x_l) arrays for levels 1..nlev-1."""
    fn = coarsen_nearest_finite if var in ANGLE_VARS else coarsen_mean_weighted
    per_ut = [fn(arr3[k], nlev) for k in range(arr3.shape[0])]
    return [np.stack([p[l] for p in per_ut]) for l in range(nlev - 1)]


def _du(path) -> int:
    tot = 0
    for root, _, files in os.walk(path):
        tot += sum(os.path.getsize(os.path.join(root, f)) for f in files)
    return tot


def _maxrss_gb() -> float:
    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return r / 2**30 if os.uname().sysname == "Darwin" else r / 2**20


def build_field_pyramid(dq: xr.Dataset, var: str, out: str, *, levels: int | None = None,
                        region: dict | None = None, meta: dict | None = None,
                        max_workers: int | None = None, keepbits: int | None = DEFAULT_KEEPBITS,
                        codec: str = DEFAULT_CODEC, dataset=None, land=None, **_ignored) -> dict:
    """Write `out` (= fields/<var>.zarr). Returns timing/size stats.

    levels=None -> choose_levels(width).
    keepbits: round the float32 mantissa to this many bits before writing (reader-transparent;
      default 12 -> relative error <= 2^-13 ~ 1.2e-4, angles <= 0.03 deg). None/23 = lossless.
    codec: 'blosc-zstd-shuffle' (default; blosc zstd-5 byte-shuffle, decoded by zarrita via
      numcodecs.js like cells.zarr) or 'zstd' (topozarr default zstd level 0, no shuffle).
    Coarse levels are computed from the *unrounded* native values, then rounded.
    dataset: grid.DATASETS id (store text); land: optional boolean (y, x) mask - cells outside it are set to
      no data before the pyramid is built (global sources such as ERA5)."""
    import topozarr
    import xproj  # noqa: F401  (registers .proj accessor)
    import zarr

    meta = meta or load_metadata()
    t0 = time.time()
    dset = get_dataset(dataset)
    da = display_array(dq, var, meta)
    if land is not None:
        attrs = dict(da.attrs)
        da = da.where(xr.DataArray(np.asarray(land, bool), dims=("latitude", "longitude")))
        da.attrs = attrs
    if region:
        da = da.isel(**region)
    da = da.load()                                  # (ut, y, x) float32 in memory (global: 1.66 GB)
    t_read = time.time() - t0
    nlev = levels or choose_levels(da.sizes["longitude"])
    # topozarr writes multiscales `transform.scale/translation` in *Dataset* dim order, so the
    # Dataset must list dims as (ut, y, x) like the array (to_dataset after assign_coords gives
    # (y, x, ut) -> scale [2, 2, 1], which mis-describes the (ut, y, x) arrays).
    ds = xr.Dataset(coords={"ut": da["ut"].values})
    ds[var] = da.rename({"latitude": "y", "longitude": "x"})
    assert tuple(ds.dims) == ("ut", "y", "x"), tuple(ds.dims)
    for name in list(ds.variables):                  # drop zarr-v2 encodings from source
        ds[name].encoding = {}
    ds["y"].attrs.update(units="degrees_north", standard_name="latitude")
    ds["x"].attrs.update(units="degrees_east", standard_name="longitude")
    ds["ut"].attrs.update(units="m/s", long_name="threshold friction velocity u*,th")
    ds.attrs.update({
        "title": f"dune-atlas field: {FIELD_META[var]['title']}",
        "source": dataset_citation(dset), "license": "CC-BY-4.0",
        "ut_default_index": C.UT_DEFAULT_INDEX,
        "dune_atlas:resampling": ("nearest-finite (first finite native cell of each window, row-major)"
                                  if var in ANGLE_VARS else
                                  "count-weighted nan-mean over native cells (recomputed from level 0)"),
    })
    ds_attrs = {}
    if dset.info:
        ds_attrs = {"dune_atlas:dataset": dset.id, "dataset_name": dset.name, "dataset_resolution": dset.resolution,
                    "dataset_period": dset.period, "dataset_n_hours": dset.n_hours,
                    "dataset_citation": dset.info["citation"], "dataset_data_citation": dset.info["data_citation"],
                    "dataset_land_cells": dset.info["land_cells"], "license_notice": dset.info["copernicus_notice"]}
        ds.attrs.update(ds_attrs)
    ds = ds.proj.assign_crs(spatial_ref="EPSG:4326")
    hints = {var: topozarr.ZarrLayerVarConfig(clim=stored_clim(var, meta), colormap=FIELD_META[var]["colormap"])}
    pyr = topozarr.create_pyramid(ds, levels=nlev, x_dim="x", y_dim="y",
                                  method="nearest" if var in ANGLE_VARS else "mean", layer_hints=hints)
    t1 = time.time()
    pyr.write(out, mode="w", max_workers=max_workers)
    t_topo = time.time() - t1
    # Recompute levels >= 1 from native cells (see module docstring), then (re)write every level
    # with the chosen codec / mantissa rounding, keeping topozarr's shapes, chunks, shards, attrs.
    t2 = time.time()
    native = ds[var].values
    data = [native] + (coarse_levels(native, var, nlev) if nlev > 1 else [])
    root = zarr.open_group(out, mode="a", zarr_format=3)
    for l, arr in enumerate(data):
        if keepbits is not None and keepbits < 23:
            arr = bitround(arr, keepbits)
        if codec == "zstd" and l == 0 and keepbits in (None, 23):
            continue                                 # topozarr already wrote exactly this
        _rewrite_array(root[str(l)], var, arr, codec)
    if ds_attrs:
        root.attrs.update(ds_attrs)                  # level groups carry them via topozarr; root too
    t_fix = time.time() - t2
    stats = dict(var=var, levels=nlev, shape=list(ds[var].shape),
                 level_widths=[int(ds.sizes["x"] // 2 ** l) for l in range(nlev)],
                 read_s=round(t_read, 1), topozarr_write_s=round(t_topo, 1),
                 recompute_coarse_s=round(t_fix, 1), codec=codec, keepbits=keepbits, total_s=round(time.time() - t0, 1),
                 bytes=_du(out), peak_rss_gb=round(_maxrss_gb(), 2))
    return stats


def _compressors(codec: str):
    from zarr.codecs import BloscCodec, ZstdCodec
    if codec == "blosc-zstd-shuffle":
        return [BloscCodec(cname="zstd", clevel=5, shuffle="shuffle", typesize=4)]
    if codec == "zstd":
        return [ZstdCodec(level=0)]
    raise ValueError(codec)


def _rewrite_array(group, var: str, arr: np.ndarray, codec: str):
    """Recreate group[var] with identical shape/chunks/shards/attrs/dims/fill but `codec`."""
    old = group[var]
    assert old.shape == arr.shape, (old.shape, arr.shape)
    spec = dict(shape=old.shape, dtype=old.dtype, chunks=old.chunks, shards=old.shards,
                dimension_names=old.metadata.dimension_names, attributes=dict(old.attrs),
                fill_value=old.fill_value)
    new = group.create_array(var, compressors=_compressors(codec), overwrite=True, **spec)
    new[...] = arr


def bitround(a: np.ndarray, keepbits: int) -> np.ndarray:
    """Round float32 mantissa to `keepbits` bits (round-half-even); NaN/inf preserved."""
    drop = 23 - keepbits
    if drop <= 0:
        return a
    b = a.astype("float32").view(np.uint32).copy()
    half = np.uint32((1 << (drop - 1)) - 1)
    mask = np.uint32((0xFFFFFFFF >> drop) << drop)
    b = (b + half + ((b >> np.uint32(drop)) & np.uint32(1))) & mask
    r = b.view(np.float32)
    bad = ~np.isfinite(a)
    r[bad] = a[bad]
    return r


# ----------------------------------------------------------------------------- registry
def registry_fragment(meta: dict | None = None, var_order=None, dataset=None, shared_clim: bool = True) -> dict:
    """{groups, layers}: one zarr-field layer per variable, validating against
    registry/layers.schema.json $defs/layer. `dataset` selects the source prefix and citation."""
    from .cellstore import FIELD_VARS
    dset = get_dataset(dataset)
    prefix, citation = DATASET_SOURCE_PREFIX[dset.id], fields_citation(dset)
    meta = meta or load_metadata()
    group_order = [g["id"] for g in GROUPS]
    order = list(var_order or LAYER_ORDER)
    order = [v for v in order if v in FIELD_VARS]  # drop withheld variables (constants.WITHHELD_VARS)
    assert sorted(order) == sorted(FIELD_VARS)
    order.sort(key=lambda v: group_order.index(FIELD_META[v]["group"]))  # stable within groups
    layers = []
    for v in order:
        fm, m = FIELD_META[v], meta[v]
        tr = fm.get("transform", "none")
        units = "°" if v in ANGLE_VARS else display_units(v)
        # definition only: units, the slider and the wind dataset are rows of the info popover (app)
        desc = field_definition(v, m["description"])
        if v in CLIPPED_RATIO_VARS and "±60,000" not in desc:   # some definitions already state it
            desc += (f" The ratio is infinite where its denominator (a net flux) is exactly zero; such values are"
                     f" shown as ±{F16_MAX:,.0f}.")
        display = {"transform": tr, "colormap": fm["colormap"],
                   "clim": list(EARTH_SHARED_CLIM[v]) if shared_clim and v in EARTH_SHARED_CLIM else display_clim(v, meta)}
        if v in MAGNITUDE_VAR:  # arrow/streamline length & opacity pairing for directional fields
            display["magnitudeVar"] = MAGNITUDE_VAR[v]
        if v in ANGLE_VARS:
            display["cyclic"] = True
        if fm.get("log"):
            display["log"] = True
        layers.append({
            "id": v, "title": fm["title"], "titleTex": title_tex(fm["title"], m["long_name"]), "group": fm["group"],
            "type": "zarr-field", "source": f"{prefix}/{v}.zarr", "variable": v,
            "thresholdAware": True, "units": units, "description": desc, "citation": citation,
            "attribution": fields_attribution(dset),
            "visible": v == "dpm", "opacity": 0.85, "queryable": True, "display": display,
        })
    _frag = {"groups": GROUPS, "layers": layers}
    used = {l["group"] for l in _frag["layers"]}
    _frag["groups"] = [g for g in _frag["groups"] if g["id"] in used]  # e.g. 'drift' while DP fields are withheld
    return _frag


def write_registry_fragment(path=REPO / "registry" / "earth" / "generated" / "qsat_fields.yaml") -> Path:
    import yaml
    frag = registry_fragment()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    header = ("# GENERATED by `python -m dune_atlas_pipeline.fields registry` from\n"
              "# fields.FIELD_META + registry/earth/qsat_field_metadata.json. Do not edit by hand.\n"
              "# Fragment {groups, layers}; layer objects validate against layers.schema.json $defs/layer.\n"
              "# clim are in display units (after display.transform); fluxes in m²/yr.\n")
    path.write_text(header + yaml.safe_dump(frag, sort_keys=False, allow_unicode=True, width=110))
    names = REPO / "registry" / "field_names.json"
    names.write_text(json.dumps(field_names(), ensure_ascii=False, indent=1) + "\n")
    return path


def main(argv=None):
    import argparse
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.fields")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("registry")
    r.add_argument("--out", default=str(REPO / "registry" / "earth" / "generated" / "qsat_fields.yaml"))
    b = sub.add_parser("build", help="build global pyramids, one store per variable (resumable)")
    b.add_argument("--data", default=os.environ.get("DUNE_WORLD_DATA",
                                                   ""))
    b.add_argument("--out", required=True, help="directory receiving <var>.zarr")
    b.add_argument("--vars", nargs="*")
    b.add_argument("--levels", type=int)
    b.add_argument("--keepbits", type=int, default=DEFAULT_KEEPBITS, help="23 = lossless")
    b.add_argument("--codec", default=DEFAULT_CODEC, choices=["blosc-zstd-shuffle", "zstd"])
    b.add_argument("--force", action="store_true")
    b.add_argument("--dataset", default="era5-land", choices=["era5-land", "era5"])
    b.add_argument("--meta", help="qsat field metadata json (colour limits); default per dataset")
    a = p.parse_args(argv)
    if a.cmd == "registry":
        print(write_registry_fragment(a.out))
        return
    from .cellstore import FIELD_VARS, load_masks
    from .qsat_view import open_qsat
    dset = get_dataset(a.dataset)
    dq = open_qsat(a.data, chunks=None, dataset=dset)  # qsat_view.py
    land = None if dset.land_only_source else load_masks(a.data, dset)[0]
    if a.meta:
        meta_path = a.meta
    else:
        meta_path = METADATA_JSON if dset.id == "era5-land" else REPO / "registry" / "earth" / "datasets" / dset.id / "qsat_field_metadata.json"
    os.makedirs(a.out, exist_ok=True)
    log = Path(a.out) / "build_stats.jsonl"
    meta = load_metadata(meta_path)
    for v in a.vars or FIELD_VARS:
        dst = Path(a.out) / f"{v}.zarr"
        done = Path(a.out) / f".{v}.done"
        if done.exists() and not a.force:
            print("skip", v, flush=True)
            continue
        st = build_field_pyramid(dq, v, str(dst), levels=a.levels, meta=meta, keepbits=a.keepbits,
                                 codec=a.codec, dataset=dset, land=land)
        with open(log, "a") as f:
            f.write(json.dumps(st) + "\n")
        done.write_text(json.dumps(st))
        print(json.dumps(st), flush=True)


if __name__ == "__main__":
    main()
