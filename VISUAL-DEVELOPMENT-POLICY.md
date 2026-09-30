# Visual Development Policy

## Current owner-authorized scope

Only GitHub, GitHub Actions, existing repository tooling and PostgreSQL service containers inside GitHub Actions are authorized for visual inspection at this stage.

No external hosting, deployment provider, managed platform or third-party infrastructure may be introduced without explicit owner approval.

Do not recommend or silently add an external provider.

## Permanent provider prohibition

**Vercel is prohibited.**

Do not create, connect, configure, deploy or recommend Vercel in this or any other project.

## Main-only invariant

`main` is the only permitted branch.

Visual inspection must run from the exact `main` SHA validated by GitHub Actions. No preview, deployment, feature, pull-request, temporary or automation branch is permitted.

## GitHub-only visual inspection

For the current authorized stage, user-visible validation is delivered as a GitHub Actions artifact, not as an external application URL.

The workflow must:

1. validate the exact `main` SHA;
2. start PostgreSQL inside GitHub Actions;
3. apply migrations from zero;
4. build and start the application;
5. verify `/` and `/api/health`;
6. run repository-local browser inspection against that runtime;
7. capture desktop and mobile screenshots;
8. run accessibility checks;
9. generate a static HTML report;
10. upload one artifact named `lander-creators-visual-inspection`.

## External capability boundary

If a future requirement cannot be satisfied with the currently authorized GitHub-only scope, stop that specific action and report:

`OWNER_APPROVAL_REQUIRED`

State only:
- the missing capability;
- why it is needed;
- what remains possible without it.

The project owner alone selects providers, hosting, services, integrations and infrastructure expansion.
