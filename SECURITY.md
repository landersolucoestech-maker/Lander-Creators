# Security Foundation

- Authentication is server authoritative and based on Better Auth.
- Authorization will be resource-aware, tenant-aware and server-enforced.
- `is_admin` is not an authorization bypass.
- MFA and step-up authentication are planned capabilities.
- Private media must use signed, time-limited access.
- External webhooks require signature verification and idempotency.
- Secrets belong in environment/secret stores and never in Git.
- Raw exceptions and internal diagnostics never render to users.
- Money operations require idempotency, transactional integrity and explicit currency.
