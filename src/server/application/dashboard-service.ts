import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import type { PermissionCode } from "@/server/authorization/permissions";
import { DomainError } from "@/server/shared/domain-error";

export type DashboardSummary = {
  creatorProfile: number;
  artists: number | null;
  releases: number | null;
  tracks: number | null;
  promotedEntities: number | null;
  promotedByType: Record<string, number> | null;
  media: number | null;
  members: number | null;
  recentActivity: Array<{ label: string; createdAt: string }>;
};

async function permitted(sql: Sql, userId: string, workspaceId: string, permission: PermissionCode) {
  try {
    await authorizeWorkspacePermission(sql, { userId, workspaceId, permission });
    return true;
  } catch (error) {
    if (error instanceof DomainError && error.status === 403) return false;
    throw error;
  }
}

async function count(sql: Sql, query: string, parameters: string[]) {
  const rows = await sql.unsafe(query, parameters);
  return Number((rows[0] as Record<string, unknown> | undefined)?.count ?? 0);
}

const activityLabels: Record<string, string> = {
  "workspace.created": "Workspace criado",
  "workspace.member.invited": "Membro convidado",
  "artist.created": "Artista cadastrado",
  "release.created": "Lançamento cadastrado",
  "track.created": "Música cadastrada",
  "company.created": "Empresa cadastrada",
  "brand.created": "Marca cadastrada",
  "product.created": "Produto cadastrado",
  "service.created": "Serviço cadastrado",
  "platform.created": "Plataforma cadastrada",
  "event.created": "Evento cadastrado",
  "project.created": "Projeto cadastrado",
  "institutional_initiative.created": "Iniciativa institucional cadastrada"
};

export async function getDashboardSummary(
  sql: Sql,
  input: { userId: string; workspaceId: string }
): Promise<DashboardSummary> {
  const creatorProfile = await count(
    sql,
    "select count(*)::int count from creator_profiles where user_id=$1",
    [input.userId]
  );

  const [musicAllowed, promotedAllowed, mediaAllowed, teamAllowed] = await Promise.all([
    permitted(sql, input.userId, input.workspaceId, "music_catalog.view"),
    permitted(sql, input.userId, input.workspaceId, "promoted_entity.view"),
    permitted(sql, input.userId, input.workspaceId, "media.view"),
    permitted(sql, input.userId, input.workspaceId, "team.member.view")
  ]);

  let artists: number | null = null;
  let releases: number | null = null;
  let tracks: number | null = null;
  if (musicAllowed) {
    [artists, releases, tracks] = await Promise.all([
      count(sql, "select count(*)::int count from workspace_artist_access where workspace_id=$1::uuid", [input.workspaceId]),
      count(sql, "select count(*)::int count from releases r where exists(select 1 from workspace_artist_access a where a.workspace_id=$1::uuid and a.artist_id=r.primary_artist_id)", [input.workspaceId]),
      count(sql, "select count(*)::int count from tracks t join releases r on r.id=t.release_id where exists(select 1 from workspace_artist_access a where a.workspace_id=$1::uuid and a.artist_id=r.primary_artist_id)", [input.workspaceId])
    ]);
  }

  let promotedEntities: number | null = null;
  let promotedByType: Record<string, number> | null = null;
  if (promotedAllowed) {
    const rows = await sql.unsafe(
      "select entity_type::text type,count(*)::int count from workspace_promoted_entity_access where workspace_id=$1::uuid and status='ACTIVE' and (expires_at is null or expires_at>now()) group by entity_type",
      [input.workspaceId]
    );
    promotedByType = Object.fromEntries(rows.map((row) => [String(row.type), Number(row.count)]));
    promotedEntities = Object.values(promotedByType).reduce((total, value) => total + value, 0);
  }

  const media = mediaAllowed
    ? await count(sql, "select count(*)::int count from media_assets where workspace_id=$1::uuid and status='READY'", [input.workspaceId])
    : null;
  const members = teamAllowed
    ? await count(sql, "select count(*)::int count from memberships where workspace_id=$1::uuid and status<>'REMOVED'", [input.workspaceId])
    : null;

  const workspaceAllowed = await permitted(sql, input.userId, input.workspaceId, "workspace.view");
  const recentRows = workspaceAllowed
    ? await sql.unsafe(
        "select action,created_at from audit_logs where workspace_id=$1::uuid and action=any($2::text[]) order by created_at desc limit 6",
        [input.workspaceId, Object.keys(activityLabels)]
      )
    : [];

  return {
    creatorProfile,
    artists,
    releases,
    tracks,
    promotedEntities,
    promotedByType,
    media,
    members,
    recentActivity: recentRows.map((row) => ({
      label: activityLabels[String(row.action)] ?? "Atividade",
      createdAt: new Date(String(row.created_at)).toISOString()
    }))
  };
}
