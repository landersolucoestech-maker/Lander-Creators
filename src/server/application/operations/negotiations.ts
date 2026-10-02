import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import type { ListQuery, Page } from "@/server/shared/list-query";
import { Conditions, runPagedList } from "@/server/shared/paged-sql";

export const negotiationListConfig = {
  sorts: ["updated_at", "campaign", "creator", "status", "amount"] as const,
  defaultSort: "updated_at" as const,
  statuses: ["INVITED", "APPLIED", "SHORTLISTED", "DECLINED", "REJECTED", "WITHDRAWN", "ACCEPTED"] as const
};
export type NegotiationSort = (typeof negotiationListConfig.sorts)[number];

const orderColumns: Record<NegotiationSort, string> = {
  updated_at: "cp.updated_at",
  campaign: "c.name",
  creator: "cr.display_name",
  status: "cp.status",
  amount: "lp.amount_minor"
};

/** A participation with its latest proposal round: one row per negotiation. */
export type NegotiationRow = {
  participation_id: string;
  campaign_id: string;
  campaign_name: string;
  creator_name: string;
  creator_country: string;
  origin: string;
  participation_status: string;
  updated_at: Date;
  proposal_id: string | null;
  proposal_round: number | null;
  proposal_status: string | null;
  proposed_by: "WORKSPACE" | "CREATOR" | null;
  proposal_amount_minor: string | null;
  proposal_currency: string | null;
  proposal_scope: string | null;
  engagement_id: string | null;
};

export async function listWorkspaceNegotiations(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<NegotiationSort> }
): Promise<Page<NegotiationRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "participation.view" });
  const { query } = input;
  const conditions = new Conditions().add("c.workspace_id = ?::uuid", input.workspaceId);
  if (query.status) conditions.add("cp.status = ?::campaign_participation_status", query.status);
  conditions.search(["c.name", "cr.display_name"], query.q);
  return runPagedList<NegotiationRow>(sql, {
    select: `cp.id::text participation_id, c.id::text campaign_id, c.name campaign_name, cr.display_name creator_name, cr.country_code creator_country,
      cp.origin::text origin, cp.status::text participation_status, cp.updated_at,
      lp.id::text proposal_id, lp.round proposal_round, lp.status::text proposal_status, lp.proposed_by proposed_by,
      lp.amount_minor::text proposal_amount_minor, lp.currency_code proposal_currency, lp.scope_summary proposal_scope,
      en.id::text engagement_id`,
    from: `from campaign_participations cp
      join campaigns c on c.id = cp.campaign_id
      join creator_profiles cr on cr.id = cp.creator_profile_id
      left join lateral (select pr.* from campaign_proposals pr where pr.participation_id = cp.id order by pr.round desc limit 1) lp on true
      left join campaign_engagements en on en.participation_id = cp.id`,
    conditions,
    orderBy: orderColumns[query.sort],
    tiebreaker: "cp.id",
    query
  });
}
