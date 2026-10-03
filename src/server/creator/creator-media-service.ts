import type { Sql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { requireCreatorOwner } from "./creator-service";

async function requireAttachableMedia(
  sql: Sql,
  input: { userId: string; mediaAssetId: string }
) {
  const rows = await sql.unsafe(
    "select ma.id::text,ma.workspace_id::text from media_assets ma where ma.id=$1::uuid and ma.created_by_user_id=$2 and ma.status='READY' limit 1",
    [input.mediaAssetId, input.userId]
  );
  const asset = rows[0] as Record<string, unknown> | undefined;
  if (!asset) {
    throw new DomainError(
      "CREATOR_MEDIA_ACCESS_DENIED",
      "Creator media attachment is not authorized",
      403
    );
  }

  try {
    await authorizeWorkspacePermission(sql, {
      userId: input.userId,
      workspaceId: String(asset.workspace_id),
      permission: "media.view"
    });
  } catch {
    throw new DomainError(
      "CREATOR_MEDIA_ACCESS_DENIED",
      "Creator media attachment is not authorized",
      403
    );
  }

  return asset;
}

export async function setCreatorAvatar(
  sql: Sql,
  input: { userId: string; creatorProfileId: string; mediaAssetId: string | null }
) {
  await requireCreatorOwner(sql, input);
  if (input.mediaAssetId) {
    await requireAttachableMedia(sql, {
      userId: input.userId,
      mediaAssetId: input.mediaAssetId
    });
  }

  const rows = await sql.unsafe(
    "update creator_profiles set avatar_media_asset_id=$3::uuid,updated_at=now() where id=$1::uuid and user_id=$2 returning id::text,avatar_media_asset_id::text",
    [input.creatorProfileId, input.userId, input.mediaAssetId]
  );
  return rows[0];
}

export type CreatorAttachableMediaRow = {
  id: string;
  original_file_name: string;
  media_kind: string;
  mime_type: string;
};

export async function listCreatorAttachableMedia(sql: Sql, userId: string): Promise<CreatorAttachableMediaRow[]> {
  const candidates = await sql.unsafe<(CreatorAttachableMediaRow & { workspace_id: string })[]>(
    "select ma.id::text,ma.workspace_id::text,ma.original_file_name,ma.media_kind::text,ma.mime_type from media_assets ma where ma.created_by_user_id=$1 and ma.status='READY' order by ma.original_file_name",
    [userId]
  );

  const authorized: CreatorAttachableMediaRow[] = [];
  for (const row of candidates) {
    try {
      await authorizeWorkspacePermission(sql, {
        userId,
        workspaceId: row.workspace_id,
        permission: "media.view"
      });
      const { workspace_id: _workspaceId, ...publicRow } = row;
      void _workspaceId;
      authorized.push(publicRow);
    } catch {
      // Inaccessible Workspace media is intentionally omitted from Creator self-service.
    }
  }

  return authorized;
}
