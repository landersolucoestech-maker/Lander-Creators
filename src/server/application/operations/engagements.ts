import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import type { ListQuery, Page } from "@/server/shared/list-query";
import { Conditions, runPagedList } from "@/server/shared/paged-sql";

export const engagementListConfig = {
  sorts: ["created_at", "campaign", "creator", "status", "amount"] as const,
  defaultSort: "created_at" as const,
  statuses: ["DRAFT", "PENDING_CREATOR_SIGNATURE", "PENDING_WORKSPACE_SIGNATURE", "ACTIVE", "CANCELLED", "COMPLETED"] as const
};
export type EngagementSort = (typeof engagementListConfig.sorts)[number];

const engagementOrder: Record<EngagementSort, string> = {
  created_at: "e.created_at",
  campaign: "c.name",
  creator: "cr.display_name",
  status: "e.status",
  amount: "e.contracted_amount_minor"
};

export type EngagementRow = {
  id: string;
  status: string;
  campaign_id: string;
  campaign_name: string;
  creator_name: string;
  amount_minor: string;
  currency_code: string;
  scope_snapshot: string;
  created_at: Date;
  activated_at: Date | null;
  contract_id: string | null;
  contract_status: string | null;
  deliverables_total: number;
  deliverables_approved: number;
  publications_verified: number;
  payable_status: string | null;
  has_active_dispute: boolean;
};

export async function listWorkspaceEngagements(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<EngagementSort> }
): Promise<Page<EngagementRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "engagement.view" });
  const { query } = input;
  const conditions = new Conditions().add("e.workspace_id = ?::uuid", input.workspaceId);
  if (query.status) conditions.add("e.status = ?::campaign_engagement_status", query.status);
  conditions.search(["c.name", "cr.display_name", "e.scope_snapshot"], query.q);
  return runPagedList<EngagementRow>(sql, {
    select: `e.id::text, e.status::text, c.id::text campaign_id, c.name campaign_name, cr.display_name creator_name,
      e.contracted_amount_minor::text amount_minor, e.currency_code, e.scope_snapshot, e.created_at, e.activated_at,
      lc.id::text contract_id, lc.status::text contract_status,
      (select count(*)::int from deliverables d where d.engagement_id = e.id and d.status <> 'CANCELLED') deliverables_total,
      (select count(*)::int from deliverables d where d.engagement_id = e.id and d.status = 'APPROVED') deliverables_approved,
      (select count(*)::int from publications p where p.engagement_id = e.id and p.status = 'VERIFIED') publications_verified,
      (select py.status::text from campaign_payables py where py.engagement_id = e.id) payable_status,
      exists (select 1 from disputes ds where ds.engagement_id = e.id and ds.status in ('OPEN', 'UNDER_REVIEW')) has_active_dispute`,
    from: `from campaign_engagements e
      join campaigns c on c.id = e.campaign_id
      join creator_profiles cr on cr.id = e.creator_profile_id
      left join lateral (select ec.* from engagement_contracts ec where ec.engagement_id = e.id order by ec.version desc limit 1) lc on true`,
    conditions,
    orderBy: engagementOrder[query.sort],
    tiebreaker: "e.id",
    query
  });
}

export const contractListConfig = {
  sorts: ["updated_at", "campaign", "creator", "status", "version"] as const,
  defaultSort: "updated_at" as const,
  statuses: ["DRAFT", "SENT", "SIGNED_CREATOR", "SIGNED_WORKSPACE", "EXECUTED", "VOID"] as const
};
export type ContractSort = (typeof contractListConfig.sorts)[number];

const contractOrder: Record<ContractSort, string> = {
  updated_at: "ec.updated_at",
  campaign: "c.name",
  creator: "cr.display_name",
  status: "ec.status",
  version: "ec.version"
};

export type WorkspaceContractRow = {
  id: string;
  engagement_id: string;
  version: number;
  status: string;
  scope_of_work: string;
  rights_terms: string;
  payment_terms: string;
  creator_signed_at: Date | null;
  workspace_signed_at: Date | null;
  executed_at: Date | null;
  updated_at: Date;
  campaign_name: string;
  creator_name: string;
  amount_minor: string;
  currency_code: string;
};

export async function listWorkspaceContracts(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<ContractSort> }
): Promise<Page<WorkspaceContractRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "engagement.view" });
  const { query } = input;
  const conditions = new Conditions().add("e.workspace_id = ?::uuid", input.workspaceId);
  if (query.status) conditions.add("ec.status = ?::engagement_contract_status", query.status);
  conditions.search(["c.name", "cr.display_name"], query.q);
  return runPagedList<WorkspaceContractRow>(sql, {
    select: `ec.id::text, ec.engagement_id::text, ec.version, ec.status::text, ec.scope_of_work, ec.rights_terms, ec.payment_terms,
      ec.creator_signed_at, ec.workspace_signed_at, ec.executed_at, ec.updated_at,
      c.name campaign_name, cr.display_name creator_name, e.contracted_amount_minor::text amount_minor, e.currency_code`,
    from: `from engagement_contracts ec
      join campaign_engagements e on e.id = ec.engagement_id
      join campaigns c on c.id = e.campaign_id
      join creator_profiles cr on cr.id = e.creator_profile_id`,
    conditions,
    orderBy: contractOrder[query.sort],
    tiebreaker: "ec.id",
    query
  });
}
