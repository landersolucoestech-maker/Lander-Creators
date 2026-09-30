# Testing Strategy

- Vitest: unit and integration tests.
- PostgreSQL 16: real CI integration database for migrations, authentication, tenancy, authorization, taxonomy, reference data and media metadata.
- CI applies all migrations from zero and reruns the migrator for repeatability.
- Reference/taxonomy bootstrap runs twice to prove idempotency.
- Authentication tests cover signup, verification, signin, invalid credentials, anonymous session, suspension, signout and password recovery.
- Workspace tests cover atomic Owner creation and retry idempotency.
- Tenant tests cover guessed Workspace IDs, foreign listing/context and immediate suspension effects.
- Etapa 4 taxonomy tests cover seeded definitions, value uniqueness, alias uniqueness/resolution, hierarchy safety, deprecation preservation and selection denial.
- Reference tests cover canonical standard codes and deterministic bootstrap.
- Media tests cover allowed upload, MIME/extension mismatch, oversize rejection, SHA-256 checksum, filename sanitization, archive semantics, storage isolation, cross-tenant denial, suspended Membership denial and time-limited signed access.
- GitHub Actions Playwright visual inspection covers authentication, Workspace, taxonomy/reference data and Shared Media states on desktop/mobile.
- Axe runs against captured visual states and blocks serious/critical violations.
- Every defect fix adds regression coverage when practical.

- Etapa 5A Creator tests cover one-profile-per-User, ownership IDOR, Workspace ADMIN separation, taxonomy substitution/deprecation, SocialProfile URL/provenance/uniqueness, metrics freshness/null semantics, readiness, status submission, visibility eligibility, availability independence and Shared Media attachment isolation.
- Visual inspection covers Creator empty, form, validation error, populated, social and availability states on desktop/mobile.


- Etapa 5B tests cover Artist Workspace access, permission+relationship conjunction, Release/Track creation, ordered primary/featured credits, TrackVersion, TrackSegment bounds, access revocation and Track audio bypass protection.
- XLSX tests cover exact template columns, SINGLE defaults, EP grouping, semicolon credits, explicit duplicate resolution, ISRC/URL/track-number conflicts, idempotent confirmation, malformed workbook, unexpected/extra sheets, formula-as-data behavior and row limit.
- Visual inspection covers Music Catalog empty, Artist detail/edit, Release/Track, Track editing, TrackSegment, import upload/error/preview/duplicate resolution/success on desktop and mobile.

## Etapa 5C coverage
Commercial integration tests cover every canonical commercial type, parent consistency, explicit Workspace access, revocation, duplicate non-merge, foreign-media denial, event validation, registry completeness and adapter resolution. Existing Music Catalog tests remain regression gates. Visual coverage runs desktop/mobile plus axe.
