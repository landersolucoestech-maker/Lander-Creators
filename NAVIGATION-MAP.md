# LANDER CREATORS — Navigation Map

## Unauthenticated routes

- `/` — authentication entry when no session exists.
- `/reset-password` — password reset.
- `/invitations/accept` — Workspace invitation acceptance.

## Workspace context

- Dashboard — `/`
- Creators — `/creator`
- Artistas / Catálogo musical — `/music-catalog`
- Entidades promovidas — `/promoted-entities`
- Campanhas — `/campaigns` with detail and builder routes
- Mídia — `/media`
- Equipe — `/team`
- Workspace — `/workspace`
- Configurações — `/settings`

Navigation visibility is capability-based. Direct server authorization remains authoritative. Artist and promoted-entity records retain their explicit access models.

## Creator context

- Meu perfil — `/creator`

Creator self-service does not inherit Workspace administration authority.

## Not currently exposed as implemented modules

Participation/Opportunities, Engagement/Contracts, Deliverables, Publication, Finance/Payments, Analytics/Reporting, Matching, Disputes, AI Runtime and provider-backed Integrations are not to be exposed as implemented navigation until their owning domain exists.
