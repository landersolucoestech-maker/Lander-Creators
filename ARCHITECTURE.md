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
- Creator: global professional CreatorProfile, taxonomy preferences, declared SocialProfile, provenance-aware metric snapshots, readiness and ownership-based self-service authorization.
- Music Catalog: global Artist → Release → Track marketing catalog with explicit WorkspaceArtistAccess, ordered Artist credits, TrackSegment and one-sheet XLSX import.

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


## Etapa 5B Music Catalog
Music Catalog is a global marketing catalog with explicit Workspace access: Artist → Release → Track. Artist access is granted through WorkspaceArtistAccess and combines with current Workspace permission checks. Track audio remains Shared Media and private. XLSX catalog import is repository-local, one-sheet, preview-first, resolution-aware and transactional. No rights, publishing, royalties, distribution or Campaign domain is introduced.

## Etapa 5C — Commercial Promoted Entities
Commercial promoted entities are global catalog/business records distinct from Workspace. Company, Brand, Product, Service, PromotedPlatform, PromotedEvent, PromotedProject and InstitutionalInitiative use explicit per-entity Workspace access and Shared Media. Music and commercial objects converge only through PromotedObjectAdapter + Registry. Campaign remains absent.


## Etapa 5D — Application Shell and Dashboard
The existing domains are consolidated by a reusable authenticated application shell. The shell owns navigation composition, responsive desktop/mobile layout and explicit Workspace/Creator context presentation; it does not own business authorization. Workspace capability checks remain server-authoritative, Creator ownership stays separate, and Artist/promoted-entity lists preserve their explicit access models.

The authenticated root is the real Dashboard when an active Workspace exists. Dashboard queries are read-only, access-filtered and use only implemented data. No new business-domain tables or external providers were introduced.


# LANDER CREATORS Architecture

## Etapa 6 — Campaign Core
Campaign is the Workspace-scoped generic orchestration domain over exactly one registry-resolved Promoted Object. The 10-step builder persists typed configuration, readiness and lifecycle state. Shared Media, Taxonomy and Reference Data remain separate sources of truth. Participation, Engagement, Finance, Content, Publication, Analytics metrics, Reporting, Matching and AI remain downstream.
