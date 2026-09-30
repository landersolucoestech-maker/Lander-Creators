# Database Conventions

- PostgreSQL identifiers: `snake_case`.
- Auth core IDs are server-generated UUID strings stored as text because Better Auth owns their lifecycle.
- Application tenant/security entity IDs use PostgreSQL UUID with `gen_random_uuid()`.
- Timestamps: `timestamptz`, stored in UTC.
- Money: integer minor units or exact decimal according to domain requirement; never floating point; currency is explicit.
- Migrations are ordered SQL files and immutable after application; new changes append migrations.
- Soft delete is not default. Identity/Workspace/Membership use explicit lifecycle states where security history must remain.
- Foreign keys are explicit and enforced.
- Indexes are driven by access paths and uniqueness invariants.
- Application services own transaction boundaries for multi-write invariants.
- Workspace creation + Owner Membership is atomic.
- Invitation acceptance is transactional and single-use.
- Owner mutations lock the Workspace before checking the final-Owner invariant.
- External money operations will require idempotency.
- The future ledger will be immutable/double-entry by design.

- Taxonomy codes are stable English machine identifiers; PT-BR labels are display data.
- Reference registries use stable standard codes.
- Media storage keys are opaque and never public API contracts.
- Media checksum uses SHA-256.

- CreatorProfile is global and has a database-enforced one-profile-per-User V1 invariant.
- Creator taxonomy joins use canonical taxonomy_value IDs and unique composite relations.
- Social metrics are append-only snapshots with explicit captured_at and provenance; unknown values are NULL.
- Social counts use non-negative PostgreSQL bigint; money is not introduced by Etapa 5A.


- Artist/Release/Track are global catalog entities and are not duplicated per Workspace.
- WorkspaceArtistAccess is the explicit Workspace-to-Artist access edge.
- Release dates use PostgreSQL date semantics; no timezone conversion is applied.
- Track duration and TrackSegment boundaries use integer milliseconds.
- Track numbers are unique within Release in V1; multi-disc modeling is deferred.
- Artist credits persist explicit role and position.
- ISRC is normalized locally; it is indexed as duplicate evidence rather than destructive global identity.
- Music import sessions are idempotent by Workspace + SHA-256 source fingerprint.
- Import rows persist normalized provenance and explicit duplicate resolution; raw XLSX bytes are not retained.

## Etapa 5C
Migration 0007 is additive. Known parent relations use real foreign keys. WorkspacePromotedEntityAccess uses the controlled promoted_object_type + entity_id pair because PostgreSQL cannot express one FK across multiple target tables; typed services validate every reference before mutation. No Campaign table exists.


# Database Conventions

Etapa 6 appends immutable migration `0008_campaign_core.sql`. Campaign IDs are UUIDs, status/mode/visibility/recruitment/platform/format values are closed PostgreSQL enums, planning budget uses BRL integer minor units, and revision provides optimistic concurrency. Business-critical builder data is normalized into typed tables; the builder is not persisted as a generic JSON dump. Promoted-object polymorphic references are validated centrally through the registry because a cross-table FK is not possible.
