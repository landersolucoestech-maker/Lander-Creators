# Product decisions pending (PRODUCT_DECISION_REQUIRED)

These behaviors are intentionally **not** implemented or changed by engineering. The current behavior is stated so the owner can decide; screens show these rules openly where they apply.

| ID | Topic | Current behavior | Decision needed |
| --- | --- | --- | --- |
| A | Dispute × payment | An OPEN/UNDER_REVIEW dispute does **not** block releasing or paying a payable. The Finance screen shows a "Disputa" column and a notice. | Should an active dispute block release/payment (and which statuses)? |
| B | Matching history | Each recalculation replaces the campaign's current scores; no history is kept. The Matching screen says so. | Keep a score history (append-only snapshots) or keep replace semantics? |
| C | Four-eyes on finance | The same user may release and register a payment. | Require a different user for release vs. payment? |
| D | Remote branch `claude/fervent-maxwell-oweb9l` | Left intact. `main` is the only working branch. | Explicit authorization to delete it. |
| E | Mandatory negotiation | A participation can only be ACCEPTED if it has an ACCEPTED proposal (`PARTICIPATION_ACCEPTANCE_REQUIRES_PROPOSAL`) and REJECTED closes open proposals; this removes the technical dead end. Whether an engagement may be created without any negotiation round is a product rule that is not changed here. | Is negotiation mandatory before an engagement? |

## Technical (non-product) protections already in place
- One active dispute per engagement, one ACCEPTED proposal per participation, unique payment reference per workspace (migrations 0018–0020; skipped when legacy data conflicts, visible through `npm run db:guarantees` / `schema_guarantees` — never auto-deduplicated).
- Audit rows are written in the same transaction as the change.

## Out of scope
AI Runtime, provider-backed integrations, Distribution, real payment/signature/storage providers.
