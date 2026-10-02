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
- Oportunidades — `/opportunities` — campanhas abertas, candidaturas e convites
- Propostas — `/proposals` — rodadas recebidas; aceitar, recusar ou contrapropor
- Contratos — `/contracts` — contratos enviados; assinatura do Creator
- Entregas — `/deliverables` — envio de conteúdo para revisão e comprovação de publicação (HTTPS)
- Pagamentos — `/payments` — acompanhamento somente leitura dos pagamentos do Creator

Creator pages are TableView surfaces (`.table-scroll` + semantic `<table>`), render PT-BR status labels, and require an existing Creator profile (otherwise they redirect to `/creator`).

Creator self-service does not inherit Workspace administration authority.

## Not yet exposed in navigation

Workspace-side screens for Engagement/Contracts, Deliverables review, Publication verification, Finance/Payments, Analytics/Reporting, Matching and Disputes are not exposed yet: their services and APIs exist, but the Workspace needs dedicated list/read endpoints and screens first. Creator-side engagement/dispute opening, AI Runtime and provider-backed Integrations are also not exposed.
