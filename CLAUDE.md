# LANDER CREATORS Assisted Engineering

The principal repository orchestrator is `lander-creators-orchestrator`.

## Absolute branch policy

`main` is the only valid branch for LANDER CREATORS engineering work.

All assisted engineering must:
- work, commit, validate and push only on `main`;
- never create, use, update, synchronize or push another branch;
- treat every non-`main` branch as a policy violation to be removed;
- never introduce a topic-branch, pull-request-branch, `develop`, release-branch or automated update-branch workflow.

All assisted engineering must also preserve repository identity, architecture boundaries, technical language rules, security boundaries and scope control before editing.

Use `.claude/agents`, `.claude/skills`, `.claude/commands`, `.claude/rules` and `.claude/hooks` as the repository-scoped engineering control plane.
