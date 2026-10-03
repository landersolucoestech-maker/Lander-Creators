# LANDER CREATORS — Etapa 01: auditoria Portal Creator + Portal Workspace

Gerado sobre `main` @ `1c9dc081ae2652f350eb8ed91fdb2da82218fdb8` (= `origin/main`). Nenhum código foi alterado nesta etapa.
Escopo: Portal Creator e Portal Workspace. Portal Admin fora de escopo (não tocado).
Convenção: "ref px" = pixels do canvas 1536×1024 das referências; a relação ref px → CSS px não foi confirmada pelo proprietário.

---

## 1. ENGINEERING PACK STATUS

| Item | Estado real |
| --- | --- |
| `CLAUDE.md`, `ARCHITECTURE.md`, `AGENT-MAP.md`, `SKILL-MAP.md`, `DEVELOPMENT-RULES.md`, `TESTING.md`, `SECURITY.md`, `DEFINITION-OF-DONE.md`, `ENGINEERING-SYSTEM.md`, `DOMAIN-MAP.md`, `DATA-OWNERSHIP.md`, `NAVIGATION-MAP.md`, `VISUAL-DEVELOPMENT-POLICY.md` | existem e foram lidos |
| `MODULE-MAP.md` | **AUSENTE** (o mapa de módulos é `DOMAIN-MAP.md`) |
| `portal-lander-orchestrator` | **AUSENTE**. O orquestrador real é `lander-creators-orchestrator` |
| `.claude/agents` | 207 arquivos `.md`, em geral de 1 a 3 linhas |
| `.claude/skills` | 147 diretórios + 66 arquivos legados |
| `.claude/commands` | 24 (`/audit`, `/plan`, `/visual-audit`, `/blast-radius`, `/quality-gate`...) |
| `.claude/rules` | 21 |
| `.claude/hooks` | 8 arquivos `.md` (`pre-task`, `pre-edit`, `post-edit`, `pre-completion`, `completion-gate`...) |
| `.claude/settings.json` | **AUSENTE**: os hooks são contratos em texto, **não são executados automaticamente** pelo harness |

Limite honesto: agentes, skills e hooks são definições em texto. Nenhum foi disparado como subagente nesta sessão. Foram usados como checklist: a conduta do orquestrador (preflight, narrowest specialist, evidência no SHA exato), os hooks `pre-task`/`completion-gate` e as regras `ui-ux`, `design-system`, `frontend`, `accessibility`, `scope-control`, `git`.

## 2–4. AGENTS / SKILLS / RULES / HOOKS

- **Agentes aplicáveis à Etapa 02 em diante:** `lander-creators-orchestrator` (coordena), `application-shell-engineer`, `design-system-engineer`, `ui-ux-engineer`, `frontend-architecture-engineer`, `frontend-engineer`, `responsive-engineer`, `accessibility-engineer`, `portal-access-engineer`, `visual-qa-engineer`, `visual-regression-engineer`, `visual-investigator`.
- **Skills aplicáveis:** `visual-consistency-audit`, `responsive-audit`, `accessibility-audit`, `ui-detail-audit`, `component-routing-design-audit`, `form-modal-table-audit`, `loading-empty-error-audit`, `route-map`, `blast-radius`, `duplication`, `test-generation-matrix`.
- **Regras que governam o trabalho visual:** `ui-ux` ("evitar KPI/card inventado onde TableView é especificado"), `design-system` ("sem design system paralelo"), `frontend` (copy PT-BR), `accessibility`, `scope-control`, `git` (somente `main`).
- **Política:** `VISUAL-DEVELOPMENT-POLICY.md` diz que *screenshots gerados não definem o design desejado; equivalência visual exige referências aprovadas pelo proprietário*. Hoje essas referências **não estão versionadas**.

## 5. GIT SNAPSHOT

- Branch `main`, HEAD `1c9dc08` = `origin/main`. Remoto `landersolucoestech-maker/Lander-Creators`.
- Working tree: `M next-env.d.ts`, `M tsconfig.json` (reescrita automática do `next dev`, não versionar), `?? Modelfile-opencode` (local do proprietário), `?? docs/reference-ui/` (criado nesta etapa, ver seção 9).
- Nada commitado, nada enviado.

## 6. STACK REAL

Next.js 16.3.6 (App Router) · React 19.3.0 · TypeScript 6 · Node 24 · npm · PostgreSQL 16 · Drizzle ORM (migrations SQL 0000–0022 aplicadas por `scripts/migrate.mjs`) · Better Auth 1.7.6 · zod 4 · vitest 5 · Playwright 1.55 + axe (instalados só no CI, `--no-save`).
Runtime deps: apenas 6 (`better-auth`, `drizzle-orm`, `next`, `postgres`, `react`, `react-dom`, `zod`). **Sem** Tailwind, biblioteca de UI, biblioteca de ícones, biblioteca de gráficos, biblioteca de datas ou `next/font`.

## 7. ARQUITETURA REAL

Monólito modular Next.js full-stack. `src/server/*` (serviços de domínio, uma pasta por owner) e `src/app/*` (páginas server-rendered + painéis client). 33 componentes client; 31 páginas; 95 rotas de API.
Autorização no servidor (`authorizeWorkspacePermission` consulta memberships/role_permissions/grants a cada chamada). Auditoria append-only na mesma transação. DEV AUTH BYPASS ativo só em development.

## 8. DESIGN SYSTEM ATUAL

Um único `src/app/styles.css` (17 KB, 103 linhas muito densas), CSS puro, sem camada de componentes.

| Token/Componente | Estado atual | Referência | Diferença | Ação |
| --- | --- | --- | --- | --- |
| Tema | **escuro** (`#0b0d10`, `color-scheme:dark`) | **claro** (fundo `#FEFEFE`/branco) | inversão total | re-tematizar via tokens |
| Cor primária | não existe token (botões neutros) | vermelho de marca ≈ `#F8001C` (amostra ±4) | ausente | criar `--color-primary` + estados |
| Tokens existentes | `--surface-*`, `--border`, `--text`, `--radius-sm/md/lg`, `--space-1..5`, `--sidebar-width:260px` | n/d | 54 usos de `var()` convivem com **55 hex literais (20 únicos)** | migrar literais para tokens |
| Sidebar | 260px, escura, com rótulos de grupo e `●` no item ativo | ≈283 (Creator) / ≈290 (Workspace) ref px, claro, ícones, item ativo com fundo `#FEF2F3` e texto/ícone vermelho, **divisores** em vez de rótulos de grupo, submenu expansível, card promocional no rodapé (Workspace) | largura, ícones, ativo, grupos, submenu, promo | refazer |
| Topbar | 72px, chips de contexto, nome do usuário, botão Sair | ≈67–70 ref px: busca global larga, sino com contador, avatar+nome+papel+chevron | busca, notificações, menu de usuário | refazer |
| Page header | `h1` + subtítulo, sem breadcrumb | breadcrumb com chevron `‹`, título preto extra-bold, subtítulo cinza, CTA vermelho (≈169×36 ref px) à direita | breadcrumb, CTA, tipografia | criar `PageHeader` |
| Stat cards | `.stats-grid` 4 col, `.mini-stats` | 4–6 cards com ícone em quadrado colorido, valor, delta verde/vermelho, legenda | ícone, delta | criar `StatCard` |
| Tabelas | `<table>` semântica em `.table-scroll` (19 tabelas) | avatar/capa, marca, badges, checkbox, "Ver" outline vermelho, menu `⋯`, painel de detalhe | sem seleção, sem avatares, sem painel | `DataTable` + `DetailPanel` |
| Toolbar/filtros | `ListToolbar` = GET form (q, status, sort, dir) | busca + 4–5 selects rotulados + período + Limpar; abas com contagem; "Filtros"/"Exportar" | só 1 filtro de status | estender |
| Paginação | `Pager` Anterior/Próxima + texto | "Mostrando 1–12 de 48", páginas numeradas, seletor "12 por página" | números, tamanho de página | estender |
| Badges | `.status-badge` (1 estilo, borda neutra) | pílulas coloridas por semântica (verde/amarelo/azul/vermelho/cinza/roxo), ponto ou ícone | 1 variante só | `StatusBadge` com tons |
| Ícones | **nenhum** (0 SVG no `src`) | ~60 ícones + marcas Instagram/TikTok/YouTube/Spotify/Apple Music/Deezer/Amazon/Pix | ausente | conjunto SVG interno |
| Gráficos | nenhum | linha/área, rosca (donut), barras | ausente | primitivos SVG internos |
| Tipografia | `Inter, system-ui` sem carregar fonte | título extra-bold; fonte exata não identificada | fonte desconhecida | owner informar fonte |
| Logo/marca | caixa de texto "LC" + "LANDER/CREATORS" | wordmark LANDER CREATORS (azul/vermelho/preto) | `public/` está **vazio** | owner fornecer asset |
| Modal/Drawer | **nenhum** `dialog`, `aria-modal`, focus trap (0 ocorrências) | modais inferíveis (convidar, novo contrato, novo pagamento, filtros) e painel lateral | ausente | criar com a11y |
| Empty/Loading/Error | `.empty-state`, `error.tsx`; sem skeleton | n/d nas referências | skeleton ausente | criar |
| Breakpoints | 1050 / 820 / 720 / 640 / 560 | só desktop | sidebar some <820 e vira drawer | estratégia na seção 14 |

Medições das referências (por amostragem de pixels, ±2 px): divisor sidebar/conteúdo em x≈283 (Creator) e x≈290 (Workspace); borda inferior da topbar em y≈67–70, cor `#EAEDF2`–`#F1F2F4`; fundo do item ativo `#FEF2F3`; texto de título `#000`; CTA primário 169×36 ref px. **Incoerência entre os dois conjuntos:** o título "Campanhas" tem bloco de 51 ref px no Workspace contra 38 no Creator (≈1,34×), e o sidebar difere ≈7 px. A implementação precisa de um único token e o proprietário deve confirmar qual vale.

## 9. INVENTÁRIO DAS REFERÊNCIAS VISUAIS

- **Não existia `docs/reference-ui/`.** As imagens só estavam na pasta temporária da sessão.
- 54 arquivos recebidos = **27 telas únicas × 2** (hash MD5 idêntico dois a dois), todos 1536×1024.
- Copiadas **sem versionar** para `docs/reference-ui/portal-creator/C01..C11` e `portal-workspace/W01..W16` (38 MB no total). Não commitei por causa do tamanho e da política de "referências aprovadas pelo proprietário"; decidir se entram no Git (e se otimizadas).
- Artefatos de geração nas imagens (não copiar): texto distorcido ("Ver PDFr", "01.90K", "01/0/2026", "Rubtoibtt99", "Etoer editar"), ícones inconsistentes, logo do avatar do topbar diferente em W11.

| ID | Arquivo | Tela |
| --- | --- | --- |
| C01 | portal-creator/C01-estatisticas | Estatísticas |
| C02 | C02-campanhas | Campanhas |
| C03 | C03-configuracoes | Configurações (abas) |
| C04 | C04-dashboard | Dashboard |
| C05 | C05-meu-perfil | Meu Perfil |
| C06 | C06-meus-contratos | Meus Contratos |
| C07 | C07-minhas-entregas | Minhas Entregas |
| C08 | C08-oportunidades | Oportunidades |
| C09 | C09-pagamentos | Pagamentos |
| C10 | C10-publicacoes | Publicações |
| C11 | C11-relatorios | Relatórios |
| W01 | portal-workspace/W01-conteudos-submenu-meus-creators | Conteúdos com submenu "Meus Creators" expandido |
| W02 | W02-campanhas | Campanhas |
| W03 | W03-chat | Chat |
| W04 | W04-configuracoes | Configurações (abas) |
| W05 | W05-conteudos | Conteúdos |
| W06 | W06-contratos | Contratos |
| W07 | W07-dashboard | Dashboard |
| W08 | W08-integracoes | Integrações |
| W09 | W09-meus-creators | Meus Creators |
| W10 | W10-musicas-releases | Músicas / Releases |
| W11 | W11-pacotes | Pacotes de Campanha |
| W12 | W12-pagamentos | Pagamentos |
| W13 | W13-publicacoes | Publicações |
| W14 | W14-rede-de-creators | Rede de Creators |
| W15 | W15-relatorios | Relatórios |
| W16 | W16-ajuda-suporte | Ajuda / Suporte |

## 10. PORTAL CREATOR — inventário

- **Hoje (código):** `/creator` (perfil/onboarding), `/opportunities`, `/proposals`, `/creator-engagements`, `/contracts`, `/deliverables`, `/payments`. Navegação: "Meu perfil, Oportunidades, Propostas, Contratações, Contratos, Entregas, Pagamentos".
- **Referência:** 11 telas. Itens da sidebar **sem tela de referência**: Rede de Criadores, Biblioteca de Conteúdo, Chat, Ajuda/Suporte.
- **Sem tela de referência, mas existentes no código:** `/proposals` (negociação/contraproposta) e `/creator-engagements` (contratações + abrir disputa). Não podem ser apagados; precisam de lugar na nova IA.

## 11. PORTAL WORKSPACE — inventário

- **Hoje:** Dashboard `/`, Creators `/creator` (**aponta para o perfil do próprio usuário**, não para uma base de creators), Artistas e Catálogo `/music-catalog`, Entidades promovidas, Campanhas (+detalhe +builder de 10 passos), Negociações, Contratações, Contratos, Revisão de conteúdo, Publicações (+planejamento), Financeiro (+candidatos), Disputas, Matching, Analytics (+publicações), Mídia, Equipe, Workspace, Configurações.
- **Tipos de workspace no banco:** `LABEL, MANAGEMENT, COMPANY, AGENCY, INTERNAL`. **Não existem** `ARTIST`, `PRODUCER` nem `BRAND` como tipo de workspace (Artist/Brand são entidades promovidas, não tenants).
- **Papéis:** OWNER, ADMIN, CAMPAIGN_MANAGER, MARKETING, SOCIAL_MEDIA, FINANCE, VIEWER (ADMIN excede a lista pedida).
- **Sem tela de referência, mas existentes no código:** Entidades promovidas, Negociações, Contratações, Disputas, Matching, Analytics, Mídia, Equipe, Planejamento de publicações, Financeiro/candidatos, builder e detalhe de campanha.

## 12. MATRIZ REFERÊNCIA × IMPLEMENTAÇÃO

Status visual: toda tela existente é `EXISTS_NEEDS_VISUAL_FIX` (tema, shell, componentes divergem; nenhuma está `EXISTS_AND_MATCHES`).

| Ref | Rota atual | Arquivos / componentes | Backend / DB | Visual | Funcional | Gap principal | Ação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C01 Estatísticas | — | `/analytics` é do Workspace | `publication_metrics_snapshots`, `campaign_payables` (sem leitura por Creator) | MISSING | MISSING + **CONFLICTING** | Regra do proprietário: sem módulo "Estatísticas" separado do Dashboard. Demografia (idade/gênero/país) sem tabela, depende de provider | decisão; read model do Creator |
| C02 Campanhas | — (`/campaigns` é Workspace) | — | `campaign_participations`, `campaigns` | MISSING | PARTIAL (dado existe) | página do Creator; "Minha Situação" é derivada, sem regra definida | criar após decisão de derivação |
| C03 Configurações | — | `/creator` mistura perfil+onboarding | `/api/creator/{availability,visibility,social,taxonomy,avatar}` | MISSING | PARTIAL | abas Contas Conectadas (provider), Preferências, Segurança, Notificações (sem domínio), Privacidade, Documentos, Plano (sem billing); faixa de preço e tempo de resposta **não existem no schema** | decidir o que persistir |
| C04 Dashboard | `/` (mostra o dashboard do Workspace) | — | — | MISSING | MISSING | dashboard do Creator inexistente | construir read model |
| C05 Meu Perfil | `/creator` | `creator-panel.tsx` | `creator_profiles` (sem handle, selo verificado, avaliação média, faixa de preço, portfólio, dados bancários) | NEEDS_VISUAL_FIX | PARTIAL | vários campos de domínio ausentes; **conflita com C03** (perfil dentro de Configurações) | decisão de IA |
| C06 Meus Contratos | `/contracts` | `contracts-panel.tsx` | `engagement_contracts`, `/api/contracts/[id]/sign` | NEEDS_VISUAL_FIX | PARTIAL | "Tipo de Contrato" (Uso de Conteúdo, Prestação de Serviços, Uso de Imagem e Voz, Exclusividade) não existe; "Ver PDF" sem geração de documento | decidir taxonomia |
| C07 Minhas Entregas | `/deliverables` | `deliverables-panel.tsx` (171 l) | `deliverables`, `content_versions`, `/api/deliverables*` | NEEDS_VISUAL_FIX | PARTIAL | KPIs, painel com timeline/feedback, **upload de arquivo** (hoje só URL externa), "Baixar arquivo" | storage depende de provider |
| C08 Oportunidades | `/opportunities` | `opportunities-panel.tsx` | `campaigns`, `/api/opportunities*` | NEEDS_VISUAL_FIX | PARTIAL | sem paginação/filtros do servidor; "Ver Oportunidades Recomendadas" (IA/matching) | refazer em DataTable |
| C09 Pagamentos | `/payments` | `payments-panel.tsx` (somente leitura) | `campaign_payables` | NEEDS_VISUAL_FIX | PARTIAL | saldo/sacar (Pix), métodos de pagamento (PII/CPF), resumo financeiro | **BLOCKED_EXTERNAL** (gateway) para saque |
| C10 Publicações | — (prova dentro de `/deliverables`) | — | `publications`, `/api/publications/[id]/proof` | MISSING | PARTIAL | página própria; "Cliques no Link" exige Smart Link | criar; KPI de cliques depende de domínio novo |
| C11 Relatórios | — | — | importação existe só p/ catálogo XLSX (Workspace) | MISSING | MISSING | semântica estranha para Creator ("importar Artistas/Marcas/Campanhas"); histórico de exportações sem tabela | PRODUCT_DECISION_REQUIRED |
| W01 Conteúdos + submenu Meus Creators | — | — | — | MISSING | MISSING | padrão de submenu expansível; páginas Histórico/Avaliações/Blacklist/Parceiros/Embaixadores = CRM/Network sem domínio | construir domínio CRM |
| W02 Campanhas | `/campaigns` (+detalhe, builder) | `campaigns-panel.tsx`, `campaigns/page.tsx` | `campaigns` + 20 tabelas `campaign_*` | NEEDS_VISUAL_FIX | PARTIAL | abas "Em negociação / Em produção / Aguardando publicação" **não são** `campaign_status`; KPI "Streams via Smart Link" exige Smart Link; tipos "Marca/Pré-save" ≠ `promoted_object_type` | regra de derivação (decisão) |
| W03 Chat | — | — | **nenhuma tabela/API** | MISSING | MISSING | domínio inteiro; anexos exigem storage | construir domínio; anexos BLOCKED_EXTERNAL |
| W04 Configurações | `/settings`, `/workspace`, `/team`, `/media` | `workspace-dashboard.tsx` (261 l) | `workspaces` (só `name,type,status`), `memberships`, `audit_logs` | NEEDS_VISUAL_FIX | PARTIAL | sem descrição, logo, plano, fuso, formato de data/moeda, prazo padrão, **taxa da plataforma editável pelo Workspace**, 2FA, sessões, notificações, billing, exportação/exclusão do workspace | decidir; muito é admin-owned |
| W05 Conteúdos | `/content-review` | `content-review-table.tsx` | `content_versions`, `deliverables` | NEEDS_VISUAL_FIX | PARTIAL | previews/thumbs de vídeo (mídia não aceita VIDEO), abas Revisões/Publicação/Resultados/Direitos, "Baixar conteúdo" | storage de vídeo BLOCKED_EXTERNAL |
| W06 Contratos | `/engagements/contracts` | `contracts-table.tsx` | `engagement_contracts` | NEEDS_VISUAL_FIX | PARTIAL | "Novo Contrato" manual conflita com o fluxo (contrato nasce de proposta aceita); "Enviar por e-mail"; PDF; statuses divergem do enum | decisão + e-mail provider |
| W07 Dashboard | `/` | `dashboard-view.tsx`, `dashboard-service.ts` | read-only agregados | NEEDS_VISUAL_FIX | PARTIAL | gráficos, Top Músicas (streams = provider), Top Creators, "Minhas Tarefas" (sem modelo), conteúdos recentes | componentes de gráfico |
| W08 Integrações | — | — | `social_connection_status` (só enum) | MISSING | MISSING | Instagram/TikTok/YouTube conectados, "skills automatizadas" | **BLOCKED_EXTERNAL**; só lista neutra "não conectado/em breve" |
| W09 Meus Creators | — (`/creator` ≠ isto) | — | sem favoritos/blacklist/parceiro/embaixador | MISSING | MISSING + **CONFLICTING** (nome/rota) | CRM sem tabelas; hoje o item "Creators" abre o perfil do próprio usuário | construir CRM; renomear |
| W10 Músicas / Releases | `/music-catalog` | `music-catalog-panel.tsx` | `artists, releases, tracks`, import XLSX | NEEDS_VISUAL_FIX | PARTIAL | Smart Link, Pré-save, streams atribuídos (provider), "Em campanha" derivado | domínio Smart Link/Pré-save interno |
| W11 Pacotes | — | — | sem billing | MISSING | MISSING | catálogo de preços, carrinho, "pagamento seguro Pix/cartão/boleto" | **BLOCKED_EXTERNAL** + decisão comercial |
| W12 Pagamentos | `/finance`, `/finance/candidates` | `payables-table.tsx` | `campaign_payables` (ações: REFRESH, RELEASE, MARK_PAID) | NEEDS_VISUAL_FIX | PARTIAL | falta "Cancelar Pagamento", método (Pix/Transferência), nota fiscal, agendado; **decisões A e C seguem pendentes** | decisões A/C |
| W13 Publicações | `/publications` (+planning) | `publications-table.tsx` | `publications`, `publication_metrics_snapshots` | NEEDS_VISUAL_FIX | PARTIAL | título/legenda, métricas 7 dias, "Registrar Publicação" (planejar/verificar já existem) | adaptar |
| W14 Rede de Creators | — (`/matching` é por campanha) | `matches-table.tsx` | `creator_profiles`, `marketplace_visibility`, taxonomias | MISSING | MISSING | descoberta/busca de creators com filtros e cards; "Recomendados por IA" | busca interna; IA BLOCKED_EXTERNAL |
| W15 Relatórios | — | — | importação só do catálogo | MISSING | MISSING | histórico de relatórios, formatos XLSX/CSV, status | tabela de relatórios (nova) |
| W16 Ajuda / Suporte | — | — | **nenhuma tabela/API** | MISSING | MISSING | domínio de tickets (portais Creator/Workspace) | construir domínio |

## 13. MAPA DE ROTAS (páginas atuais)

Workspace: `/`, `/campaigns`, `/campaigns/[id]`, `/campaigns/[id]/builder`, `/music-catalog`, `/promoted-entities`, `/negotiations`, `/engagements`, `/engagements/contracts`, `/content-review`, `/publications`, `/publications/planning`, `/finance`, `/finance/candidates`, `/disputes`, `/matching`, `/analytics`, `/analytics/publications`, `/media`, `/team`, `/workspace`, `/settings`.
Creator: `/creator`, `/opportunities`, `/proposals`, `/creator-engagements`, `/contracts`, `/deliverables`, `/payments`.
Públicas: `/`(login), `/reset-password`, `/invitations/accept`.
**Colisão de nomes entre portais:** `/` serve Workspace; `/contracts` e `/payments` são Creator, enquanto o Workspace usa `/engagements/contracts` e `/finance`; `/campaigns` e `/publications` são só Workspace; não há `/campaigns` do Creator. O Creator ainda usa rotas "soltas" e o Workspace usa o mesmo espaço raiz: a nova IA precisa decidir prefixos ou rotas distintas por portal.

## 14. MAPA DE COMPONENTES (existentes)

`ApplicationShell` (único, serve os dois via prop `context`), `renderWorkspacePage` (12 páginas) e `renderCreatorPage` (5 páginas), `ListToolbar`, `Pager`, `useApiAction`, `AccessDeniedState`, `.status-badge`, `.empty-state`, `.stat-card`, `.table-scroll`, `.detail-list`.
Não existem: Topbar própria, Breadcrumb, PageHeader, StatCard (componente), Tabs, DetailPanel, Drawer, Modal, FormField/Select/DateRange (componentes), Avatar/Identity, PlatformBadge, ContentPreview, FileAttachment, Skeleton, ícones, gráficos.

## 15. MAPA DE ENTIDADES

73 tabelas. Existem: identidade/workspace/RBAC/audit, taxonomia/referência/mídia, creator (+social, métricas declaradas), catálogo musical, entidades promovidas, campanha (20 tabelas `campaign_*`), participação, proposta, engagement, contrato, deliverable, content_version, publicação, métricas de publicação, payable, disputa, match snapshot.
**Ausentes** (necessárias às referências): notificações, chat/mensagens, tickets/suporte, Smart Link e cliques, Pré-save, waves, CRM do creator (favorito/blacklist/parceiro/embaixador/avaliação), content library, relatórios/exportações, pacotes/billing/faturas, métodos de pagamento do creator, conexões de integração, portfólio do creator, tarefas, preferências de notificação, configurações do workspace (logo, descrição, fuso, formato).

## 16. MAPA DE APIs

95 rotas. Workspace: `/api/workspaces/{id}/…` (campanhas, participações, propostas, engagements, contratos, conteúdo, publicações, payables, disputas, analytics, matching, mídia, membros, catálogo, promoted entities). Creator: `/api/creator*`, `/api/opportunities*`, `/api/proposals*`, `/api/contracts*`, `/api/deliverables*`, `/api/publications*`, `/api/payments`, `/api/disputes`, `/api/engagements`. Listas do Workspace retornam `{rows,total,page,pageSize,pageCount}`; páginas do Creator carregam listas inteiras (sem paginação servidor). Sem API de notificações, busca global, chat, tickets, smart link, relatórios, integrações.

## 17. MAPA DE PERMISSÕES

48 permission codes (`workspace.*`, `team.*`, `campaign.*`, `participation.*`, `proposal.*`, `engagement.*`, `deliverable.*`, `publication.*`, `finance.*`, `analytics.*`, `matching.*`, `dispute.*`, `media.*`, `music_catalog.*`, `promoted_entity.*`...). Navegação Workspace é por capability (`*.view`). Creator usa autorização por posse do recurso. **Sem** permissões para: chat, suporte, relatórios/export, integrações, CRM de creators, Smart Link, pré-save, pacotes/billing, notificações. Sem modelo de Platform Admin (fora do escopo).

## 18. FLUXOS CROSS-PORTAL (estado real)

Campanha (Workspace, `campaigns`) → convite direto ou candidatura (`campaign_participations`, `/api/opportunities/[id]/apply`) → shortlist → proposta/contraproposta (`campaign_proposals`, Workspace e Creator) → aceite → engagement + contrato (`campaign_engagements`, `engagement_contracts`, assinatura dupla) → deliverables → envio de conteúdo (`content_versions`, Creator via URL) → revisão/aprovação (Workspace) → publicação planejada/prova/verificação (`publications`) → métricas (`publication_metrics_snapshots`) → payable elegível/liberado/pago (`campaign_payables`) → disputa (`disputes`). **Todas as etapas existem e têm teste.** Faltam: notificação em cada transição, chat de contexto, upload real de arquivo do Creator, métricas vindas de provider, Smart Link/atribuição, relatórios.

## 19. DUPLICAÇÕES

- 12 páginas com guarda/shell **próprio** (campaigns ×3, creator, media, music-catalog, opportunities, `/`, promoted-entities, settings, team, workspace) vs 17 que usam `renderWorkspacePage`/`renderCreatorPage`.
- Dois conceitos de "tabela": 19 `.table-scroll` com cabeçalhos/ações repetidos; badges em 26 pontos com 1 variante.
- Mapas de rótulo centralizados só em `post-campaign-labels.ts`; rótulos de papel e tipo repetidos em `workspace-dashboard.tsx`.
- Taxonomia dupla de "tipo" de contrato entre as referências do Creator e do Workspace.

## 20. DÍVIDA TÉCNICA RELEVANTE

- **42 arquivos de código com linha média > 200 caracteres** (código compactado), contra `DEVELOPMENT-RULES.md` ("não compactar/minificar código-fonte"). Inclui `styles.css`, `opportunities/page.tsx`, `payables/[id]/route.ts`, vários testes.
- 55 hex literais no CSS ao lado de tokens; CSS legado (`catalog-*`, `creator-*`) sobreposto às camadas novas.
- Dois shells mentais ("Workspace"/"Creator") no mesmo componente por `context`.
- Hooks do pack não são executados (sem `settings.json`).
- O teste visual atual faz captura + axe, **sem comparação com referência** (0 `toHaveScreenshot`, 1 teste).
- Validação antes de autorização em POST (achado de segurança já registrado; não alterado).
- README desatualizado em relação ao DOMAIN-MAP.

## 21. BASELINE DE TESTES (HEAD `1c9dc08`)

| Comando | Resultado | Origem |
| --- | --- | --- |
| `npm run lint` | exit 0 | preexistente limpo |
| `npm run typecheck` | exit 0 | limpo |
| `npm run test:engineering-os` | ok (207 agentes, 147 skills, 24 comandos, 8 hooks, 21 rules) | limpo |
| `npm test` (banco único) | **224/224**, 44 arquivos | limpo |
| `npm run db:guarantees -- --strict` | 5/5 | limpo |
| `npm run build` (flag desligada) | exit 0 | limpo |
| CI `1c9dc08` | CI `validate`, `visual_inspection`, `publish_visual` e Live Preview `preview` = success | run 37095973065 / 37095973111 |
| E2E/visual local | Playwright **não instalado localmente** (só no CI) | o `npm test` não cobre |
Lint, typecheck e Engineering OS foram reexecutados nesta etapa; testes/build/CI são da execução anterior sobre a mesma árvore de código.

## 22. GAPS VISUAIS

1. Tema claro vs escuro. 2. Falta paleta primária. 3. Shell: sidebar/topbar/ícones/breadcrumb. 4. Sem busca global, sino, menu de usuário. 5. Sem componentes: StatCard, Tabs, DetailPanel, Modal, Drawer, Avatar, PlatformBadge, ContentPreview. 6. Sem ícones e sem gráficos. 7. Tabelas sem seleção, avatar, capa, menu de ações. 8. Painel lateral mestre-detalhe (W02, W05, W06, W09, W10, W12, C07, C09, C10) inexistente. 9. Paginação sem números e sem tamanho de página. 10. Logo e fonte inexistentes no repo. 11. Cards promocionais do rodapé do sidebar (Workspace) sem fonte de dados.

## 23. GAPS FUNCIONAIS

Domínios inexistentes: Notificações, Chat, Suporte/Tickets, Smart Link, Pré-save, CRM de creators, Rede/descoberta de creators, Content Library, Relatórios/exportações, Pacotes/Billing, Integrações, métodos de pagamento/saque do Creator, dashboard e estatísticas do Creator, página de Campanhas e Publicações do Creator, configurações ricas de Creator e de Workspace.
Dados ausentes no schema: handle do creator, selo verificado, avaliação média, faixa de preço, tempo de resposta, portfólio, demografia da audiência, nota fiscal, método de pagamento, logo/descrição/plano/fuso/formato do workspace.

## 24. RISCOS / BLOCKERS

- **Referências incoerentes entre telas** (sidebar, nomes, itens) e com regras do proprietário → decisões abaixo.
- **BLOCKED_EXTERNAL:** upload/streaming de vídeo (storage), saque Pix/gateway, assinatura de PDF, e-mail, métricas de Spotify/TikTok/Instagram/YouTube, "Recomendados por IA", cobrança/Pacotes, Integrações reais.
- Blast radius da troca de tema: todas as 31 páginas, 33 componentes client, `styles.css` inteiro e o spec visual.
- Rotas colidem entre portais (seção 13).
- Playwright só roda no CI: iterar visualmente exige instalá-lo localmente (decisão do proprietário, é dependência de dev).

### Decisões de produto necessárias (novas, além de A–E)

| ID | Tema | Por quê |
| --- | --- | --- |
| F | **Navegação canônica do Creator** | Referências divergem: "Meu Perfil" e "Estatísticas" aparecem em C02, C04–C10 mas **não** em C01, C03, C11; C11 troca Estatísticas por Relatórios. A regra anterior do proprietário diz: sem "Estatísticas" separado, Perfil dentro de Configurações, Relatórios como módulo. |
| G | **Navegação canônica do Workspace** | O sidebar muda por tela (Analytics vs Relatórios; Chat, Ajuda, Integrações, Pacotes, Smart Link, Pré-save aparecem só em algumas; "Creators" vs "Meus Creators"). União = 19 itens. |
| H | Onde ficam as telas existentes sem referência | Negociações, Contratações, Disputas, Matching, Entidades promovidas, Mídia, Equipe, Planejamento de publicações, builder. Não serão apagadas. |
| I | Tokens finais | Qual título vale (51 vs 38 ref px), largura do sidebar (283 vs 290), fonte, vermelho exato, relação ref px → CSS px. |
| J | Assets | Wordmark/logo, fonte, ícones de marca, imagens de capa. `public/` está vazio. |
| K | Regras derivadas de status | Abas "Em negociação / Em produção / Aguardando publicação", "Minha Situação" e "Lançado/Pré-save/Em campanha" não são enums. |
| L | Taxonomia de tipo de contrato | Creator e Workspace mostram "tipo" diferentes. |
| M | Tipos de workspace | Incluir ARTIST/PRODUCER/BRAND exige migration. |
| N | Pacotes, taxa da plataforma, plano | Comercial/admin-owned. |
| O | Relatórios do Creator | O conteúdo da referência C11 não faz sentido para um Creator (importar Artistas/Marcas). |

## 25. PLANO DE IMPLEMENTAÇÃO ORDENADO (por dependência real)

0. **Pré-requisitos (sem código):** decisões F, G, H, I, J; versionar (ou não) as referências; instalar Playwright localmente.
1. **Fundação do Design System:** tokens claros (cor, tipografia, raio, sombra, espaço, breakpoints) em `styles.css`/camada de tokens; fonte; conjunto de ícones SVG internos; primitivos `StatusBadge`, `PlatformBadge`, `Button`, `FormField/Select/DateRange`. Teste: snapshot de tokens + axe.
2. **Shell único:** `Sidebar` (ícones, ativo, divisores, submenu, promo card), `Topbar` (busca, sino com contador, menu de usuário), `Breadcrumb`, `PageHeader`; a11y do drawer móvel com `role="dialog"`, `aria-modal`, focus trap.
3. **Primitivas de dados:** `StatCard`, `Tabs`, `FilterBar` (generalizar `ListToolbar`), `DataTable` (checkbox, avatares, menu de ações), `Pagination` (números, tamanho), `DetailPanel`, `EmptyState/Skeleton/ErrorState`. Reusar `renderWorkspacePage/renderCreatorPage`.
4. **Consolidar guardas:** migrar as 12 páginas bespoke para os helpers.
5. **Portal Workspace — telas que já têm domínio:** W07 Dashboard, W02 Campanhas, W12 Pagamentos, W06 Contratos, W05 Conteúdos, W13 Publicações, W10 Músicas/Releases, W04 Configurações (parte existente).
6. **Portal Creator — telas que já têm domínio:** C08 Oportunidades, C06 Contratos, C07 Entregas, C09 Pagamentos (leitura), C05 Perfil/C03 Configurações, C02 Campanhas, C10 Publicações; depois C04 Dashboard (novo read model).
7. **Domínios novos (um por vez, com schema+API+permissão+teste):** Notificações → Chat → Suporte → CRM/Rede de Creators → Smart Link/Pré-save → Relatórios → Content Library. Integrações, Pacotes e saque permanecem BLOCKED_EXTERNAL (somente estados neutros).
8. **Responsivo** por breakpoint definido, **acessibilidade** funcional + axe, **regressão visual** contra as referências, gates finais.

## 26. PRIMEIRA UNIDADE DE IMPLEMENTAÇÃO RECOMENDADA

**U1 — Tokens + conjunto de ícones + primitivos de tema claro**, sem trocar nenhuma tela ainda.
Arquivos: `src/app/styles.css` (camada de tokens), novo `src/app/ui/` (ícones SVG internos, `StatusBadge`, `PlatformBadge`, `Button`), `public/` (logo, depois que o proprietário fornecer). Depende de decisões I e J. Risco baixo: não toca domínio, API nem banco.

## 27. DEFINITION OF DONE DA U1

- Tokens de cor/tipografia/raio/sombra/espaço/breakpoint documentados e usados; **zero hex literais novos** fora dos tokens; hex legados migrados ou listados.
- Cor primária e tons semânticos conferidos contra amostras das referências (±4 em RGB) com a medição registrada.
- Todos os ícones usados nas 27 referências existem como SVG interno acessível (`aria-hidden` ou rótulo).
- `StatusBadge`/`PlatformBadge`/`Button` com variantes e estados (hover, focus visível, disabled) e contraste AA verificado.
- Nenhuma dependência nova de runtime; nenhum provider; sem Vercel.
- lint, typecheck, Engineering OS, 224+ testes, build com bypass desligado, CI verde no SHA exato; inspeção visual desktop/mobile com axe.
- Localhost 3100 respondendo; documentação (`DESIGN`/`NAVIGATION-MAP`) reconciliada.
