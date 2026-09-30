# branch-policy-check

## Purpose
Enforce the LANDER CREATORS main-only repository policy before every edit, commit or push.

Required checks:
1. Verify the repository is `landersolucoestech-maker/Lander-Creators`.
2. Verify the current/target branch is exactly `main`.
3. Reject creation, use, update, synchronization or push of any other branch.
4. Report any non-`main` remote branch as a policy violation to be removed.
5. Reject topic-branch, pull-request-branch, `develop`, release-branch or automated update-branch workflows.

## Evidence
Always reference concrete repository state, Git refs, commands or diffs. Never infer compliance from intent.
