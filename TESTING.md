# Testing Strategy

- Vitest: unit and lightweight integration tests.
- PostgreSQL integration tests arrive with the first persistence-owning domain using isolated test databases.
- Playwright arrives when real end-user flows exist; no ceremonial E2E job exists yet.
- Every defect fix adds a regression test when practical.
- CI must pass lint, formatting, typecheck, tests and build before merge.
