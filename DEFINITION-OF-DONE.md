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
- the diff contains no unrelated work.
