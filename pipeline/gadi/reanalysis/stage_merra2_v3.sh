#!/bin/bash
# Hold the 8 queued MERRA-2 jobs, install the per-connection cookie fix, then release them.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); [ -f "$HERE/../site.env" ] && . "$HERE/../site.env"   # site settings (site.example.env)
WORK=${DUNE_ATLAS_WORK:?set DUNE_ATLAS_WORK in pipeline/gadi/site.env}/reanalysis
PY=${DUNE_ATLAS_PYTHON:?set DUNE_ATLAS_PYTHON in pipeline/gadi/site.env}
PROJ=${DUNE_ATLAS_PROJECT:?set DUNE_ATLAS_PROJECT in pipeline/gadi/site.env}
for j in 181362549 181362550 181362551 181362552 181362554 181362556 181362557 181362558; do
  /opt/pbs/default/bin/qhold $j.gadi-pbs 2>&1 | head -1
done
tar -xzf code.tgz -C $WORK/code && chmod -R u+rwX,g+rX $WORK/code && grep -c COOKIE_DIR $WORK/code/reanalysis/download.py
rm -f $WORK/raw/merra2/*/*.nc4.part   # leftovers of the stopped jobs only (old fixed name)
for j in 181362549 181362550 181362551 181362552 181362554 181362556 181362557 181362558; do
  st=$(/opt/pbs/default/bin/qstat -f $j.gadi-pbs 2>/dev/null | awk '/job_state/{print $3}')
  [ "$st" = "H" ] && /opt/pbs/default/bin/qrls $j.gadi-pbs; echo "$j was ${st:-gone}"
done
/opt/pbs/default/bin/qstat -u "$USER" | grep dl_ | awk '{print $1,$4,$10}'
