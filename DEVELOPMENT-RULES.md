# Development Rules

- `main` is the only permitted branch.
- Technical and engineering surfaces are English.
- End-user UX copy is PT-BR.
- Preserve single domain ownership and avoid cross-domain persistence writes.
- Server-side authorization is authoritative; hidden UI is never authorization.
- No `is_admin` bypass.
- Tenant and ownership scope are explicit at service boundaries.
- Do not expose raw technical errors, secrets, storage keys or filesystem paths.
- Never commit credentials or production secrets.
- Applied migrations are immutable.
- External providers are never introduced implicitly; Vercel is prohibited.
- Refactors require dependency/blast-radius review and behavior-preserving validation.
- Do not compact/minify repository source code for delivery; maintainable source is required.

## Application shell

Authenticated product routes use the shared application shell unless a documented boundary requires otherwise. Navigation visibility is capability-based. Dashboard data is real, access-filtered and read-only. Unimplemented modules are not exposed as implemented navigation. Mobile navigation preserves keyboard operation, focus return and no page-level horizontal overflow.

## User-visible changes

The exact final `main` SHA must pass CI plus applicable visual inspection. Desktop/mobile screenshots and accessibility evidence are required. The existing temporary Live Preview may be used for exact-SHA external acceptance; its post-acceptance keepalive is not a completion blocker.

## Campaign boundary

Campaign owns planning configuration and lifecycle only. It must not absorb Participation, Proposal/Engagement, executed Terms, delivered Content, Publication, Finance/Payments, Analytics metrics, Matching or AI Runtime.

## Authentication in local/development (owner decision)

**AUTHENTICATION IS INTENTIONALLY DISABLED IN LOCAL/DEVELOPMENT UNTIL THE PRODUCT OWNER EXPLICITLY REQUESTS RE-ENABLEMENT.**
(Decisão do proprietário do produto: autenticação desabilitada em development; não reativar sem ordem explícita.)

Future audits, security reviews and agents must NOT "fix", remove or re-enable this behavior on their own.

- Mechanism: DEV AUTH BYPASS in `src/server/auth/dev-auth-bypass.ts`, wired only through `resolveApplicationActor`.
- Enabled only when `NODE_ENV=development` and `LANDER_DEV_AUTH_BYPASS=true` (set in the untracked `.env.local`; run `npm run dev`).
  `next start`/production, `test` and CI ignore it; `parseEnv` rejects `LANDER_DEV_AUTH_BYPASS=true` with `NODE_ENV=production`;
  `tests/dev-auth-bypass.test.ts` fails if any workflow/Dockerfile/`.env.example` enables it.
- Authentication is bypassed; **authorization is not**. Personas are real seeded users with real memberships and roles, so
  capabilities and tenant isolation are enforced exactly as in production. A persona is never allow-all.
- Seed personas with `npm run dev:personas` (idempotent). Switch with `GET /api/dev/persona?persona=<key>[&redirect=/path]`
  (cookie `lander_dev_persona`; 404 unless the bypass is enabled). Keys: `workspace_owner` (default), `workspace_marketing`,
  `workspace_campaign_manager`, `workspace_social_media`, `workspace_finance`, `workspace_viewer`, `creator`, `platform_admin`,
  `isolated_owner` (owner of a second workspace, for isolation checks).
- The auth architecture (Better Auth, sessions, RBAC, capabilities) is untouched and remains the production path.
- `platform_admin` is an identity with no workspace authority: the Platform Admin authorization model does not exist yet.

Local production builds (`next build`) must override the flag, because `.env.local` enables it and production rejects it: `LANDER_DEV_AUTH_BYPASS=false npm run build`.
