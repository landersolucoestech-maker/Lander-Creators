# Promoted Objects

## Purpose
LANDER CREATORS now has two promoted-object families that remain independent in persistence and converge only through a typed adapter registry.

### Music
Artist → Release → Track.

### Commercial
Company, Brand, Product, Service, PromotedPlatform, PromotedEvent, PromotedProject and InstitutionalInitiative.

Campaign is not implemented in Etapa 5C.

## Canonical PromotedObjectType
MUSIC_TRACK, MUSIC_RELEASE, ARTIST, COMPANY, BRAND, PRODUCT, SERVICE, PLATFORM, EVENT, PROJECT, INSTITUTIONAL_INITIATIVE. There is no OTHER type.

## Workspace access
Commercial entities are global catalog/business records. WorkspacePromotedEntityAccess is explicit per entity and uses OWNER, MANAGE_CAMPAIGNS, VIEW or CAMPAIGN_ONLY plus PENDING, ACTIVE, SUSPENDED, REVOKED or EXPIRED status and optional expiry.

There is intentionally no automatic access inheritance from Company to child entities. Parent context and Workspace authorization are separate. Revoking one entity does not preserve invisible authority through a parent.

## Readiness
Adapters return READY, READY_WITH_WARNINGS or BLOCKED with structured blockers/warnings. Archived and suspended objects block new operational use. Company verification is separate: an unverified Company is currently a readiness warning, not an external verification claim.

## Parent chains
Brand → optional Company.
Product → Brand → Company or Product → Company.
Service → Company.
Platform/Event/Project/Institutional Initiative may reference Company and/or Brand when their context is valid.

## Media and reference data
Commercial media reuses Shared Media. Commercial categories use Taxonomy. Country, language and timezone use Reference Data. No separate storage or hardcoded canonical category source exists.

## Duplicate policy
Normalized identity and context are duplicate signals only. POSSIBLE_DUPLICATE never auto-merges. Creating a separate record in the presence of a candidate requires explicit confirmation.

## Adapter contract
The registry resolves display identity, parent/context chain, access, structured readiness and available asset references from existing source-of-truth entities. It does not fabricate Campaign goals, analytics or matching information.

## Future material fields
Company identity/domain/verification, Product/Service identity and parent context, and Event date/time/location are expected to be material to future Campaign snapshots.

## Explicit exclusions
No Campaign, CRM, ecommerce, inventory, logistics, ticketing, booking, matching, analytics or project-management engine is implemented in this foundation.
