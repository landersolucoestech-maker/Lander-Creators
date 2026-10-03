# LANDER CREATORS — Definition of Done

A change is complete only when all applicable requirements below are satisfied.

## Repository and scope
- repository identity and the `main`-only invariant are verified;
- scope, owning domain and blast radius are clear;
- the diff contains no unrelated work;
- canonical documentation reflects implemented truth.

## Database and bootstrap
- applicable migrations apply from zero and remain repeatable;
- bootstrap/seed operations remain deterministic and idempotent;
- concurrency/integrity invariants are tested where relevant;
- applied migrations are never rewritten.

## Code quality
- deterministic dependency installation succeeds;
- lint passes;
- typecheck passes;
- repository-local engineering OS structural contracts pass;
- applicable unit/integration/security tests pass;
- build passes;
- runtime smoke passes.

## Security
- server-side authorization remains authoritative;
- tenant/ownership isolation is tested for security-bound changes;
- no secret, raw storage key, filesystem path or raw technical error is exposed;
- provider connectivity is never claimed without provider evidence.

## Domain-specific invariants
- Creator self-service proves ownership isolation independently from Workspace RBAC.
- Music Catalog proves Workspace permission + Artist access and protected Track audio.
- XLSX import preserves canonical one-sheet parsing, preview-before-write, duplicate resolution, idempotency and transactional confirmation.
- Commercial promoted entities preserve explicit access and registry adapters.
- Campaign remains one generic engine and preserves the boundary between planning configuration and Participation, Engagement, Terms, delivered Content, Publication, Finance, Analytics, Matching and AI.

## User-visible changes
- exact final `main` SHA passes repository desktop/mobile browser inspection;
- accessibility checks have no unresolved serious/critical findings;
- the visual artifact exists;
- the exact SHA passes the repository's publication/preview gate where applicable.

A running `Keep preview online` step is not a completion blocker once build, external-origin smoke and live application acceptance have succeeded.

## Autonomous execution
- the unit followed IMPLEMENT -> VALIDATE -> COMMIT -> PUSH `main` -> CI -> FIX -> LEDGER;
- `ORCHESTRATION-LEDGER.md` is updated with head SHA, last green SHA, CI status, next action and blockers;
- Engineering Pack usage is recorded truthfully (EXECUTED_AS_SUBAGENT / EXECUTED_BY_ORCHESTRATOR / EXECUTED_INLINE_FALLBACK / NOT_APPLICABLE);
- undefined product decisions are recorded as `PRODUCT_DECISION_REQUIRED` and isolated, never invented.

## Infrastructure
No external infrastructure/provider is selected or introduced without explicit owner authorization. Vercel is prohibited.
