# Testing Strategy

- Vitest: unit and lightweight integration tests.
- PostgreSQL integration tests: introduced with the first persistence-owning domain using isolated test databases.
- Playwright: introduced when real end-user flows exist; no ceremonial E2E job exists yet.
- Every defect fix must add a regression test when practical.
- CI must pass lint, typecheck, tests and build before merge.
