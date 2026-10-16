"""Local Mars products from the Gadi export (`fields_export.npz`: fields (23, 64, 90, 180), rho_mean, dunes):

  registry/mars/qsat_field_metadata.json         names/units/descriptions (Earth canonical text, Mars wording) +
                                                 p2/p98/frac_finite at d index 29 (200 um) over all cells
  <devroot>/.../fv3-beta1/fields/<var>.zarr      23 field pyramids (d, y, x) + qsdiv (d, y, x) + rho_mean (y, x)
  <devroot>/.../fv3-beta1/cells-aux.zarr         qsdiv (lat, lon, d) m/yr, rho_mean (lat, lon) kg m^-3 and elev_mean
                                                 (lat, lon) m (elev_mean.npz, added with
                                                 cellsaux.write_variable), Earth cellsaux conventions
  registry/mars/generated/qsat_fields.yaml       fragment {groups, layers}: the 23 field layers
  registry/mars/generated/x_extra_fields.yaml    fragment: qsdiv and rho_mean

qsdiv = qsdiv.divergence(RDP, RDD) with R = R_MARS (3389.5 km), x S2Y -> m/yr (Earth definition, Gunn 2026 M6).
The contract grid has no +-90° rows (centres 89 ... -89), so every cell has a value.

    python -m dune_atlas_pipeline.mars.sidecars all --export fields_export.npz --devroot staging/mars/devroot
    python -m dune_atlas_pipeline.mars.sidecars registry      # registry fragments only (texts), clims kept
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import time
from pathlib import Path

import numpy as np

from .. import fields as EF
from .. import qsdiv as EQ
from . import cells as CE
from . import constants as M
from . import pyramids as PY
from .fields import QSAT_VARS

REPO = Path(__file__).resolve().parents[4]
META_JSON = REPO / CE.DS.meta_json
GEN = REPO / CE.DS.registry_dir
PREFIX = CE.DS.prefix
K = M.D_DEFAULT_INDEX
D_TEXT = f" Shown at the selected median grain diameter d (default {int(M.D_VALUES_UM[K])} µm)."
EARTH_UT_TEXT = (f" Shown at the selected threshold friction velocity u*,th "
                 f"(default {EF.C.UT_VALUES[EF.C.UT_DEFAULT_INDEX]:.2f} m/s).")
THRESHOLD_NOTE = (r" The threshold is the cessation threshold $u_{\ast,th}(d, \rho_f, T)$ of each sample, from Pähtz & "
                  r"Durán (2023).")
# Citation of the atlas-derived fields, one format with Earth (fields.fields_citation; app mars/cell/citation.ts
# fieldsCitation): "Gunn, A. (2026). ... doi:...; transport law: ...; winds: ...".
GCM_WINDS = CE.DS.winds_phrase
CITATION = (f"{EF.PAPER_CITATION}; transport law: Pähtz, T. & Durán, O. (2023). Scaling laws for planetary sediment "
            f"transport from DEM-RANS numerical simulations. Journal of Fluid Mechanics 963, A20. "
            f"doi:10.1017/jfm.2023.343; winds: {GCM_WINDS}")
GCM_CITATION = CE.DS.gcm_citation
# Licence row of everything derived from the dataset's winds
LICENCE = CE.DS.licence
ATTRIBUTION = {"citation": CITATION, "licence": LICENCE}
# how often the wind dataset samples the Mars year, in the descriptions (no dataset name in the shared texts)
SAMPLING = "one sample per Mars hour" if CE.DS.samples_per_sol == 24 else f"one sample every {({2: 'two', 3: 'three', 4: 'four', 6: 'six'}).get(24 // CE.DS.samples_per_sol, 24 // CE.DS.samples_per_sol)} Mars hours"


def load_export(path) -> dict:
    z = np.load(path)
    out = {k: z[k] for k in z.files}
    assert out["fields"].shape == (23, 64, CE.NY, CE.NX)
    assert list(out["field_vars"]) == list(QSAT_VARS)
    np.testing.assert_array_equal(out["lat"], CE.LAT); np.testing.assert_array_equal(out["lon"], CE.LON)
    return out


def var_index(v):
    return QSAT_VARS.index(v)


# ---------------------------------------------------------------------------------------------- metadata
def mars_text(var: str, desc: str) -> str:
    desc = desc.replace(" over all speed and direction bins", " over all samples of the Mars year (n = 1 per sample)")
    if var in ("uft", "ufm", "qhbf", "qhef"):
        desc += THRESHOLD_NOTE
    return desc


def refresh_texts(meta: dict) -> dict:
    """The descriptions of an existing qsat_field_metadata.json rewritten from the canonical Earth text (mars_text), the
    statistics kept: a wording change needs no new export from Gadi."""
    canon = json.loads((REPO / "registry" / "earth" / "qsat_field_metadata.json").read_text())
    return {v: ({**m, "description": mars_text(v, canon[v]["description"])} if v in canon and v in QSAT_VARS else m)
            for v, m in meta.items()}


def field_metadata(fields: np.ndarray, k: int = K) -> dict:
    canon = json.loads((REPO / "registry" / "earth" / "qsat_field_metadata.json").read_text())
    out = {}
    for i, v in enumerate(QSAT_VARS):
        a = fields[i, k]
        f = a[np.isfinite(a)].astype("f8")
        c = canon[v]
        out[v] = {"long_name": c["long_name"], "units": c["units"], "description": mars_text(v, c["description"]),
                  "p2": float(np.percentile(f, 2)), "p98": float(np.percentile(f, 98)),
                  "frac_finite": round(float(f.size / a.size), 4)}
    return out


# ---------------------------------------------------------------------------------------------- qsdiv
def compute_qsdiv(fields: np.ndarray) -> np.ndarray:
    """(64, 90, 180) float32 m/yr from rdpm (m^2/s) and rdpa (rad), R = R_MARS."""
    q = fields[var_index("rdpm")].astype("f8")
    a = fields[var_index("rdpa")].astype("f8")
    out = np.empty(q.shape, "f4")
    for k in range(q.shape[0]):
        out[k] = (EQ.divergence(q[k], a[k], CE.LAT.astype("f8"), CE.LON.astype("f8"), R=M.R_MARS) * M.S2Y)
    return out


def qsdiv_attrs() -> dict:
    return {
        "long_name": "Saturated flux divergence (∇·qs)",
        "long_name_latex": r"\nabla\cdot\vec{q_s}",
        "description": ("Divergence of the time-averaged flat-bed saturated sand-flux vector (magnitude RDP, direction "
                        "RDD) on the sphere, div q = 1/(R cos φ)[∂(q cos θ)/∂λ + ∂(q sin θ cos φ)/∂φ], R = 3389.5 km "
                        "(Mars), central differences " + CE.DS.qsdiv_grid_text + ". Negative values (flux convergence) imply deposition, positive values erosion."),
        "description_tex": (r"$\nabla\cdot\vec{q_s} = \frac{1}{R\cos\phi}\left[\frac{\partial (q\cos\theta)}{\partial\lambda}"
                            r" + \frac{\partial (q\sin\theta\cos\phi)}{\partial\phi}\right]$ with $q = RDP$, "
                            r"$\theta = RDD$, $R = 3389.5$ km; negative values imply deposition."),
        "units": "m/yr", "source_units_tex": "m/yr", "derived_from": "rdpm, rdpa", "mars_radius_m": M.R_MARS,
        "method": ("Gunn (2026) Methods M6 (pipeline qsdiv.divergence with R = R_MARS); numpy.gradient central "
                   "differences, periodic in longitude, float64 coordinates"),
    }


# ---------------------------------------------------------------------------------------------- cells-aux
CONVENTIONS = ("grain-size-dependent arrays: (latitude, longitude, d), shard 16x16 cells, inner chunk 1 cell, index "
               "at end; scalar arrays: (latitude, longitude), plain 64x64 chunks; every cell has a value (no land "
               "mask on Mars); NaN = not defined")


def load_elev_mean(npz) -> tuple[np.ndarray, str]:
    """Terrain's cell mean elevation on the contract grid (keys elev_mean, lat, lon, grid, source)."""
    z = np.load(npz)
    em = np.asarray(z["elev_mean"], "f4")
    assert em.shape == (CE.NY, CE.NX) and np.isfinite(em).all()
    np.testing.assert_array_equal(z["lat"], CE.LAT); np.testing.assert_array_equal(z["lon"], CE.LON)
    assert json.loads(str(z["grid"])) == CE.GRID
    return em, str(z["source"])


def elev_attrs(source: str) -> dict:
    from .terrain import DEM_ATTRIBUTION as A
    return {"long_name": "Mean elevation of the cell", "long_name_latex": r"\overline{z}", "units": "m",
            "description": ("Spherical-area-weighted mean over " + CE.DS.cell_text + " of the 1/64° area-mean grid of the MGS MOLA – MEX "
                            "HRSC blended DEM (200 m), heights above the Mars 2000 areoid (mars/terrain.py)."),
            "source": source, "citation": A["citation"], "url": A["url"], "licence": A["licence"],
            "changes": A["changes"]}


def write_cells_aux(out: str, qsdiv: np.ndarray, rho_mean: np.ndarray, elev_mean: np.ndarray | None = None,
                    elev_source: str = "") -> dict:
    """cells-aux.zarr with qsdiv (lat, lon, d), rho_mean (lat, lon) [and elev_mean (lat, lon)]; attrs as the Earth
    sidecar."""
    import zarr
    from .. import cellsaux as CA
    if os.path.exists(out):
        shutil.rmtree(out)
    root = zarr.open_group(out, mode="w", zarr_format=3)
    root.attrs.update({
        "title": "dune-atlas Mars per-cell auxiliary variables (sidecar to cells.zarr)", "body": "mars",
        "grid": CE.GRID, "d_values_um": [int(x) for x in M.D_VALUES_UM], "d_default_index": int(K),
        "cells": CE.NY * CE.NX, "variables": [], "conventions": CONVENTIONS, "dataset": CE.DATASET["id"],
        "dataset_name": CE.DATASET["name"], "dataset_resolution": CE.DS.resolution_text})
    qa = qsdiv_attrs()
    data = np.moveaxis(qsdiv, 0, -1).astype("f4")                         # (lat, lon, d)
    a = root.create_array("qsdiv", shape=data.shape, dtype="float32", chunks=(CA.SHARD, CA.SHARD, data.shape[2]),
                          serializer=CA._sharding((1, 1, data.shape[2])), compressors=None, fill_value=np.nan,
                          dimension_names=["latitude", "longitude", "d"],
                          attributes={k: qa[k] for k in ("long_name", "long_name_latex", "units", "description",
                                                         "derived_from", "method", "mars_radius_m")} |
                          {"display_units": "m/kyr", "display_scale": 1000.0,
                           "source": f"Derived from the rdpm and rdpa fields of this atlas; {CITATION}",
                           "licence": "CC BY 4.0"})
    a[...] = data
    root.attrs["variables"] = ["qsdiv"]
    allcells = np.ones((CE.NY, CE.NX), bool)
    CA.write_variable(root, "rho_mean", rho_mean, allcells, {
        "long_name": "Near-surface air density, mean over the Mars year", "long_name_latex": r"\overline{\rho_f}",
        "units": "kg m-3",
        "description": CE.DS.rho_description,
        "source": GCM_CITATION, "licence": LICENCE})
    if elev_mean is not None:
        CA.write_variable(root, "elev_mean", elev_mean, allcells, elev_attrs(elev_source))
    return {"objects": CA.count_objects(out), "variables": list(root.attrs["variables"])}


# ---------------------------------------------------------------------------------------------- registry
def qsat_fragment(meta: dict) -> dict:
    frag = EF.registry_fragment(meta, dataset="era5", shared_clim=False)  # Mars keeps its own p2/p98 colour limits         # '{dataset}/fields/<var>.zarr' sources, Earth rules
    for lay in frag["layers"]:
        assert "Shown at the selected" not in lay["description"], lay["id"]   # units/slider are popover rows
        lay["citation"] = CITATION
        lay["attribution"] = dict(ATTRIBUTION)
        if lay["id"] in EF.MARS_FIELD_DEFINITIONS:            # Mars wording
            lay["description"] = EF.MARS_FIELD_DEFINITIONS[lay["id"]]
        assert lay["source"] == f"{{dataset}}/fields/{lay['id']}.zarr", lay["source"]
    return frag


def extra_fragment(qsdiv_clim, rho_clim) -> dict:
    return {"groups": [], "layers": [
        {"id": "qsdiv", "title": "Saturated flux divergence (∇·qs)", "titleTex": r"Saturated flux divergence $\nabla\cdot\vec{q}_s$",
         "group": "drift", "type": "zarr-field", "source": "{dataset}/fields/qsdiv.zarr", "variable": "qsdiv",
         "thresholdAware": True, "units": "m/kyr",
         "description": (r"Divergence of the time-averaged saturated sand-flux vector (magnitude RDP, direction RDD) on "
                         r"the Mars sphere, following Gunn (2026), Methods M6: $\nabla\cdot\vec{q}_s = \frac{1}{R\cos\phi}"
                         r"\left[\frac{\partial (q\cos\theta)}{\partial\lambda} + \frac{\partial (q\sin\theta\cos\phi)}"
                         r"{\partial\phi}\right]$ with $q = RDP$, $\theta = RDD$. By conservation of sand mass, negative "
                         r"values (flux convergence) imply deposition and positive values (flux divergence) erosion. The "
                         r"values assume a saturated flux and an unlimited supply of loose sand, so on rock, crusted or "
                         r"vegetated surfaces actual erosion is limited by the sand available."),
         # Mars has no land mask, and the
         # divergence is defined in every cell (one-sided differences at the first and last rows).
         "citation": CITATION, "attribution": dict(ATTRIBUTION), "visible": False, "opacity": 0.85, "queryable": False,
         "display": {"transform": "scale", "scale": 1000.0, "colormap": "piyg", "clim": list(qsdiv_clim)}},
        {"id": "rho_mean", "title": "Near-surface air density", "titleTex": r"Near-surface air density $\overline{\rho_f}$",
         "group": "environment", "type": "zarr-field", "source": "{dataset}/fields/rho_mean.zarr",
         "variable": "rho_mean", "thresholdAware": False, "units": "kg/m³",
         "description": (r"Mean over the samples of the Mars year of the lowest-layer air density $\rho_f = p/(R T)$ of the "
                         f"wind dataset ({SAMPLING}; $p$ = mid pressure of the lowest layer, $T$ = lowest-level temperature)."),
         "citation": GCM_CITATION, "attribution": {"citation": GCM_CITATION, "licence": LICENCE}, "visible": False, "opacity": 0.85, "queryable": True,
         "display": {"transform": "none", "colormap": "viridis", "clim": list(rho_clim)}},
    ]}


def _sig(x, n=2):
    return float(f"{x:.{n}g}")


def write_fragments(meta: dict, qsdiv_clim, rho_clim, gen=GEN) -> list[Path]:
    import yaml
    gen = Path(gen); gen.mkdir(parents=True, exist_ok=True)
    hdr = ("# GENERATED by `python -m dune_atlas_pipeline.mars.sidecars` from fields.FIELD_META and\n"
           "# registry/mars/qsat_field_metadata.json. Do not edit by hand. Fragment {groups, layers}; layer objects\n"
           "# validate against registry/layers.schema.json $defs/layer. Sources are dataset-relative ('{dataset}' =\n"
           f"# {PREFIX}); clim in display units (after display.transform), fluxes in m²/yr,\n"
           f"# from p2/p98 at d = {int(M.D_VALUES_UM[K])} µm over all cells (Mars has no land mask).\n")
    p1 = gen / "qsat_fields.yaml"
    p1.write_text(hdr + yaml.safe_dump(qsat_fragment(meta), sort_keys=False, allow_unicode=True, width=110))
    ex = extra_fragment(qsdiv_clim, rho_clim)
    p2 = gen / "x_extra_fields.yaml"
    p2.write_text(hdr.replace("from fields.FIELD_META and\n# registry/mars/qsat_field_metadata.json",
                              "(qsdiv: RDP/RDD divergence with R_MARS;\n# rho_mean: "
                              + ("FV3" if CE.DS.id == "fv3-beta1" else CE.DS.id) + " annual mean)")
                  + f"# qsdiv clim: ± p98 of |qsdiv| over dune cells (cover > 1 %) at d = {int(M.D_VALUES_UM[K])} µm, m/kyr; rho_mean clim:\n"
                  "# p2/p98 over all cells.\n"
                  + yaml.safe_dump(ex, sort_keys=False, allow_unicode=True, width=110))
    return [p1, p2]


# ---------------------------------------------------------------------------------------------- driver
def build_all(export, devroot, gen=GEN, meta_json=META_JSON, vars_=None, log=print, elev_npz=None) -> dict:
    t0 = time.time()
    ex = load_export(export)
    F = ex["fields"]
    meta = field_metadata(F)
    Path(meta_json).parent.mkdir(parents=True, exist_ok=True)
    Path(meta_json).write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
    base = Path(devroot) / PREFIX
    fdir = base / "fields"; fdir.mkdir(parents=True, exist_ok=True)
    stats = {"pyramids": []}
    canon_attrs = {v: {"long_name": meta[v]["long_name"], "description": meta[v]["description"],
                       "units": meta[v]["units"]} for v in QSAT_VARS}
    for i, v in enumerate(vars_ or QSAT_VARS):
        st = PY.build_field_pyramid(F[QSAT_VARS.index(v)], v, str(fdir / f"{v}.zarr"), meta, canon_attrs[v])
        stats["pyramids"].append(st); log(json.dumps(st))
    q = compute_qsdiv(F)
    qa = qsdiv_attrs()
    dunes = ex["dunes"]
    dm = dunes > 0.01
    qv = np.abs(q[K][dm]); qv = qv[np.isfinite(qv)]
    p98 = float(np.percentile(qv, 98)) * 1e3                                    # m/kyr
    qsdiv_clim = [-_sig(p98), _sig(p98)]
    meta_q = dict(meta); meta_q["qsdiv"] = {"p2": qsdiv_clim[0] / 1e3, "p98": qsdiv_clim[1] / 1e3}
    src = {"long_name": "Saturated flux divergence $" + qa["long_name_latex"] + "$", "description": qa["description"],
           "units": "m/yr"}
    extra = {k: qa[k] for k in ("long_name_latex", "description_tex", "derived_from", "mars_radius_m", "method")}
    extra.update({"display_units": "m/kyr", "display_scale": 1000.0, "colormap": "piyg",
                  "sign_convention": "negative = flux convergence = deposition"})
    st = PY.build_field_pyramid(q, "qsdiv", str(fdir / "qsdiv.zarr"), meta_q, src, extra_var_attrs=extra)
    stats["pyramids"].append(st); log(json.dumps(st))
    rho = ex["rho_mean"].astype("f4")
    rho_clim = [_sig(float(np.percentile(rho, 2))), _sig(float(np.percentile(rho, 98)))]
    st = PY.build_2d_pyramid(rho, "rho_mean", str(fdir / "rho_mean.zarr"), title="Near-surface air density (annual mean)",
                             clim=rho_clim, colormap="viridis",
                             var_attrs={"long_name": "Near-surface air density, mean over the Mars year",
                                        "long_name_latex": r"\overline{\rho_f}", "units": "kg m-3",
                                        "description": f"Mean over the samples of the Mars year ({SAMPLING}) of the lowest-layer air density."})
    stats["pyramids"].append({"var": "rho_mean", "bytes": st["bytes"], "objects": st["objects"]}); log(json.dumps(st))
    em, esrc = load_elev_mean(elev_npz) if elev_npz else (None, "")
    stats["cells_aux"] = write_cells_aux(str(base / "cells-aux.zarr"), q, rho, em, esrc)
    stats["fragments"] = [str(p) for p in write_fragments(meta, qsdiv_clim, rho_clim, gen)]
    stats["qsdiv_clim_m_per_kyr"] = qsdiv_clim; stats["rho_clim"] = rho_clim
    stats["qsdiv_dune_ddef"] = {"median_m_per_kyr": float(np.median(q[K][dm]) * 1e3),
                               "frac_negative": float((q[K][dm] < 0).mean()), "p98_abs_m_per_kyr": p98}
    stats["total_s"] = round(time.time() - t0, 1)
    return stats


def rewrite_registry(gen=GEN, meta_json=META_JSON) -> list[Path]:
    """Rewrite only the two registry fragments from registry/mars/qsat_field_metadata.json, keeping the colour limits
    of the current x_extra_fields.yaml (they come from the Gadi export; texts and citations change, data do not)."""
    import yaml
    meta = refresh_texts(json.loads(Path(meta_json).read_text()))
    Path(meta_json).write_text(json.dumps(meta, ensure_ascii=False, indent=1) + "\n")
    cur = {l["id"]: l for l in (yaml.safe_load((Path(gen) / "x_extra_fields.yaml").read_text()) or {})["layers"]}
    return write_fragments(meta, cur["qsdiv"]["display"]["clim"], cur["rho_mean"]["display"]["clim"], gen=gen)


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.sidecars")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("registry", help="rewrite the registry fragments only (texts; clims kept)")
    a = sub.add_parser("all")
    a.add_argument("--export", required=True); a.add_argument("--devroot", required=True)
    a.add_argument("--stats-out")
    a.add_argument("--elev-mean", help="Terrain elev_mean.npz (contract grid)")
    args = p.parse_args(argv)
    if args.cmd == "registry":
        for q in rewrite_registry():
            print(q)
        return
    st = build_all(args.export, args.devroot, elev_npz=args.elev_mean)
    if args.stats_out:
        Path(args.stats_out).write_text(json.dumps(st, indent=1))
    print(json.dumps({k: v for k, v in st.items() if k != "pyramids"}, indent=1))


if __name__ == "__main__":
    main()
