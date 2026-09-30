# LANDER CREATORS Application Shell

## Purpose

Etapa 5D consolidates the already implemented product foundations into one authenticated application experience. It does not introduce a new business domain.

## Authenticated shell

The authenticated application uses one reusable shell with:

- desktop sidebar;
- responsive mobile navigation;
- sticky header;
- explicit Workspace / Creator context controls;
- account and sign-out controls;
- a single main content landmark;
- a skip link;
- permission-aware navigation.

Unauthenticated authentication, password reset and invitation routes remain outside the authenticated shell where appropriate.

## Contexts

### Workspace

Workspace context uses the existing active Workspace persisted in `user_context_preferences.active_workspace_id`. Switching Workspaces continues through the existing active-Workspace API and authorization service.

### Creator

Creator context is route-explicit through `/creator`. It intentionally uses a smaller navigation surface so Creator self-service does not inherit Workspace administration navigation.

No duplicate context-persistence model is introduced.

## Navigation authorization

Navigation visibility is derived from current permission checks through the existing authorization service. It does not use role-name checks.

Direct server routes remain authoritative. A hidden item does not grant or revoke access; protected module routes independently evaluate current capabilities before loading their data.

Artist and promoted-entity lists continue to apply their existing explicit entity-access rules after Workspace permission checks.

## Dashboard

The Dashboard is the authenticated `/` experience whenever an active Workspace exists.

It reads real data only:

- personal CreatorProfile state;
- Workspace-accessible Artist count;
- accessible Release and Track counts through Artist access;
- active, unexpired promoted-entity access counts;
- Workspace media count;
- Workspace membership count;
- a small safe projection of known audit actions.

No Campaign, Finance, ROI, revenue, follower-growth or synthetic analytics are shown.

## Mobile behavior

At narrow viewports the sidebar becomes an accessible drawer with:

- explicit open and close controls;
- Escape-key close behavior;
- focus transfer to the close control;
- focus return to the menu trigger;
- route selection close behavior;
- no page-level horizontal overflow.

## Product modules

The shell exposes only implemented areas:

- Dashboard;
- Creator;
- Artists / Music Catalog;
- Commercial Promoted Entities;
- Shared Media;
- Team;
- Workspace;
- Settings.

Campaign and later domains remain absent.


## Etapa 6 — Campaign Core
Etapa 6 adds `Campanhas` to Workspace navigation only when `campaign.view` is effective. Creator self-service navigation remains isolated.
