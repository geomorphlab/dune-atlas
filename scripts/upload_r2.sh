#!/usr/bin/env bash
# Upload a staged data release to Cloudflare R2 (S3 API) with rclone.
#   R2_ACCOUNT_ID=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
#   scripts/upload_r2.sh /Volumes/MGL2TB/dune-atlas-staging/v1 v1
# Requires rclone (conda-forge: `conda install -c conda-forge rclone`). Published versions are
# immutable: refuses to upload into a version prefix that already has objects unless FORCE=1.
set -euo pipefail
SRC=${1:?staging release dir}; VER=${2:?version, e.g. v1}
BUCKET=${R2_BUCKET:-dune-atlas-data}; PREFIX="dune-atlas/${VER}"
: "${R2_ACCOUNT_ID:?}" "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}"
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" RCLONE_CONFIG_R2_ACL=private
if [[ "${FORCE:-0}" != 1 ]] && [[ -n "$(rclone lsf "r2:${BUCKET}/${PREFIX}" --max-depth 1 2>/dev/null | head -1)" ]]; then
  echo "r2:${BUCKET}/${PREFIX} already has objects; published versions are immutable (FORCE=1 to override)"; exit 1
fi
# expected layout: cells.zarr/  fields/<var>.zarr/  dunes/*.pmtiles
for p in cells.zarr fields dunes; do [[ -e "$SRC/$p" ]] || { echo "missing $SRC/$p"; exit 1; }; done
rclone copy "$SRC" "r2:${BUCKET}/${PREFIX}" \
  --exclude "._*" --exclude ".DS_Store" --exclude "*.manifest.json" --exclude "logs/**" --exclude ".tools/**" \
  --header-upload "Cache-Control: public, max-age=86400, s-maxage=2592000, immutable" \
  --transfers 16 --checkers 32 --s3-no-check-bucket --progress
rclone size "r2:${BUCKET}/${PREFIX}"
