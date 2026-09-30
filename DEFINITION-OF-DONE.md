# Definition of Done

A change is complete only when:
- repository identity and the `main`-only branch invariant are verified;
- scope and domain ownership are clear;
- deterministic dependency installation succeeds;
- applicable migrations apply from zero and remain repeatable;
- deterministic bootstrap/seed operations remain idempotent;
- lint passes;
- typecheck passes;
- unit/integration/security tests pass;
- tenant-isolation and authorization tests pass for security-bound changes;
- relevant concurrency/integrity invariants are tested;
- build passes;
- runtime smoke passes;
- security implications are reviewed;
- no secret, raw storage key, filesystem path or raw technical error is exposed;
- documentation reflects implemented truth;
- the diff contains no unrelated work;
- taxonomy integrity and reference bootstrap are validated when changed;
- media changes include MIME/content, size, checksum, filename, access-token, tenant-isolation and storage-boundary coverage;
- user-visible changes pass GitHub-only desktop/mobile Playwright inspection and accessibility checks on the exact CI-green `main` SHA;
- the GitHub Actions visual artifact exists for user-visible stages.

External infrastructure is never selected or introduced without explicit owner approval.

- Creator changes prove ownership isolation independently from Workspace RBAC.
- Social provider claims require actual provider evidence; declared data remains explicitly manual/not connected.
- Creator readiness remains explainable and does not claim deferred Terms/legal gates are satisfied.

- Music Catalog changes prove Workspace permission + Artist access authorization, Track audio protection and access-revocation behavior.
- XLSX changes prove canonical columns, preview-before-write, duplicate resolution, idempotency, no silent overwrite, parser security limits and transactional confirmation.
- Music Catalog completion must preserve the no-Work/no-Phonogram/no-Rights/no-Distribution boundary.

## Etapa 5C addition
Commercial Promoted Entities require additive migrations from zero, explicit authorization, all canonical registry adapters, structured readiness, real PT-BR UI, full tests/build/runtime, desktop/mobile evidence, axe without serious/critical issues, exact-SHA artifact and GitHub-native publication. Campaign must remain absent.


## Etapa 5D completion additions
Application Shell + Dashboard is complete only when the exact final main SHA has: a coherent authenticated shell, real access-filtered Dashboard, capability-aware navigation, explicit Workspace/Creator contexts, safe direct-route authorization, responsive mobile navigation, no future-domain implementation, full regression tests, build/runtime smoke, desktop/mobile Playwright, axe with no unresolved serious/critical findings, visual artifact and successful GitHub-native publication.
