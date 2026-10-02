# LANDER CREATORS — Domain Map

This document describes the current repository state. Historical stage notes belong in Git history and stage reports, not in the canonical domain map.

## Implemented business and foundation domains

- Identity
- Workspace
- Membership
- Authorization
- Security Audit foundation
- Taxonomy
- Reference Data
- Shared Media
- Creator: CreatorProfile, taxonomy relationships, declared SocialProfile, provenance-aware SocialMetricsSnapshot, readiness and self-service ownership authorization
- Music Catalog: Artist, WorkspaceArtistAccess, Release, Track, Track Artist Credits, TrackSegment and one-sheet XLSX catalog import
- Commercial Promoted Entities: Company, Brand, Product, Service, PromotedPlatform, PromotedEvent, PromotedProject, InstitutionalInitiative and WorkspacePromotedEntityAccess
- Promoted Object Registry across music and commercial promoted-object types
- Campaign Core: lifecycle/state machine, promoted-object snapshot, targeting, content requirements, brief/assets, schedule, planning budget/capacity, rights requirements, tracking configuration, readiness and 10-step Campaign Builder
- Participation/Opportunities: creator applications, direct invitations, shortlist, withdrawal, rejection and acceptance
- Proposal/Negotiation: workspace offers, creator counterproposals, acceptance and rejection with immutable negotiation rounds
- Engagement/Contracts: accepted-proposal engagement snapshot, versioned contract, creator/workspace signatures and activation

## Implemented application-experience layer

The authenticated application shell, Dashboard, navigation registry, Media, Team, Workspace and Settings surfaces compose existing domains. They do not own business persistence.

## Intentionally not implemented yet

Deliverables/Content, Publication, Finance/Payments, Analytics metrics, Reporting, Matching, Disputes, downstream provider-backed Integrations, Music Intelligence, AI Runtime/AI Operations and Distribution remain separate downstream domains.

## Boundary rules

- Workspace is the operational tenant; it is not Company, Brand, Artist or Creator.
- User/authentication identity is not CreatorProfile.
- Creator and Artist are distinct identities.
- Campaign planning budget is not Finance/Payments.
- Campaign content requirements are not delivered Content/Deliverables.
- Campaign rights requirements are planning requirements, not an executed Engagement Terms contract.
- Promoted-object polymorphism belongs to the typed Promoted Object Registry.
- Shared Media owns media metadata/storage seams; business domains own business meaning and references.
- Logical domain boundaries do not require one package or service per domain.
