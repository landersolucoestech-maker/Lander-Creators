# LANDER CREATORS Architecture

## Style
LANDER CREATORS starts as a TypeScript modular monolith delivered through a Next.js full-stack web application. Domain ownership will be explicit while deployment remains simple until operational evidence justifies extraction.

## Runtime boundaries
- Web: Next.js App Router on Node.js 24 LTS.
- Database: PostgreSQL with Drizzle ORM and explicit transactions.
- Background work: PostgreSQL-backed durable jobs are planned through pg-boss; a dedicated worker process may be introduced without splitting domain ownership.
- Object storage: S3-compatible private object storage behind an application interface; provider deferred.
- Email: provider adapter behind an application interface; provider deferred.
- Authentication: Better Auth, server-authoritative sessions; user flows deferred to Identity.

## Tenant context
Future tenant context must be explicit and immutable per execution boundary. It propagates from request/session resolution to services, repositories, jobs and logs. No repository method may infer tenant scope from untrusted client input alone.

## Error boundary
Technical diagnostics remain English and internal. User-visible messages are PT-BR and mapped from stable public error codes. Raw exceptions never render in the UI.

## Deployment
The application remains deployable as OCI-compatible containers. Specific hosting vendors are deferred until operational, compliance and cost requirements are known.
