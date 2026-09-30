import type { Sql, TransactionSql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { DomainError } from "@/server/shared/domain-error";
import type { PermissionCode } from "@/server/authorization/permissions";

type QueryExecutor = Sql | TransactionSql;

export async function authorizeArtistAccess(
  sql: QueryExecutor,
  input: {
    userId: string;
    workspaceId: string;
    artistId: string;
    permission: "artist.view" | "artist.manage" | "music_catalog.view" | "music_catalog.manage" | "music_catalog.import";
    requireManage?: boolean;
  }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    permission: input.permission as PermissionCode
  });

  const rows = await sql.unsafe(
    "select access_level::text from workspace_artist_access where workspace_id=$1::uuid and artist_id=$2::uuid limit 1",
    [input.workspaceId, input.artistId]
  );
  const level = rows[0]?.access_level ? String(rows[0].access_level) : null;
  if (!level || (input.requireManage && level !== "MANAGE")) {
    throw new DomainError("ARTIST_ACCESS_DENIED", "Workspace has no required Artist access", 403);
  }
  return { accessLevel: level };
}

export async function authorizeReleaseAccess(
  sql: QueryExecutor,
  input: { userId: string; workspaceId: string; releaseId: string; manage?: boolean }
) {
  const rows = await sql.unsafe(
    "select primary_artist_id::text from releases where id=$1::uuid limit 1",
    [input.releaseId]
  );
  if (!rows[0]) throw new DomainError("RELEASE_NOT_FOUND", "Release not found", 404);
  await authorizeArtistAccess(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    artistId: String(rows[0].primary_artist_id),
    permission: input.manage ? "music_catalog.manage" : "music_catalog.view",
    requireManage: input.manage
  });
  return { artistId: String(rows[0].primary_artist_id) };
}

export async function authorizeTrackAccess(
  sql: QueryExecutor,
  input: { userId: string; workspaceId: string; trackId: string; manage?: boolean }
) {
  const rows = await sql.unsafe(
    "select r.primary_artist_id::text from tracks t join releases r on r.id=t.release_id where t.id=$1::uuid limit 1",
    [input.trackId]
  );
  if (!rows[0]) throw new DomainError("TRACK_NOT_FOUND", "Track not found", 404);
  await authorizeArtistAccess(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    artistId: String(rows[0].primary_artist_id),
    permission: input.manage ? "music_catalog.manage" : "music_catalog.view",
    requireManage: input.manage
  });
  return { artistId: String(rows[0].primary_artist_id) };
}
