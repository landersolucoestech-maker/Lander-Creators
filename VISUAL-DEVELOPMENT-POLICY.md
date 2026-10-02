# Visual Development Policy

## Authorized scope

GitHub, GitHub Actions, existing repository tooling, PostgreSQL service containers inside GitHub Actions and the repository's temporary public-tunnel mechanism are authorized for visual inspection.

No managed hosting, deployment platform or additional third-party infrastructure may be introduced without explicit owner approval. Vercel is prohibited.

## Main-only invariant

`main` is the only permitted branch. Visual inspection and temporary live acceptance must run from the exact `main` SHA being validated. No preview, deployment, feature, pull-request, temporary or automation branch is permitted.

## Required visual evidence

For user-visible changes, the workflow must validate the exact SHA, provision PostgreSQL, apply migrations, bootstrap deterministic data, build/start the application, smoke critical routes, run repository-local desktop/mobile browser inspection, run accessibility checks and preserve the visual report artifact.

The Live Preview workflow may additionally expose the exact-SHA runtime through the repository's existing temporary public tunnel. It must verify the external origin and live acceptance before the preview is considered valid. Preview retention is intentionally brief and is not a completion gate after acceptance succeeds.

## Reference authority

Generated screenshots prove what the SHA renders. They do not define the desired design. Claims of visual equivalence require owner-approved references or explicit canonical design-system rules.

## Provider boundary

If a future visual requirement needs infrastructure outside the authorized scope, do not select a provider implicitly. Record the missing capability and continue every validation that remains possible without it.
