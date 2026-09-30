# Environments

## Local/development
Use `.env.local`, never committed. Developers run PostgreSQL locally or against an isolated development database.

## Test
Tests use isolated deterministic configuration. Database-owning stages must use isolated test databases and never point to production.

## Production
Secrets come from the deployment platform secret store. Configuration is validated before use.

Preview/staging is deferred until a deployment provider and release workflow are selected.
