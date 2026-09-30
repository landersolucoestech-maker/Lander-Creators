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
