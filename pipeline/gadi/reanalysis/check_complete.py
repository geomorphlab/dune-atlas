"""Completeness of the downloaded 10 m winds, 1980-2025 (run after all download jobs have finished).

For each dataset: every expected file exists exactly once (MERRA-2: one per day; JRA-3Q: u and v per month), has a
manifest entry whose size matches the file, and the hours add up to 403,248 (1980-01-01T00 to 2025-12-31T23).
Leftover *.part files of stopped jobs are listed (and removed with --clean). Writes a JSON summary.

  python check_complete.py RAW_ROOT OUT.json [--clean]
"""
import calendar
import collections
import glob
import json
import os
import sys

Y0, Y1 = 1980, 2025


def manifest(path):
    m = {}
    for line in open(path):
        if line.strip():
            r = json.loads(line)
            m[r["file"]] = r            # a file downloaded twice (overlapping jobs) keeps its last entry
    return m


def merra2(root):
    man = manifest(f"{root}/merra2/manifest.jsonl")
    missing, bad, hours, streams = [], [], 0, collections.Counter()
    for y in range(Y0, Y1 + 1):
        for m in range(1, 13):
            for d in range(1, calendar.monthrange(y, m)[1] + 1):
                stamp = f"{y:04d}{m:02d}{d:02d}"
                fs = glob.glob(f"{root}/merra2/{y:04d}/MERRA2_*.inst1_2d_asm_Nx.{stamp}.nc4")
                if len(fs) != 1:
                    missing.append((stamp, len(fs)))
                    continue
                name = os.path.basename(fs[0])
                r = man.get(name)
                if r is None or r["bytes"] != os.path.getsize(fs[0]) or r["n"] != 24:
                    bad.append(name)
                    continue
                hours += 24
                streams[int(name[7:10])] += 1
    return dict(files_expected=sum(366 if y % 4 == 0 else 365 for y in range(Y0, Y1 + 1)), missing=missing[:50],
                n_missing=len(missing), bad=bad[:50], n_bad=len(bad), hours=hours, streams=dict(streams))


def jra3q(root):
    man = manifest(f"{root}/jra3q/manifest.jsonl")
    missing, bad, hours = [], [], 0
    for y in range(Y0, Y1 + 1):
        for m in range(1, 13):
            nh = calendar.monthrange(y, m)[1] * 24
            for tag in ("0_2_2.ugrd10m", "0_2_3.vgrd10m"):
                fs = glob.glob(f"{root}/jra3q/{y:04d}/jra3q.fcst_surf.{tag}-hgt-fc-gauss.{y:04d}{m:02d}0100_*.nc")
                if len(fs) != 1:
                    missing.append((y, m, tag, len(fs)))
                    continue
                name = os.path.basename(fs[0])
                r = man.get(name)
                if r is None or r["bytes"] != os.path.getsize(fs[0]) or r["n"] != nh:
                    bad.append(name)
                    continue
                if tag.startswith("0_2_2"):
                    hours += nh
    return dict(files_expected=2 * 12 * (Y1 - Y0 + 1), missing=missing[:50], n_missing=len(missing), bad=bad[:50],
                n_bad=len(bad), hours_u=hours)


def main(root, out, clean=False):
    parts = sorted(glob.glob(f"{root}/*/*/*.part"))
    res = dict(expected_hours=int((Y1 - Y0 + 1) * 8760 + sum(24 for y in range(Y0, Y1 + 1) if y % 4 == 0)),
               merra2=merra2(root), jra3q=jra3q(root), leftover_parts=len(parts),
               bytes={ds: sum(os.path.getsize(f) for f in glob.glob(f"{root}/{ds}/*/*") if not f.endswith(".part"))
                      for ds in ("merra2", "jra3q")})
    if clean:
        for f in parts:
            os.remove(f)
        res["removed_parts"] = len(parts)
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: (v if not isinstance(v, dict) else {a: b for a, b in v.items() if a not in ("missing", "bad")})
                      for k, v in res.items()}))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], "--clean" in sys.argv)
