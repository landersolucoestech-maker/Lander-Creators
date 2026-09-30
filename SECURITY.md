# Security Foundation

## Implemented
- Better Auth email/password authentication with required email verification.
- Server-authoritative session resolution.
- Password reset with expiring Better Auth verification tokens and session revocation on reset.
- Application identity states: PENDING_VERIFICATION, ACTIVE, SUSPENDED, DISABLED, DELETED.
- Workspace tenant isolation enforced in server application services.
- Active Membership required for Workspace authorization.
- No `is_admin` authorization bypass.
- Owner-only nondelegable authority enforced for assigning OWNER.
- Final active Owner cannot be removed, suspended or demoted.
- Invitation secrets are generated cryptographically, stored only as SHA-256 hashes in Workspace invitation persistence, expire and are single-use.
- Active Workspace preferences are revalidated against current authorization and cleared on Membership suspension/removal.
- Security-sensitive Workspace/Membership actions write safe audit events.
- Raw provider/database exceptions are mapped before user-facing responses.

## Deferred
- MFA user experience.
- Step-up authentication enforcement for future sensitive operations.
- Production email provider.
- PostgreSQL RLS; current isolation is application-enforced and integration-tested.
- Future domain separation-of-duties policies.

Never log passwords, session tokens, verification tokens, invitation secrets or auth secrets.


## Etapa 4
- Media upload validates content signature, declared MIME, extension and size.
- SVG and archives are rejected by the foundation.
- Private media content is served through authenticated Workspace-authorized routes only.
- Storage keys and filesystem paths are not returned to clients.
- Cross-tenant media access is integration-tested.
- External malware scanning is not implemented.
