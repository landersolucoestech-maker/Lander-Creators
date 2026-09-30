# Visual Development Policy

## Permanent rule

Every LANDER CREATORS implementation stage that changes user-visible behavior must finish with a reachable visual deployment of the exact validated `main` commit.

GitHub Actions validation alone is not sufficient for user-visible stages.

## Absolute provider prohibition

**Vercel is prohibited.**

Do not:
- create a Vercel project;
- connect this repository to Vercel;
- deploy with Vercel;
- add Vercel configuration;
- add Vercel CI actions;
- add Vercel environment bindings;
- recommend Vercel as a deployment option.

This prohibition is operational policy and must not be reinterpreted by an agent, workflow, prompt or future implementation stage.

## Branch invariant

Deployment must consume only `main`.

No preview branch, deployment branch, PR branch, feature branch, temporary branch or provider-generated Git branch is permitted.

## Required user-visible stage flow

1. Implement directly on `main`.
2. Run applicable validation.
3. Commit and push `main`.
4. Inspect GitHub Actions.
5. Require CI success for the exact commit.
6. Apply required migrations to the non-production visual database.
7. Deploy that exact validated commit to the configured non-Vercel visual environment.
8. Verify the deployment loads.
9. Verify `/` and `/api/health`.
10. Verify every user-visible route added or changed by the stage.
11. Perform visual QA for desktop and mobile.
12. Capture screenshots where supported.
13. Return the accessible URL and exact commit traceability.

## Deployment architecture

The hosting provider is an operational delivery layer only. Domain architecture must remain provider-independent.

The project should maintain one continuously updated visual/development environment fed only from validated `main`.

Conceptual flow:

`main` → GitHub Actions validation → CI success → visual deployment → owner inspection.

## Database

The visual environment must use a non-production PostgreSQL environment with equivalent PostgreSQL semantics.

Never use real customer data, real Creator payout data or real production secrets for development visualization.

Migrations must be validated from zero in CI and safely applied to the visual database before code that requires them is deployed.

## Completion state

A user-visible stage may be marked complete only when:
- code is committed to `main`;
- GitHub Actions passes for that exact commit;
- that exact commit is deployed;
- the deployment is reachable;
- relevant routes are smoke-tested;
- the owner receives the accessible URL.

If deployment cannot be completed because the required non-Vercel provider/account/environment is unavailable, return:

`IMPLEMENTATION_COMPLETE_VISUAL_DEPLOYMENT_BLOCKED`

and state the exact missing dependency.

## Required final report section

### VISUAL DEVELOPMENT STATUS

- provider:
- environment:
- branch: `main`
- commit:
- commit message:
- GitHub Actions run ID:
- CI conclusion:
- deployment ID:
- deployment status:
- accessible URL:
- routes verified:
- desktop:
- mobile:
- accessibility:
- PT-BR UX:
- errors/empty/loading states:
- screenshots:
- known visual limitations:
