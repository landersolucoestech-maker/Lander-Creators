# LANDER CREATORS — Agent Map

`lander-creators-orchestrator` is the single principal orchestrator.

Repository specialists are grouped by responsibility rather than competing orchestration: repository/architecture/change safety; identity/workspace/authorization/security; database/API/data/integrations; frontend/UI/UX/design system/responsive/accessibility/visual regression; domain specialists for implemented business owners; QA/test/E2E/visual QA/release/runtime validation; and investigators for codebase, dependency, data flow, schema, duplication, dead code and technical debt.

Use the narrowest applicable specialist. Cross-domain changes remain coordinated by the principal orchestrator and preserve one persistence owner per business concept. Specialist files under `.claude/agents/` are the executable repository-local capability definitions and are authoritative over external packs.
