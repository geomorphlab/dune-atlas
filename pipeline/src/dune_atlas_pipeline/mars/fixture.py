"""Fixture subset of the Mars cells.zarr for local app testing: the full store metadata (same array shapes, codecs
and attrs) with only the shard objects around three dune fields (Nili Patera, Proctor crater, the north polar erg):
`fields` for the 3 x 3 shards around each site (radius 1), `series` (~26 MB per shard) for the site shards only
(radius 0); every other shard is absent and reads as the fill value (NaN). The 1-D and 2-D arrays (ls, sol, dunes, dune) are
copied whole. Objects are copied byte for byte, so values are identical to the full store.

    python -m dune_atlas_pipeline.mars.fixture --store cells.zarr --out fixture/cells.zarr [--radius 1]
"""
from __future__ import annotations

import argparse
import json
import os
import shutil

SHARD = 16
NSY, NSX = 6, 12                       # shard grid of the 90 x 180 cells
SITES = {"Nili Patera": (9.0, 67.0), "Proctor crater": (-47.0, 30.0), "north polar erg": (81.0, 121.0)}


def site_shard(lat, lon):
    i = int(round((89 - lat) / 2)); j = int(round((lon + 179) / 2)) % 180
    return i // SHARD, j // SHARD


def fixture_shards(radius=1, sites=SITES) -> list[tuple[int, int]]:
    out = set()
    for la, lo in sites.values():
        a, b = site_shard(la, lo)
        for da in range(-radius, radius + 1):
            for db in range(-radius, radius + 1):
                if 0 <= a + da < NSY:
                    out.add((a + da, (b + db) % NSX))
    return sorted(out)


def build(store, out, radius=1, series_radius=0) -> dict:
    import zarr
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    shutil.copy2(os.path.join(store, "zarr.json"), os.path.join(out, "zarr.json"))
    for name in ("ls", "sol", "dunes", "dune"):
        shutil.copytree(os.path.join(store, name), os.path.join(out, name))
    shards = fixture_shards(radius)
    per = {"series": fixture_shards(series_radius), "fields": shards}
    n = 0; nbytes = 0
    for name in ("series", "fields"):
        os.makedirs(os.path.join(out, name))
        shutil.copy2(os.path.join(store, name, "zarr.json"), os.path.join(out, name, "zarr.json"))
        for a, b in per[name]:
            src = os.path.join(store, name, "c", str(a), str(b), "0", "0")
            if os.path.exists(src):
                dst = os.path.join(out, name, "c", str(a), str(b), "0", "0")
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
                n += 1; nbytes += os.path.getsize(dst)
    g = zarr.open_group(out, mode="r+", zarr_format=3)
    g.attrs.update({"fixture": {"note": "subset of the Mars cells.zarr: only these shards (16 x 16 cells, row/col "
                                        "shard indices) hold data; elsewhere fill values",
                                "shards": [list(s) for s in shards], "radius_shards": radius,
                                "series_shards": [list(s) for s in per["series"]],
                                "series_radius_shards": series_radius,
                                "sites": {k: list(v) for k, v in SITES.items()}}})
    return {"shards": len(shards), "series_shards": len(per["series"]), "objects": n, "bytes": nbytes}


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.fixture")
    p.add_argument("--store", required=True); p.add_argument("--out", required=True)
    p.add_argument("--radius", type=int, default=1)
    p.add_argument("--series-radius", type=int, default=0)
    a = p.parse_args(argv)
    print(json.dumps(build(a.store, a.out, a.radius, a.series_radius)), flush=True)


if __name__ == "__main__":
    main()
