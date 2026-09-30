# Testing Strategy

- Vitest: unit and integration tests.
- PostgreSQL 16: real CI integration database for migrations, authentication persistence, tenancy, authorization and concurrency.
- CI applies all migrations from zero and reruns the migrator to prove repeatability.
- Authentication tests cover signup, verification, signin, invalid credentials, anonymous session, suspension, signout and password recovery.
- Workspace tests cover atomic Owner creation and retry idempotency.
- Tenant tests cover guessed Workspace IDs, foreign member listing and invalid context switching.
- Team/security tests cover invitation recipient binding, expiration, replay, Owner privilege escalation, suspension and removal effects.
- Concurrency tests protect the final Owner and invitation single-use behavior.
- Playwright remains deferred until broader end-user product workflows exist.
- Every defect fix adds regression coverage when practical.
- CI must pass deterministic install, migration, lint, typecheck, tests, build and runtime smoke on `main`.
