#!/bin/bash
# Run by submit_job on a Gadi login node: unpack the code, check it, qsub the pilot, print the job id, exit.
set -u
WORK=/scratch/k10/ag5517/dune-atlas/reanalysis
PY=/g/data/k10/ag5517/apps/dune_atlas_venv/bin/python
mkdir -p $WORK/code $WORK/logs $WORK/raw
tar -xzf code.tgz -C $WORK/code
chmod -R u+rwX,g+rX $WORK/code
test -f $WORK/code/reanalysis/download.py && test -f $WORK/code/era5/era5_hist.py || { echo "layout wrong"; ls -R $WORK/code | head; exit 3; }
test -x $PY || { echo "no $PY"; exit 4; }
ls -la ~/.netrc ~/.urs_cookies ~/.dodsrc 2>&1 | awk '{print $1, $NF}'
bash -n $WORK/code/reanalysis/pilot.pbs || exit 5
cd $WORK/logs
JID=$(/opt/pbs/default/bin/qsub -P k10 -v PY=$PY,CODE=$WORK/code/reanalysis,WORK=$WORK $WORK/code/reanalysis/pilot.pbs 2>&1)
case "$JID" in *gadi-pbs*) echo "PBS_JOBID=$JID";; *) echo "qsub rejected: $JID"; exit 6;; esac
