# LANDER CREATORS

LANDER CREATORS is a Creator Marketing platform implemented as a TypeScript modular monolith with a Next.js full-stack application and PostgreSQL.

## Current implementation status

The repository currently includes the engineering foundation plus the implemented product foundations for:

- Identity, Workspace, authorization and audit;
- governed Taxonomy and Reference Data;
- Shared Media;
- Creator profiles and creator readiness;
- Music Catalog: Artist → Release → Track, including XLSX import;
- Commercial Promoted Entities: Company, Brand, Product, Service, PromotedPlatform, PromotedEvent, PromotedProject and InstitutionalInitiative;
- the typed Promoted Object registry/adapters that connect music and commercial promoted objects without collapsing their domain boundaries;
- Campaign Core and its persistence-backed 10-step Campaign Builder.

Participation, Proposal/negotiation, Engagement, Engagement Terms, Deliverables/Content, Publication, Finance/Payments, Analytics metrics, Reporting, Matching, Disputes, downstream provider-backed Integrations, Music Intelligence, AI Runtime/AI Operations and Distribution remain deferred until their explicit implementation stages.

## Engineering rules

Work is performed directly on `main`. GitHub and GitHub Actions are the authorized development/validation environment. Vercel and any other external provider remain prohibited unless the owner explicitly authorizes them.

Technical and engineering surfaces are English. End-user UX copy is PT-BR. Server-side authorization is authoritative, raw technical errors must not leak to the UI, and user-visible changes require desktop/mobile visual evidence plus accessibility validation on the exact validated `main` SHA.

See `ARCHITECTURE.md`, `DOMAIN-BOUNDARIES.md`, `DEVELOPMENT-RULES.md`, `SECURITY.md`, `TESTING.md` and `DEFINITION-OF-DONE.md` before implementation work.
