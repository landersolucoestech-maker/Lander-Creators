# Creator Model

## Identity boundary
User is the authenticated human identity. CreatorProfile is the global professional Creator Marketing identity. CreatorProfile is not User, Artist, Workspace, Company, CampaignParticipant, Engagement or a social account.

V1 enforces one CreatorProfile per User.

## Lifecycle
Creator status is independent from discoverability and availability:
- DRAFT
- UNDER_REVIEW
- ACTIVE
- LIMITED
- SUSPENDED
- DISABLED

Marketplace visibility:
- VISIBLE
- HIDDEN

Availability:
- AVAILABLE
- LIMITED_AVAILABILITY
- UNAVAILABLE

UNAVAILABLE does not deactivate a Creator. LIMITED/SUSPENDED/DISABLED cannot be made VISIBLE. User self-service cannot directly activate a Creator.

## Readiness
Technical readiness requires:
- verified User;
- CreatorProfile;
- display name;
- country;
- language;
- at least one CREATOR_NICHE;
- at least one truthful declared SocialProfile.

Readiness returns explicit missing requirement codes.

Legal Creator Terms are not implemented. The canonical current marker is `CREATOR_TERMS_GATE_DEFERRED`. Submission transitions a technically ready DRAFT to UNDER_REVIEW; it does not fake approval or legal onboarding.

## Taxonomy and Reference Data
Creator niches reference CREATOR_NICHE. Content styles reference CONTENT_STYLE. Optional music preferences reference MUSIC_GENRE. Country, language and timezone reference Etapa 4 registries.

## SocialProfile
Supported V1 platform architecture: TikTok, Instagram and YouTube. Public self-service creates DECLARED profiles only, with NOT_CONNECTED connection status. No provider OAuth/API exists and no account is represented as provider-verified.

External account ID, when known, is unique per platform across CreatorProfiles. Handle is normalized for matching but original display input is retained. Social URLs must be HTTPS and use a supported platform host.

## Metrics
SocialMetricsSnapshot preserves captured_at and source. Current self-service source is MANUAL_DECLARED. Unknown metrics are NULL, never zero. No universal Creator score exists.

## Media
Avatar references Shared Media MediaAsset. Attachment requires the authenticated owner to own the CreatorProfile and the media to be a READY asset uploaded by that user in a Workspace where current media.view authorization exists. No parallel storage model is created.

Creator portfolio is deferred until a concrete product need justifies the additional entity.

## Rate Card
Deferred in Etapa 5A. No contractual or financial meaning has been introduced.

## Authorization
Workspace actions: Membership + Role + Permission.
Creator self-service: authenticated User + CreatorProfile ownership.

Workspace ADMIN does not become Creator owner.

## Future boundaries
Discovery, Matching, Campaign recruitment, Engagement, Finance, rankings and social provider integrations are not implemented here.


## Context selection
The same authenticated User may use Workspace and Creator contexts. The UI exposes explicit navigation between the Workspace area and the Creator area. Creator self-service never silently derives authority from the active Workspace.

## Workspace relationships and restrictions
WorkspaceCreatorRelationship, DO_NOT_CONTRACT and Creator-level Workspace blocks are deferred. CreatorProfile remains global and is not duplicated per Workspace.

## Portfolio
Creator portfolio is deferred. Shared Media is already the required future byte source; no parallel storage model exists.

## Rate Card
Rate Card remains deferred. No pricing, wallet, ledger, payable, payout or contractual price model was introduced in Etapa 5A.

## Social provider extension
No OAuth/API provider client exists. A future provider integration must preserve SocialProfile provenance and may only claim PROVIDER/CONNECTED when supported by real provider evidence and explicit owner-authorized infrastructure.
