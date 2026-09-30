# Branch Policy

- The only valid working branch is `main`.
- All engineering work, commits, validation fixes and pushes must target `main` directly.
- Do not create, use, update, synchronize or push to any other branch.
- Any non-`main` branch is a repository-policy violation and should be deleted.
- Automated tooling must not create persistent or update branches.
- Force pushes and history rewrites remain prohibited unless explicitly authorized for repository recovery.
- CI must validate every push to `main`.
- GitHub protection must be configured, where safely supported, without requiring a pull-request workflow that conflicts with the main-only policy.
