#!/bin/bash
# Login-node wrapper: extract the code tarball into the code dir, fill the PBS template from the site
# settings (pipeline/gadi/site.env, see site.example.env) and KEY=VALUE arguments, qsub, print the job id,
# exit. Usage: stage_and_submit.sh <tag> <template.pbs> [KEY=VALUE ...]
set -eu
TAG=$1; TPL=$2; shift 2
SITE_ENV=${DUNE_ATLAS_SITE_ENV:-$(dirname "$0")/../site.env}
# shellcheck source=/dev/null
. "$SITE_ENV"
: "${DUNE_ATLAS_PROJECT:?}" "${DUNE_ATLAS_STORAGE:?}" "${DUNE_ATLAS_PYTHON:?}" "${DUNE_ATLAS_WORK:?}"
ROOT=$DUNE_ATLAS_WORK/mars
CODE=$ROOT/code/terrain-$TAG
mkdir -p $CODE $ROOT/logs
if [ ! -f $CODE/dune_atlas_pipeline/mars/terrain.py ]; then
  tar -xzf code.tgz -C $CODE
  find $CODE -type d -exec chmod 2755 {} + ; find $CODE -type f -exec chmod 644 {} +
fi
test -f $CODE/dune_atlas_pipeline/mars/terrain.py || { echo "bad layout"; exit 3; }
sed -e "s#@CODE@#$CODE#g" -e "s#@PROJECT@#$DUNE_ATLAS_PROJECT#g" -e "s#@STORAGE@#$DUNE_ATLAS_STORAGE#g" \
    -e "s#@PYTHON@#$DUNE_ATLAS_PYTHON#g" -e "s#@LOGS@#$ROOT/logs#g" -e "s#@WORK@#$ROOT/work#g" -e "s#@STORES@#$ROOT/stores#g" \
    -e "s#@MARS_DEM@#${DUNE_ATLAS_MARS_DEM:-}#g" $TPL > job.pbs
for kv in "$@"; do k=${kv%%=*}; v=${kv#*=}; sed -i "s#@$k@#$v#g" job.pbs; done
grep -q "@[A-Z]*@" job.pbs && { echo "unfilled template"; grep "@[A-Z]*@" job.pbs; exit 5; }
bash -n job.pbs || exit 4
mkdir -p $ROOT/work/terrain
cp job.pbs $ROOT/work/terrain/$(basename $TPL .pbs)-$TAG.pbs
JID=$(/opt/pbs/default/bin/qsub job.pbs)
case "$JID" in *gadi-pbs*) ;; *) echo "qsub rejected: $JID"; exit 6 ;; esac
echo "PBS_JOBID=$JID"
