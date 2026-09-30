# Domain Boundaries

1. Campaign is generic Creator Marketing, not music-only.
2. Music is a specialization.
3. Workspace is not Company.
4. Creator is not Artist.
5. CampaignParticipation handles recruitment.
6. CampaignEngagement handles commercial hiring.
7. Terms belong to Engagement.
8. Every contracted Deliverable requires Publication.
9. Content and Publication are separate domains.
10. Campaign Finance is separate from SaaS Billing.
11. Platform Fee is separate from Creator Fee.
12. Analytics does not own business state.
13. AI is assistive and cannot perform critical business actions.
14. Internal technical language is English.
15. End-user UX is PT-BR.
16. Raw technical errors never render directly to users.


## Etapa 3 implemented security root

Identity, Workspace, Membership, active Workspace context, authorization and their security audit foundation are now real implemented domains. This does not change the immutable boundaries above and does not authorize creation of downstream Campaign, Creator, Artist, Finance, Content, Publication, Analytics or AI Runtime models.

17. Taxonomy is global governed classification, not Workspace-owned business data.
18. Reference Data is standards-oriented and separate from taxonomy.
19. Shared Media owns technical file concerns only; downstream domains reference MediaAsset.

20. CreatorProfile is global and distinct from User, Workspace and Artist.
21. Creator self-service authorization derives from CreatorProfile ownership, not Workspace RBAC.
22. SocialProfile provider connectivity must never be inferred from declared/manual data.
23. Creator readiness is technical while Creator Terms remain deferred; no fake legal gate is accepted.


24. Artist is distinct from CreatorProfile, User and Workspace.
25. Music Catalog is Artist → Release → Track for marketing operations, not rights administration.
26. Workspace catalog authority requires both Workspace permission and explicit Artist access.
27. Track audio is private Shared Media and cannot be reached around catalog authorization.
28. Catalog import is preview/resolution-first and never auto-merges possible duplicates.
29. Work, Phonogram, Publishing, Rights, Royalties and Distribution remain outside LANDER CREATORS Music Catalog.

## Commercial promoted-object boundaries
- Workspace is operational tenancy; Company is a promoted commercial entity.
- Commercial entities are not CRM, ecommerce, inventory, logistics, ticketing or project-management systems.
- Parent relationships never implicitly grant Workspace access.
- Music and Commercial converge only through typed adapters/registry.
- Campaign is a separate future domain.


# Domain Boundaries

Campaign is generic Creator Marketing orchestration and owns campaign configuration only. It references exactly one Promoted Object through the registry. Campaign targeting is not Matching. Content requirements are not Deliverables or Publications. Rights requirements are not Engagement Terms. Planning budget is not Finance. Tracking intent is not Analytics metrics. Participation and Engagement remain separate future domains.
