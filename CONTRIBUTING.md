# Contributing

The public repository has one long-lived branch, `main`, which is what https://map.geomorphlab.org/
serves. Every change reaches it through a pull request.

1. Branch from `main` (`git switch -c <topic>`), commit, push the branch and open a pull request.
2. CI (`.github/workflows/ci.yml`) runs on the pull request, only for the areas the change touches
   (`scripts/ci/changes.sh`): the synthetic test stores (`fixtures-earth`, `fixtures-mars`; cached, built only
   when their generators change), registry validation, type check, Earth and Mars tests and both builds
   (`app`: app, registry, docs/concepts, the help-text record, pipeline/src and scripts changes), pipeline
   lint and tests (`pipeline`: pipeline, registry and scripts changes) and the repository text check for
   everything else (`text`). The `gate` check passes when every job that ran passed; it is the check that
   must pass before merging. `main` accepts no force pushes or deletions.
3. After the merge, the same workflow runs on `main` and the `deploy` job publishes both atlases to GitHub
   Pages once the gate has passed, whenever the change touched what the app job builds. There are no
   preview deployments.

CI is the full gate. Before opening the pull request, run the checks of the area you changed:

* app: in `app/`, `npm run typecheck` and the tests of what you touched (`npx vitest run tests/<file>`,
  `VITE_BODY=mars npx vitest run tests/mars/<file>`), or `npm run test:all` for a wider change;
* pipeline: `python -m pytest pipeline/tests/<file>`;
* text in tracked files: `npx vitest run tests/repotext.test.ts` (in `app/`).

For a change that should not alter what visitors see, also run the equivalence check `bash
../tools/checks/equivalence.sh <baseline-dir>` against a baseline recorded before the change (`BASELINE=1`;
see [docs/guide/getting-started.md](docs/guide/getting-started.md#refactoring-checks)). The full local run
`bash scripts/test-ci.sh` (what the app job runs, from a clean export) is needed only for changes to the
build or to CI itself.

Conventions:

* Public text (help, tour, About, info popovers, downloads) is reviewed in
  [docs/reference/help-text.md](docs/reference/help-text.md) (`npm run help-doc` after editing).
* Tracked files carry no local paths, credentials or process notes; `app/tests/repotext.test.ts` checks this.
* Data are added under new prefixes (`dune-atlas/<body>/<dataset>/v<N>/`); published object keys are not
  overwritten ([docs/guide/infrastructure.md](docs/guide/infrastructure.md)).
* How the code is organised and how to add a layer, a wind dataset or a planet:
  [docs/guide/extending.md](docs/guide/extending.md).
* Validation reports and other dated records go to [docs/records/](docs/records/README.md).

Code: MIT ([LICENSE](LICENSE)); data: [DATA_LICENSE.md](DATA_LICENSE.md).
