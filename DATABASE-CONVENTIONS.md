# LANDER CREATORS — Database Conventions

- PostgreSQL identifiers use `snake_case`.
- Better Auth owns authentication credential/session/verification lifecycle; its IDs remain compatible with Better Auth.
- Application tenant/security entity IDs use PostgreSQL UUID with `gen_random_uuid()`.
- Timestamps use `timestamptz` and UTC; date-only business values use PostgreSQL `date`.
- Money uses integer minor units or exact decimal according to domain requirements, never floating point; currency is explicit.
- Migrations are ordered, append-only SQL. Applied migrations are immutable.
- Foreign keys are explicit whenever the target is one concrete table. Controlled polymorphic references require typed service validation.
- Indexes follow real access paths and uniqueness invariants.
- Application services own transaction boundaries for multi-write invariants.
- Soft delete is not the default; explicit lifecycle states are preferred where history/security matters.
- External money operations require idempotency; a future financial ledger must not be modeled as Campaign planning budget.

## Security and tenancy

- Workspace creation + Owner Membership is atomic.
- Invitation acceptance is transactional and single-use.
- Owner mutations preserve the final-Owner invariant.
- Tenant authorization is server-authoritative.
- Raw storage keys and filesystem paths are never public contracts.

## Shared foundations

- Taxonomy codes are stable English machine identifiers; PT-BR labels are display data.
- Reference registries use stable standard codes.
- Media checksum uses SHA-256 and media storage keys are opaque.

## Creator

- CreatorProfile is global and one-profile-per-User in V1.
- Creator taxonomy joins use canonical taxonomy-value IDs and unique composite relations.
- Social metrics are append-only snapshots with explicit capture time and provenance; unknown values are NULL.
- Social counts are non-negative bigint.

## Music Catalog

- Artist/Release/Track are global catalog entities and are not duplicated per Workspace.
- WorkspaceArtistAccess is the explicit Workspace-to-Artist edge.
- Track duration and TrackSegment boundaries use integer milliseconds.
- Artist credits persist explicit role and position.
- ISRC is normalized and indexed as duplicate evidence rather than destructive global identity.
- Music import sessions are idempotent by Workspace + SHA-256 source fingerprint.
- Import rows persist provenance and explicit duplicate resolution; raw XLSX bytes are not retained.

## Commercial promoted entities

Known parent relations use real foreign keys. `WorkspacePromotedEntityAccess` uses controlled promoted-object type + entity ID because PostgreSQL cannot express one foreign key across multiple target tables; typed services validate references.

## Campaign Core

Migration `0008_campaign_core.sql` introduced Campaign persistence. Campaign IDs are UUIDs; lifecycle/configuration categories use closed PostgreSQL enums; planning budget uses integer minor units; revision provides optimistic concurrency. Builder data is normalized into typed tables rather than a generic JSON document.

The current Campaign persistence is defined by the immutable migration and Campaign service SQL. Any future consolidation into Drizzle schema definitions must be additive/representational and must not rewrite applied migration history.
