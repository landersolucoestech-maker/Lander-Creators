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

Operação (post-campaign, grouped under "Operação"; each item is visible only with its capability from `src/server/application/application-context.ts`):

| Item | Route | Capability (permission) |
| --- | --- | --- |
| Negociações | `/negotiations` | `negotiations` (`participation.view`) |
| Contratações | `/engagements` | `engagements` (`engagement.view`) |
| Contratos | `/engagements/contracts` | `engagements` |
| Revisão de conteúdo | `/content-review` | `contentReview` (`deliverable.view`) |
| Publicações | `/publications`, `/publications/planning` | `publications` (`publication.view`) |
| Financeiro | `/finance`, `/finance/candidates` | `finance` (`finance.view`) |
| Disputas | `/disputes` | `disputes` (`dispute.view`) |
| Matching | `/matching` | `matching` (`matching.view`) |
| Analytics | `/analytics`, `/analytics/publications` | `analytics` (`analytics.view`) |

Every screen is a server-rendered TableView (GET toolbar with search, filter, sort; pager; empty/error states; row actions gated by `manage`-type permissions). Pending owner decisions are shown openly on the screen (Finance: dispute does not block payment, no four-eyes; Matching: no score history). Reads go through `GET /api/workspaces/{workspaceId}/...` list routes returning `{rows,total,page,pageSize,pageCount}`.

Navigation visibility is capability-based. Direct server authorization remains authoritative. Artist and promoted-entity records retain their explicit access models.

## Creator context

- Meu perfil — `/creator`
- Oportunidades — `/opportunities` — campanhas abertas, candidaturas e convites
- Propostas — `/proposals` — rodadas recebidas; aceitar, recusar ou contrapropor
- Contratos — `/contracts` — contratos enviados; assinatura do Creator
- Entregas — `/deliverables` — envio de conteúdo para revisão e comprovação de publicação (HTTPS)
- Contratações — `/creator-engagements` — contratações do Creator e abertura de disputa (ACTIVE/COMPLETED sem disputa em andamento)
- Pagamentos — `/payments` — acompanhamento somente leitura dos pagamentos do Creator

Creator pages are TableView surfaces (`.table-scroll` + semantic `<table>`), render PT-BR status labels, and require an existing Creator profile (otherwise they redirect to `/creator`).

Creator self-service does not inherit Workspace administration authority.

## Not yet exposed in navigation

AI Runtime and provider-backed Integrations are not exposed. Engagement-level Workspace actions that have no owner-approved UX (for example mandatory negotiation, blocking payment on dispute) are intentionally absent; see `docs/product/PRODUCT-DECISIONS.md`.

## Active-route detection

The shell marks one item current per path (`src/app/ui/active-route.ts`): exact match or `href/` prefix; the longest matching href wins; fragment hrefs (for example `/music-catalog#artists`) are never marked current.
