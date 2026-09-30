# Definition of Done

A change is complete only when:

- repository identity and the `main`-only branch invariant are verified;
- scope and domain ownership are clear;
- deterministic dependency installation succeeds;
- applicable migrations apply from zero and remain repeatable;
- lint passes;
- typecheck passes;
- unit/integration/security tests pass;
- tenant-isolation and authorization tests pass for security-bound changes;
- relevant concurrency invariants are tested;
- build passes;
- runtime smoke passes;
- security implications are reviewed;
- no secret or raw technical error is exposed;
- documentation reflects implemented truth;
- the diff contains no unrelated work;
- for user-visible changes, the exact CI-green `main` commit is deployed to the configured non-Vercel visual environment;
- the deployed root, health endpoint and changed user-visible routes are smoke-tested;
- desktop/mobile visual QA is performed where applicable;
- the owner receives the accessible deployment URL;
- if deployment is unavailable, the stage reports `IMPLEMENTATION_COMPLETE_VISUAL_DEPLOYMENT_BLOCKED` instead of complete.

- taxonomy integrity and reference bootstrap are validated when changed;
- media changes require MIME/content, tenant-isolation and storage-boundary tests;
- for current owner policy, user-visible completion uses the exact CI-green main SHA and GitHub Actions visual artifact; no external deployment is implied.
