# LANDER CREATORS Architecture

## Style
LANDER CREATORS is a TypeScript modular monolith delivered through a Next.js full-stack web application. Domain ownership is explicit while deployment remains simple until operational evidence justifies extraction.

## Runtime boundaries
- Web: Next.js App Router on Node.js 24 LTS.
- Database: PostgreSQL with Drizzle schema definitions and explicit transactional services.
- Authentication: Better Auth with server-authoritative sessions.
- Background work: PostgreSQL-backed durable jobs remain planned; no queue is installed yet.
- Media bytes: provider-neutral storage contract. Etapa 4 authorizes only an explicitly enabled local/ephemeral adapter for CI/test and GitHub visual inspection.
- Email: auth and Workspace invitation senders use an adapter seam. Production provider selection remains deferred.

## Implemented domain modules
- Identity: Better Auth core identity plus application-owned identity status/profile.
- Workspace: operational tenant, creation and active context.
- Authorization: system roles, permission registry, additional grant schema, Workspace-scope enforcement.
- Audit: security-critical actions.
- Taxonomy: governed platform classification with stable codes, aliases and shallow hierarchy.
- Reference Data: standards-oriented language, country, currency and timezone registries.
- Shared Media: Workspace-scoped technical media metadata, validation, checksum, provider-neutral storage and authorized access.

## Tenant strategy
Application-layer tenant enforcement remains authoritative. Every Workspace-bound service resolves current User, Membership, Workspace state and required permission from the database. Client Workspace identifiers never authorize by themselves.

## Session and authorization freshness
Session identity is resolved by Better Auth. Workspace authorization is not cached as a long-lived permission snapshot. Suspension/removal therefore invalidates effective authority immediately.

## Media access
Private media has no permanent public URL. Access is mediated by the application, requires current authentication and Workspace permission, and uses a short-lived HMAC access token bound to user, Workspace and MediaAsset. Raw storage keys and filesystem paths are not public contracts.

## Error boundary
Technical diagnostics remain English and internal. User-visible messages are PT-BR and mapped from stable public error codes.

## Visual inspection and infrastructure
The current owner-authorized visual model is GitHub-only: GitHub Actions starts the exact validated `main` SHA with ephemeral PostgreSQL and local browser tooling, captures desktop/mobile screenshots, runs accessibility checks and uploads the visual artifact.

No external hosting, storage, database, CDN or deployment provider is authorized. Vercel is prohibited. If a future capability requires external infrastructure, it requires explicit owner approval before selection or introduction.
