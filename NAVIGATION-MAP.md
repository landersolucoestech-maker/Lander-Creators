# LANDER CREATORS Navigation Map

## Unauthenticated routes

- `/` — authentication entry when no session exists.
- `/reset-password` — password reset.
- `/invitations/accept` — Workspace invitation acceptance.

## Workspace context

### Visão geral
- Dashboard — `/`

### Operação
- Creators — `/creator`
- Artistas — `/music-catalog#artists`
- Catálogo musical — `/music-catalog`
- Entidades promovidas — `/promoted-entities`

### Recursos
- Mídia — `/media`

### Organização
- Equipe — `/team`
- Workspace — `/workspace`
- Configurações — `/settings`

Items are filtered by real capabilities. Artist and promoted-entity records remain filtered by their explicit access models.

## Creator context

- Meu perfil — `/creator`

Creator context intentionally avoids Workspace administration navigation.

## Not present

No clickable navigation exists for:

- Campaign;
- Finance;
- Content;
- Publication;
- Analytics;
- Reporting;
- Matching;
- AI Runtime.


## Etapa 6 — Campaign Core
Etapa 6 Workspace operation navigation adds `/campaigns`, `/campaigns/[campaignId]` and `/campaigns/[campaignId]/builder`. No downstream Participation/Finance/Analytics navigation is exposed.
