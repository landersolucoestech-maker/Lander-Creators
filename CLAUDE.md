# LANDER CREATORS Assisted Engineering

The principal repository orchestrator is `lander-creators-orchestrator`. Read `ENGINEERING-SYSTEM.md`, `DOMAIN-MAP.md`, `DATA-OWNERSHIP.md`, `ARCHITECTURE.md`, `DEFINITION-OF-DONE.md` and applicable `.claude/rules/*` before material changes.

## Absolute branch policy

`main` is the only valid branch. Work, commit, validate and push only on `main`. Never create or use topic, PR, develop, release or automated update branches. Never force-push or rewrite history except explicit repository recovery.

## Autonomous execution

Autonomous execution is the default (`AUTONOMOUS-EXECUTION.md`, `.claude/rules/autonomous-execution.md`). Implement, validate, commit, push to `main`, follow CI, fix and continue to the next unit without re-asking authorization already granted by the owner. Hard limits stay in force: no force-push/history rewrite/destructive operations, no secrets, no new providers, no Vercel, no change to the DEV AUTH BYPASS without an explicit owner order. Record Engineering Pack usage truthfully in `ORCHESTRATION-LEDGER.md`.

## Canonical control plane

Use `.claude/agents`, `.claude/skills`, `.claude/commands`, `.claude/rules` and `.claude/hooks` as the repository-scoped engineering control plane. External engineering packs are selective capability sources only; they do not replace this control plane.

## Current implemented ownership

Current canonical domain state is defined by `DOMAIN-MAP.md`; data authority is defined by `DATA-OWNERSHIP.md`. Historical Etapa boundaries are provenance, not permission to contradict current repository state.

Implemented owners include Identity, Workspace/Membership, Authorization, Taxonomy, Reference Data, Shared Media, Creator, Music Catalog, Commercial Promoted Entities, Promoted Object Registry and Campaign Core. The application shell/Dashboard composes those owners without taking their persistence.

Downstream Participation, Proposal/Engagement, Engagement Terms, Deliverables/Content, Publication, Finance/Payments, Analytics/Reporting, Matching, Disputes, provider-backed Integrations, Music Intelligence, AI Runtime and Distribution remain separate until explicitly implemented.

## Domain specialists

Use the narrowest matching specialist. Security-root changes use identity/workspace/authorization specialists; media/taxonomy/catalog/creator/commercial/campaign changes use their repository specialists. Cross-domain work remains coordinated by `lander-creators-orchestrator` and must preserve single ownership.

Campaign work must not collapse Participation, Engagement, Finance, delivered Content, Publication, Analytics, Matching or AI into Campaign Core.

## Permanent visual development rule

For user-visible changes, read and enforce `VISUAL-DEVELOPMENT-POLICY.md`. Completion requires the exact CI-green `main` SHA to pass repository visual inspection. A generated visual report is evidence, not a substitute for owner-approved visual references.

**Vercel is prohibited for this project.**

## Provider rule

Do not introduce hosting, storage, auth, social, payment, signature, messaging, analytics or deployment providers implicitly. Keep integration seams provider-neutral until the applicable provider is explicitly authorized.

## Completion rule

Before claiming completion, satisfy `DEFINITION-OF-DONE.md`, identify the exact SHA, and verify the required CI/runtime/visual gates. If a gate fails, return to the failure before advancing.

## Authentication in local/development

Authentication is intentionally disabled in local/development by product-owner decision (DEV AUTH BYPASS, `DEVELOPMENT-RULES.md`). Do not re-enable, remove or "fix" it without an explicit owner order. Authorization and tenant isolation stay enforced; production stays fail-closed.
