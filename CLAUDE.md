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

Under the current owner-authorized policy, a user-visible stage is complete only after the exact CI-green `main` SHA passes the GitHub Actions visual-inspection job and its artifact is verified. No external deployment or public URL is implied or authorized.

**Vercel is prohibited for this project.**


## Etapa 4 specialists
Use `taxonomy-engineer` for governed classification/reference boundaries and `shared-media-engineer` for provider-neutral media metadata, validation, tenant access and storage seams. Do not introduce downstream-domain specialists or external infrastructure without owner approval.

## Etapa 5A Creator specialist
Use `creator-engineer` and Creator skills for CreatorProfile, SocialProfile, readiness, ownership security and Creator taxonomy/media relationships. Do not introduce Campaign, Matching, Finance or external social providers.


## Etapa 5B Music Catalog specialists
Use `artist-engineer` for Artist identity/access, `music-catalog-engineer` for Release/Track/credits/TrackSegment and `catalog-import-engineer` for the canonical one-sheet XLSX pipeline. Do not introduce Work, Phonogram, rights, distribution, Campaign, Finance or AI Music Intelligence.
