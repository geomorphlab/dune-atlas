#!/bin/bash
# Run by submit_job on a Gadi login node: unpack the code, check it, qsub the pilot, print the job id, exit.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); [ -f "$HERE/../site.env" ] && . "$HERE/../site.env"   # site settings (site.example.env)
WORK=${DUNE_ATLAS_WORK:?set DUNE_ATLAS_WORK in pipeline/gadi/site.env}/reanalysis
PY=${DUNE_ATLAS_PYTHON:?set DUNE_ATLAS_PYTHON in pipeline/gadi/site.env}
PROJ=${DUNE_ATLAS_PROJECT:?set DUNE_ATLAS_PROJECT in pipeline/gadi/site.env}
mkdir -p $WORK/code $WORK/logs $WORK/raw
tar -xzf code.tgz -C $WORK/code
chmod -R u+rwX,g+rX $WORK/code
test -f $WORK/code/reanalysis/download.py && test -f $WORK/code/era5/era5_hist.py || { echo "layout wrong"; ls -R $WORK/code | head; exit 3; }
test -x $PY || { echo "no $PY"; exit 4; }
ls -la ~/.netrc ~/.urs_cookies ~/.dodsrc 2>&1 | awk '{print $1, $NF}'
bash -n $WORK/code/reanalysis/pilot.pbs || exit 5
cd $WORK/logs
JID=$(/opt/pbs/default/bin/qsub -P $PROJ -v PY=$PY,CODE=$WORK/code/reanalysis,WORK=$WORK $WORK/code/reanalysis/pilot.pbs 2>&1)
case "$JID" in *gadi-pbs*) echo "PBS_JOBID=$JID";; *) echo "qsub rejected: $JID"; exit 6;; esac
