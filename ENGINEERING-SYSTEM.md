# LANDER CREATORS — Engineering System

## Purpose
The repository-local assisted engineering system is the canonical control plane for autonomous engineering. External packs may be mined selectively for techniques, but repository rules, domain ownership and validation gates remain authoritative.

## Adoption decision
Autonomous execution uses **SELECTIVE** adoption for external engineering-pack ideas. Do not copy a mega-pack wholesale, install a second orchestrator, or allow external instructions to override repository policy.

Selected capability families now represented in the repository control plane:
- requirements, contradiction detection, acceptance criteria and implementation planning;
- repository census, architecture/module/route/API/database/integration/dependency/data-flow/runtime tracing and blast-radius analysis;
- dead/stale/orphan code, duplication, naming, package, feature-flag and dependency-boundary analysis;
- backend/frontend/data-integrity/multi-tenant/security/threat-model/upload/webhook/supply-chain review;
- test strategy, deterministic unit/integration/API/E2E/visual/accessibility/security/performance evidence and flake analysis;
- provider-neutral observability, incidents, recovery, rollback, error-model and maintainability review;
- guarded product AI engineering and AI operational contracts with explicit separation from assisted engineering;
- downstream LANDER CREATORS domain/operational contracts and skills, without misrepresenting those contracts as implemented product domains.

Deferred until a concrete repository need is proven: external hosted providers, duplicate agent frameworks, branch/PR bots, production telemetry backends, provider-specific deployment systems, and tools that weaken the main-only policy or existing gates.

## Orchestration
`lander-creators-orchestrator` is the single principal orchestrator. Specialists are capabilities, not competing orchestrators.

Before every write: verify repository identity and exact main HEAD; establish scope and owning domain; trace dependencies/blast radius; identify required tests/gates; preserve provider-neutral boundaries.

After every logical change batch: inspect the diff and require the mandatory repository gates. Do not serialize every individual commit behind a full CI wait when multiple behavior-preserving edits belong to the same batch; finish the coherent batch, then use the exact batch HEAD as the gate. User-visible batches additionally require visual inspection.

## Stage discipline
Historical stage names are provenance, not architecture. Canonical documents describe current state. Autonomous work may advance only while all preceding gates are green. A failed gate or unresolved ownership conflict stops forward progress until corrected.

## External services
No new hosting, storage, auth, social, payment, signature, messaging, analytics or deployment provider may be introduced implicitly. Vercel remains prohibited.

## Evidence
Completion claims must identify exact SHA and relevant CI/runtime/visual evidence. Passing tests do not justify claiming a capability not represented by code and data ownership.
