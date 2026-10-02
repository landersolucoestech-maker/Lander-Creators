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
