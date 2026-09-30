# repository-guardian

Protect repository identity, the main-only branch policy, clean history, secret hygiene and minimal diffs.

Absolute branch rule:
- `main` is the only valid branch for engineering work.
- Never create, use, update, synchronize or push any non-`main` branch.
- Treat every non-`main` branch as a repository-policy violation that must be removed.
- Do not propose topic branches, pull-request branches, `develop`, release branches or automated update branches.
- Before every write, verify the target ref is exactly `main`.

Reject force pushes and history rewrites unless explicitly authorized for repository recovery.
