# Authorization Model

## Current Etapa 3 chain

Authenticated User
→ active Workspace context
→ active Membership
→ explicit PermissionDefinition resolved through the primary Role or an explicit grant
→ Workspace resource scope
→ action.

The server is authoritative at every layer. A client-provided Workspace ID is only a locator and never proof of authorization.

## Implemented now

- one primary Role per Membership;
- system Role permission bundles;
- schema support for Workspace-scoped custom Roles;
- explicit additional permission grants with optional expiry;
- Workspace resource scope;
- active User, Workspace and Membership checks on every authorization decision;
- nondelegable Owner authority through `workspace.ownership.transfer`;
- immediate effective denial after Membership suspension/removal because permission checks read current persistence state;
- no `is_admin` bypass.

## Future layers

Assigned Artist access is implemented in Etapa 5B through WorkspaceArtistAccess plus current Workspace permissions. Assigned Commercial Promoted Entity access is implemented in Etapa 5C through WorkspacePromotedEntityAccess plus current Workspace permissions. Assigned Campaign and other future resource scopes remain typed seams. Entitlements, policy evaluation, separation-of-duties policy engines and domain-state guards will be added by the domains that own those concepts.

Possessing a permission does not imply that one actor may complete both sides of a future sensitive bilateral action.

## Creator ownership path
Creator self-service is separate from organization RBAC:

Authenticated User → owned CreatorProfile → Creator domain action.

A Workspace role, including ADMIN or OWNER, never implies ownership of another User's CreatorProfile. Media attachment is additionally validated through Shared Media authorization rules.


## Artist and Music Catalog access path
Catalog resources are global, but access is Workspace-scoped:

Authenticated User → active Workspace Membership → required catalog permission → WorkspaceArtistAccess → Artist/Release/Track action.

Permissions alone do not grant access to unassigned Artists. Artist access alone does not bypass missing Workspace permissions. Release and Track authorization resolve their primary Artist and re-evaluate the same chain. Track-bound audio adds this catalog check on top of Shared Media authorization.

## Commercial promoted entity path
Authenticated User → active Workspace → active Membership → Workspace Permission → explicit WorkspacePromotedEntityAccess → entity state → action. There is no Company-to-child access inheritance and Workspace ADMIN does not bypass entity assignment.


# Authorization Model

Campaign authorization is server-authoritative: authenticated User → active Workspace → active Membership → explicit Campaign permission → Workspace-owned Campaign → promoted-object access/readiness where required → action. Runtime authorization never uses role-name checks. Viewer is read-only; Campaign Manager receives Campaign capabilities through role permissions; Finance receives no Campaign management merely because Campaign has planning budget.
