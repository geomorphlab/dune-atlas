"""Field pyramids: coarsening rules (coastal NaN handling), level choice, registry fragment."""
import json
import os
from pathlib import Path

import numpy as np
import pytest

from dune_atlas_pipeline import fields as F
from dune_atlas_pipeline.cellstore import FIELD_VARS

REPO = Path(__file__).resolve().parents[2]
D = os.environ.get("DUNE_WORLD_DATA", "")


# --------------------------------------------------------------------------- coarsening
def test_choose_levels_global():
    assert F.choose_levels(3600) == 5                 # 3600, 1800, 900, 450, 225
    assert 3600 // 2 ** (F.choose_levels(3600) - 1) <= 256
    assert F.choose_levels(300) == 2 and F.choose_levels(256) == 1


def test_weighted_mean_no_nan_poisoning_no_fabrication():
    a = np.full((8, 8), np.nan, "f4")
    a[0, 0] = 1.0                                     # single coastal land cell in a 4x4 window
    a[4:8, 4:8] = 3.0                                 # full-land window
    a[4, 0] = 5.0; a[5, 1] = 7.0                      # partial window, 2 land cells
    l1, l2 = F.coarsen_mean_weighted(a, 3)
    assert l1[0, 0] == 1.0 and np.isnan(l1[0, 1])     # land kept, ocean stays NaN
    assert l2[0, 0] == 1.0                            # not erased at 4x
    assert np.isnan(l2[0, 1])                         # all-ocean window -> NaN (nothing invented)
    assert l2[1, 1] == 3.0
    assert l2[1, 0] == pytest.approx(6.0)             # mean of the two land cells, not mean-of-means
    # footprint == any-finite in window
    win = np.isfinite(a).reshape(2, 4, 2, 4).any((1, 3))
    assert (np.isfinite(l2) == win).all()


def test_weighted_mean_differs_from_chained_mean_of_means():
    import topozarr_core as tc
    a = np.full((4, 4), np.nan)
    a[0, 0] = 1.0                       # isolated cell in its 2x2 block
    a[2:4, 0:2] = 4.0; a[3, 1] = np.nan  # 3 cells of 4.0
    a[0:2, 2:4] = 10.0
    chained = tc.block_reduce(tc.block_reduce(a, (2, 2), "mean"), (2, 2), "mean")
    ours = F.coarsen_mean_weighted(a, 3)[1]
    assert chained[0, 0] == pytest.approx((1 + 4 + 10) / 3)
    assert ours[0, 0] == pytest.approx((1 + 3 * 4 + 4 * 10) / 8)


def test_nearest_finite_keeps_coastal_angles_and_real_values():
    a = np.full((4, 4), np.nan, "f4")
    a[1, 1] = 2.5; a[3, 2] = -3.0; a[2, 3] = 0.1
    l1, l2 = F.coarsen_nearest_finite(a, 3)
    assert l1[0, 0] == np.float32(2.5)               # top-left ocean -> take the land cell
    assert l1[1, 1] == np.float32(0.1)               # row-major: (2,3) before (3,2)
    assert np.isnan(l1[0, 1]) and np.isnan(l1[1, 0])
    assert l2[0, 0] == np.float32(2.5)
    assert set(np.unique(l1[np.isfinite(l1)])) <= set(a[np.isfinite(a)])


def test_trim_matches_topozarr_shapes():
    a = np.random.default_rng(0).random((1801 // 8, 3600 // 8)).astype("f4")
    out = F.coarsen_mean_weighted(a, 4)
    assert [o.shape for o in out] == [(112, 225), (56, 112), (28, 56)]


def test_bitround():
    x = np.array([1.0, np.pi, -2.7182817, np.nan, 1e-20], "f4")
    y = F.bitround(x, 12)
    fin = np.isfinite(x)
    assert np.isnan(y[3])
    assert np.all(np.abs(y[fin] - x[fin]) <= np.abs(x[fin]) * 2.0 ** -12)


def test_tex_to_plain():
    s = F.tex_to_plain(r"Net along-crest flux $\langle Q_{\parallel}(\alpha_H)\rangle$ in m$^2$/s.")
    assert s == "Net along-crest flux ⟨Q∥(αH)⟩ in m²/s."


# --------------------------------------------------------------------------- registry
def _schema_layer_validator():
    import jsonschema
    schema = json.loads((REPO / "registry" / "layers.schema.json").read_text())
    sub = {"$schema": schema["$schema"], "$defs": schema["$defs"], "$ref": "#/$defs/layer"}
    return jsonschema.Draft202012Validator(sub), schema


def test_registry_fragment_validates():
    import jsonschema
    val, schema = _schema_layer_validator()
    frag = F.registry_fragment()
    assert set(frag) == {"groups", "layers"}
    gval = jsonschema.Draft202012Validator(
        {"$schema": schema["$schema"], **schema["properties"]["groups"]})
    gval.validate(frag["groups"])
    for lyr in frag["layers"]:
        val.validate(lyr)
    ids = [l["id"] for l in frag["layers"]]
    from dune_atlas_pipeline import constants as C
    assert sorted(ids) == sorted(FIELD_VARS) and len(ids) == len(C.QSAT_VARS) - len(C.WITHHELD_VARS)
    assert not set(ids) & set(C.WITHHELD_VARS)  # withheld fields never published
    groups = {g["id"] for g in frag["groups"]}
    assert all(l["group"] in groups for l in frag["layers"])


def test_registry_semantics():
    frag = {l["id"]: l for l in F.registry_fragment()["layers"]}
    for v, l in frag.items():
        assert l["type"] == "zarr-field" and l["thresholdAware"] is True
        assert l["source"] == f"{{dataset}}/fields/{v}.zarr"  # ERA5-Land: dune-atlas/v1/fields/<v>.zarr
        assert "$" not in l["title"] and "\\" not in l["title"]
        # definitions keep the source TeX for the app's KaTeX rendering: balanced $...$, no
        # units / slider / processing sentences (info-popover rows), one citation format and a licence row
        assert l["description"].count("$") % 2 == 0 and "Shown at the selected" not in l["description"]
        assert l["attribution"] == F.fields_attribution() and l["citation"].startswith(F.PAPER_CITATION + "; ")
        lo, hi = l["display"]["clim"]
        assert lo < hi
    for v in [v for v in ("at", "ae", "ao", "rdpa") if v in frag]:
        assert frag[v]["display"]["transform"] == "rad-to-bearing" and frag[v]["display"]["cyclic"]
        assert frag[v]["display"]["clim"] == [0.0, 360.0]
    assert frag["ab"]["display"]["transform"] == "rad-to-axis" and frag["ab"]["display"]["clim"] == [0.0, 180.0]
    for v in ("qnlb", "qncb", "qnle"):
        lo, hi = frag[v]["display"]["clim"]
        assert frag[v]["display"]["colormap"] == "rdbu" and lo == -hi
    # DP p98 = 4.43e-6 m^2/s -> ~140 m^2/yr
    assert frag["qacb"]["units"] == "m²/yr"  # flux converted m²/s -> m²/yr (dpm withheld: constants.WITHHELD_VARS)
    cmaps = set(json.loads((REPO / "app" / "src" / "generated" / "colormaps.json").read_text())) - {"_comment"}
    assert {l["display"]["colormap"] for l in frag.values()} <= cmaps


def test_generated_yaml_is_current(tmp_path):
    import yaml
    committed = REPO / "registry" / "earth" / "generated" / "qsat_fields.yaml"
    fresh = F.write_registry_fragment(tmp_path / "q.yaml")
    assert yaml.safe_load(committed.read_text()) == yaml.safe_load(fresh.read_text()), \
        "regenerate: python -m dune_atlas_pipeline.fields registry"


# --------------------------------------------------------------------------- end-to-end (source data)
@pytest.mark.skipif(not os.path.isdir(D), reason="source data not available")
def test_build_small_region(tmp_path):
    import warnings
    import xarray as xr
    import zarr
    warnings.filterwarnings("ignore")
    dq = xr.open_zarr(f"{D}/era5-land_1950_2024_qsat_params.zarr", consolidated=False)
    region = dict(latitude=slice(1000, 1064), longitude=slice(1900, 2028))   # Namib coast
    for v in ("dpm", "at"):
        out = tmp_path / f"{v}.zarr"
        st = F.build_field_pyramid(dq, v, str(out), levels=3, region=region)
        g = zarr.open_group(str(out), mode="r")
        a0 = g[f"0/{v}"][...]
        assert a0.shape == (64, 64, 128) and a0.dtype == np.float32
        src = dq[v].isel(**region).values
        scale = F.C.S2Y if v in F.FLUX_VARS else 1.0
        exact = (src * scale).astype("f4")
        np.testing.assert_allclose(a0, exact, rtol=2.0 ** -12, equal_nan=True)   # keepbits=12
        np.testing.assert_array_equal(a0, F.bitround(exact, F.DEFAULT_KEEPBITS))
        ref = (F.coarsen_nearest_finite if v in F.ANGLE_VARS else F.coarsen_mean_weighted)(exact[14], 3)
        for lvl in (1, 2):
            np.testing.assert_array_equal(g[f"{lvl}/{v}"][14], F.bitround(ref[lvl - 1], F.DEFAULT_KEEPBITS))
            assert np.isfinite(g[f"{lvl}/{v}"][14]).sum() == np.isfinite(ref[lvl - 1]).sum()
        codecs = json.loads((out / "0" / v / "zarr.json").read_text())["codecs"][0]["configuration"]["codecs"]
        assert codecs[-1]["name"] == "blosc" and codecs[-1]["configuration"]["shuffle"] == "shuffle"
        assert dict(g[f"1/{v}"].attrs)["long_name"] == F.FIELD_META[v]["title"]
        lay = g.attrs["multiscales"]["layout"]
        assert lay[1]["transform"]["scale"] == [1.0, 2.0, 2.0]   # (ut, y, x) order
        assert g.attrs["proj:code"] == "EPSG:4326"
        assert dict(g[f"0/{v}"].attrs)["units"] == ("m²/yr" if v == "dpm" else "rad")
        assert st["levels"] == 3
