#!/bin/bash
# Replace the 10 queued MERRA-2 download jobs by 8 jobs with 3 parallel connections each (24 in total).
set -u
WORK=/scratch/k10/ag5517/dune-atlas/reanalysis
PY=/g/data/k10/ag5517/apps/dune_atlas_venv/bin/python
tar -xzf code.tgz -C $WORK/code && chmod -R u+rwX,g+rX $WORK/code
bash -n $WORK/code/reanalysis/download.pbs || exit 5
for j in 181362272 181362273 181362274 181362275 181362276 181362277 181362279 181362280 181362281 181362282; do
  st=$(/opt/pbs/default/bin/qstat -f $j.gadi-pbs 2>/dev/null | awk '/job_state/{print $3}')
  if [ "$st" = "Q" ]; then /opt/pbs/default/bin/qdel $j.gadi-pbs && echo "qdel $j (was Q)"; else echo "kept $j state=$st"; fi
done
cd $WORK/logs
for r in 1980:1985 1986:1991 1992:1997 1998:2003 2004:2008 2009:2014 2015:2020 2021:2025; do
  y0=${r%:*}; y1=${r#*:}
  JID=$(/opt/pbs/default/bin/qsub -P k10 -N dl_merra2_$y0 -v PY=$PY,CODE=$WORK/code/reanalysis,WORK=$WORK,DS=merra2,Y0=$y0,Y1=$y1,NW=3 $WORK/code/reanalysis/download.pbs 2>&1)
  case "$JID" in *gadi-pbs*) echo "merra2 $y0-$y1 $JID";; *) echo "qsub rejected merra2 $y0-$y1: $JID";; esac
done
/opt/pbs/default/bin/qstat -u ag5517 | grep -c dl_
