# LANDER CREATORS — Application Shell

## Purpose

The authenticated application shell composes implemented domains into one experience. It is an application layer, not a business-domain persistence owner.

## Shell contract

The shell provides desktop sidebar, responsive mobile navigation, sticky header, explicit Workspace/Creator context, account/sign-out controls, one main content landmark, skip navigation and capability-aware navigation.

Authentication, password reset and invitation acceptance may remain outside the authenticated shell where appropriate.

## Contexts

Workspace context uses the active Workspace persisted in `user_context_preferences.active_workspace_id` and revalidated server-side against current Membership.

Creator context is explicit through Creator self-service routes and must not inherit Workspace administration authority. No duplicate context-persistence model is introduced.

## Navigation and authorization

Navigation visibility derives from current permission checks, never role-name assumptions. Hidden navigation is not authorization; protected routes independently enforce current server-side capabilities.

## Dashboard

Dashboard reads real, access-filtered data only. It must not fabricate Campaign, Finance, ROI, revenue, follower-growth or other analytics. Campaign summaries may be shown only from implemented Campaign Core data.

## Responsive/accessibility behavior

Mobile navigation must preserve keyboard access, focus transfer/return, Escape close behavior and no page-level horizontal overflow. User-visible changes remain subject to the repository visual and accessibility gates.

## Implemented surfaces

Current surfaces are defined by `NAVIGATION-MAP.md`. Future modules are not exposed merely because their domain is planned.

## Shared shell implementation (Etapa 03 U2)

One shell drives both portals; `ApplicationShell` (`src/app/application-shell.tsx`) is configured by `{state, navigation, context}` and no page owns a layout. Primitives live in `src/app/ui/`:

| Primitive | File | Notes |
| --- | --- | --- |
| BrandSlot | `brand-slot.tsx` | Text mark only. `BLOCKED_ASSET_LOGO`: no logo asset exists; swap here when the owner supplies it. |
| Sidebar | `sidebar.tsx` | Groups Visão geral / Operação / Recursos / Organização; `aria-current="page"`; optional promo slot (`sidebar-context-card.tsx` is not wired: no owner copy). |
| Topbar | `topbar.tsx` | Mobile trigger, context switcher, search (`role="search"`, no backend yet), notification button (no fabricated count), account menu. |
| PageContainer / PageHeader | `page-container.tsx`, `page-header.tsx` | Primitives for U3+ pages; existing pages are not migrated in U2. |
| MobileNav | `mobile-nav.tsx` | `role="dialog"` + `aria-modal`, focus trap, Escape, scroll lock, focus return to the trigger; `onClose` is read through a ref so parent re-renders do not move focus. |
| Active route | `active-route.ts` | Exact or `prefix/` match; longest href wins; fragment hrefs (`#artists`) are never "current" because `usePathname` cannot see fragments. |

Canonical dimensions (tokens `--lc-*`, `DESIGN-SYSTEM.md`): sidebar 288px, topbar 64px, gutter 32px, control height 40px. Breakpoints: at 1024px and below the sidebar becomes the drawer; at 640px the topbar wraps (tablet and mobile share one layout; refine in a later unit if the references require it).

Dev fixture: `/dev/shell` (Workspace and Creator shells plus an isolated drawer). It calls `notFound()` in production and is static in the production build.

Legacy routes (Negociações, Disputas, Matching, Entidades promovidas, Equipe, Mídia) remain in navigation; none was removed.

### Decisions F–O (status at U2)

| ID | Status | Resolution |
| --- | --- | --- |
| F Creator navigation | RESOLVED_FOR_U2 | Creator reference navigation is implemented per `NAVIGATION-MAP.md`. Reference-only surfaces must remain honest zero states until backed by real sources. Relatórios remains `PRODUCT_DECISION_REQUIRED` and is not exposed. |
| G Workspace navigation | RESOLVED_FOR_U2 | Capability-gated implemented set; unimplemented reference items (Chat, Ajuda, Integrações, Pacotes, Smart Link, Pré-save) are not exposed. Analytics vs Relatórios naming remains `PRODUCT_DECISION_REQUIRED`. |
| H Screens without reference | RESOLVED | Preserved, grouped under Operação/Recursos/Organização. |
| I Final tokens | RESOLVED | U1 `DESIGN-SYSTEM.md` values are canonical (288/64/32/40). Reference px ratio (51 vs 38 title, 283 vs 290 sidebar) still unconfirmed by the owner. |
| J Assets | BLOCKED | `BLOCKED_ASSET_LOGO`, `BLOCKED_ASSET_FONT` in force; no logo/font added. |
| K Status-derived rules | NOT_APPLICABLE_TO_U2 | Open for the Campaigns unit. |
| L Contract-type taxonomy | NOT_APPLICABLE_TO_U2 | Open. |
| M Workspace types | NOT_APPLICABLE_TO_U2 | Needs a migration; open. |
| N Packages / platform fee | NOT_APPLICABLE_TO_U2 | Commercial; `BLOCKED_EXTERNAL`. |
| O Creator reports | NOT_APPLICABLE_TO_U2 | `PRODUCT_DECISION_REQUIRED`. |

### Reference vs implementation (shell)

| Item | Reference (ref px, sampled ±2) | Implementation | Status |
| --- | --- | --- | --- |
| Sidebar width | ≈283 Creator / ≈290 Workspace | 288px token | RESOLVED_BY_TOKEN, pixel check pending |
| Topbar height | ≈67–70 | 64px token | RESOLVED_BY_TOKEN, pixel check pending |
| Active item | bg `#FEF2F3`, red text/icon | `--lc-*` tokens | implemented, pixel check pending |
| Search / bell / user menu | present | present (no counter, no backend) | implemented |
| Promo card (Workspace) | present | slot only | blocked on copy |
| Logo / font | wordmark, unknown font | text mark / system stack | BLOCKED_ASSET_* |
| Pixel-level comparison against the 27 reference images | — | not performed locally; runs in the CI visual gate | OPEN |
