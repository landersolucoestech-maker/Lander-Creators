# Security Foundation

## Implemented
- Better Auth email/password authentication with required email verification.
- Server-authoritative session resolution.
- Password reset with expiring Better Auth verification tokens and session revocation on reset.
- Application identity states: PENDING_VERIFICATION, ACTIVE, SUSPENDED, DISABLED, DELETED.
- Workspace tenant isolation enforced in server application services.
- Active Membership required for Workspace authorization.
- No `is_admin` authorization bypass.
- Owner-only nondelegable authority enforced for assigning or mutating OWNER.
- Final active Owner cannot be removed, suspended or demoted.
- Invitation secrets are cryptographically generated, stored only as hashes, expire and are single-use.
- Active Workspace preferences are revalidated and cleared on Membership suspension/removal.
- Security-sensitive Workspace/Membership and Shared Media mutations write safe audit events.
- Raw provider/database exceptions are mapped before user-facing responses.

## Etapa 4 Shared Media
- Upload validates detected content signature, declared MIME, extension and size.
- Original filenames are sanitized and are never used as filesystem paths.
- Storage keys are opaque UUIDs and are never exposed by public media representations.
- SVG and archives are rejected by the current foundation.
- Private content requires authentication, current Workspace `media.view` authorization and a short-lived HMAC access token bound to user, Workspace, MediaAsset and expiration.
- Token verification rejects tampering, expiry and context mismatch.
- The local filesystem adapter is disabled by default and is available only when `MEDIA_STORAGE_MODE=ephemeral` is explicitly configured for CI/test visual execution.
- Cross-tenant access, guessed MediaAsset IDs, suspended Membership access and local storage isolation are integration-tested.
- Responses use `X-Content-Type-Options: nosniff` and private/no-store caching for media bytes.

## Deferred
- MFA user experience.
- Step-up authentication enforcement for future sensitive operations.
- Production email provider.
- PostgreSQL RLS; current isolation is application-enforced and integration-tested.
- Future domain separation-of-duties policies.
- Malware scanning. No repository-local scanner exists and no external scanning service is authorized.
- Persistent production media storage. No external storage provider is authorized.

Never log passwords, session tokens, verification tokens, invitation secrets, media access tokens or auth secrets.

## Etapa 5A Creator
- Creator self-service requires CreatorProfile ownership and does not inherit Workspace ADMIN authority.
- Social links require HTTPS and supported platform hosts; javascript and malformed URLs are rejected.
- Public self-service SocialProfiles are DECLARED and NOT_CONNECTED; no provider verification is faked.
- Creator taxonomy relations validate taxonomy family and reject deprecated values for new associations.
- Creator avatar attachment reuses Shared Media authorization, rejects foreign assets and revalidates current User/Workspace/Membership/permission state before attachment.
- User-provided bio is stored as text and rendered through React escaping; arbitrary HTML is not accepted.
- Creator marketplace visibility is enforced server-side and cannot become VISIBLE before ACTIVE status.


## Etapa 5B Artist + Music Catalog
- Catalog access requires both current Workspace permission and WorkspaceArtistAccess.
- Guessed Artist/Release/Track IDs cannot bypass the Artist access edge.
- Revoking WorkspaceArtistAccess takes effect on subsequent authorization checks.
- Track audio remains PRIVATE and generic Shared Media reads add catalog authorization for Track-bound audio.
- Artist artwork/audio attachment requires Shared Media permission, same-Workspace MediaAsset, READY status and expected media kind.
- Catalog URLs require HTTPS; raw parser/database errors remain behind stable PT-BR public errors.
- XLSX parsing is local: no formula execution, external links, extra/hidden sheets, malformed archives, unbounded rows or unbounded entry expansion.
- Possible Artist duplicates are never auto-merged.

## Etapa 5C security
Commercial links are HTTPS-only and are never fetched server-side during creation. Descriptions are untrusted plain text. Foreign MediaAsset attachment is rejected. Entity access status and expiry fail closed. Duplicate candidates never auto-merge. Typed registry validation prevents arbitrary promoted-object type injection.


## Etapa 6 — Campaign Core
Campaign security gate covers cross-Workspace IDOR, promoted-object access, foreign Shared Media, direct lifecycle escalation, activation bypass, unsafe URLs, stale writes and active material edits. Authorization remains permission-based.

## Post-campaign lifecycle
- Content and publication-proof URLs must be absolute `https` (`src/server/shared/https-url.ts`), enforced in the Deliverable and Publication services.
- Every transition writes `audit_logs` through `writeAudit` in the same transaction as the state change.
- A payment reference is required to mark a payable paid and is unique per workspace; releasing a payable re-proves that every non-cancelled deliverable has a verified publication.
- Music import never exposes or claims another workspace's Artist, and never creates or upgrades Artist access.
- A promoted-entity access grant cannot downgrade an OWNER access row.
- Creators never see contract drafts that were not sent to them.

## Workspace read layer
List routes authorize Membership + capability permission server-side, scope every query by `workspace_id`, accept only whitelisted sort/filter keys, cap page size and return DTOs without storage keys or foreign-tenant data. Unknown, foreign and inaccessible ids produce the same not-found response (no 404×409 enumeration) in proposal, participation and neighbor flows. Media attached to content versions must be owned by the submitting Creator (`created_by_user_id`).
