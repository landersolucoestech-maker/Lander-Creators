# LANDER CREATORS — Domain Boundaries

1. Campaign is generic Creator Marketing, not music-only; music is a specialization.
2. Workspace is operational tenancy and is not Company, Brand, Artist or Creator.
3. User, CreatorProfile and Artist are distinct identities.
4. Participation owns recruitment/application/invitation state.
5. Engagement owns commercial hiring after recruitment.
6. Negotiated/contracted scope and rights belong to Engagement Terms, not Campaign planning.
7. Every contracted Deliverable requires Publication under the product rules; Deliverable/Content and Publication remain separate owners.
8. Campaign planning budget is separate from Finance/Payments and SaaS Billing.
9. Platform Fee is separate from Creator Fee.
10. Analytics/Reporting observe and aggregate; they do not own transactional business state.
11. AI is assistive; critical business actions require deterministic authorization and human-controlled transitions.
12. Internal technical language is English; end-user UX is PT-BR; raw technical errors never render directly to users.
13. Taxonomy is global governed classification; Reference Data is standards-oriented; neither is Workspace-owned business data.
14. Shared Media owns technical file concerns only; business domains reference MediaAsset.
15. Creator self-service authorization derives from CreatorProfile ownership, not Workspace RBAC.
16. Social provider connectivity is never inferred from declared/manual data.
17. Music Catalog is Artist → Release → Track for creator-marketing operations, not rights administration or distribution.
18. Workspace catalog authority requires Workspace permission plus explicit Artist access.
19. Commercial parent relationships never implicitly grant Workspace access.
20. Music and Commercial promoted entities converge only through the typed Promoted Object Registry.
21. Campaign targeting is not Matching.
22. Campaign content requirements are not Deliverables or Publications.
23. Campaign rights requirements are not executed Engagement Terms.
24. Campaign tracking intent is not Analytics metrics.
25. Provider integrations are adapters at domain boundaries; provider payloads are not canonical domain models.

## Current implementation boundary

Implemented domains and intentionally deferred domains are listed in `DOMAIN-MAP.md`. This file defines durable boundaries, not historical implementation stages.
