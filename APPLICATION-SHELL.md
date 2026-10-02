# LANDER CREATORS — Application Shell

## Purpose

The authenticated application shell composes implemented domains into one experience. It is an application layer, not a business-domain persistence owner.

## Shell contract

The shell provides desktop sidebar, responsive mobile navigation, sticky header, explicit Workspace/Creator context, account/sign-out controls, one main content landmark, skip navigation and capability-aware navigation.

Authentication, password reset and invitation acceptance may remain outside the authenticated shell where appropriate.

## Contexts

Workspace context uses the active Workspace persisted in `user_context_preferences.active_workspace_id` and revalidated server-side against current Membership.

Creator context is explicit through Creator self-service routes and must not inherit Workspace administration authority. No duplicate context-persistence model is introduced.

## Navigation and authorization

Navigation visibility derives from current permission checks, never role-name assumptions. Hidden navigation is not authorization; protected routes independently enforce current server-side capabilities.

## Dashboard

Dashboard reads real, access-filtered data only. It must not fabricate Campaign, Finance, ROI, revenue, follower-growth or other analytics. Campaign summaries may be shown only from implemented Campaign Core data.

## Responsive/accessibility behavior

Mobile navigation must preserve keyboard access, focus transfer/return, Escape close behavior and no page-level horizontal overflow. User-visible changes remain subject to the repository visual and accessibility gates.

## Implemented surfaces

Current surfaces are defined by `NAVIGATION-MAP.md`. Future modules are not exposed merely because their domain is planned.
