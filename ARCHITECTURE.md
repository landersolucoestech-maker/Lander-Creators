# LANDER CREATORS — Architecture

## Style
LANDER CREATORS is a TypeScript modular monolith delivered through a Next.js full-stack application. Domain ownership is explicit; deployment remains simple until operational evidence justifies extraction.

## Runtime boundaries
- Web: Next.js App Router on Node.js 24 LTS.
- Database: PostgreSQL with Drizzle schema definitions and explicit transactional services.
- Authentication: Better Auth with server-authoritative sessions.
- Background work: PostgreSQL-backed durable jobs remain planned; no queue is installed.
- Media: provider-neutral storage contract; local/ephemeral adapter is for CI/test/visual inspection only.
- Email: adapter seam; production provider selection remains deferred.

## Implemented domain ownership
- Identity: Better Auth core identity plus application-owned profile/status.
- Workspace and Membership: operational tenant, membership and active context.
- Authorization: permission registry, roles/grants and Workspace-scope enforcement.
- Audit: security-critical actions.
- Taxonomy and Reference Data: governed classification and standards-oriented reference registries.
- Shared Media: Workspace-scoped metadata, validation, checksum, provider-neutral storage and authorized access.
- Creator: global professional CreatorProfile, taxonomy preferences, declared SocialProfile, provenance-aware metrics, readiness and ownership-based self-service authorization.
- Music Catalog: global Artist → Release → Track marketing catalog, WorkspaceArtistAccess, ordered credits, TrackSegment and one-sheet XLSX import.
- Commercial Promoted Entities: Company, Brand, Product, Service, PromotedPlatform, PromotedEvent, PromotedProject and InstitutionalInitiative with explicit Workspace access.
- Promoted Object Registry: typed resolution across music and commercial promoted objects.
- Campaign Core: Workspace-scoped generic campaign orchestration over exactly one registry-resolved Promoted Object, including lifecycle, 10 persistent builder steps, readiness and planning configuration.

## Application experience
The authenticated application shell owns navigation composition, responsive desktop/mobile layout and explicit Workspace/Creator context presentation. Dashboard queries are read-only and access-filtered. Application surfaces compose domain services and do not take ownership of their persistence.

## Tenant and authorization strategy
Application-layer tenant enforcement is authoritative. Every Workspace-bound service resolves current User, Membership, Workspace state and required permission from the database. Client Workspace identifiers and hidden navigation never authorize. Creator ownership and explicit Artist/promoted-entity access remain independent boundaries.

## Session freshness
Session identity is resolved by Better Auth. Workspace authorization is not a long-lived permission snapshot; membership suspension/removal therefore invalidates effective authority immediately.

## Media access
Private media has no permanent public URL. Access requires current authorization and uses short-lived application-mediated access. Raw storage keys and filesystem paths are not public contracts.

## Error boundary
Technical diagnostics are English and internal. User-visible messages are PT-BR and mapped from stable public error codes.

## Campaign boundary
Campaign owns planning/orchestration only. Participation, Proposal/Engagement, Engagement Terms, delivered Content/Deliverables, Publication, Finance/Payments, Analytics/Reporting, Matching, Disputes and AI remain downstream domains. Campaign planning budget is not a ledger; content requirements are not delivered content; rights requirements are not an executed contract.

## Visual validation and infrastructure
User-visible changes are validated on the exact `main` SHA by GitHub Actions using ephemeral PostgreSQL and local browser tooling, with desktop/mobile screenshots and accessibility checks. No external hosting, storage, database, CDN or deployment provider is implicitly authorized. Vercel is prohibited.
