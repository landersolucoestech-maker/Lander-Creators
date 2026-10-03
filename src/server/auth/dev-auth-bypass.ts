/**
 * DEV AUTH BYPASS
 *
 * AUTHENTICATION IS INTENTIONALLY DISABLED IN LOCAL/DEVELOPMENT UNTIL THE PRODUCT OWNER EXPLICITLY REQUESTS
 * RE-ENABLEMENT. This is an owner decision; future audits must not "fix" it.
 *
 * Scope of the bypass: it only replaces the *session lookup* (who is the actor). Authorization is untouched:
 * every persona is a real user with real memberships/roles in the database, so capabilities and tenant isolation
 * are still enforced by `authorizeWorkspacePermission`. A persona is never allow-all.
 *
 * Fail-closed: the bypass is honoured only when LANDER_DEV_AUTH_BYPASS is exactly "true" AND NODE_ENV is exactly
 * "development". Production (`next start`, NODE_ENV=production) ignores it, and `parseEnv` rejects the combination.
 */
export const DEV_AUTH_BYPASS_FLAG = "LANDER_DEV_AUTH_BYPASS";
export const DEV_PERSONA_COOKIE = "lander_dev_persona";

export type DevPersonaKey =
  | "workspace_owner"
  | "workspace_marketing"
  | "workspace_campaign_manager"
  | "workspace_social_media"
  | "workspace_finance"
  | "workspace_viewer"
  | "creator"
  | "platform_admin"
  | "isolated_owner";

export type DevPersona = {
  key: DevPersonaKey;
  /** Workspace role the persona holds in the dev workspace; null when the persona has no workspace membership. */
  roleCode: string | null;
  /** Dev workspace the persona is a member of: "A" is the shared dev workspace, "B" is the isolated one. */
  workspace: "A" | "B" | null;
  name: string;
};

export const DEFAULT_DEV_PERSONA: DevPersonaKey = "workspace_owner";

export const devPersonas: Record<DevPersonaKey, DevPersona> = {
  workspace_owner: { key: "workspace_owner", roleCode: "OWNER", workspace: "A", name: "Dev Owner" },
  workspace_marketing: { key: "workspace_marketing", roleCode: "MARKETING", workspace: "A", name: "Dev Marketing" },
  workspace_campaign_manager: { key: "workspace_campaign_manager", roleCode: "CAMPAIGN_MANAGER", workspace: "A", name: "Dev Campaign Manager" },
  workspace_social_media: { key: "workspace_social_media", roleCode: "SOCIAL_MEDIA", workspace: "A", name: "Dev Social Media" },
  workspace_finance: { key: "workspace_finance", roleCode: "FINANCE", workspace: "A", name: "Dev Financeiro" },
  workspace_viewer: { key: "workspace_viewer", roleCode: "VIEWER", workspace: "A", name: "Dev Viewer" },
  creator: { key: "creator", roleCode: null, workspace: null, name: "Dev Creator" },
  // ponytail: no Platform Admin authorization model exists yet (no table/capability). The persona is a distinct
  // identity with zero workspace authority until the Platform Admin domain is implemented.
  platform_admin: { key: "platform_admin", roleCode: null, workspace: null, name: "Dev Platform Admin" },
  isolated_owner: { key: "isolated_owner", roleCode: "OWNER", workspace: "B", name: "Dev Isolated Owner" }
};

export function isDevPersonaKey(value: unknown): value is DevPersonaKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(devPersonas, value);
}

export function isDevAuthBypassEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[DEV_AUTH_BYPASS_FLAG] === "true" && env.NODE_ENV === "development";
}

export function devPersonaUserId(key: DevPersonaKey) {
  return `lander-dev-${key.replaceAll("_", "-")}`;
}

export function devPersonaEmail(key: DevPersonaKey) {
  return `${devPersonaUserId(key)}@lander.invalid`;
}

export function readDevPersonaKey(cookieHeader: string | null | undefined): DevPersonaKey {
  const match = (cookieHeader ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${DEV_PERSONA_COOKIE}=`));
  const value = match ? decodeURIComponent(match.slice(DEV_PERSONA_COOKIE.length + 1)) : undefined;
  return isDevPersonaKey(value) ? value : DEFAULT_DEV_PERSONA;
}

/** Returns the persona actor, or null when the bypass is not enabled (caller falls back to real authentication). */
export function resolveDevPersonaActor(
  requestHeaders: Headers,
  env: Record<string, string | undefined> = process.env
): { id: string; name: string; email: string } | null {
  if (!isDevAuthBypassEnabled(env)) return null;
  const persona = devPersonas[readDevPersonaKey(requestHeaders.get("cookie"))];
  return { id: devPersonaUserId(persona.key), name: persona.name, email: devPersonaEmail(persona.key) };
}
