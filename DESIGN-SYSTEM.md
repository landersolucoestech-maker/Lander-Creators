# LANDER CREATORS — Design System

Etapa 02, Unidade U1 (Foundation Visual). Full derivation evidence and
screen-by-screen inventory: `docs/reference-ui/ETAPA-01-AUDITORIA.md`.
Canonical visual references: `docs/reference-ui/portal-creator/`,
`docs/reference-ui/portal-workspace/` (27 images, 1536×1024).

There is **one** Design System for both Portal Creator and Portal Workspace
(`.claude/rules/design-system.md`). It does not fork per portal.

## Status: LEGACY vs FOUNDATION_NEW

U1 does not reconstruct any of the 31 existing pages. To avoid a broken
half-light/half-dark UI mid-migration, the new light-theme tokens are
**namespaced** (`--lc-*`) and additive:

- **LEGACY** — the unprefixed tokens (`--surface-*`, `--text`, `--border`,
  `--radius-*`, `--space-*`) and all page-specific CSS in `src/app/styles.css`
  (`.catalog-*`, `.creator-*`, `.campaign-*`, …). Dark theme. Still powers all
  31 pages today. Untouched in U1.
- **FOUNDATION_NEW** — the `--lc-*` tokens and the `Button`/`Badge`/`Icon`
  primitives in `src/app/ui/`. Light theme, matches the canonical references.
  Consumed today only by the primitives themselves and the isolated preview
  at `/dev/foundation`.
- **MIGRATION_PENDING** — every one of the 31 pages. Each future unit moves
  one page (or page group) from LEGACY to FOUNDATION_NEW tokens; LEGACY
  tokens/selectors are deleted only once no page references them anymore.
  Two parallel *definitive* systems must never coexist past the migration —
  this split is explicitly transitional.

## Color tokens

Semantic names, defined once in `src/app/styles.css` under
`FOUNDATION_NEW`. Derived from cross-reference pixel sampling (Python/Pillow)
across both portals, corroborated against `ETAPA-01-AUDITORIA.md` section 8
(±4 RGB tolerance, generative-mockup antialiasing).

| Token | Value | Source |
| --- | --- | --- |
| `--lc-color-background` / `-surface` | `#FFFFFF` | page/card fill, sampled ~(254,254,255) |
| `--lc-color-surface-subtle` | `#F7F8FB` | topbar fill, sampled (247,248,251) |
| `--lc-color-text-primary` | `#0A0A0A` | page titles |
| `--lc-color-text-secondary` | `#4B5563` | body copy (estimated, AA-safe on white) |
| `--lc-color-text-muted` | `#8A93A3` | captions/helper text (estimated) |
| `--lc-color-border` | `#E7EAF0` | sidebar/topbar divider, sampled (238–240,242–244,244–248) |
| `--lc-color-border-strong` | `#D7DCE4` | estimated, darker variant of border |
| `--lc-color-brand-primary` | `#F8001C` | primary CTA fill, sampled avg ≈(252,2,31); matches audit's ≈`#F8001C` within tolerance |
| `--lc-color-brand-primary-hover` / `-active` | `#D40017` / `#B50013` | derived (darkened brand-primary) |
| `--lc-color-brand-primary-subtle` | `#FFF2F6` | active nav-item background, sampled (255,242,246) |
| `--lc-color-success` / `-subtle` | `#0F9D58` / `#E1F8EC` | "Aberta"/"Ativa" badges |
| `--lc-color-warning` / `-subtle` | `#B45309` / `#FDF3DA` | "Em análise"/"Em negociação" badges, dot sampled (246,151,56) |
| `--lc-color-info` / `-subtle` | `#1D6FD6` / `#E6F1FE` | "Em andamento"/"Em produção" badges, subtle sampled (227,243,254) |
| `--lc-color-danger` / `-subtle` | `#D4000F` / `#FDE8EA` | "Cancelada" badge, brand-adjacent red |
| `--lc-color-neutral` / `-subtle` | `#4B5563` / `#EEF0F3` | "Pausada"/"Concluída" badges |

Badge semantic colors (success/warning/info/neutral) are estimated from
imprecise coordinate sampling on generated mockups and are flagged for
recalibration when `StatusBadge` is actually wired to real status enums in a
later unit — they are directionally correct (hue/family) but not pixel-exact.

## Typography

No confirmed brand font family exists in the repository (see **Font status**
below). The type **scale** (independent of family) is normalized across both
portals — no per-page sizes:

`--lc-font-size-display` 2.75rem · `-page-title` 2.25rem · `-section-title`
1.375rem · `-card-title` 1.0625rem · `-body` 1rem · `-body-small` 0.875rem ·
`-label` 0.8125rem · `-caption` 0.75rem · `-table-header` 0.75rem ·
`-table-cell` 0.875rem · `-button` 0.9375rem · `-badge` 0.75rem.

Weights: regular 400 / medium 600 / bold 800 (extra-bold titles match the
references). `--lc-font-family-base` stays `Inter, ui-sans-serif, system-ui,
-apple-system, "Segoe UI", sans-serif` as a **technical fallback**, unchanged
from the pre-existing declaration — not a confirmed brand choice.

## Spacing / radius / borders / shadows

- Spacing scale: `--lc-space-1..7` = 4 / 8 / 12 / 16 / 24 / 32 / 48px.
- Radius: `--lc-radius-sm` 8px (buttons/inputs) · `-md` 12px (cards) · `-lg`
  16px (panels/modals) · `-pill` 999px (badges/avatars).
- Borders: `--lc-border-default`/`-strong`/`-focus`/`-error`, all built from
  the color tokens above — never a bare hex.
- Shadows: the references are predominantly flat. Only two low-elevation
  shadows exist (`--lc-shadow-sm`, `--lc-shadow-md`); no heavy drop shadows
  were introduced.

## Canonical dimensions

Both portals showed small discrepancies between screens (generative-mockup
variance, not a deliberate per-portal design). One canonical value per
dimension, normalized by predominance / 8px-grid alignment / cross-screen
coherence:

| Dimension | Observed (Creator) | Observed (Workspace) | Canonical | Justification |
| --- | --- | --- | --- | --- |
| Sidebar width | ≈283 ref px | ≈288–290 ref px | **288px** | midpoint rounds to the nearest 8px-grid step; matches the 16-screen Workspace set more closely |
| Topbar height | — | border at y≈67 (both) | **64px** | nearest 8px-grid step below the sampled 67px border |
| Page title size | 38 ref px block | 51 ref px block | **2.25rem (36px)** | Workspace's bolder hierarchy adopted as canonical; Creator titles migrate up when their pages move to FOUNDATION_NEW |
| Card/panel radius | consistent | consistent | **12px / 16px** | sampled rounded corners on stat cards and the detail panel |
| Control height (button/input) | — | primary CTA sampled 39px tall | **40px** | rounds the sampled 39px to an 8px-grid step |
| Badge height | consistent pill | consistent pill | **24px** | visual proportion against 40px controls |
| Table row height | — | — | **56px** | proportion against avatar (32px) + vertical padding seen in list rows |
| Detail/master panel width | — | ≈424 ref px (W02) | **400px** | nearest round value; ref-px→CSS-px ratio is unconfirmed (see note below), so this is provisional |
| Page gutter | consistent | consistent | **32px** | `--lc-space-6`, matches generous whitespace in both portals |

**Open note (carried from the audit, decision I):** the ref-px → CSS-px
relationship for the 1536×1024 canvas was never confirmed by the product
owner. All canonical dimensions above are directionally correct and
internally consistent, but should be re-validated once that ratio (or a real
breakpoint target) is confirmed.

## Icon system

No icon library was installed (none existed; `ETAPA-01-AUDITORIA.md` section
8 confirms 0 SVGs in `src` and no icon dependency in `package.json`). Per the
brief, no new dependency was added. `src/app/ui/icons.tsx` exports a single
typed `Icon` component over an internal `ICON_PATHS` registry (24×24
viewBox, `stroke="currentColor"`, `fill="none"`, 2px stroke).

- `aria-hidden="true"` by default (decorative); pass `label` to render
  `role="img"` + `aria-label` for icons with no adjacent text.
- `size` prop controls both dimensions; no inline SVG duplicated per page.
- Current inventory (17): `chevron-down/right/left`, `close`, `check`,
  `add`, `edit`, `delete`, `download`, `upload`, `external-link`, `search`,
  `filter`, `menu`, `notification`, `warning`, `info`, `success`, `error`.
  Covers every category requested for U1 (navigation, actions, status,
  filters, search). Platform/social marks (Instagram, TikTok, YouTube,
  Spotify, …) are out of scope for U1 and are not implemented.

## Button primitive (`src/app/ui/button.tsx`)

```tsx
<Button variant="primary" size="md" icon="add" loading={false}>Nova Campanha</Button>
```

- `variant`: `primary | secondary | ghost | danger | icon`.
- `size`: `sm | md | lg` (32 / 40 / 48px height, `--lc-control-height-*`).
- States: default, hover, active, `:focus-visible` (2px brand outline),
  `disabled` (0.5 opacity, `cursor:not-allowed`, blocks `onClick`), `loading`
  (spinner, `aria-busy`, disabled, reduced-motion aware).
- Semantic HTML: renders a native `<button>`; `type="button"` by default so
  it never accidentally submits a form.
- Icon-only usage requires `aria-label`; a `console.warn` flags the omission
  in development.

## Badge primitive (`src/app/ui/badge.tsx`)

```tsx
<Badge variant="success">Ativa</Badge>
```

`variant`: `success | warning | danger | info | neutral | brand`. Purely
presentational — it takes no domain props (no `campaignStatus`, no
`participationStatus`). Mapping a domain enum to a `BadgeVariant` is the
consuming page/service's job, introduced when that page migrates.

## Visual foundation validation

No existing story/demo/showcase route was found (`ETAPA-01-AUDITORIA.md`
confirms 0 Storybook, 0 component showcase). Per the brief, no new platform
was introduced. `/dev/foundation` (`src/app/dev/foundation/page.tsx`) is a
minimal, unlinked route rendering every color token, both Button states and
all five variants, all six Badge variants, and the full icon set, for manual
and Playwright inspection. It calls `notFound()` whenever
`NODE_ENV==="production"` (verified in `npm run build`: the route compiles
to a static 404 in a production build), so it never ships as product UI.

The existing CI-only Playwright harness (`visual-tests/current-ui.visual.spec.mjs`,
`playwright.visual.config.mjs`) was reused as-is; it was not extended to crawl
`/dev/foundation` in U1 because that harness authenticates and drives real
product flows, and the dev-only route is 404 in the production build it
exercises. Local manual inspection at `/dev/foundation` (dev server) plus the
new component tests are the inspection path for this unit.

## Asset blockers

- **BLOCKED_ASSET_LOGO** — `public/` contains only `.gitkeep`; no logo asset
  (SVG/PNG/font icon) exists anywhere in the repository. The wordmark visible
  inside the reference screenshots is generative-mockup output, not a source
  asset, and was not redrawn or extracted per the brief. U1 ships without a
  logo in the shell (the shell itself is out of scope for U1 anyway).
- **BLOCKED_ASSET_FONT** — no `next/font` usage, no font files, no package
  dependency, no CSS `@font-face`, no other repository evidence names a
  specific brand typeface. The existing `Inter` fallback stack is kept
  unchanged as a technical placeholder, clearly documented as unconfirmed.
- **Playwright** — confirmed not installed locally (absent from
  `package.json`, `node_modules`, no local config beyond
  `playwright.visual.config.mjs`, which only CI populates via
  `npm install --no-save`). Reused the existing CI-only infrastructure;
  no new dependency was added locally without evidence that local visual
  execution is otherwise impossible — it already is impossible without this
  install, which is CI's documented, intentional choice.

## Reference image governance

27 canonical images (11 Portal Creator + 16 Portal Workspace) are versioned
under `docs/reference-ui/`; no duplicates existed to remove. Each was
losslessly re-encoded (Pillow, `optimize=True`, `compress_level=9` — verified
pixel-identical and dimension-identical before/after): 37.85 MB → 30.34 MB
(19.8% reduction, 7.88 MB saved). No crop, color, or content change.

## Accessibility

- Color pairs checked for AA-level intent: `--lc-color-text-primary` (#0A0A0A)
  on `--lc-color-background` (#FFF) and `--lc-color-brand-primary` (#F8001C)
  text/fill on white both clear AA for normal text by a wide margin.
- `:focus-visible` on `Button` uses a 2px solid outline with offset —
  keyboard-navigable, visible on both filled and transparent variants.
- `Icon` defaults to `aria-hidden`; `Badge`/`Button` never rely on color
  alone (badges carry label text; buttons carry text or a mandatory
  `aria-label`).
- `prefers-reduced-motion` is respected by the Button loading spinner.
