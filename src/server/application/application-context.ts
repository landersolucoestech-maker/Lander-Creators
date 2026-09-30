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
  | "workspaceSettings";

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

  const capabilities: Record<ApplicationCapability, boolean> = {
    workspace: false,
    team: false,
    media: false,
    music: false,
    promoted: false,
    workspaceSettings: false
  };

  if (activeWorkspace) {
    const workspaceId = activeWorkspace.id;
    const [workspace, team, media, music, promoted, workspaceSettings] = await Promise.all([
      hasWorkspacePermission(sql, user.id, workspaceId, "workspace.view"),
      hasWorkspacePermission(sql, user.id, workspaceId, "team.member.view"),
      hasWorkspacePermission(sql, user.id, workspaceId, "media.view"),
      hasWorkspacePermission(sql, user.id, workspaceId, "music_catalog.view"),
      hasWorkspacePermission(sql, user.id, workspaceId, "promoted_entity.view"),
      hasWorkspacePermission(sql, user.id, workspaceId, "workspace.update")
    ]);
    Object.assign(capabilities, { workspace, team, media, music, promoted, workspaceSettings });
  }

  return { user, workspaces, activeWorkspace, creator, capabilities };
}
