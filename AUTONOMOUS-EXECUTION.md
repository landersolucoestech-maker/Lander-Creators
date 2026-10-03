# LANDER CREATORS — Autonomous Execution Policy

Authority: standing product-owner order (2026-10-03). This is the canonical policy for how the orchestrator and specialists execute work.

## Default

AUTONOMOUS EXECUTION IS THE DEFAULT FOR THIS PROJECT. Normal, internal, reversible development operations never require human confirmation, and already-granted authorization is never requested again.

Pre-authorized by the owner:
- read/edit/create project files, refactor safely, fix code;
- run lint, typecheck, tests, build, schema guarantees, Engineering OS checks, HTTP checks against localhost;
- start/restart the local development server (localhost:3100), install technically necessary dependencies per project policy, install/configure Playwright locally;
- create tests, run visual and E2E checks, update documentation and the Engineering Pack (agents, skills, rules, hooks, commands, CLAUDE.md, ledger);
- `git add`, `git commit`, `git push origin main`, follow CI and fix CI failures;
- continue to the next executable unit.

## Delivery loop

IMPLEMENT -> VALIDATE -> COMMIT -> PUSH origin/main -> CI -> FIX IF REQUIRED -> UPDATE LEDGER -> NEXT UNIT.

The next unit is derived from the audit, reference-vs-implementation matrix, dependencies, backlog, ledger, Definition of Done, Git state and CI result. "Awaiting direction" is not an outcome while a deterministic next action exists.

## Hard limits (autonomy is not blanket authorization)

Never, without an explicit owner order naming the action:
- force-push, history rewrite, `git reset --hard`, destructive `git clean`, deleting remote branches;
- create or use any branch other than `main`, or open pull requests;
- destructive file/infrastructure/database operations, secret manipulation or committing secrets;
- create, connect or contract external services/providers; use Vercel (prohibited);
- re-enable, remove or "fix" the DEV AUTH BYPASS in local/development;
- alter owner files kept out of Git (`Modelfile-opencode`, `.env.local`);
- weaken authorization, tenant isolation or production fail-closed behavior.

A failed gate is never relabeled as success: return to the failure before advancing.

## Product decisions

Autonomy decides HOW to implement, not WHAT the product does. A genuinely undefined product decision is recorded as `PRODUCT_DECISION_REQUIRED`, its dependency is isolated, and all independent work continues. Work returns to the owner only when no other relevant executable front remains.

## Runtime permission prompts

A permission prompt raised by the Claude Code interface is a runtime restriction, not missing owner authorization. Request only the minimal technical permission, never re-ask the product question, and prefer persistent project-scoped permissions (`.claude/settings.json`) for routine safe command classes.

## Engineering Pack usage (truthful evidence)

The orchestrator is `lander-creators-orchestrator`. For each unit it selects every specialist, skill and hook applicable to the blast radius (and none that are irrelevant). Evidence is recorded with exactly one status per specialist:

- `EXECUTED_AS_SUBAGENT` — actually run through the runtime's subagent mechanism;
- `EXECUTED_BY_ORCHESTRATOR` — performed directly by the orchestrator;
- `EXECUTED_INLINE_FALLBACK` — only when no subagent mechanism exists; the ledger must record `SUBAGENT_RUNTIME_AVAILABLE=false` with concrete evidence;
- `NOT_APPLICABLE`.

Reading a Markdown definition is not execution. Claims of "agents activated" or "Engineering Pack activated" must match the recorded evidence.

## Ledger

`ORCHESTRATION-LEDGER.md` is the persistent record (fields defined there) and is updated at the end of every unit.
