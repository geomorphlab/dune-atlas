#!/usr/bin/env bash
# Post-upload checks against the public custom domain: suffix ranges, byte ranges, CORS preflight.
#   scripts/verify_r2.sh https://data.geomorphlab.org/dune-atlas/v1 https://map.geomorphlab.org
set -uo pipefail
BASE=${1:?}; ORIGIN=${2:-https://map.geomorphlab.org}; fail=0
check() { local name=$1 want=$2 got=$3; if [[ "$got" == "$want" ]]; then echo "ok   $name ($got)"; else echo "FAIL $name: want $want got $got"; fail=1; fi; }
shard=$(curl -s "$BASE/cells.zarr/hist/zarr.json" >/dev/null && echo "cells.zarr/hist/c/66/119/0/0")
check "metadata 200"        200 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/cells.zarr/zarr.json")"
check "suffix range 206"    206 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Range: bytes=-4100' "$BASE/$shard")"
check "offset range 206"    206 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-99' "$BASE/$shard")"
check "pmtiles range 206"   206 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-126' "$BASE/dunes/dunes.pmtiles")"
pre=$(curl -s -o /dev/null -D - -X OPTIONS -H "Origin: $ORIGIN" -H 'Access-Control-Request-Method: GET' \
      -H 'Access-Control-Request-Headers: range' "$BASE/cells.zarr/zarr.json" | tr -d '\r')
check "CORS allow-origin"   "$ORIGIN" "$(echo "$pre" | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2}')"
expo=$(curl -s -o /dev/null -D - -H "Origin: $ORIGIN" -H 'Range: bytes=0-9' "$BASE/cells.zarr/zarr.json" | tr -d '\r' | awk -F': ' 'tolower($1)=="access-control-expose-headers"{print tolower($2)}')
[[ "$expo" == *content-range* ]] && echo "ok   CORS exposes content-range" || { echo "FAIL CORS expose-headers: '$expo'"; fail=1; }
cache=$(curl -s -o /dev/null -D - "$BASE/dunes/dunes.pmtiles" -H 'Range: bytes=0-9' | tr -d '\r' | awk -F': ' 'tolower($1)=="cf-cache-status"{print $2}')
echo "info cf-cache-status: ${cache:-none} (HIT after a repeat request means edge caching works)"
exit $fail
