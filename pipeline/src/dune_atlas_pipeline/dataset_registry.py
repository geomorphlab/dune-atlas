"""Registry files of an additional wind dataset (ERA5), kept in `registry/earth/datasets/<id>/`. The app
merges them at build time (app/src/core/registry/load.ts): `dataset.yaml` adds the entry to the `datasets` list
and each fragment replaces the same-named `registry/earth/generated/*.yaml` fragment for that dataset. The
entry's `info`, `credits` and `citationSources` (what the panel, About, citations and exports say about the
dataset) are written by hand and kept when the entry is rewritten.

    registry/earth/datasets/era5/dataset.yaml               entry for the `datasets` list of registry/earth/layers.yaml
    registry/earth/datasets/era5/qsat_field_metadata.json   per-variable long_name/units/description + p2/p98 at
                                                      u*,th index 14 over the dataset's land cells (as
                                                      registry/earth/qsat_field_metadata.json for ERA5-Land)
    registry/earth/datasets/era5/qsat_fields.yaml           fragment {groups, layers}: the 23 field layers with
                                                      dataset-relative sources '{dataset}/fields/<var>.zarr'
                                                      and colour limits from this dataset's statistics
    registry/earth/datasets/era5/x_extra_fields.yaml        fragment: as registry/earth/generated/x_extra_fields.yaml (aridity,
                                                      dataset-independent) with the flux-divergence layer
                                                      '{dataset}/fields/qsdiv.zarr' 

The layer ids equal the ERA5-Land ones, so the same layer list can serve both datasets once sources use
'{dataset}' (the dataset-independent layers - dunes, aridity, vegetation map - are unchanged).

    python -m dune_atlas_pipeline.dataset_registry metadata --data DIR --dataset era5
    python -m dune_atlas_pipeline.dataset_registry write --dataset era5
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from . import constants as C
from .grid import get_dataset

REPO = Path(__file__).resolve().parents[3]
# ERA5 stores with land = lsm > 0 (2026-10-13); the first build (lsm > 0.5) is at dune-atlas/v1/datasets/era5
PREFIX = {"era5": "dune-atlas/v2/datasets/era5", "merra2": "dune-atlas/v2/datasets/merra2",
          "jra3q": "dune-atlas/v2/datasets/jra3q"}
TITLE = {"era5": "ERA5 0.25°, 1950–2024", "merra2": "MERRA-2 0.5° × 0.625°, 1980–2025", "jra3q": "JRA-3Q 0.375°, 1980–2025"}
# who produces the dataset (first words of the entry's description)
PROVIDER = {"era5": "ECMWF", "merra2": "NASA GMAO", "jra3q": "JMA"}
# keys of a dataset entry written by hand (what the app says about the dataset: layers.schema.json $defs/dataset)
CURATED_KEYS = ("info", "credits", "citationSources")


def out_dir(ds) -> Path:
    return REPO / "registry" / "earth" / "datasets" / get_dataset(ds).id


def field_metadata(data_dir, dataset, ut_index=C.UT_DEFAULT_INDEX) -> dict:
    """{var: {long_name, units, description, p2, p98, frac_finite}} over the dataset's land cells."""
    from .cellstore import FIELD_VARS, load_masks
    from .qsat_view import open_qsat
    ds = get_dataset(dataset)
    dq = open_qsat(data_dir, chunks=None, dataset=ds)
    land = load_masks(data_dir, ds)[0]
    out = {}
    for v in FIELD_VARS:
        a = dq[v].isel(ut=ut_index).values
        a = np.where(land, a, np.nan)
        f = a[np.isfinite(a)]
        at = dq[v].attrs
        out[v] = {"long_name": at.get("long_name", ""), "units": at.get("units", ""),
                  "description": at.get("description", ""),
                  "p2": float(np.percentile(f, 2)), "p98": float(np.percentile(f, 98)),
                  "frac_finite": round(float(f.size / a.size), 4)}
    return out


def dataset_entry(dataset) -> dict:
    ds = get_dataset(dataset)
    i = ds.info
    return {"id": ds.id, "title": TITLE[ds.id], "prefix": PREFIX[ds.id],
            "description": (f"{PROVIDER[ds.id]} {ds.name} hourly 10 m winds, {ds.period}, on the {ds.resolution} grid "
                            f"({ds.n_hours:,} hours); land cells: {i['land_cells']}."),
            "citation": f"{i['data_citation']}",
            "cellAuxStores": ["{dataset}/cells-aux.zarr", "{dataset}/cells-aux-veg.zarr"]}


def write(dataset="era5") -> list[Path]:
    import yaml
    from . import extra_layers, fields, qsdiv
    ds = get_dataset(dataset)
    d = out_dir(ds); d.mkdir(parents=True, exist_ok=True)
    meta = fields.load_metadata(d / "qsat_field_metadata.json")
    # names and descriptions are the same for every dataset: take them from the ERA5-Land metadata
    # (registry/earth/qsat_field_metadata.json); this dataset's file contributes the colour limits (p2/p98)
    canon = fields.load_metadata(REPO / "registry" / "earth" / "qsat_field_metadata.json")
    for v, m in meta.items():
        for k in ("long_name", "units", "description"):
            if k in canon.get(v, {}):
                m[k] = canon[v][k]
    hdr = (f"# GENERATED by `python -m dune_atlas_pipeline.dataset_registry write --dataset {ds.id}`. Do not edit.\n"
           f"# {ds.name} ({ds.resolution}) registry files; merged by the app for this dataset (see the module docstring).\n")
    paths = []
    p = d / "dataset.yaml"
    entry = dataset_entry(ds)
    # the hand-maintained texts of the entry (panel, About, citations, exports) are kept as they are
    if p.exists():
        old = (yaml.safe_load(p.read_text()) or [{}])[0]
        entry.update({k: old[k] for k in CURATED_KEYS if k in old})
    p.write_text(hdr.replace("`. Do not edit.\n", "`; info, credits and\n# citationSources are maintained by hand (kept by the writer).\n", 1)
                 + "# entry for the `datasets` list of registry/earth/layers.yaml\n"
                 + yaml.safe_dump([entry], sort_keys=False, allow_unicode=True, width=110))
    paths.append(p)
    p = d / "qsat_fields.yaml"
    frag = fields.registry_fragment(meta, dataset=ds)
    p.write_text(hdr + "# Fragment {groups, layers}; clim in display units from this dataset's p2/p98 at u*,th = 0.15 m/s.\n"
                 + yaml.safe_dump(frag, sort_keys=False, allow_unicode=True, width=110))
    paths.append(p)
    p = d / "x_extra_fields.yaml"
    lay = qsdiv.registry_layer(extra_layers.QSDIV_CLIM, extra_layers.QSDIV_COLORMAP, extra_layers.QSDIV_GROUP,
                               dataset=ds)
    frag = extra_layers.fragment()       # same as registry/earth/generated/x_extra_fields.yaml (aridity is dataset-independent)
    frag["layers"] = [lay if l["id"] == "qsdiv" else l for l in frag["layers"]]
    p.write_text(hdr + "# Fragment {groups, layers}: as registry/earth/generated/x_extra_fields.yaml with this dataset's flux "
                 "divergence.\n" + yaml.safe_dump(frag, sort_keys=False, allow_unicode=True, width=110))
    paths.append(p)
    return paths


def main(argv=None):
    from .cli import DEFAULT_DATA
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.dataset_registry")
    sub = p.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("metadata"); m.add_argument("--data", default=DEFAULT_DATA); m.add_argument("--dataset", default="era5")
    w = sub.add_parser("write"); w.add_argument("--dataset", default="era5")
    a = p.parse_args(argv)
    if a.cmd == "metadata":
        d = out_dir(a.dataset); d.mkdir(parents=True, exist_ok=True)
        meta = field_metadata(a.data, a.dataset)
        (d / "qsat_field_metadata.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
        print(d / "qsat_field_metadata.json")
    else:
        for x in write(a.dataset):
            print(x)


if __name__ == "__main__":
    main()
