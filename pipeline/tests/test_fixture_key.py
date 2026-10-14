"""The fixture cache key (scripts/ci/fixture_key.py) covers every repository module the generators load."""
import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "ci"))
import fixture_key as FK  # noqa: E402

# load a generator in a fresh interpreter (module level only, not its main) and list the modules it loaded
LOAD = {
    "earth": "import importlib; importlib.import_module('dune_atlas_pipeline.synthetic_fixture')",
    "mars": f"import runpy; runpy.run_path({str(REPO / 'scripts' / 'mars' / 'app' / 'make_fixture.py')!r}, run_name='not_main')",
}


def _loaded(body: str) -> set[Path]:
    code = (f"import json, sys\n{LOAD[body]}\n"
            "print(json.dumps(sorted({getattr(m, '__file__', None) or '' for m in list(sys.modules.values())})))")
    env = {**os.environ, "PYTHONPATH": os.pathsep.join([str(REPO / "pipeline" / "src"), os.environ.get("PYTHONPATH", "")])}
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True, env=env).stdout
    files = json.loads(out.splitlines()[-1])
    return {Path(f).resolve() for f in files if f.endswith(".py") and Path(f).resolve().is_relative_to(REPO)}


def test_inputs_cover_the_imported_modules():
    for body in ("earth", "mars"):
        missing = _loaded(body) - set(FK.inputs(body))
        assert not missing, (body, sorted(str(p.relative_to(REPO)) for p in missing))


def test_key_is_stable_and_body_specific():
    assert FK.key("earth") == FK.key("earth")
    assert FK.key("earth") != FK.key("mars")
    names = {str(p.relative_to(REPO)) for p in FK.inputs("mars")}
    assert {"scripts/mars/app/fixture_common.py", "pipeline/src/dune_atlas_pipeline/mars/physics.py", "registry/mars/qsat_field_metadata.json"} <= names
    assert not any(n.startswith("registry/mars/places") or n.startswith("app/") for n in names)
