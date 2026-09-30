import {
  index,
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
