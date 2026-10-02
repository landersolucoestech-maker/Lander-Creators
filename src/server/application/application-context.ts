import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import type { PermissionCode } from "@/server/authorization/permissions";
import { getCreatorProfileByUser } from "@/server/creator/creator-service";
import { listUserWorkspaces } from "@/server/workspace/workspace-service";
import { DomainError } from "@/server/shared/domain-error";

export type ApplicationWorkspace = {
  id: string;
  name: string;
  type: string;
  status: string;
  role_code: string;
  active: boolean;
};

export type ApplicationCapability =
  | "workspace"
  | "team"
  | "media"
  | "music"
  | "promoted"
  | "workspaceSettings"
  | "campaign"
  | "engagements"
  | "contentReview"
  | "publications"
  | "finance"
  | "analytics"
  | "matching"
  | "disputes";

/** Navigation capabilities are the server-side `*.view`/`*.update` permissions; hiding a link never authorizes. */
export const capabilityPermissions = {
  workspace: "workspace.view",
  team: "team.member.view",
  media: "media.view",
  music: "music_catalog.view",
  promoted: "promoted_entity.view",
  workspaceSettings: "workspace.update",
  campaign: "campaign.view",
  engagements: "engagement.view",
  contentReview: "deliverable.view",
  publications: "publication.view",
  finance: "finance.view",
  analytics: "analytics.view",
  matching: "matching.view",
  disputes: "dispute.view"
} as const satisfies Record<ApplicationCapability, PermissionCode>;

export function noCapabilities(): Record<ApplicationCapability, boolean> {
  return Object.fromEntries(Object.keys(capabilityPermissions).map((name) => [name, false])) as Record<ApplicationCapability, boolean>;
}

export type ApplicationShellState = {
  user: { id: string; name: string; email: string };
  workspaces: ApplicationWorkspace[];
  activeWorkspace: ApplicationWorkspace | null;
  creator: { id: string; displayName: string } | null;
  capabilities: Record<ApplicationCapability, boolean>;
};

async function hasWorkspacePermission(
  sql: Sql,
  userId: string,
  workspaceId: string,
  permission: PermissionCode
) {
  try {
    await authorizeWorkspacePermission(sql, { userId, workspaceId, permission });
    return true;
  } catch (error) {
    if (error instanceof DomainError && error.status === 403) return false;
    throw error;
  }
}

export async function getApplicationShellState(
  sql: Sql,
  user: { id: string; name: string; email: string }
): Promise<ApplicationShellState> {
  const workspaces = (await listUserWorkspaces(sql, user.id)) as unknown as ApplicationWorkspace[];
  const activeWorkspace = workspaces.find((workspace) => workspace.active) ?? null;
  const creatorRow = await getCreatorProfileByUser(sql, user.id);
  const creator = creatorRow
    ? {
        id: String((creatorRow as Record<string, unknown>).id),
        displayName: String((creatorRow as Record<string, unknown>).display_name)
      }
    : null;

  const capabilities = noCapabilities();

  if (activeWorkspace) {
    const workspaceId = activeWorkspace.id;
    const entries = Object.entries(capabilityPermissions) as Array<[ApplicationCapability, PermissionCode]>;
    const granted = await Promise.all(entries.map(([, permission]) => hasWorkspacePermission(sql, user.id, workspaceId, permission)));
    entries.forEach(([name], index) => {
      capabilities[name] = granted[index];
    });
  }

  return { user, workspaces, activeWorkspace, creator, capabilities };
}
