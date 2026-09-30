# Branch Policy

- Canonical/default branch: `main`.
- Normal development: short-lived topic branches and pull requests into `main`.
- Direct pushes to `main`: reserved for the initial bootstrap and emergency repository administration until branch protection is active.
- Required pull-request checks: lint, typecheck, unit tests and build.
- Intended protection: require pull request, require CI, block force pushes and branch deletion, require branch to be current before merge when supported.
- Avoid long-lived `develop` or parallel release branches until a concrete release model requires them.
