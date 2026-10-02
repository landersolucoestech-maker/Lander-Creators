import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import type { ListQuery, Page } from "@/server/shared/list-query";
import { Conditions, runPagedList } from "@/server/shared/paged-sql";

export const payableListConfig = {
  sorts: ["updated_at", "campaign", "creator", "status", "amount"] as const,
  defaultSort: "updated_at" as const,
  statuses: ["PENDING", "ELIGIBLE", "RELEASED", "PAID", "CANCELLED"] as const
};
export type PayableSort = (typeof payableListConfig.sorts)[number];

const order: Record<PayableSort, string> = {
  updated_at: "py.updated_at",
  campaign: "c.name",
  creator: "cr.display_name",
  status: "py.status",
  amount: "py.amount_minor"
};

export type WorkspacePayableRow = {
  id: string;
  engagement_id: string;
  status: string;
  amount_minor: string;
  currency_code: string;
  eligible_at: Date | null;
  released_at: Date | null;
  paid_at: Date | null;
  external_payment_reference: string | null;
  campaign_name: string;
  creator_name: string;
  deliverables_required: number;
  publications_verified: number;
  has_active_dispute: boolean;
};

export async function listWorkspacePayables(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<PayableSort> }
): Promise<Page<WorkspacePayableRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "finance.view" });
  const { query } = input;
  const conditions = new Conditions().add("py.workspace_id = ?::uuid", input.workspaceId);
  if (query.status) conditions.add("py.status = ?::payable_status", query.status);
  conditions.search(["c.name", "cr.display_name", "py.external_payment_reference"], query.q);
  return runPagedList<WorkspacePayableRow>(sql, {
    select: `py.id::text, py.engagement_id::text, py.status::text, py.amount_minor::text, py.currency_code,
      py.eligible_at, py.released_at, py.paid_at, py.external_payment_reference, c.name campaign_name, cr.display_name creator_name,
      (select count(*)::int from deliverables d where d.engagement_id = py.engagement_id and d.status <> 'CANCELLED') deliverables_required,
      (select count(*)::int from deliverables d where d.engagement_id = py.engagement_id and d.status <> 'CANCELLED'
         and exists (select 1 from publications p where p.deliverable_id = d.id and p.status = 'VERIFIED')) publications_verified,
      exists (select 1 from disputes ds where ds.engagement_id = py.engagement_id and ds.status in ('OPEN', 'UNDER_REVIEW')) has_active_dispute`,
    from: `from campaign_payables py
      join campaigns c on c.id = py.campaign_id
      join creator_profiles cr on cr.id = py.creator_profile_id`,
    conditions,
    orderBy: order[query.sort],
    tiebreaker: "py.id",
    query
  });
}

export const payableCandidateListConfig = {
  sorts: ["created_at", "campaign", "creator"] as const,
  defaultSort: "created_at" as const
};
export type PayableCandidateSort = (typeof payableCandidateListConfig.sorts)[number];

const candidateOrder: Record<PayableCandidateSort, string> = { created_at: "e.created_at", campaign: "c.name", creator: "cr.display_name" };

export type PayableCandidateRow = {
  engagement_id: string;
  campaign_name: string;
  creator_name: string;
  amount_minor: string;
  currency_code: string;
};

/** Active or completed engagements that do not have a payable yet. */
export async function listWorkspacePayableCandidates(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<PayableCandidateSort> }
): Promise<Page<PayableCandidateRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "finance.view" });
  const { query } = input;
  const conditions = new Conditions()
    .add("e.workspace_id = ?::uuid", input.workspaceId)
    .add("e.status in ('ACTIVE', 'COMPLETED') and not exists (select 1 from campaign_payables py where py.engagement_id = e.id)");
  conditions.search(["c.name", "cr.display_name"], query.q);
  return runPagedList<PayableCandidateRow>(sql, {
    select: "e.id::text engagement_id, c.name campaign_name, cr.display_name creator_name, e.contracted_amount_minor::text amount_minor, e.currency_code",
    from: `from campaign_engagements e
      join campaigns c on c.id = e.campaign_id
      join creator_profiles cr on cr.id = e.creator_profile_id`,
    conditions,
    orderBy: candidateOrder[query.sort],
    tiebreaker: "e.id",
    query
  });
}
