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
