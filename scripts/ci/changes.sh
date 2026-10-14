#!/usr/bin/env bash
# Which CI jobs a change needs (.github/workflows/ci.yml, job `changes`). Writes app, pipeline, text and
# fixtures (true/false) to $GITHUB_OUTPUT (or stdout) and the changed files to the job summary.
#   EVENT  github.event_name; BASE  the commit to compare with (pull request: its base; push: the
#   previous main). No usable base (workflow_dispatch, a new branch, a force push): every job runs.
# Local use:  BASE=origin/main bash scripts/ci/changes.sh
set -euo pipefail
out="${GITHUB_OUTPUT:-/dev/stdout}"
all=false
if [ "${EVENT:-}" = "workflow_dispatch" ] || [ -z "${BASE:-}" ] || [ "${BASE}" = "0000000000000000000000000000000000000000" ] \
   || ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  all=true; files=""
else
  files="$(git diff --name-only "$BASE" HEAD)"
fi
# the app job: the app and what its tests and builds read (registry, the concepts text and the help-text
# record, the fixture generators in pipeline/src and scripts/, the recorded constants)
APP='^(app/|registry/|docs/concepts/|docs/reference/help-text\.md$|pipeline/src/|pipeline/pyproject\.toml$|scripts/|\.github/workflows/)'
# the pipeline job: the pipeline and what its tests and lint read (registry fragments, scripts/, app/scripts/)
PIPELINE='^(pipeline/|registry/|scripts/|app/scripts/|\.github/workflows/)'
match() { [ "$all" = true ] || { [ -n "$files" ] && grep -qE "$1" <<<"$files"; }; }
app=false; pipeline=false; text=false
match "$APP" && app=true
match "$PIPELINE" && pipeline=true
# the repository text check (app/tests/repotext.test.ts reads every tracked file): with the app tests, or alone
[ "$app" = false ] && [ -n "$files" ] && text=true
fixtures=false; { [ "$app" = true ] || [ "$pipeline" = true ]; } && fixtures=true
printf 'app=%s\npipeline=%s\ntext=%s\nfixtures=%s\n' "$app" "$pipeline" "$text" "$fixtures" >> "$out"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "app=$app pipeline=$pipeline text=$text fixtures=$fixtures (all=$all)"; echo '```'; echo "${files:-(all)}" | head -200; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
fi
