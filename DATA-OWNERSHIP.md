# LANDER CREATORS — Data Ownership

This document is the canonical current-state ownership map. A responsibility has one authoritative owner; cross-domain references do not transfer ownership.

| Responsibility | Source of truth |
|---|---|
| Authenticated human identity | Better Auth core User + Identity `identity_profiles` |
| Authentication credentials/session/verification | Better Auth |
| Operational tenant | Workspace `workspaces` |
| User ↔ Workspace relationship | Membership `memberships` |
| Active Workspace preference | `user_context_preferences`, server-revalidated against Membership |
| Role/permission definitions and grants | Authorization |
| Team invitations | Workspace/Authorization `workspace_invitations` |
| Security action history | Audit `audit_logs` |
| Taxonomy definitions/values/aliases | Taxonomy |
| Countries/languages/currencies/timezones | Reference Data |
| Media metadata and storage seam | Shared Media |
| Tenant media authorization | Authorization + Shared Media |
| Creator professional profile and social profile | Creator |
| Creator niche/style/music preferences | Creator + Taxonomy references |
| Creator social metrics snapshots | Creator |
| Artist / Release / Track / credits / TrackSegment | Music Catalog |
| Workspace catalog access | Authorization + `WorkspaceArtistAccess` |
| XLSX import decisions/provenance | Music Catalog Import |
| Company / Brand / Product / Service | Commercial Promoted Entities |
| Platform / Event / Project / Institutional Initiative | Commercial Promoted Entities |
| Workspace commercial entity access | Promoted Entity Access + Authorization |
| Promoted-object type resolution | Promoted Object Registry |
| Campaign lifecycle and configuration | Campaign Core |
| Campaign promoted-object reference/snapshot | Campaign Core + Promoted Object Registry |
| Campaign targeting/content requirements/brief/schedule | Campaign Core |
| Campaign planning budget/capacity | Campaign Core |
| Campaign rights requirements | Campaign Core |
| Campaign tracking configuration | Campaign Core |
| Participation/application/invitation | Participation domain |
| Proposal/counterproposal/acceptance (immutable rounds) | Proposal/Negotiation domain |
| Engagement, versioned contract and signatures | Engagement/Contracts domain |
| Delivered content and revisions | Deliverables/Content domain |
| Publication/proof URL | Publication domain |
| Payables, releases and paid recording | Finance/Payments domain |
| Publication metric snapshots and campaign aggregation | Analytics/Reporting domain |
| Campaign-to-creator match snapshots | Matching domain |
| Engagement disputes | Disputes domain |

## Non-negotiable ownership separations

- Better Auth remains authentication authority; application tables must not duplicate credentials or sessions.
- Workspace is not a commercial promoted entity.
- User, Creator and Artist remain distinct.
- Campaign planning budget never becomes the payment ledger.
- Campaign content requirements never become delivered content records.
- Campaign rights requirements never become the executed contract.
- Provider integrations remain adapters at boundaries; provider payloads must not become canonical domain models.

## Read models
Workspace list read models join tables owned by Participation/Proposal, Engagement, Deliverable, Publication, Finance, Analytics, Matching and Dispute for display only; they never write and never become an owner. `audit_logs` is written exclusively through `src/server/shared/audit.ts`.
