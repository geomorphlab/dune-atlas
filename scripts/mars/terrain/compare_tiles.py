"""Tile-by-tile comparison of two vector PMTiles archives (Terrain round 3: the '-r2' metadata rebuild).

    python scripts/mars/terrain/compare_tiles.py OLD.pmtiles NEW.pmtiles [--json out.json]

For every tile id in either archive: the gzip-decompressed MVT bytes are compared; where they differ, each
layer is decoded to (name, version, extent) and its features to (id, geometry type, tags resolved to
(key, value bytes), raw geometry command bytes), compared first in order and then as a multiset (tippecanoe
may write features in a different order between runs). Also compares the header fields that describe the
tile set (entry / content counts reported separately as storage) and lists the metadata keys that differ. Exit status 0 only if every tile decodes to the same
features (geometry and properties).
"""
import argparse
import gzip
import json
import sys
from collections import Counter

from pmtiles.reader import MmapSource, Reader, all_tiles

sys.path.insert(0, __import__("os").path.join(__import__("os").path.dirname(__file__), "../../../pipeline/src"))
from dune_atlas_pipeline.mars.dunes import _fields  # noqa: E402

HEADER_KEYS = ("tile_type", "tile_compression", "min_zoom", "max_zoom", "min_lon_e7", "min_lat_e7", "max_lon_e7",
               "max_lat_e7", "center_zoom", "center_lon_e7", "center_lat_e7", "addressed_tiles_count")
# storage only (run-length entries / deduplicated contents; tippecanoe's deduplication of identical tiles can
# differ by a few contents between runs): reported, not part of the verdict
STORAGE_KEYS = ("tile_entries_count", "tile_contents_count")


def read(path):
    with open(path, "rb") as f:
        r = Reader(MmapSource(f))
        h, m = r.header(), r.metadata()
        tiles = {}
        for (z, x, y), data in all_tiles(r.get_bytes):
            tiles[(z, x, y)] = gzip.decompress(data) if data[:2] == b"\x1f\x8b" else data
    return h, m, tiles


def canon(tile: bytes):
    """[(name, version, extent, [(id, type, ((key, value), ...), geometry bytes), ...]), ...]"""
    layers = []
    for f, _, lb in _fields(tile):
        if f != 3:
            continue
        name, version, extent, keys, values, feats = None, None, 4096, [], [], []
        for lf, _, lv in _fields(lb):
            if lf == 1:
                name = lv.decode()
            elif lf == 15:
                version = lv
            elif lf == 5:
                extent = lv
            elif lf == 3:
                keys.append(lv.decode())
            elif lf == 4:
                values.append(bytes(lv))
            elif lf == 2:
                feats.append(lv)
        out = []
        for fb in feats:
            fid, gtype, geom, tags = None, None, b"", []
            for ff, _, fv in _fields(fb):
                if ff == 1:
                    fid = fv
                elif ff == 3:
                    gtype = fv
                elif ff == 4:
                    geom = bytes(fv)
                elif ff == 2:
                    i, ints = 0, []
                    from dune_atlas_pipeline.mars.dunes import _varint
                    while i < len(fv):
                        v, i = _varint(fv, i); ints.append(v)
                    tags = [(keys[ints[k]], values[ints[k + 1]]) for k in range(0, len(ints), 2)]
            out.append((fid, gtype, tuple(sorted(tags)), geom))
        layers.append((name, version, extent, out))
    return layers


def compare(old, new):
    ho, mo, to = read(old)
    hn, mn, tn = read(new)
    res = {"old": old, "new": new,
           "header_diff": {k: [ho[k], hn[k]] for k in HEADER_KEYS if ho.get(k) != hn.get(k)},
           "storage_diff": {k: [ho[k], hn[k]] for k in STORAGE_KEYS if ho.get(k) != hn.get(k)},
           "metadata_keys_differing": sorted(k for k in set(mo) | set(mn) if mo.get(k) != mn.get(k)),
           "tiles_old": len(to), "tiles_new": len(tn),
           "only_old": len(set(to) - set(tn)), "only_new": len(set(tn) - set(to)),
           "bytes_identical": 0, "same_features_same_order": 0, "same_features_other_order": 0,
           "different": 0, "features_total": 0, "different_tiles": []}
    for t in sorted(set(to) & set(tn)):
        a, b = to[t], tn[t]
        ca = canon(a)
        res["features_total"] += sum(len(L[3]) for L in ca)
        if a == b:
            res["bytes_identical"] += 1
            continue
        cb = canon(b)
        if ca == cb:
            res["same_features_same_order"] += 1
        elif ([L[:3] for L in ca] == [L[:3] for L in cb]
              and all(Counter(x[3]) == Counter(y[3]) for x, y in zip(ca, cb))):
            res["same_features_other_order"] += 1
        else:
            res["different"] += 1
            if len(res["different_tiles"]) < 20:
                res["different_tiles"].append(list(t))
    res["identical_features"] = (res["different"] == 0 and res["only_old"] == 0 and res["only_new"] == 0
                                 and not res["header_diff"])
    return res


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("old")
    ap.add_argument("new")
    ap.add_argument("--json")
    a = ap.parse_args()
    r = compare(a.old, a.new)
    if a.json:
        with open(a.json, "w") as f:
            json.dump(r, f, indent=1)
    print(json.dumps(r, indent=1))
    sys.exit(0 if r["identical_features"] else 1)
