import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { DomainError } from "@/server/shared/domain-error";
import { validateMedia } from "./media-validation";
import type { MediaStorageAdapter } from "./storage";

function safe(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    fileName: String(row.file_name),
    originalFileName: String(row.original_file_name),
    mediaKind: String(row.media_kind),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    status: String(row.status),
    visibility: String(row.visibility),
    createdAt: row.created_at
  };
}

export async function listMediaAssets(
  sql: Sql,
  input: { userId: string; workspaceId: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    permission: "media.view"
  });
  const rows = await sql.unsafe(
    "select id::text,workspace_id::text,file_name,original_file_name,media_kind::text,mime_type,size_bytes,status::text,visibility::text,created_at from media_assets where workspace_id=$1::uuid order by created_at desc",
    [input.workspaceId]
  );
  return rows.map((row) => safe(row as Record<string, unknown>));
}

export async function uploadMediaAsset(
  sql: Sql,
  storage: MediaStorageAdapter,
  input: {
    userId: string;
    workspaceId: string;
    originalFileName: string;
    declaredMime: string;
    bytes: Buffer;
    visibility?: "PRIVATE" | "WORKSPACE_AVAILABLE";
  }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    permission: "media.upload"
  });

  const validated = validateMedia(input);
  const stored = await storage.put({ bytes: input.bytes });

  try {
    return await sql.begin(async (tx) => {
      const rows = await tx.unsafe(
        "insert into media_assets(workspace_id,created_by_user_id,file_name,original_file_name,media_kind,mime_type,size_bytes,checksum_sha256,storage_key,status,visibility) values($1::uuid,$2,$3,$4,$5::media_kind,$6,$7,$8,$9,'READY',$10::media_visibility) returning id::text,workspace_id::text,file_name,original_file_name,media_kind::text,mime_type,size_bytes,status::text,visibility::text,created_at",
        [
          input.workspaceId,
          input.userId,
          validated.fileName,
          validated.originalFileName,
          validated.kind,
          validated.mime,
          validated.sizeBytes,
          validated.checksumSha256,
          stored.storageKey,
          input.visibility ?? "PRIVATE"
        ]
      );
      const row = rows[0] as Record<string, unknown>;

      await tx.unsafe(
        "insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,delta,origin) values('USER',$1,$2::uuid,'media.uploaded','media_asset',$3,$4::jsonb,'API')",
        [
          input.userId,
          input.workspaceId,
          String(row.id),
          JSON.stringify({
            mediaKind: validated.kind,
            mimeType: validated.mime,
            sizeBytes: validated.sizeBytes
          })
        ]
      );

      return safe(row);
    });
  } catch (error) {
    await storage.remove(stored.storageKey);
    throw error;
  }
}

export async function readMediaAsset(
  sql: Sql,
  storage: MediaStorageAdapter,
  input: { userId: string; workspaceId: string; mediaAssetId: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    permission: "media.view"
  });

  const rows = await sql.unsafe(
    "select mime_type,file_name,storage_key,status::text from media_assets where id=$1::uuid and workspace_id=$2::uuid",
    [input.mediaAssetId, input.workspaceId]
  );
  const row = rows[0] as Record<string, unknown> | undefined;

  if (!row || row.status === "ARCHIVED") {
    throw new DomainError("MEDIA_NOT_FOUND", "Media asset not found", 404);
  }

  if (!(await storage.exists(String(row.storage_key)))) {
    throw new DomainError(
      "MEDIA_STORAGE_UNAVAILABLE",
      "Media bytes unavailable",
      503
    );
  }

  return {
    bytes: await storage.read(String(row.storage_key)),
    mimeType: String(row.mime_type),
    fileName: String(row.file_name)
  };
}

export async function archiveMediaAsset(
  sql: Sql,
  _storage: MediaStorageAdapter,
  input: { userId: string; workspaceId: string; mediaAssetId: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    permission: "media.archive"
  });

  return sql.begin(async (tx) => {
    const rows = await tx.unsafe(
      "update media_assets set status='ARCHIVED',archived_at=now(),updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status='READY' returning id::text",
      [input.mediaAssetId, input.workspaceId]
    );

    if (!rows[0]) {
      throw new DomainError("MEDIA_NOT_FOUND", "Media asset not found", 404);
    }

    await tx.unsafe(
      "insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values('USER',$1,$2::uuid,'media.archived','media_asset',$3,'API')",
      [input.userId, input.workspaceId, input.mediaAssetId]
    );

    return { mediaAssetId: input.mediaAssetId, status: "ARCHIVED" as const };
  });
}
