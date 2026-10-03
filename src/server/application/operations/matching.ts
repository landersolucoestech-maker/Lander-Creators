import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { DomainError } from "@/server/shared/domain-error";
import { Conditions, runPagedList } from "@/server/shared/paged-sql";
import type { ListQuery, Page } from "@/server/shared/list-query";

export const matchListConfig = {
  sorts: ["overall", "music", "audience", "creator_fit", "name"] as const,
  defaultSort: "overall" as const
};
export type MatchSort = (typeof matchListConfig.sorts)[number];

const order: Record<MatchSort, string> = {
  overall: "m.overall_fit",
  music: "m.music_fit",
  audience: "m.audience_fit",
  creator_fit: "m.creator_fit",
  name: "cp.display_name"
};

/** Current deterministic snapshot of one campaign/creator pair. Scores are heuristics, not facts. */
export type MatchRow = {
  creator_profile_id: string;
  display_name: string;
  country_code: string;
  music_fit: number;
  audience_fit: number;
  creator_fit: number;
  overall_fit: number;
  reasons: string[];
  calculated_at: Date;
};

export async function listWorkspaceMatches(
  sql: Sql,
  input: { userId: string; workspaceId: string; campaignId: string; query: ListQuery<MatchSort> }
): Promise<Page<MatchRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "matching.view" });
  const campaign = await sql.unsafe("select 1 from campaigns where id = $1::uuid and workspace_id = $2::uuid", [input.campaignId, input.workspaceId]);
  if (!campaign[0]) throw new DomainError("CAMPAIGN_NOT_FOUND", "Campaign not found", 404);
  const { query } = input;
  const conditions = new Conditions().add("m.campaign_id = ?::uuid", input.campaignId);
  conditions.search(["cp.display_name"], query.q);
  return runPagedList<MatchRow>(sql, {
    select: "m.creator_profile_id::text, cp.display_name, cp.country_code, m.music_fit, m.audience_fit, m.creator_fit, m.overall_fit, m.reasons, m.calculated_at",
    from: "from campaign_creator_match_snapshots m join creator_profiles cp on cp.id = m.creator_profile_id",
    conditions,
    orderBy: order[query.sort],
    tiebreaker: "m.creator_profile_id",
    query
  });
}
