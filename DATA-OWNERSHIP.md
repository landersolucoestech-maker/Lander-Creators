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

| Taxonomy definitions/values/aliases | Taxonomy module |
| Countries/languages/currencies/timezones | Reference Data module |
| Media metadata | Shared Media module |
| Media bytes | MediaStorageAdapter implementation; local/ephemeral only in Etapa 4 |
| Tenant media authorization | Authorization + Shared Media modules |

| Creator professional profile | Creator module |
| Creator niche/style/music preferences | Creator module + Taxonomy references |
| Social account metadata | Creator SocialProfile |
| Social metrics snapshots | Creator social metrics persistence |
| Creator avatar bytes | Shared Media |
| Creator self-service authorization | CreatorProfile ownership |


| Artist identity/catalog profile | Music Catalog |
| Release | Music Catalog |
| Track | Music Catalog |
| Track Artist Credits | Music Catalog |
| TrackSegment | Music Catalog |
| Audio/artwork bytes | Shared Media |
| Genre hierarchy | Taxonomy |
| Language/country | Reference Data |
| Workspace catalog access | Authorization + WorkspaceArtistAccess |
| XLSX import decisions/provenance | Catalog Import |
