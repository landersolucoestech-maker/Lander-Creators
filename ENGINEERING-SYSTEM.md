# LANDER CREATORS — Engineering System

## Purpose
The repository-local assisted engineering system is the canonical control plane for autonomous engineering. External packs may be mined selectively for techniques, but repository rules, domain ownership and validation gates remain authoritative.

## Adoption decision
Autonomous execution uses **SELECTIVE** adoption for external engineering-pack ideas. Do not copy a mega-pack wholesale, install a second orchestrator, or allow external instructions to override repository policy.

Selected capability families:
- repository census, architecture/dependency tracing and blast-radius analysis;
- dead-code, duplication and dependency-boundary analysis;
- security/static-analysis patterns;
- browser/E2E and accessibility validation patterns;
- API/schema contract validation patterns;
- provider-neutral observability conventions.

Deferred until a concrete repository need is proven: external hosted providers, duplicate agent frameworks, branch/PR bots, production telemetry backends, provider-specific deployment systems, and tools that weaken the main-only policy or existing gates.

## Orchestration
`lander-creators-orchestrator` is the single principal orchestrator. Specialists are capabilities, not competing orchestrators.

Before every write: verify repository identity and exact main HEAD; establish scope and owning domain; trace dependencies/blast radius; identify required tests/gates; preserve provider-neutral boundaries.

After every write: inspect the diff; run relevant tests; run mandatory repository gates; require visual inspection for user-visible changes; advance only when evidence is green.

## Stage discipline
Historical stage names are provenance, not architecture. Canonical documents describe current state. Autonomous work may advance only while all preceding gates are green. A failed gate or unresolved ownership conflict stops forward progress until corrected.

## External services
No new hosting, storage, auth, social, payment, signature, messaging, analytics or deployment provider may be introduced implicitly. Vercel remains prohibited.

## Evidence
Completion claims must identify exact SHA and relevant CI/runtime/visual evidence. Passing tests do not justify claiming a capability not represented by code and data ownership.
