"""Mars dune fields: shapefile (aggregated from the USGS Mars Global Digital Dune Database, merged) ->
antimeridian-safe GeoJSON -> vector PMTiles (tippecanoe, Earth dunes-layer settings), and the dune overlap
fraction on the 2-degree contract grid (cells.zarr `dunes` / `dune`).

Input: 3,514 polygon records, Mars 2000 sphere (R = 3,396,190 m) planetocentric lon/lat, lon -180..180, no
attributes besides FID. Records that cross the antimeridian are already split into parts on both sides
(RFC 7946 style), so no coordinate leaves [-180, 180]; this is asserted, not repaired.

Features: one per source record (geometry made valid, exterior rings CCW, coordinates rounded to 1e-6 deg
~ 6 cm). Attributes, as Earth's dunes layer where meaningful (no grid `cells`):
  id        1 = largest field by area (MVT feature id)
  src_fid   FID of the source record
  area_km2  spherical area on R = 3,396,190 m (pyproj Geod on the sphere; geodesic edges)
  lon, lat  area centroid (Lambert azimuthal equal-area about the field, antimeridian-safe)
  west/south/east/north  bbox (west > east if the field crosses +-180)
Mars lon/lat is used as if it were EPSG:4326 by the web map (no datum shift), like every Mars layer.

Overlap fraction: for each 2-degree cell of the contract grid (rows lat 89 -> -89, cols lon -179 -> 179,
cell edges on even degrees) the dune area inside the cell / the cell area, both on the sphere. Intersections
are taken in lon/lat (cell edges are parallels and meridians) and measured in the cylindrical equal-area
plane (lon, sin lat), which is exact for the cell edges; polygon edges are short (median < 1 km).
"""
from __future__ import annotations

import json
import math
import os

import numpy as np

R_MARS_2000 = 3396190.0
# Web-Mercator latitude limit. The vector tiles carry the dune (and invert) geometry clipped exactly here; the
# polar caps poleward of it are drawn on the globe from `polar_cap_meshes` (app/src/mars/map/polarcap.ts).
MERC_LAT = 85.0511287798066
# MapLibre's globe extends every polygon triangle edge lying on the world's top/bottom tile edge (tile y = 0 /
# extent of the top/bottom tile row) to the pole (render/subdivision.ts `_fillPoles`), which drew wedges from
# the north pole to the polar dune fields. `nudge_pole_edges` therefore moves vertices on or beyond that edge
# one tile unit inside (1/4096 of a tile, sub-pixel), so no geometry touches it.
TILE_LAT_LIMIT = math.floor(MERC_LAT * 1e6) / 1e6     # 85.051128: the limit, rounded down to the 1e-6 coordinate grid
GRID = {"lat0": 89, "dlat": -2, "lon0": -179, "dlon": 2, "ny": 90, "nx": 180, "cell_registration": "centre"}
# The merged layer = MGD3 (Hayward et al. 2007, 2010, 2012, 2014) plus the small dune fields of Fenton (2020):
# MGD3 mapped fields > 1 km^2 only; Fenton (2020) updated the inventory equatorward of 65 deg and
# added many small fields (553 of the 3,514 merged polygons are < 1 km^2).
FENTON_2020 = ("Fenton, L. K. (2020). Updating the global inventory of dune fields on Mars and identification of many "
               "small dune fields. Icarus, 352, 114018. https://doi.org/10.1016/j.icarus.2020.114018")
HAYWARD_2014 = ("Hayward, R. K., Fenton, L. K., & Titus, T. N. (2014). Mars Global Digital Dune Database (MGD3): Global "
                "dune distribution and wind pattern observations. Icarus, 230, 38-46. https://doi.org/10.1016/j.icarus.2013.04.011")
CITATION = ("Dune fields: compiled by A. Gunn from the USGS Mars Global Digital Dune Database (MGD3; Hayward et al. "
            "2007, USGS Open-File Report 2007-1158, MC2-MC29, 65° N-65° S; Hayward et al. 2010, OFR 2010-1170, MC-1, "
            "65°-90° N; Hayward et al. 2012, OFR 2012-1259, MC-30, 65°-90° S, doi:10.3133/ofr20121259; Hayward et al. "
            "2014, Icarus 230, 38-46, doi:10.1016/j.icarus.2013.04.011) plus the small dune fields of Fenton (2020, "
            "Icarus 352, 114018, doi:10.1016/j.icarus.2020.114018), merged")
MGD3_REFERENCES = [
    "Hayward, R.K., Mullins, K.F., Fenton, L.K., Hare, T.M., Titus, T.N., Bourke, M.C., Colaprete, A., and "
    "Christensen, P.R., 2007, Mars Global Digital Dune Database: MC2-MC29: U.S. Geological Survey Open-File Report "
    "2007-1158. https://pubs.usgs.gov/of/2007/1158/",
    "Hayward, R.K., Fenton, L.K., Tanaka, K.L., Titus, T.N., Colaprete, A., and Christensen, P.R., 2010, Mars Global "
    "Digital Dune Database: MC-1: U.S. Geological Survey Open-File Report 2010-1170. https://pubs.usgs.gov/of/2010/1170/",
    "Hayward, R.K., Fenton, L.K., Titus, T.N., Colaprete, A., and Christensen, P.R., 2012, Mars global digital dune "
    "database: MC-30: U.S. Geological Survey Open-File Report 2012-1259, pamphlet 8 p. and GIS data, scale "
    "1:20,000,000. https://doi.org/10.3133/ofr20121259",
    HAYWARD_2014,
]
DUNE_REFERENCES = [*MGD3_REFERENCES, FENTON_2020]
ATTRIBUTION = ("Dune fields: USGS Mars Global Digital Dune Database (Hayward et al. 2007, 2010, 2012, 2014) and "
               "Fenton (2020), merged, compiled by A. Gunn")
# R2 keys of the tiles (objects are create-only). The '-r2' archives are the
# round-2 dunes.pmtiles / invert.pmtiles rebuilt with the MGD3 + Fenton (2020) metadata above: same input, same
# tippecanoe arguments apart from --attribution/--description, same clip and nudge; decoded tiles identical
# (docs/records/validation-mars-terrain.md section 10). polar-caps.json (no citation fields) is unchanged and stays
# beside them (the app derives its URL from the directory of `source`).
DUNES_KEY = "dune-atlas/mars/v1/dunes/dunes-r2.pmtiles"
INVERT_KEY = "dune-atlas/mars/v1/dunes/invert-r2.pmtiles"
POLAR_CAPS_KEY = "dune-atlas/mars/v1/dunes/polar-caps.json"
DESCRIPTION = "Mars dune fields (USGS MGD3 and Fenton 2020, merged), Mars 2000 planetocentric lon/lat"


def geod():
    from pyproj import Geod
    return Geod(a=R_MARS_2000, b=R_MARS_2000)


def load_shapefile(path: str):
    import geopandas as gpd
    g = gpd.read_file(path)
    assert len(g) > 0
    return g


def _parts(geom):
    return list(getattr(geom, "geoms", [geom]))


def crosses_antimeridian(geom) -> bool:
    """True if the (already split) geometry has parts touching both +180 and -180."""
    b = [p.bounds for p in _parts(geom)]
    return any(x1 >= 180 - 1e-9 for _, _, x1, _ in b) and any(x0 <= -180 + 1e-9 for x0, _, _, _ in b)


def _unwrapped(geom):
    """Shift parts west of 0 by +360 for an antimeridian-crossing geometry (continuous longitudes)."""
    import shapely
    from shapely.geometry import MultiPolygon
    if not crosses_antimeridian(geom):
        return geom
    ps = [shapely.transform(p, lambda c: np.column_stack([np.where(c[:, 0] < 0, c[:, 0] + 360, c[:, 0]), c[:, 1]]))
          for p in _parts(geom)]
    return MultiPolygon(ps) if len(ps) > 1 else ps[0]


def centroid_lonlat(geom) -> tuple[float, float]:
    """Area centroid via a Lambert azimuthal equal-area projection centred on the field (Mars sphere)."""
    import pyproj
    import shapely
    u = _unwrapped(geom)
    c0 = u.centroid
    laea = pyproj.Proj(proj="laea", lat_0=float(c0.y), lon_0=float(c0.x), R=R_MARS_2000)
    pr = shapely.transform(u, lambda c: np.column_stack(laea(c[:, 0], c[:, 1])))
    cx = pr.centroid
    lon, lat = laea(cx.x, cx.y, inverse=True)
    lon = (lon + 180) % 360 - 180
    return float(lon), float(lat)


def bbox(geom) -> tuple[float, float, float, float]:
    """(west, south, east, north); west > east when the field crosses +-180."""
    if crosses_antimeridian(geom):
        u = _unwrapped(geom)
        w, s, e, n = u.bounds
        return ((w + 180) % 360 - 180, s, (e + 180) % 360 - 180 if e > 180 else e, n)
    return geom.bounds


def validate_lonlat(geom) -> dict:
    """Coordinate checks: all lon in [-180, 180], lat in [-90, 90], no ring step > 180 deg in longitude."""
    import shapely
    c = shapely.get_coordinates(geom)
    jumps = 0
    for p in _parts(geom):
        for ring in [p.exterior, *p.interiors]:
            x = np.asarray(ring.coords)[:, 0]
            jumps += int(np.sum(np.abs(np.diff(x)) > 180))
    return {"lon_ok": bool((c[:, 0] >= -180).all() and (c[:, 0] <= 180).all()),
            "lat_ok": bool((np.abs(c[:, 1]) <= 90).all()), "ring_jumps": jumps}


def features(gdf, ndigits: int = 6) -> tuple[list[dict], dict]:
    """GeoJSON features (id 1 = largest) + summary."""
    import shapely
    from shapely.geometry import mapping
    from shapely.geometry.polygon import orient
    from shapely.geometry import MultiPolygon, Polygon
    G = geod()
    recs = []
    n_invalid = n_fixed = 0
    for fid, geom in zip(gdf["FID"] if "FID" in gdf else range(len(gdf)), gdf.geometry):
        if not geom.is_valid:
            n_invalid += 1
            geom = shapely.make_valid(geom)
            polys = [p for p in _parts(geom) if isinstance(p, Polygon) and p.area > 0]
            geom = polys[0] if len(polys) == 1 else MultiPolygon(polys)
            n_fixed += int(geom.is_valid)
        v = validate_lonlat(geom)
        assert v["lon_ok"] and v["lat_ok"] and v["ring_jumps"] == 0, (fid, v)
        geom = MultiPolygon([orient(p, 1.0) for p in _parts(geom)]) if geom.geom_type == "MultiPolygon" \
            else orient(geom, 1.0)
        area = abs(G.geometry_area_perimeter(geom)[0]) / 1e6
        lon, lat = centroid_lonlat(geom)
        w, s, e, n = bbox(geom)
        recs.append((area, int(fid), geom, lon, lat, w, s, e, n))
    recs.sort(key=lambda r: (-r[0], r[1]))
    feats = []
    for rank, (area, fid, geom, lon, lat, w, s, e, n) in enumerate(recs, start=1):
        gj = json.loads(json.dumps(mapping(geom)))
        gj["coordinates"] = _round(gj["coordinates"], ndigits)
        feats.append({"type": "Feature", "id": rank, "geometry": gj,
                      "properties": {"id": rank, "src_fid": fid, "area_km2": round(area, 3),
                                     "lon": round(lon, 3), "lat": round(lat, 3), "west": round(w, 3),
                                     "south": round(s, 3), "east": round(e, 3), "north": round(n, 3)}})
    areas = np.array([r[0] for r in recs])
    summ = {"n_features": len(feats), "n_input": len(gdf), "n_invalid_input": n_invalid, "n_made_valid": n_fixed,
            "n_multipolygon": int(sum(f["geometry"]["type"] == "MultiPolygon" for f in feats)),
            "n_crossing_antimeridian": int(sum(f["properties"]["west"] > f["properties"]["east"] for f in feats)),
            "total_area_km2": float(areas.sum()), "largest_km2": float(areas.max()),
            "median_km2": float(np.median(areas)), "smallest_km2": float(areas.min()),
            "n_vertices": int(sum(len(shapely.get_coordinates(r[2])) for r in recs)),
            "lat_range": [float(min(r[6] for r in recs)), float(max(r[8] for r in recs))],
            "n_north_of_mercator": int(sum(r[8] > 85.0511 for r in recs)),
            "n_south_of_mercator": int(sum(r[6] < -85.0511 for r in recs)),
            # composition (MGD3 maps fields > 1 km^2 only; the smaller ones are from Fenton 2020)
            "n_lt_1km2": int((areas < 1.0).sum()),
            "n_equatorward_65": int(sum(abs(r[4]) < 65 for r in recs)),
            "area_equatorward_65_km2": float(sum(r[0] for r in recs if abs(r[4]) < 65))}
    return feats, summ


def _round(obj, nd):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(v, nd) for v in obj]
        return [_round(o, nd) for o in obj]
    return obj


def write_geojson(feats: list[dict], path: str) -> str:
    with open(path + ".tmp", "w") as f:
        f.write('{"type":"FeatureCollection","features":[\n')
        for i, ft in enumerate(feats):
            f.write(("," if i else "") + json.dumps(ft, separators=(",", ":")) + "\n")
        f.write("]}\n")
    os.replace(path + ".tmp", path)
    return path


def clip_for_tiles(feats: list[dict], lat_limit: float = TILE_LAT_LIMIT, ndigits: int = 6) -> tuple[list[dict], dict]:
    """Copies of the features with geometry clipped to |lat| <= lat_limit (polygon parts only, valid, CCW
    exteriors); features entirely outside are dropped. Properties are unchanged (whole-field values)."""
    import shapely
    from shapely.geometry import shape, mapping, box, MultiPolygon, Polygon
    from shapely.geometry.polygon import orient
    clip = box(-180, -lat_limit, 180, lat_limit)
    out, n_clipped, dropped = [], 0, []
    for f in feats:
        g = shape(f["geometry"])
        if clip.contains(g):
            out.append(f)
            continue
        h = shapely.make_valid(g.intersection(clip))
        polys = [p for p in getattr(h, "geoms", [h]) if isinstance(p, Polygon) and p.area > 0]
        if not polys:
            dropped.append(f["id"])
            continue
        n_clipped += 1
        polys = [orient(p, 1.0) for p in polys]
        h = polys[0] if len(polys) == 1 else MultiPolygon(polys)
        gj = json.loads(json.dumps(mapping(h)))
        gj["coordinates"] = _round(gj["coordinates"], ndigits)
        out.append({**f, "geometry": gj})
    return out, {"tile_lat_limit": lat_limit, "n_tile_features": len(out), "n_clipped_at_lat_limit": n_clipped,
                 "dropped_ids_beyond_lat_limit": dropped}


def tippecanoe_args() -> list[str]:
    """Earth's dunes TIPPECANOE_ARGS with Mars name/description/attribution."""
    from .. import dunes as earth
    out = []
    for a in earth.TIPPECANOE_ARGS:
        if a.startswith("--attribution="):
            a = "--attribution=" + ATTRIBUTION
        elif a.startswith("--name="):
            a = "--name=dune-atlas Mars dunes"
        elif a.startswith("--description="):
            a = "--description=" + DESCRIPTION
        out.append(a)
    return out


def build_vector_pmtiles(geojson: str, out: str) -> str:
    """Earth's build_vector_pmtiles invocation (bare tippecanoe, relative paths) with the Mars metadata args."""
    import shutil
    import subprocess
    if shutil.which("tippecanoe") is None:
        raise RuntimeError("tippecanoe not found")
    out = os.path.abspath(out)
    cwd = os.path.dirname(out)
    src = os.path.relpath(os.path.abspath(geojson), cwd)
    subprocess.run(["tippecanoe", "-o", os.path.basename(out), *tippecanoe_args(), src], check=True, cwd=cwd)
    return out


# ----------------------------------------------------------------------------- overlap fraction on the 2-deg grid
def contract_axes():
    lat = GRID["lat0"] + GRID["dlat"] * np.arange(GRID["ny"], dtype="f8")
    lon = GRID["lon0"] + GRID["dlon"] * np.arange(GRID["nx"], dtype="f8")
    return lat, lon


def cea(geom):
    """lon/lat (deg) -> cylindrical equal-area plane (lon rad, sin lat): planar area x R^2 = spherical area."""
    import shapely
    return shapely.transform(geom, lambda c: np.column_stack([np.radians(c[:, 0]), np.sin(np.radians(c[:, 1]))]))


def overlap_fraction(geoms) -> np.ndarray:
    """(90, 180) float64 dune area fraction per contract-grid cell."""
    import shapely
    from shapely import STRtree, box
    lat, lon = contract_axes()
    hl, hn = abs(GRID["dlat"]) / 2, GRID["dlon"] / 2
    I, J = np.meshgrid(np.arange(len(lat)), np.arange(len(lon)), indexing="ij")
    I, J = I.ravel(), J.ravel()
    boxes = box(lon[J] - hn, lat[I] - hl, lon[J] + hn, lat[I] + hl)
    geoms = np.asarray(list(geoms), dtype=object)
    tree = STRtree(boxes)
    gi, bi = tree.query(geoms, predicate="intersects")
    inter = shapely.intersection(geoms[gi], boxes[bi])
    a = np.array([cea(g).area for g in inter])
    cell_area = np.radians(GRID["dlon"]) * (np.sin(np.radians(lat + hl)) - np.sin(np.radians(lat - hl)))
    frac = np.zeros((len(lat), len(lon)))
    np.add.at(frac, (I[bi], J[bi]), a)
    frac /= cell_area[:, None]
    return frac


def fv3_to_contract(a: np.ndarray) -> np.ndarray:
    """FV3 orientation (lat -89..89 ascending, lon 1..359) -> contract (lat 89..-89, lon -179..179)."""
    return np.roll(a[::-1], 90, axis=1)


def save_grid(frac: np.ndarray, path: str, extra: dict | None = None) -> str:
    lat, lon = contract_axes()
    np.savez_compressed(path, frac=frac.astype("f4"), dune=(frac > 0).astype("u1"), lat=lat, lon=lon,
                        grid=json.dumps(GRID), citation=CITATION, **(extra or {}))
    return path


def summary_tiles(pmtiles: str, maxzoom: int = 10) -> dict:
    """Per zoom: features in tiles and distinct field ids present (tippecanoe-decode)."""
    import subprocess
    res = {}
    for z in (0, 3, 6, maxzoom):
        p = subprocess.run(["tippecanoe-decode", "-c", f"-Z{z}", f"-z{z}", pmtiles], check=True,
                           capture_output=True, text=True)
        ids, n = set(), 0
        for line in p.stdout.splitlines():
            line = line.strip().rstrip(",")
            if line.startswith('{ "type": "Feature"'):
                ft = json.loads(line)
                n += 1
                ids.add(ft["id"])
        res[z] = {"tile_features": n, "fields_present": len(ids)}
    return res


def main(argv=None):
    import argparse
    import time
    p = argparse.ArgumentParser(prog="python -m dune_atlas_pipeline.mars.dunes")
    p.add_argument("--shp", required=True)
    p.add_argument("--out-dir", required=True, help="work dir (GeoJSON, summary, grid npz)")
    p.add_argument("--pmtiles", required=True)
    p.add_argument("--compare", help="assessment npz (FV3 orientation: frac, lat, lon)")
    p.add_argument("--invert-pmtiles", help="also build the inverted layer (surface without dunes) here")
    a = p.parse_args(argv)
    os.makedirs(a.out_dir, exist_ok=True)
    t0 = time.time()
    g = load_shapefile(a.shp)
    feats, summ = features(g)
    write_geojson(feats, os.path.join(a.out_dir, "mars-dunes.geojson"))          # full geometry
    tfeats, tsumm = clip_for_tiles(feats)
    summ.update(tsumm)
    gj = write_geojson(tfeats, os.path.join(a.out_dir, "mars-dunes-tiles.geojson"))  # clipped at 85 deg
    build_vector_pmtiles(gj, a.pmtiles)
    summ["pole_edge_nudge"] = nudge_pole_edges(a.pmtiles)
    summ["pmtiles_bytes"] = os.path.getsize(a.pmtiles)
    meshes, csumm = polar_cap_meshes(feats)
    cap_path = write_polar_caps(meshes, os.path.join(os.path.dirname(a.pmtiles), "polar-caps.json"))
    csumm["bytes"] = os.path.getsize(cap_path)
    summ["polar_caps"] = csumm
    from .. import dunes as earth
    summ["tile_sizes"] = earth.tile_sizes(a.pmtiles)
    if a.invert_pmtiles:
        inv, isumm = invert_features(feats, tfeats)
        igj = write_geojson(inv, os.path.join(a.out_dir, "mars-invert-tiles.geojson"))
        build_invert_pmtiles(igj, a.invert_pmtiles)
        isumm["pole_edge_nudge"] = nudge_pole_edges(a.invert_pmtiles)
        isumm["pmtiles_bytes"] = os.path.getsize(a.invert_pmtiles)
        isumm["tile_sizes"] = earth.tile_sizes(a.invert_pmtiles)
        isumm["polar_tile_check"] = polar_tile_check(a.invert_pmtiles)
        isumm["tile_bounds_check"] = tile_bounds_check(a.invert_pmtiles, maxzoom=5)
        summ["invert"] = isumm
    summ["tile_ids"] = summary_tiles(a.pmtiles)
    summ["polar_tile_check"] = polar_tile_check(a.pmtiles)
    import shapely
    from shapely.geometry import shape
    geoms = [shapely.make_valid(shape(f["geometry"])) for f in feats]
    frac = overlap_fraction(geoms)
    lat, lon = contract_axes()
    cell_area = (R_MARS_2000 ** 2 * np.radians(2) *
                 (np.sin(np.radians(lat + 1)) - np.sin(np.radians(lat - 1))))[:, None]
    summ["grid"] = {"cells_with_dunes": int((frac > 0).sum()), "max_frac": float(frac.max()),
                    "dune_area_km2_from_grid": float((frac * cell_area).sum() / 1e6),
                    "frac_ge_1_minus_1e9": int((frac > 1 + 1e-9).sum())}
    if a.compare:
        d = np.load(a.compare)
        assert np.allclose(d["lat"], np.arange(-89, 90, 2)) and np.allclose(d["lon"], np.arange(1, 360, 2))
        ref = fv3_to_contract(d["frac"])
        diff = frac - ref
        summ["compare_assessment"] = {
            "cells_ref": int((ref > 0).sum()), "cells_new": int((frac > 0).sum()),
            "cells_both": int(((ref > 0) & (frac > 0)).sum()),
            "cells_only_new": int(((frac > 0) & ~(ref > 0)).sum()),
            "cells_only_ref": int(((ref > 0) & ~(frac > 0)).sum()),
            "max_abs_diff": float(np.abs(diff).max()), "mean_abs_diff_dune_cells": float(np.abs(diff[(frac > 0) | (ref > 0)]).mean()),
            "area_ref_km2": float((ref * cell_area).sum() / 1e6)}
    save_grid(frac, os.path.join(a.out_dir, "mars_dunefrac_contract.npz"))
    summ["elapsed_s"] = round(time.time() - t0, 1)
    with open(os.path.join(a.out_dir, "dunes_summary.json"), "w") as f:
        json.dump(summ, f, indent=1)
    print(json.dumps(summ, indent=1))



# ----------------------------------------------------------------------------- registry
def composition(summary: dict) -> str:
    """Sentence on the MGD3 / Fenton (2020) composition from the summary counts ('' if not in the summary)."""
    if "n_lt_1km2" not in summary:
        return ""
    return (f" MGD3 maps fields larger than 1 km²; {summary['n_lt_1km2']:,} polygons are smaller (Fenton 2020). "
            f"Equatorward of 65°: {summary['n_equatorward_65']:,} polygons, "
            f"{summary['area_equatorward_65_km2']:,.0f} km² (MGD3 and Fenton 2020).")


def registry_fragment(summary: dict) -> dict:
    """registry/mars/generated/dunes.yaml {groups, layers} (Earth dunes.yaml schema; no invert layer)."""
    n = summary["n_features"]
    area = summary["total_area_km2"]
    return {
        "groups": [{"id": "dunes", "title": "Dunes",
                    "description": (f"Mapped Martian dune fields (USGS Mars Global Digital Dune Database and Fenton "
                                    f"2020, {n:,} polygons, {area / 1e6:.2f} million km²).")}],
        "layers": [{
            "id": "dunes", "title": "Dune fields", "group": "dunes", "type": "pmtiles-vector",
            "source": DUNES_KEY, "sourceLayer": "dunes",
            "visible": True, "opacity": 1, "queryable": True, "minzoom": 0, "maxzoom": 24,
            "description": (f"Mapped aeolian dune fields of Mars: the USGS Mars Global Digital Dune Database (MGD3; "
                            f"equatorial MC2–MC29, north polar MC-1, south polar MC-30; Hayward et al. 2007, 2010, 2012, "
                            f"2014) plus the small dune fields of Fenton (2020), merged into {n:,} polygons "
                            f"({area:,.0f} km²)." + composition(summary)),
            "citation": CITATION,
            "attribution": {"source": "USGS Mars Global Digital Dune Database (MGD3) and Fenton (2020), merged, compiled by A. Gunn",
                            "citation": "; ".join(DUNE_REFERENCES), "doi": "10.3133/ofr20121259",
                            "licence": "Public domain (U.S. Geological Survey)",
                            "url": "https://www.usgs.gov/centers/astrogeology-science-center/science/mars-global-digital-dune-database",
                            "changes": "MGD3 and Fenton (2020) merged into one polygon layer; invalid geometries repaired; coordinates rounded to 1e-6°."},
            # 'invert' view: the Mars surface without mapped dunes (complement of this layer, polar caps
            # included); built by dunes.invert_features / build_invert_pmtiles
            "invertSource": INVERT_KEY,
            "invertSourceLayer": "invert",
            "style": {"fill": {"fill-color": "#a0a0a0", "fill-opacity": 0.55}},
        }],
    }


# ----------------------------------------------------------------------------- MVT reader/writer (pole-edge nudge)
def _varint(b: bytes, i: int):
    r = s = 0
    while True:
        c = b[i]; i += 1
        r |= (c & 0x7F) << s
        if c < 0x80:
            return r, i
        s += 7


def _fields(b: bytes):
    """Yield (field number, wire type, value) of a protobuf message (varint / length-delimited only)."""
    i, n = 0, len(b)
    while i < n:
        key, i = _varint(b, i)
        f, wt = key >> 3, key & 7
        if wt == 0:
            v, i = _varint(b, i)
        elif wt == 2:
            ln, i = _varint(b, i)
            v = b[i:i + ln]; i += ln
        elif wt == 5:
            v = b[i:i + 4]; i += 4
        elif wt == 1:
            v = b[i:i + 8]; i += 8
        else:
            raise ValueError(f"wire type {wt}")
        yield f, wt, v


def mvt_polygons(data: bytes) -> list[dict]:
    """Decode an MVT tile (gzip or raw): [{layer, extent, id, rings: [np.ndarray (n, 2) tile units]}] for
    polygon features. Rings are closed explicitly (first vertex appended)."""
    import gzip
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    out = []
    for f, _, layer in _fields(data):
        if f != 3:
            continue
        name, extent, feats = None, 4096, []
        for lf, _, lv in _fields(layer):
            if lf == 1:
                name = lv.decode()
            elif lf == 5:
                extent = lv
            elif lf == 2:
                feats.append(lv)
        for fb in feats:
            fid, gtype, geom = None, None, b""
            for ff, _, fv in _fields(fb):
                if ff == 1:
                    fid = fv
                elif ff == 3:
                    gtype = fv
                elif ff == 4:
                    geom = fv
            if gtype != 3:
                continue
            ints, i = [], 0
            while i < len(geom):
                v, i = _varint(geom, i); ints.append(v)
            rings, cur, x, y, k = [], [], 0, 0, 0
            while k < len(ints):
                cmd, cnt = ints[k] & 7, ints[k] >> 3; k += 1
                if cmd in (1, 2):
                    for _ in range(cnt):
                        dx, dy = ints[k], ints[k + 1]; k += 2
                        x += (dx >> 1) ^ -(dx & 1); y += (dy >> 1) ^ -(dy & 1)
                        if cmd == 1 and cur:
                            rings.append(cur); cur = []
                        cur.append((x, y))
                elif cmd == 7:
                    if cur:
                        cur.append(cur[0]); rings.append(cur); cur = []
            if cur:
                rings.append(cur)
            out.append({"layer": name, "extent": extent, "id": fid, "rings": [np.asarray(r, float) for r in rings]})
    return out


def _tile_lat(z: int, y: int, ty: np.ndarray, ext: int) -> np.ndarray:
    n = 2 ** z
    return np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (y + ty / ext) / n))))


def polar_tile_check(pmtiles: str, maxzoom: int = 10, buffer_px: float = 5.0,
                     lat_limit: float = TILE_LAT_LIMIT) -> dict:
    """For every tile of the top (y = 0) and bottom (y = 2^z - 1) Mercator rows: count vertices on or beyond the
    world's north/south edge (tile y <= 0 resp. >= extent) and polygon edges lying along that edge (both ends
    there; MapLibre's globe extends such edges to the pole -> wedges unless the edge spans the whole tile, which
    fills the polar cap; `pole_edge_cover_*` = covered fraction of the edge per touching tile). Also the longest
    edge (fraction of the tile extent) that does not run along a tile-buffer clip line (|coordinate - (-b, 0,
    extent, extent+b)| <= 1) or along the lat_limit clip parallel."""
    from pmtiles.reader import Reader, MmapSource
    res = {}
    with open(pmtiles, "rb") as fh:
        r = Reader(MmapSource(fh))
        for z in range(maxzoom + 1):
            n = 2 ** z
            d = {"tiles": 0, "features": 0, "verts_on_or_beyond_pole_edge": 0, "edges_on_pole_edge": 0,
                 "max_free_edge_tile_frac": 0.0, "pole_edge_cover": []}
            for y, north in ((0, True), (n - 1, False)):
                if n == 1 and not north:
                    break
                for x in range(n):
                    data = r.get(z, x, y)
                    if not data:
                        continue
                    d["tiles"] += 1
                    iv = []                      # x-intervals of edges on the pole edge, clamped as MapLibre clips
                    for ft in mvt_polygons(data):
                        d["features"] += 1
                        ext = ft["extent"]
                        b = buffer_px / 256 * ext
                        for ring in ft["rings"]:
                            yy = ring[:, 1]
                            bad = (yy <= 0) if north else (yy >= ext)
                            if n == 1:
                                bad = (yy <= 0) | (yy >= ext)
                            d["verts_on_or_beyond_pole_edge"] += int(bad.sum())
                            e_on = bad[1:] & bad[:-1]
                            d["edges_on_pole_edge"] += int(e_on.sum())
                            xc = np.clip(ring[:, 0], 0, ext)
                            for k in np.flatnonzero(e_on):
                                lo, hi = sorted((xc[k], xc[k + 1]))
                                if hi > lo:
                                    iv.append((lo, hi))
                            a, c = ring[:-1], ring[1:]
                            L = np.hypot(*(c - a).T)
                            on_clip = np.zeros(len(L), bool)
                            for k in (0, 1):
                                for lim in (-b, ext + b, 0, ext):
                                    on_clip |= (np.abs(a[:, k] - lim) <= 1) & (np.abs(c[:, k] - lim) <= 1)
                            # edges along the TILE_LAT_LIMIT clip parallel are expected (straight in Mercator)
                            lat_a = _tile_lat(z, y, a[:, 1], ext)
                            lat_c = _tile_lat(z, y, c[:, 1], ext)
                            on_clip |= (np.abs(np.abs(lat_a) - lat_limit) < 1e-3) & (np.abs(np.abs(lat_c) - lat_limit) < 1e-3)
                            if (~on_clip).any():
                                d["max_free_edge_tile_frac"] = max(d["max_free_edge_tile_frac"],
                                                                   float(L[~on_clip].max() / ext))
                    if iv:                       # union length of the covered pole-edge intervals / extent
                        iv.sort()
                        tot, (a0, b0) = 0.0, iv[0]
                        for a1, b1 in iv[1:]:
                            if a1 > b0:
                                tot += b0 - a0; a0, b0 = a1, b1
                            else:
                                b0 = max(b0, b1)
                        tot += b0 - a0
                        d["pole_edge_cover"].append(round(tot / ext, 4))
            c = d.pop("pole_edge_cover")
            d["tiles_touching_pole_edge"] = len(c)
            d["pole_edge_cover_min"] = min(c) if c else None
            d["pole_edge_cover_max"] = max(c) if c else None
            res[z] = d
    return res



def tile_bounds_check(pmtiles: str, maxzoom: int = 5, buffer_px: float = 5.0) -> dict:
    """Every tile z0..maxzoom: vertices outside the buffered tile [-b, extent + b] (should be 0) and, per zoom,
    the number of rings whose vertices sit on the world's top/bottom edge in the top/bottom tile row."""
    from pmtiles.reader import Reader, MmapSource, all_tiles
    out = {}
    with open(pmtiles, "rb") as fh:
        for (z, x, y), data in all_tiles(MmapSource(fh)):
            if z > maxzoom:
                continue
            d = out.setdefault(z, {"tiles": 0, "verts": 0, "verts_outside_buffer": 0})
            d["tiles"] += 1
            for ft in mvt_polygons(data):
                ext = ft["extent"]
                b = buffer_px / 256 * ext
                for ring in ft["rings"]:
                    d["verts"] += len(ring)
                    d["verts_outside_buffer"] += int(((ring < -b - 1) | (ring > ext + b + 1)).any(axis=1).sum())
    return dict(sorted(out.items()))



# ----------------------------------------------------------------------------- inverted layer
def invert_tippecanoe_args() -> list[str]:
    """Earth's non-dune (invert) tippecanoe arguments with the Mars layer name/metadata."""
    from .. import dunes as earth
    out = []
    for a in earth.NONDUNE_TIPPECANOE_ARGS:
        if a.startswith("--layer="):
            a = "--layer=invert"
        elif a.startswith("--name="):
            a = "--name=dune-atlas Mars surface without dunes"
        elif a.startswith("--description="):
            a = ("--description=Mars surface without mapped dunes (complement of the dune layer), for the inverted "
                 "dune view (Web-Mercator band; the polar caps are drawn on the globe from polar-caps.json)")
        elif a.startswith("--attribution="):
            a = "--attribution=" + ATTRIBUTION
        out.append(a)
    return out


def cea_area_m2(geom) -> float:
    """Exact spherical area (R = R_MARS_2000) of a lon/lat geometry whose edges are parallels/meridians or short."""
    return float(cea(geom).area) * R_MARS_2000 ** 2


def invert_features(feats: list[dict], tile_feats: list[dict]) -> tuple[list[dict], dict]:
    """The complement of the dune polygons over the whole sphere, as one feature (id 1).

    Tile geometry = the Web-Mercator band (|lat| <= TILE_LAT_LIMIT) minus the tile-clipped dunes, so the dune
    and invert tiles cover the flat map without gap or overlap; the polar caps beyond the band (with holes for
    the polar dunes) are drawn on the globe from polar_cap_meshes. Attributes use the whole sphere."""
    import shapely
    from shapely.geometry import shape, mapping, box, MultiPolygon, Polygon
    from shapely.geometry.polygon import orient
    world = box(-180, -90, 180, 90)
    merc = box(-180, -TILE_LAT_LIMIT, 180, TILE_LAT_LIMIT)
    full = shapely.union_all([shapely.make_valid(shape(f["geometry"])) for f in feats])
    clipped = shapely.union_all([shapely.make_valid(shape(f["geometry"])) for f in tile_feats])
    comp = shapely.make_valid(merc.difference(clipped))
    polys = [orient(p, 1.0) for p in getattr(comp, "geoms", [comp]) if isinstance(p, Polygon) and p.area > 0]
    comp = polys[0] if len(polys) == 1 else MultiPolygon(polys)
    sphere = 4 * math.pi * R_MARS_2000 ** 2
    a_dunes = cea_area_m2(full)
    a_comp_true = cea_area_m2(shapely.make_valid(world.difference(full)))
    a_comp_tiles = cea_area_m2(comp)
    gj = json.loads(json.dumps(mapping(comp)))
    gj["coordinates"] = _round(gj["coordinates"], 6)
    props = {"id": 1, "area_km2": round(a_comp_true / 1e6, 1),
             "frac_of_surface": round(a_comp_true / sphere, 6)}
    summ = {"invert_parts": len(polys), "invert_holes": int(sum(len(p.interiors) for p in polys)),
            "invert_vertices": int(len(shapely.get_coordinates(comp))),
            "sphere_km2": sphere / 1e6, "dune_union_km2_cea": a_dunes / 1e6,
            "invert_true_km2": a_comp_true / 1e6, "invert_tile_geometry_km2": a_comp_tiles / 1e6,
            "closure_rel_err": abs(a_comp_true + a_dunes - sphere) / sphere,
            "dune_sum_minus_union_km2": sum(cea_area_m2(shapely.make_valid(shape(f["geometry"]))) for f in feats) / 1e6
            - a_dunes / 1e6}
    return [{"type": "Feature", "id": 1, "geometry": gj, "properties": props}], summ


def build_invert_pmtiles(geojson: str, out: str) -> str:
    import shutil
    import subprocess
    if shutil.which("tippecanoe") is None:
        raise RuntimeError("tippecanoe not found")
    out = os.path.abspath(out)
    cwd = os.path.dirname(out)
    src = os.path.relpath(os.path.abspath(geojson), cwd)
    subprocess.run(["tippecanoe", "-o", os.path.basename(out), *invert_tippecanoe_args(), src], check=True, cwd=cwd)
    return out



def _enc_varint(v: int) -> bytes:
    out = bytearray()
    while True:
        c = v & 0x7F
        v >>= 7
        out.append(c | (0x80 if v else 0))
        if not v:
            return bytes(out)


def _enc_field(f: int, wt: int, v) -> bytes:
    key = _enc_varint((f << 3) | wt)
    if wt == 0:
        return key + _enc_varint(v)
    if wt == 2:
        return key + _enc_varint(len(v)) + v
    return key + v                                       # fixed32 / fixed64 raw bytes


def _ring_area2(r) -> float:
    x, y = r[:, 0], r[:, 1]
    return float(np.sum(x[:-1] * y[1:] - x[1:] * y[:-1]))


def _encode_polygon(rings: list[np.ndarray]) -> bytes:
    """MVT geometry commands for closed rings (last vertex == first, dropped in the encoding)."""
    zz = lambda v: (v << 1) ^ (v >> 63)
    out, cx, cy = [], 0, 0
    for r in rings:
        pts = r[:-1].astype(np.int64)
        out.append((1 << 3) | 1)
        x, y = int(pts[0, 0]), int(pts[0, 1])
        out += [zz(x - cx), zz(y - cy)]
        cx, cy = x, y
        out.append(((len(pts) - 1) << 3) | 2)
        for x, y in pts[1:]:
            x, y = int(x), int(y)
            out += [zz(x - cx), zz(y - cy)]
            cx, cy = x, y
        out.append((1 << 3) | 7)
    return b"".join(_enc_varint(v) for v in out)


def _nudge_rings(rings: list[np.ndarray], north: bool, south: bool, ext: int) -> tuple[list[np.ndarray], int]:
    """Clamp y into [1, ext-1] on the pole edge(s); drop rings that become degenerate (an exterior with its holes)."""
    n = 0
    out, keep_holes = [], True
    ext_sign = None
    for r in rings:
        r = r.copy()
        a0 = _ring_area2(r)
        if ext_sign is None and a0 != 0:
            ext_sign = np.sign(a0)
        is_ext = a0 != 0 and np.sign(a0) == ext_sign
        if north:
            m = r[:, 1] < 1
            n += int(m.sum()); r[m, 1] = 1
        if south:
            m = r[:, 1] > ext - 1
            n += int(m.sum()); r[m, 1] = ext - 1
        a1 = _ring_area2(r)
        if is_ext:
            keep_holes = a1 != 0 and np.sign(a1) == ext_sign
            if keep_holes:
                out.append(r)
        elif keep_holes and a1 != 0 and np.sign(a1) == -ext_sign:
            out.append(r)
    return out, n


def nudge_tile(data: bytes, z: int, y: int) -> tuple[bytes, int]:
    """Rewrite polygon geometry of a top/bottom-row MVT tile so no vertex lies on or beyond the world edge.
    Other tiles and non-polygon features are returned unchanged. Returns (gzip bytes, vertices moved)."""
    import gzip
    north, south = y == 0, y == 2 ** z - 1
    if not (north or south):
        return data, 0
    gz = data[:2] == b"\x1f\x8b"
    raw = gzip.decompress(data) if gz else data
    moved = 0
    tile_out = bytearray()
    for f, wt, layer in _fields(raw):
        if f != 3:
            tile_out += _enc_field(f, wt, layer)
            continue
        ext = 4096
        for lf, _, lv in _fields(layer):
            if lf == 5:
                ext = lv
        lay_out = bytearray()
        for lf, lwt, lv in _fields(layer):
            if lf != 2:
                lay_out += _enc_field(lf, lwt, lv)
                continue
            gtype = None
            for ff, _, fv in _fields(lv):
                if ff == 3:
                    gtype = fv
            if gtype != 3:
                lay_out += _enc_field(lf, lwt, lv)
                continue
            rings = mvt_polygons(_enc_field(3, 2, _enc_field(2, 2, lv) + _enc_field(5, 0, ext)))[0]["rings"]
            new, k = _nudge_rings(rings, north, south, ext)
            moved += k
            if not new:
                continue                                  # feature degenerate on this tile
            fb = bytearray()
            for ff, fwt, fv in _fields(lv):
                fb += _enc_field(4, 2, _encode_polygon(new)) if ff == 4 else _enc_field(ff, fwt, fv)
            lay_out += _enc_field(2, 2, bytes(fb))
        tile_out += _enc_field(3, 2, bytes(lay_out))
    out = bytes(tile_out)
    return (gzip.compress(out, 6) if gz else out), moved


def nudge_pole_edges(pmtiles: str) -> dict:
    """Rewrite `pmtiles` in place (atomic) with nudge_tile applied to the top/bottom tile rows."""
    from pmtiles.reader import Reader, MmapSource, all_tiles
    from pmtiles.tile import zxy_to_tileid
    from pmtiles.writer import Writer
    with open(pmtiles, "rb") as fh:
        src = MmapSource(fh)
        r = Reader(src)
        header, meta = r.header(), r.metadata()
        tiles = [(zxy_to_tileid(z, x, y), z, x, y, d) for (z, x, y), d in all_tiles(src)]
    tiles.sort()
    moved = changed = 0
    with open(pmtiles + ".tmp", "wb") as f:
        w = Writer(f)
        for tid, z, x, y, d in tiles:
            nd, k = nudge_tile(d, z, y)
            if k:
                moved += k; changed += 1
            w.write_tile(tid, nd)
        hdr = {k: header[k] for k in ("tile_type", "tile_compression", "min_zoom", "max_zoom", "min_lon_e7",
                                       "min_lat_e7", "max_lon_e7", "max_lat_e7", "center_zoom", "center_lon_e7",
                                       "center_lat_e7")}
        w.finalize(hdr, meta)
    os.replace(pmtiles + ".tmp", pmtiles)
    return {"tiles": len(tiles), "tiles_changed": changed, "vertices_moved": moved}


# ----------------------------------------------------------------------------- polar caps (globe layer)
def cap_band(north: bool, lat0: float = MERC_LAT):
    from shapely.geometry import box
    return box(-180, lat0, 180, 90) if north else box(-180, -90, 180, -lat0)


def triangulate_cap(geom, north: bool, lat0: float = MERC_LAT, dlon: float = 2.0, dlat: float = 0.25) -> np.ndarray:
    """Triangles (n, 3, 2) lon/lat covering geom within the cap band poleward of lat0, cut by a dlon x dlat
    grid (the globe draws straight chords between vertices, so edges are kept short; the cap ring at lat0 is
    vertexed every dlon at most, like the tile mesh). Exact cover: sum of triangle areas = area of the piece."""
    import shapely
    from shapely.geometry import box, Polygon
    band = cap_band(north, lat0)
    g = shapely.make_valid(geom).intersection(band)
    if g.is_empty:
        return np.zeros((0, 3, 2))
    lats = np.r_[lat0, np.arange(math.ceil(lat0 / dlat) * dlat, 90 + 1e-9, dlat)]
    lats = np.unique(np.clip(lats, lat0, 90))
    if not north:
        lats = -lats[::-1]
    lons = np.arange(-180, 180 + 1e-9, dlon)
    cells = [box(lons[j], lats[i], lons[j + 1], lats[i + 1]) for i in range(len(lats) - 1) for j in range(len(lons) - 1)]
    tree = shapely.STRtree(cells)
    tris = []
    parts = [p for p in getattr(g, "geoms", [g]) if isinstance(p, Polygon)]
    for p in parts:
        for ci in tree.query(p, predicate="intersects"):
            piece = shapely.make_valid(p.intersection(cells[ci]))
            for q in getattr(piece, "geoms", [piece]):
                if not isinstance(q, Polygon) or q.area <= 0:
                    continue
                q = shapely.segmentize(q, max(dlon, dlat))   # boundary vertices on the cell lines
                t = shapely.constrained_delaunay_triangles(q)
                for tri in getattr(t, "geoms", []):
                    c = np.asarray(tri.exterior.coords)[:3]
                    tris.append(c)
    return np.asarray(tris, float) if tris else np.zeros((0, 3, 2))


def tri_area_m2(tris: np.ndarray) -> float:
    """Sum of spherical areas of lon/lat triangles (cylindrical equal-area plane, exact for the cell lines)."""
    if not len(tris):
        return 0.0
    x, y = np.radians(tris[..., 0]), np.sin(np.radians(tris[..., 1]))
    a = 0.5 * np.abs((x[:, 1] - x[:, 0]) * (y[:, 2] - y[:, 0]) - (x[:, 2] - x[:, 0]) * (y[:, 1] - y[:, 0]))
    return float(a.sum()) * R_MARS_2000 ** 2


def polar_cap_meshes(feats: list[dict], lat0: float = MERC_LAT) -> tuple[dict, dict]:
    """{'dunes': {'N': tris, 'S': tris}, 'invert': {...}} poleward of lat0 from the UNCLIPPED dune polygons,
    plus area checks (km^2): mesh area vs the exact source area in each cap."""
    import shapely
    from shapely.geometry import shape
    full = shapely.union_all([shapely.make_valid(shape(f["geometry"])) for f in feats])
    meshes, summ = {"dunes": {}, "invert": {}}, {}
    for pole, north in (("N", True), ("S", False)):
        band = cap_band(north, lat0)
        dun = full.intersection(band)
        inv = band.difference(full)
        meshes["dunes"][pole] = triangulate_cap(dun, north, lat0)
        meshes["invert"][pole] = triangulate_cap(inv, north, lat0)
        summ[pole] = {"cap_km2": cea_area_m2(band) / 1e6, "dunes_src_km2": cea_area_m2(dun) / 1e6,
                      "dunes_mesh_km2": tri_area_m2(meshes["dunes"][pole]) / 1e6,
                      "invert_src_km2": cea_area_m2(inv) / 1e6,
                      "invert_mesh_km2": tri_area_m2(meshes["invert"][pole]) / 1e6,
                      "dunes_triangles": len(meshes["dunes"][pole]), "invert_triangles": len(meshes["invert"][pole])}
    return meshes, summ


def write_polar_caps(meshes: dict, path: str, lat0: float = MERC_LAT, ndigits: int = 6) -> str:
    """JSON for the app's globe cap layer: {version, lat0, layers: {dunes|invert: {N|S: flat [lon, lat, ...]
    of triangles}}} (3 vertices per triangle)."""
    doc = {"version": 1, "lat0": lat0, "crs": "Mars 2000 planetocentric lon/lat (treated as EPSG:4326)",
           "note": "triangles of the dune / invert polygons poleward of the Web-Mercator limit, for the globe",
           "layers": {k: {p: [round(float(v), ndigits) for v in t.reshape(-1)] for p, t in d.items()}
                      for k, d in meshes.items()}}
    with open(path + ".tmp", "w") as f:
        json.dump(doc, f, separators=(",", ":"))
    os.replace(path + ".tmp", path)
    return path


if __name__ == "__main__":
    main()
