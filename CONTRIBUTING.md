# Contributing

The public repository has one long-lived branch, `main`, which is what https://map.geomorphlab.org/
serves. Every change reaches it through a pull request.

1. Branch from `main` (`git switch -c <topic>`), commit, push the branch and open a pull request.
2. CI (`.github/workflows/ci.yml`) runs on the pull request: synthetic test stores (`fixtures`), registry
   validation, type check, Earth and Mars tests and both builds (`app`), pipeline lint and tests
   (`pipeline`). The three checks must pass before merging; `main` accepts no force pushes or deletions.
3. After the merge, the same workflow runs on `main` and the `deploy` job publishes both atlases to GitHub
   Pages once `app` and `pipeline` have passed. There are no preview deployments.

Before opening the pull request, run in `app/`: `npm run test:all`, `npm run typecheck` and, for a change
that should not alter what visitors see, the equivalence check `bash ../tools/checks/equivalence.sh
<baseline-dir>` against a baseline recorded before the change (`BASELINE=1`; see
[docs/guide/getting-started.md](docs/guide/getting-started.md#refactoring-checks)). `bash scripts/test-ci.sh`
runs what CI runs from a clean export of the working tree.

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
