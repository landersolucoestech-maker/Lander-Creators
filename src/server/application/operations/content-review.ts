import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import type { ListQuery, Page } from "@/server/shared/list-query";
import { Conditions, runPagedList } from "@/server/shared/paged-sql";

export const contentReviewListConfig = {
  sorts: ["submitted_at", "campaign", "creator", "deliverable", "status"] as const,
  defaultSort: "submitted_at" as const,
  statuses: ["SUBMITTED", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "SUPERSEDED"] as const
};
export type ContentReviewSort = (typeof contentReviewListConfig.sorts)[number];

const order: Record<ContentReviewSort, string> = {
  submitted_at: "cv.submitted_at",
  campaign: "c.name",
  creator: "cr.display_name",
  deliverable: "d.title",
  status: "cv.status"
};

export type ContentReviewRow = {
  id: string;
  version: number;
  status: string;
  external_url: string | null;
  media_asset_id: string | null;
  media_file_name: string | null;
  creator_note: string | null;
  review_note: string | null;
  submitted_at: Date;
  reviewed_at: Date | null;
  deliverable_id: string;
  deliverable_title: string;
  deliverable_status: string;
  platform: string;
  format: string;
  requirements_snapshot: string;
  campaign_name: string;
  creator_name: string;
};

/** Content versions of the workspace's deliverables; pass deliverableId to see one deliverable's whole history. */
export async function listWorkspaceContentVersions(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<ContentReviewSort>; deliverableId?: string | null }
): Promise<Page<ContentReviewRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "deliverable.view" });
  const { query } = input;
  const conditions = new Conditions().add("d.workspace_id = ?::uuid", input.workspaceId);
  if (input.deliverableId) conditions.add("d.id = ?::uuid", input.deliverableId);
  if (query.status) conditions.add("cv.status = ?::content_version_status", query.status);
  conditions.search(["c.name", "cr.display_name", "d.title"], query.q);
  return runPagedList<ContentReviewRow>(sql, {
    select: `cv.id::text, cv.version, cv.status::text, cv.external_url, cv.media_asset_id::text, ma.original_file_name media_file_name,
      cv.creator_note, cv.review_note, cv.submitted_at, cv.reviewed_at,
      d.id::text deliverable_id, d.title deliverable_title, d.status::text deliverable_status, d.platform, d.format, d.requirements_snapshot,
      c.name campaign_name, cr.display_name creator_name`,
    from: `from content_versions cv
      join deliverables d on d.id = cv.deliverable_id
      join campaigns c on c.id = d.campaign_id
      join creator_profiles cr on cr.id = d.creator_profile_id
      left join media_assets ma on ma.id = cv.media_asset_id and ma.workspace_id = d.workspace_id`,
    conditions,
    orderBy: order[query.sort],
    tiebreaker: "cv.id",
    query
  });
}
