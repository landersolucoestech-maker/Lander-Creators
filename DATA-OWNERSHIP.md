# Data Ownership

| Responsibility | Source of truth |
|---|---|
| Authenticated human identity | Better Auth core User plus LANDER CREATORS `identity_profiles` application status/preferences |
| Authentication credentials/session | Better Auth-owned `account`, `session`, `verification` |
| Operational tenant | `workspaces` |
| User ↔ Workspace relationship | `memberships` |
| Active Workspace preference | `user_context_preferences`, revalidated against current Membership on the server |
| Role definitions | Authorization `roles` |
| Permission definitions | Authorization `permission_definitions` |
| Role permission bundles | `role_permissions` |
| Additional grants/scopes | `membership_grants` |
| Team invitations | `workspace_invitations` |
| Security action history | `audit_logs` |

Better Auth owns passwords, credential accounts, sessions and verification tokens. LANDER CREATORS does not duplicate those values in application identity tables.
