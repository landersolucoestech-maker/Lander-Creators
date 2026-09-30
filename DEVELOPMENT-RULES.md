# Development Rules

- Technical and engineering surfaces are English.
- End-user UX copy is PT-BR.
- Preserve domain ownership and avoid cross-domain persistence writes.
- Server-side authorization is authoritative.
- No `is_admin` authorization bypass.
- Tenant scope is explicit at service and repository boundaries.
- Changes are minimal, reviewed and validated.
- Do not expose raw technical errors to users.
- Never commit credentials or production secrets.

- User-visible stages require deployment of the exact CI-green `main` commit to an accessible non-Vercel visual environment.
- Vercel is prohibited.
- Deployment must never create, use or depend on another Git branch.
- Visual completion requires route smoke tests, desktop/mobile inspection and an accessible URL.


## Application shell rules
- Authenticated product routes must use the shared application shell unless there is a documented reason not to.
- Navigation visibility must be capability-based; do not authorize by role name.
- Hidden navigation never replaces direct server authorization.
- Dashboard metrics must be real, access-filtered and read-only.
- Future modules must not be exposed as implemented navigation.
- Mobile navigation must preserve keyboard access, focus return and no horizontal overflow.
