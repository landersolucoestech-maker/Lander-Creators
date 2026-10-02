import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import type { ListQuery, Page } from "@/server/shared/list-query";
import { Conditions, runPagedList } from "@/server/shared/paged-sql";

export const publicationListConfig = {
  sorts: ["updated_at", "campaign", "creator", "deliverable", "status"] as const,
  defaultSort: "updated_at" as const,
  statuses: ["PLANNED", "READY", "PUBLISHED", "VERIFIED", "FAILED", "CANCELLED"] as const
};
export type PublicationSort = (typeof publicationListConfig.sorts)[number];

const order: Record<PublicationSort, string> = {
  updated_at: "p.updated_at",
  campaign: "c.name",
  creator: "cr.display_name",
  deliverable: "d.title",
  status: "p.status"
};

export type WorkspacePublicationRow = {
  id: string;
  deliverable_id: string;
  deliverable_title: string;
  platform: string;
  mode: string;
  status: string;
  scheduled_at: Date | null;
  published_at: Date | null;
  verified_at: Date | null;
  proof_url: string | null;
  campaign_name: string;
  creator_name: string;
  latest_views: string | null;
};

export async function listWorkspacePublications(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<PublicationSort> }
): Promise<Page<WorkspacePublicationRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "publication.view" });
  const { query } = input;
  const conditions = new Conditions().add("p.workspace_id = ?::uuid", input.workspaceId);
  if (query.status) conditions.add("p.status = ?::publication_status", query.status);
  conditions.search(["c.name", "cr.display_name", "d.title"], query.q);
  return runPagedList<WorkspacePublicationRow>(sql, {
    select: `p.id::text, d.id::text deliverable_id, d.title deliverable_title, p.platform, p.mode::text, p.status::text,
      p.scheduled_at, p.published_at, p.verified_at, p.proof_url, c.name campaign_name, cr.display_name creator_name,
      (select m.views::text from publication_metrics_snapshots m where m.publication_id = p.id order by m.captured_at desc limit 1) latest_views`,
    from: `from publications p
      join deliverables d on d.id = p.deliverable_id
      join campaigns c on c.id = p.campaign_id
      join creator_profiles cr on cr.id = p.creator_profile_id`,
    conditions,
    orderBy: order[query.sort],
    tiebreaker: "p.id",
    query
  });
}

export const plannableListConfig = {
  sorts: ["approved_at", "campaign", "creator", "deliverable"] as const,
  defaultSort: "approved_at" as const
};
export type PlannableSort = (typeof plannableListConfig.sorts)[number];

const plannableOrder: Record<PlannableSort, string> = {
  approved_at: "d.approved_at",
  campaign: "c.name",
  creator: "cr.display_name",
  deliverable: "d.title"
};

export type PlannableDeliverableRow = {
  id: string;
  title: string;
  platform: string;
  format: string;
  approved_at: Date | null;
  campaign_name: string;
  creator_name: string;
};

/** Approved deliverables that still have no publication plan (publication is mandatory for them). */
export async function listWorkspacePlannableDeliverables(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<PlannableSort> }
): Promise<Page<PlannableDeliverableRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "publication.view" });
  const { query } = input;
  const conditions = new Conditions()
    .add("d.workspace_id = ?::uuid", input.workspaceId)
    .add("d.status = 'APPROVED' and not exists (select 1 from publications p where p.deliverable_id = d.id)");
  conditions.search(["c.name", "cr.display_name", "d.title"], query.q);
  return runPagedList<PlannableDeliverableRow>(sql, {
    select: "d.id::text, d.title, d.platform, d.format, d.approved_at, c.name campaign_name, cr.display_name creator_name",
    from: `from deliverables d
      join campaigns c on c.id = d.campaign_id
      join creator_profiles cr on cr.id = d.creator_profile_id`,
    conditions,
    orderBy: plannableOrder[query.sort],
    tiebreaker: "d.id",
    query
  });
}
