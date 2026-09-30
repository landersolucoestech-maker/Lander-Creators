# Database Conventions

- PostgreSQL identifiers: `snake_case`.
- Primary keys: UUIDv7 or database-supported time-sortable UUID strategy, finalized before first domain migration.
- Timestamps: `timestamptz`, stored in UTC.
- Money: integer minor units or exact decimal according to domain requirement; never floating point; currency is explicit.
- Migrations: timestamp/order-prefixed, immutable after production application.
- Soft delete: not default; only when domain semantics require retention.
- Foreign keys: explicit and enforced unless a documented external-boundary reason exists.
- Indexes: driven by access paths and uniqueness invariants.
- Transactions: application services own transaction boundaries for multi-write invariants.
- External money operations require idempotency.
- The future ledger is immutable/double-entry by design.
