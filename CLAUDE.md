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


## Etapa 3 specialists

Current security-root specialists:
- `identity-engineer`
- `workspace-engineer`
- `authorization-engineer`

Use authorization/tenant/database analysis skills for changes that touch Identity, Workspace, Membership, permissions, invitations, migrations or tenant isolation. No downstream-domain specialist is installed by Etapa 3.


## Permanent visual development rule

For any stage that changes user-visible application behavior, read and enforce `VISUAL-DEVELOPMENT-POLICY.md`.

A user-visible stage is not complete until the exact CI-green `main` commit is deployed to the configured non-Vercel visual environment, smoke-tested, visually inspected and returned with an accessible URL.

**Vercel is prohibited for this project.**
