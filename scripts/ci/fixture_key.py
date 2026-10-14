"""Cache key of a synthetic test fixture (CI, .github/workflows/ci.yml): a hash of exactly what the fixture is
made from, so the cache is rebuilt when (and only when) its output can change.

    python scripts/ci/fixture_key.py earth|mars [--list]

Inputs hashed: the generator and every repository module it can import (found by reading the import
statements, function-level imports included, transitively; standard library and installed packages are
not followed), the registry files the generators read, pipeline/pyproject.toml (the Python dependencies)
and this file. Stdlib only: runs before any install.
"""
from __future__ import annotations

import ast
import hashlib
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "pipeline" / "src"
# the fixture generators and the directories their plain `import x` statements resolve to
GENERATORS = {
    "earth": ([SRC / "dune_atlas_pipeline" / "synthetic_fixture.py"], []),
    "mars": ([REPO / "scripts" / "mars" / "app" / "make_fixture.py"], [REPO / "scripts" / "mars" / "app"]),
}
# repository data the generators read (fields.load_metadata, field names) and the Python dependencies
DATA = ["registry/earth/qsat_field_metadata.json", "registry/earth/datasets/*/qsat_field_metadata.json",
        "registry/mars/qsat_field_metadata.json", "registry/field_names.json", "pipeline/pyproject.toml"]


def _module_file(name: str, extra: list[Path]) -> Path | None:
    for base in [SRC, *extra]:
        p = base / Path(*name.split("."))
        if (p / "__init__.py").exists():
            return p / "__init__.py"
        if p.with_suffix(".py").exists():
            return p.with_suffix(".py")
    return None


def _package(f: Path) -> str | None:
    """dotted package of a module under pipeline/src (None elsewhere)"""
    if SRC not in f.parents:
        return None
    return ".".join(f.relative_to(SRC).parts[:-1])


def closure(starts: list[Path], extra: list[Path]) -> list[Path]:
    seen: set[Path] = set()
    todo = list(starts)
    while todo:
        f = todo.pop()
        if f in seen:
            continue
        seen.add(f)
        pkg = _package(f)
        for node in ast.walk(ast.parse(f.read_text(encoding="utf-8"))):
            names: list[str] = []
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                base = node.module or ""
                if node.level and pkg is not None:
                    up = pkg.split(".")[: len(pkg.split(".")) - (node.level - 1)]
                    base = ".".join(up + ([node.module] if node.module else []))
                names = [base] + [f"{base}.{a.name}" for a in node.names]
            for n in names:
                m = _module_file(n, extra)
                if m:
                    todo.append(m)
        for par in f.parents:   # importing a module runs the __init__ of its packages
            if par == SRC or SRC not in par.parents:
                break
            if (par / "__init__.py").exists():
                todo.append(par / "__init__.py")
    return sorted(seen)


def inputs(body: str) -> list[Path]:
    starts, extra = GENERATORS[body]
    data = {p for pat in DATA for p in REPO.glob(pat)}
    return sorted(set(closure(starts, extra)) | data | {Path(__file__).resolve()})


def key(body: str) -> str:
    h = hashlib.sha256()
    for p in inputs(body):
        h.update(str(p.relative_to(REPO)).encode() + b"\0" + p.read_bytes() + b"\0")
    return h.hexdigest()[:20]


if __name__ == "__main__":
    body = sys.argv[1]
    if "--list" in sys.argv:
        print("\n".join(str(p.relative_to(REPO)) for p in inputs(body)))
    else:
        print(key(body))
