#!/bin/bash
# Update the code on Gadi and qsub the 1980-2025 download jobs (10 MERRA-2 + 6 JRA-3Q, copyq); print the job ids.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); [ -f "$HERE/../site.env" ] && . "$HERE/../site.env"   # site settings (site.example.env)
WORK=${DUNE_ATLAS_WORK:?set DUNE_ATLAS_WORK in pipeline/gadi/site.env}/reanalysis
PY=${DUNE_ATLAS_PYTHON:?set DUNE_ATLAS_PYTHON in pipeline/gadi/site.env}
PROJ=${DUNE_ATLAS_PROJECT:?set DUNE_ATLAS_PROJECT in pipeline/gadi/site.env}
tar -xzf code.tgz -C $WORK/code && chmod -R u+rwX,g+rX $WORK/code
bash -n $WORK/code/reanalysis/download.pbs || exit 5
cd $WORK/logs
sub() {
  JID=$(/opt/pbs/default/bin/qsub -P $PROJ -N dl_$1_$2 -v PY=$PY,CODE=$WORK/code/reanalysis,WORK=$WORK,DS=$1,Y0=$2,Y1=$3 $WORK/code/reanalysis/download.pbs 2>&1)
  case "$JID" in *gadi-pbs*) echo "$1 $2-$3 $JID";; *) echo "qsub rejected $1 $2-$3: $JID";; esac
}
for r in 1980:1984 1985:1989 1990:1994 1995:1999 2000:2004 2005:2009 2010:2014 2015:2018 2019:2022 2023:2025; do sub merra2 ${r%:*} ${r#*:}; done
for r in 1980:1987 1988:1995 1996:2003 2004:2011 2012:2018 2019:2025; do sub jra3q ${r%:*} ${r#*:}; done
