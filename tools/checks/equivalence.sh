#!/usr/bin/env bash
# Refactor equivalence gate: build both atlases from a clean export of <ref> (default: HEAD plus
# uncommitted changes to tracked files), then record and compare against a baseline directory:
#   H  dist tree hashes (tools/checks/tree-hash.sh)
#   T  built-string inventories (tools/checks/strings.mjs)
#   S  snapshots (tools/checks/snapshot.ts --live: registry, info popovers, help, layer panel,
#      data URLs, per-cell data requests, cell-panel DOM, download hashes)
# The share-link corpus is a test (tests/sharecorpus.test.ts, tests/mars/sharecorpus.test.ts).
#   bash tools/checks/equivalence.sh <baseline-dir> [<ref>] [<out-dir>]
# <baseline-dir> holds earth.json, mars.json, strings-earth.txt, strings-mars.txt, hashes.txt
# (written by this script with BASELINE=1). Needs Node 22 and network access to data.geomorphlab.org.
set -euo pipefail
repo="$(git -C "$(dirname "$0")/../.." rev-parse --show-toplevel)"
base="$(cd "$1" && pwd)"
ref="${2:-$(git -C "$repo" stash create)}"; ref="${ref:-HEAD}"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/dune-atlas-eq.XXXXXX")"
out="${3:-$tmp/out}"; mkdir -p "$out"; out="$(cd "$out" && pwd)"
trap 'rm -rf "$tmp/src"' EXIT
mkdir -p "$tmp/src" && git -C "$repo" archive "$ref" | tar -x -C "$tmp/src"
# the snapshot tool of the working tree (it may be newer than <ref>)
mkdir -p "$tmp/src/tools/checks" && cp "$repo"/tools/checks/* "$tmp/src/tools/checks/"
cd "$tmp/src/app"
export npm_config_cache="${npm_config_cache:-$repo/app/.npm-cache}" npm_config_update_notifier=false NODE_USE_ENV_PROXY="${NODE_USE_ENV_PROXY:-1}"
npm ci --prefer-offline --no-audit --no-fund >/dev/null
VITE_DATA_BASE=https://data.geomorphlab.org npm run build >/dev/null
VITE_BODY=mars VITE_BASE=/mars/ VITE_DATA_BASE=https://data.geomorphlab.org VITE_SITE_URL=https://map.geomorphlab.org/mars/ npm run build:mars >/dev/null
th() { bash ../tools/checks/tree-hash.sh "$1"; }
printf 'earth %s %s\nmars %s %s\n' "$(th dist)" "$(find dist -type f | wc -l | tr -d ' ')" "$(th dist-mars)" "$(find dist-mars -type f | wc -l | tr -d ' ')" > "$out/hashes.txt"
(cd dist && find . -type f | sed 's/-[A-Za-z0-9_-]\{8\}\././' | LC_ALL=C sort) > "$out/files-earth.txt"
(cd dist-mars && find . -type f | sed 's/-[A-Za-z0-9_-]\{8\}\././' | LC_ALL=C sort) > "$out/files-mars.txt"
node ../tools/checks/strings.mjs dist > "$out/strings-earth.txt"
node ../tools/checks/strings.mjs dist-mars > "$out/strings-mars.txt"
npx vite-node ../tools/checks/snapshot.ts -- "$out/earth.json" --live 2>/dev/null | tail -1
VITE_BODY=mars npx vite-node ../tools/checks/snapshot.ts -- "$out/mars.json" --live 2>/dev/null | tail -1
if [ -n "${BASELINE:-}" ]; then cp "$out"/* "$base/"; echo "baseline written to $base"; exit 0; fi
echo "== hashes"; diff "$base/hashes.txt" "$out/hashes.txt" && echo "identical" || true
st=0
for b in earth mars; do
  echo "== $b files (asset hashes masked)"; diff "$base/files-$b.txt" "$out/files-$b.txt" && echo identical || st=1
  echo "== $b built strings"; node ../tools/checks/compare.mjs "$base/strings-$b.txt" "$out/strings-$b.txt" || st=1
  echo "== $b snapshot"; node ../tools/checks/compare.mjs "$base/$b.json" "$out/$b.json" || st=1
done
echo "outputs in $out"
exit $st
