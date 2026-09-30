import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { user } from "@/server/auth/schema";

export const identityStatus = pgEnum("identity_status", [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
  "DELETED"
]);

export const workspaceType = pgEnum("workspace_type", [
  "LABEL",
  "MANAGEMENT",
  "COMPANY",
  "AGENCY",
  "INTERNAL"
]);

export const workspaceStatus = pgEnum("workspace_status", [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED"
]);

export const membershipStatus = pgEnum("membership_status", [
  "ACTIVE",
  "SUSPENDED",
  "REMOVED"
]);

export const roleKind = pgEnum("role_kind", ["SYSTEM", "CUSTOM"]);
export const auditActorType = pgEnum("audit_actor_type", [
  "USER",
  "SYSTEM",
  "PLATFORM_STAFF",
  "AI_AGENT",
  "INTEGRATION"
]);
export const auditOrigin = pgEnum("audit_origin", ["WEB", "API", "SYSTEM", "INTEGRATION"]);
export const scopeKind = pgEnum("authorization_scope_kind", [
  "WORKSPACE",
  "OWN_RESOURCE",
  "ASSIGNED_ARTIST",
  "ASSIGNED_PROMOTED_ENTITY",
  "ASSIGNED_CAMPAIGN"
]);

export const identityProfiles = pgTable("identity_profiles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  phone: text("phone"),
  preferredLanguage: text("preferred_language").notNull().default("pt-BR"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  country: text("country").notNull().default("BR"),
  status: identityStatus("status").notNull().default("PENDING_VERIFICATION"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: workspaceType("type").notNull(),
  status: workspaceStatus("status").notNull().default("ACTIVE"),
  createdByUserId: text("created_by_user_id").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  kind: roleKind("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  codeWorkspaceUnique: uniqueIndex("roles_workspace_code_unique").on(table.workspaceId, table.code)
}));

export const permissionDefinitions = pgTable("permission_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  codeUnique: uniqueIndex("permission_definitions_code_unique").on(table.code)
}));

export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissionDefinitions.id, { onDelete: "cascade" })
}, (table) => ({
  uniqueRolePermission: uniqueIndex("role_permissions_unique").on(table.roleId, table.permissionId)
}));

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  status: membershipStatus("status").notNull().default("ACTIVE"),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  uniqueUserWorkspace: uniqueIndex("memberships_user_workspace_unique").on(table.userId, table.workspaceId),
  workspaceIndex: index("memberships_workspace_idx").on(table.workspaceId)
}));

export const userContextPreferences = pgTable("user_context_preferences", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  activeWorkspaceId: uuid("active_workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  intendedRoleId: uuid("intended_role_id").notNull().references(() => roles.id),
  tokenHash: text("token_hash").notNull(),
  invitedByUserId: text("invited_by_user_id").notNull().references(() => user.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  tokenUnique: uniqueIndex("workspace_invitations_token_hash_unique").on(table.tokenHash)
}));

export const membershipGrants = pgTable("membership_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissionDefinitions.id, { onDelete: "cascade" }),
  scope: scopeKind("scope").notNull().default("WORKSPACE"),
  scopeId: text("scope_id"),
  grantedByUserId: text("granted_by_user_id").notNull().references(() => user.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const workspaceCreationRequests = pgTable("workspace_creation_requests", {
  userId: text("user_id").notNull().references(() => user.id),
  idempotencyKey: text("idempotency_key").notNull(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  requestUnique: uniqueIndex("workspace_creation_requests_unique").on(table.userId, table.idempotencyKey)
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: auditActorType("actor_type").notNull(),
  actorId: text("actor_id"),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  delta: jsonb("delta"),
  origin: auditOrigin("origin").notNull(),
  correlationId: text("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const taxonomyStatus = pgEnum("taxonomy_status", ["ACTIVE","DEPRECATED"]);
export const mediaKind = pgEnum("media_kind", ["IMAGE","AUDIO","DOCUMENT"]);
export const mediaStatus = pgEnum("media_status", ["READY","ARCHIVED"]);
export const mediaVisibility = pgEnum("media_visibility", ["PRIVATE","WORKSPACE_AVAILABLE"]);

export const taxonomyDefinitions = pgTable("taxonomy_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  displayNamePtBr: text("display_name_pt_br").notNull(),
  description: text("description").notNull(),
  hierarchyEnabled: boolean("hierarchy_enabled").notNull().default(false),
  maxDepth: integer("max_depth"),
  status: taxonomyStatus("status").notNull().default("ACTIVE"),
  revision: integer("revision").notNull().default(1),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
}, t => ({ codeUnique: uniqueIndex("taxonomy_definitions_code_unique").on(t.code) }));

export const taxonomyValues = pgTable("taxonomy_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  taxonomyDefinitionId: uuid("taxonomy_definition_id").notNull().references(()=>taxonomyDefinitions.id),
  code: text("code").notNull(),
  displayLabelPtBr: text("display_label_pt_br").notNull(),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: taxonomyStatus("status").notNull().default("ACTIVE"),
  supersededById: uuid("superseded_by_id"),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
}, t => ({
  definitionCodeUnique: uniqueIndex("taxonomy_values_definition_code_unique").on(t.taxonomyDefinitionId,t.code),
  parentIndex: index("taxonomy_values_parent_idx_drizzle").on(t.parentId)
}));

export const taxonomyAliases = pgTable("taxonomy_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  taxonomyDefinitionId: uuid("taxonomy_definition_id").notNull().references(()=>taxonomyDefinitions.id,{onDelete:"cascade"}),
  taxonomyValueId: uuid("taxonomy_value_id").notNull().references(()=>taxonomyValues.id,{onDelete:"cascade"}),
  normalizedAlias: text("normalized_alias").notNull(),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
}, t => ({
  aliasUnique: uniqueIndex("taxonomy_aliases_definition_alias_unique").on(t.taxonomyDefinitionId,t.normalizedAlias)
}));

export const referenceLanguages = pgTable("reference_languages",{code:text("code").primaryKey(),displayNamePtBr:text("display_name_pt_br").notNull(),active:boolean("active").notNull().default(true)});
export const referenceCountries = pgTable("reference_countries",{code:text("code").primaryKey(),displayNamePtBr:text("display_name_pt_br").notNull(),active:boolean("active").notNull().default(true)});
export const referenceCurrencies = pgTable("reference_currencies",{code:text("code").primaryKey(),displayNamePtBr:text("display_name_pt_br").notNull(),active:boolean("active").notNull().default(true)});
export const referenceTimezones = pgTable("reference_timezones",{code:text("code").primaryKey(),displayNamePtBr:text("display_name_pt_br").notNull(),active:boolean("active").notNull().default(true)});

export const mediaAssets = pgTable("media_assets",{
  id:uuid("id").primaryKey().defaultRandom(),
  workspaceId:uuid("workspace_id").notNull().references(()=>workspaces.id),
  createdByUserId:text("created_by_user_id").notNull().references(()=>user.id),
  fileName:text("file_name").notNull(),
  originalFileName:text("original_file_name").notNull(),
  mediaKind:mediaKind("media_kind").notNull(),
  mimeType:text("mime_type").notNull(),
  sizeBytes:bigint("size_bytes",{mode:"number"}).notNull(),
  checksumSha256:text("checksum_sha256").notNull(),
  storageKey:text("storage_key").notNull(),
  status:mediaStatus("status").notNull().default("READY"),
  visibility:mediaVisibility("visibility").notNull().default("PRIVATE"),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
  archivedAt:timestamp("archived_at",{withTimezone:true})
},t=>({
  storageUnique:uniqueIndex("media_assets_storage_key_unique").on(t.storageKey),
  workspaceIndex:index("media_assets_workspace_idx_drizzle").on(t.workspaceId),
  checksumIndex:index("media_assets_checksum_idx_drizzle").on(t.checksumSha256)
}));


export const creatorStatus = pgEnum("creator_status", ["DRAFT","UNDER_REVIEW","ACTIVE","LIMITED","SUSPENDED","DISABLED"]);
export const creatorMarketplaceVisibility = pgEnum("creator_marketplace_visibility", ["VISIBLE","HIDDEN"]);
export const creatorAvailability = pgEnum("creator_availability", ["AVAILABLE","LIMITED_AVAILABILITY","UNAVAILABLE"]);
export const socialPlatform = pgEnum("social_platform", ["TIKTOK","INSTAGRAM","YOUTUBE"]);
export const socialProfileProvenance = pgEnum("social_profile_provenance", ["DECLARED","MANUAL_VERIFIED","PROVIDER"]);
export const socialConnectionStatus = pgEnum("social_connection_status", ["NOT_CONNECTED","CONNECTED","REAUTH_REQUIRED","PERMISSION_LIMITED","ERROR","REVOKED"]);
export const socialMetricsSource = pgEnum("social_metrics_source", ["MANUAL_DECLARED","PROVIDER"]);

export const creatorProfiles = pgTable("creator_profiles",{
  id:uuid("id").primaryKey().defaultRandom(),
  userId:text("user_id").notNull().references(()=>user.id),
  displayName:text("display_name").notNull(),
  bio:text("bio"),
  countryCode:text("country_code").notNull().references(()=>referenceCountries.code),
  languageCode:text("language_code").notNull().references(()=>referenceLanguages.code),
  timezoneCode:text("timezone_code").notNull().references(()=>referenceTimezones.code),
  region:text("region"),
  city:text("city"),
  status:creatorStatus("status").notNull().default("DRAFT"),
  marketplaceVisibility:creatorMarketplaceVisibility("marketplace_visibility").notNull().default("HIDDEN"),
  availability:creatorAvailability("availability").notNull().default("AVAILABLE"),
  avatarMediaAssetId:uuid("avatar_media_asset_id").references(()=>mediaAssets.id,{onDelete:"set null"}),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>({
  userUnique:uniqueIndex("creator_profiles_user_unique").on(t.userId),
  discoveryIndex:index("creator_profiles_status_idx_drizzle").on(t.status,t.marketplaceVisibility,t.availability)
}));

export const creatorProfileNiches = pgTable("creator_profile_niches",{
  creatorProfileId:uuid("creator_profile_id").notNull().references(()=>creatorProfiles.id,{onDelete:"cascade"}),
  taxonomyValueId:uuid("taxonomy_value_id").notNull().references(()=>taxonomyValues.id,{onDelete:"restrict"}),
  isPrimary:boolean("is_primary").notNull().default(false),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>({uniqueRelation:uniqueIndex("creator_profile_niches_unique").on(t.creatorProfileId,t.taxonomyValueId)}));

export const creatorProfileContentStyles = pgTable("creator_profile_content_styles",{
  creatorProfileId:uuid("creator_profile_id").notNull().references(()=>creatorProfiles.id,{onDelete:"cascade"}),
  taxonomyValueId:uuid("taxonomy_value_id").notNull().references(()=>taxonomyValues.id,{onDelete:"restrict"}),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>({uniqueRelation:uniqueIndex("creator_profile_content_styles_unique").on(t.creatorProfileId,t.taxonomyValueId)}));

export const creatorMusicGenres = pgTable("creator_music_genres",{
  creatorProfileId:uuid("creator_profile_id").notNull().references(()=>creatorProfiles.id,{onDelete:"cascade"}),
  taxonomyValueId:uuid("taxonomy_value_id").notNull().references(()=>taxonomyValues.id,{onDelete:"restrict"}),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>({uniqueRelation:uniqueIndex("creator_music_genres_unique").on(t.creatorProfileId,t.taxonomyValueId)}));

export const socialProfiles = pgTable("social_profiles",{
  id:uuid("id").primaryKey().defaultRandom(),
  creatorProfileId:uuid("creator_profile_id").notNull().references(()=>creatorProfiles.id,{onDelete:"cascade"}),
  platform:socialPlatform("platform").notNull(),
  externalAccountId:text("external_account_id"),
  handle:text("handle").notNull(),
  normalizedHandle:text("normalized_handle").notNull(),
  profileUrl:text("profile_url"),
  displayName:text("display_name"),
  provenance:socialProfileProvenance("provenance").notNull().default("DECLARED"),
  connectionStatus:socialConnectionStatus("connection_status").notNull().default("NOT_CONNECTED"),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>({
  creatorHandleUnique:uniqueIndex("social_profiles_creator_platform_handle_unique").on(t.creatorProfileId,t.platform,t.normalizedHandle)
}));

export const socialMetricsSnapshots = pgTable("social_metrics_snapshots",{
  id:uuid("id").primaryKey().defaultRandom(),
  socialProfileId:uuid("social_profile_id").notNull().references(()=>socialProfiles.id,{onDelete:"cascade"}),
  capturedAt:timestamp("captured_at",{withTimezone:true}).notNull(),
  source:socialMetricsSource("source").notNull(),
  followers:bigint("followers",{mode:"number"}),
  following:bigint("following",{mode:"number"}),
  totalLikes:bigint("total_likes",{mode:"number"}),
  averageViews:bigint("average_views",{mode:"number"}),
  engagementRateBasisPoints:integer("engagement_rate_basis_points"),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>({capturedIndex:index("social_metrics_snapshots_profile_captured_idx_drizzle").on(t.socialProfileId,t.capturedAt)}));
