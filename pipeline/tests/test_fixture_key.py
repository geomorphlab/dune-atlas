"""The fixture cache key (scripts/ci/fixture_key.py) covers every repository module the generators load."""
import importlib
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "ci"))
import fixture_key as FK  # noqa: E402


def _repo_modules() -> set[Path]:
    out = set()
    for m in list(sys.modules.values()):
        f = getattr(m, "__file__", None)
        if f and Path(f).resolve().is_relative_to(REPO) and Path(f).suffix == ".py":
            out.add(Path(f).resolve())
    return out


def test_earth_inputs_cover_the_imported_modules():
    importlib.import_module("dune_atlas_pipeline.synthetic_fixture")
    loaded = {p for p in _repo_modules() if (REPO / "pipeline" / "src") in p.parents}
    missing = loaded - set(FK.inputs("earth"))
    assert not missing, sorted(str(p.relative_to(REPO)) for p in missing)


def test_mars_inputs_cover_the_imported_modules():
    # in a fresh interpreter: the generator inserts its own paths and imports at module level
    import json
    gen = str(REPO / "scripts" / "mars" / "app" / "make_fixture.py")
    code = (f"import json, runpy, sys\nrunpy.run_path({gen!r}, run_name='not_main')\n"
            "print(json.dumps(sorted({getattr(m, '__file__', None) or '' for m in sys.modules.values()})))")
    files = json.loads(subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True).stdout.splitlines()[-1])
    loaded = {Path(f).resolve() for f in files if f.endswith(".py") and Path(f).resolve().is_relative_to(REPO)}
    missing = loaded - set(FK.inputs("mars"))
    assert not missing, sorted(str(p.relative_to(REPO)) for p in missing)


def test_key_is_stable_and_body_specific():
    assert FK.key("earth") == FK.key("earth")
    assert FK.key("earth") != FK.key("mars")
    names = {str(p.relative_to(REPO)) for p in FK.inputs("mars")}
    assert {"scripts/mars/app/fixture_common.py", "pipeline/src/dune_atlas_pipeline/mars/physics.py", "registry/mars/qsat_field_metadata.json"} <= names
    assert not any(n.startswith("registry/mars/places") or n.startswith("app/") for n in names)
