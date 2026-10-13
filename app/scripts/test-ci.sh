#!/usr/bin/env bash
# CI-like check from a clean export (as .github/workflows/deploy.yml on ubuntu-latest): no notes/,
# no staging/, fresh `npm ci`, then validate-registry, test and build.
#   npm run test:ci            # HEAD plus uncommitted changes to tracked files (git stash create)
#   npm run test:ci -- <ref>   # any commit / tag
# Set CI_NODE=/path/to/node22/bin to run with the CI Node version (deploy.yml: node-version 22).
set -euo pipefail
repo="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
ref="${1:-$(git -C "$repo" stash create)}"
ref="${ref:-HEAD}"
tmpbase="$(cd "${TMPDIR:-/tmp}" && pwd)"
tmp="$(mktemp -d "$tmpbase/dune-atlas-ci.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT
git -C "$repo" archive "$ref" | tar -x -C "$tmp"
cd "$tmp/app"
[ -n "${CI_NODE:-}" ] && export PATH="$CI_NODE:$PATH"
echo "ci: $(git -C "$repo" rev-parse --short "$ref") in $tmp, node $(node --version)"
test ! -e "$tmp/staging" && test ! -e "$tmp/notes" || { echo "ci: export contains staging/ or notes/"; exit 1; }
# reuse the repo's npm cache if present (offline-friendly); CI itself uses actions/setup-node's cache
export npm_config_cache="${npm_config_cache:-$repo/app/.npm-cache}"
npm ci --prefer-offline --no-audit --no-fund
npm run validate-registry
CI=true npm test
# list what was skipped (fixture-dependent tests: staging/ is not in git)
CI=true npx vitest run --reporter=verbose 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^\s+↓' | sed 's/^ */ci: skipped: /' || true
VITE_DATA_BASE="https://data.geomorphlab.org" npm run build
echo "ci: OK"
