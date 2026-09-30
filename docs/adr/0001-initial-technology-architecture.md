# ADR 0001: Initial Technology Architecture

Status: Accepted

## Context
LANDER CREATORS is a greenfield multi-tenant Creator Marketing platform with transactional finance requirements, private media, background work, external integrations and future AI operations. V1 needs responsive web, not native mobile.

## Decision
- Language: TypeScript 6.
- Runtime: Node.js 24 LTS.
- Frontend/application framework: Next.js 16 App Router on React 19.
- Application topology: modular monolith, full-stack web first.
- Repository topology: single application repository; logical domain modules remain internal until extraction is justified.
- Package manager: npm, with a committed lockfile once dependency resolution is available.
- Database: PostgreSQL.
- Data access: Drizzle ORM plus explicit SQL/transaction escape hatches.
- Authentication: Better Auth with server-authoritative sessions; identity flows deferred.
- Object storage: S3-compatible private storage interface; provider deferred.
- Background jobs: PostgreSQL-backed pg-boss strategy, with a dedicated worker process when jobs are introduced.
- Email: application adapter; provider deferred.
- Tests: Vitest now; Playwright when real browser flows exist.
- CI: GitHub Actions.
- Deployment: OCI-compatible containers; hosting vendor deferred.

## Alternatives considered
- Separate SPA + API: rejected initially because it doubles deployment and contract-management overhead without a current requirement.
- Microservices: rejected because transactional domains are tightly related and no current scaling boundary justifies distribution.
- Document database as primary store: rejected because finance, tenancy and workflow state require strong relational integrity.
- Prisma: viable, but Drizzle was selected for SQL transparency, lightweight typed access and explicit transactional control.
- Managed authentication-only vendor: viable, but deferred to avoid unnecessary identity vendor lock-in before Identity requirements are implemented.

## Pressure points
Potential future extraction boundaries include media processing, metric synchronization, report generation and AI execution. Extraction must be driven by measured operational needs.
