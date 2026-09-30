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

Resource scopes for assigned Artist, assigned Promoted Entity, assigned Campaign and own resources are typed seams only. Entitlements, policy evaluation, separation-of-duties policy engines and domain-state guards will be added by the domains that own those concepts.

Possessing a permission does not imply that one actor may complete both sides of a future sensitive bilateral action.

## Creator ownership path
Creator self-service is separate from organization RBAC:

Authenticated User → owned CreatorProfile → Creator domain action.

A Workspace role, including ADMIN or OWNER, never implies ownership of another User's CreatorProfile. Media attachment is additionally validated through Shared Media authorization rules.
