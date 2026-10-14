#!/bin/bash
# Login-node wrapper (host.compute submit_job): extract the code tarball into the code dir, fill the PBS
# template, qsub, print the job id, exit. Usage: stage_and_submit.sh <tag> <template.pbs> [KEY=VALUE ...]
set -eu
TAG=$1; TPL=$2; shift 2
CODE=/scratch/k10/ag5517/dune-atlas/mars/code/terrain-$TAG
mkdir -p $CODE /scratch/k10/ag5517/dune-atlas/mars/logs
if [ ! -f $CODE/dune_atlas_pipeline/mars/terrain.py ]; then
  tar -xzf code.tgz -C $CODE
  find $CODE -type d -exec chmod 2755 {} + ; find $CODE -type f -exec chmod 644 {} +
fi
test -f $CODE/dune_atlas_pipeline/mars/terrain.py || { echo "bad layout"; exit 3; }
sed "s#@CODE@#$CODE#g" $TPL > job.pbs
for kv in "$@"; do k=${kv%%=*}; v=${kv#*=}; sed -i "s#@$k@#$v#g" job.pbs; done
grep -q "@[A-Z]*@" job.pbs && { echo "unfilled template"; grep "@[A-Z]*@" job.pbs; exit 5; }
bash -n job.pbs || exit 4
mkdir -p /scratch/k10/ag5517/dune-atlas/mars/work/terrain
cp job.pbs /scratch/k10/ag5517/dune-atlas/mars/work/terrain/$(basename $TPL .pbs)-$TAG.pbs
JID=$(/opt/pbs/default/bin/qsub job.pbs)
case "$JID" in *gadi-pbs*) ;; *) echo "qsub rejected: $JID"; exit 6 ;; esac
echo "PBS_JOBID=$JID"
