# LANDER CREATORS Architecture

## Style
LANDER CREATORS is a TypeScript modular monolith delivered through a Next.js full-stack web application. Domain ownership is explicit while deployment remains simple until operational evidence justifies extraction.

## Runtime boundaries
- Web: Next.js App Router on Node.js 24 LTS.
- Database: PostgreSQL with Drizzle schema definitions and explicit transactional services.
- Authentication: Better Auth with server-authoritative sessions.
- Background work: PostgreSQL-backed durable jobs remain planned; no queue is installed yet.
- Object storage: S3-compatible private object storage remains an interface-level future requirement.
- Email: auth and Workspace invitation senders use an adapter seam. Production provider selection remains deferred.

## Implemented domain modules
- Identity: Better Auth core identity plus application-owned identity status/profile.
- Workspace: operational tenant, creation and active context.
- Authorization: system roles, permission registry, additional grant schema, Workspace-scope enforcement.
- Audit: security-critical Etapa 3 actions.

## Tenant strategy
Etapa 3 uses application-layer tenant enforcement rather than PostgreSQL RLS. Every Workspace-bound service resolves current User, Membership, Workspace state and required permission from the database. Client Workspace identifiers never authorize by themselves. PostgreSQL integration tests prove cross-tenant denial.

RLS is intentionally deferred because the current Next.js/Drizzle/background-job architecture benefits from one explicit authorization service and transaction model. RLS can be reconsidered if future direct database access paths justify a second enforcement layer.

## Session and authorization freshness
Session identity is resolved by Better Auth. Workspace authorization is not cached as a long-lived permission snapshot: current identity, Workspace and Membership state is queried for each protected Workspace operation. Suspension/removal therefore invalidates effective Workspace authority immediately.

## Error boundary
Technical diagnostics remain English and internal. User-visible messages are PT-BR and mapped from stable public error codes. Raw Better Auth, Drizzle and PostgreSQL exceptions never render directly to users.

## Deployment
The application remains deployable as OCI-compatible containers. Hosting is an operational delivery concern and must not leak into domain architecture.

Vercel is permanently prohibited.

A persistent non-Vercel visual/development environment must consume only the exact CI-green `main` commit. User-visible stages are not complete until that commit is deployed, reachable and visually verified.


## Etapa 4 shared foundations
Taxonomy and Reference Data are platform-level governed registries. Shared Media stores metadata in PostgreSQL and delegates bytes through a provider-neutral MediaStorageAdapter. The current LocalEphemeralStorageAdapter exists only for CI/test and GitHub visual inspection; no production storage provider is selected or authorized.
