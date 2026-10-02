import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { pageOf, type ListQuery, type Page } from "@/server/shared/list-query";
import { Conditions, runPagedList } from "@/server/shared/paged-sql";

export const campaignAnalyticsListConfig = {
  sorts: ["name", "status", "views", "publications"] as const,
  defaultSort: "name" as const,
  defaultDir: "asc" as const
};
export type CampaignAnalyticsSort = (typeof campaignAnalyticsListConfig.sorts)[number];

const campaignOrder: Record<CampaignAnalyticsSort, string> = {
  name: "c.name",
  status: "c.status",
  views: "coalesce(sum(l.views), 0)",
  publications: "count(distinct p.id)"
};

/** Latest immutable snapshot per publication, summed per campaign. Counters are bigint text (never floats). */
export type CampaignAnalyticsRow = {
  id: string;
  name: string;
  status: string;
  publications: number;
  verified_publications: number;
  with_metrics: number;
  views: string;
  reach: string;
  impressions: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  clicks: string;
};

export async function listWorkspaceCampaignAnalytics(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<CampaignAnalyticsSort> }
): Promise<Page<CampaignAnalyticsRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "analytics.view" });
  const { query } = input;
  const params: (string | number)[] = [input.workspaceId];
  let search = "";
  if (query.q) {
    params.push(`%${query.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
    search = ` and c.name ilike $${params.length}`;
  }
  const total = await sql.unsafe<{ n: number }[]>(`select count(*)::int n from campaigns c where c.workspace_id = $1::uuid${search}`, params);
  const limit = params.length + 1;
  const rows = await sql.unsafe<CampaignAnalyticsRow[]>(
    `with latest as (
       select distinct on (m.publication_id) m.* from publication_metrics_snapshots m
       join publications p on p.id = m.publication_id where p.workspace_id = $1::uuid
       order by m.publication_id, m.captured_at desc)
     select c.id::text, c.name, c.status::text,
       count(distinct p.id)::int publications,
       count(distinct case when p.status = 'VERIFIED' then p.id end)::int verified_publications,
       count(distinct l.publication_id)::int with_metrics,
       coalesce(sum(l.views), 0)::text views, coalesce(sum(l.reach), 0)::text reach, coalesce(sum(l.impressions), 0)::text impressions,
       coalesce(sum(l.likes), 0)::text likes, coalesce(sum(l.comments), 0)::text comments, coalesce(sum(l.shares), 0)::text shares,
       coalesce(sum(l.saves), 0)::text saves, coalesce(sum(l.clicks), 0)::text clicks
     from campaigns c
     left join publications p on p.campaign_id = c.id
     left join latest l on l.publication_id = p.id
     where c.workspace_id = $1::uuid${search}
     group by c.id
     order by ${campaignOrder[query.sort]} ${query.dir === "asc" ? "asc" : "desc"}, c.id
     limit $${limit}::int offset $${limit + 1}::int`,
    [...params, query.pageSize, (query.page - 1) * query.pageSize]
  );
  return pageOf(rows, total[0].n, query);
}

export const metricTargetListConfig = {
  sorts: ["updated_at", "campaign", "creator", "views"] as const,
  defaultSort: "updated_at" as const
};
export type MetricTargetSort = (typeof metricTargetListConfig.sorts)[number];

const targetOrder: Record<MetricTargetSort, string> = {
  updated_at: "p.updated_at",
  campaign: "c.name",
  creator: "cr.display_name",
  views: "ls.views"
};

export type MetricTargetRow = {
  id: string;
  title: string;
  platform: string;
  status: string;
  proof_url: string | null;
  campaign_name: string;
  creator_name: string;
  last_captured_at: Date | null;
  last_source: string | null;
  views: string | null;
};

/** Publications that can receive a metric snapshot (published or verified), with their latest snapshot if any. */
export async function listWorkspaceMetricTargets(
  sql: Sql,
  input: { userId: string; workspaceId: string; query: ListQuery<MetricTargetSort> }
): Promise<Page<MetricTargetRow>> {
  await authorizeWorkspacePermission(sql, { userId: input.userId, workspaceId: input.workspaceId, permission: "analytics.view" });
  const { query } = input;
  const conditions = new Conditions().add("p.workspace_id = ?::uuid", input.workspaceId).add("p.status in ('PUBLISHED', 'VERIFIED')");
  conditions.search(["c.name", "cr.display_name", "d.title"], query.q);
  return runPagedList<MetricTargetRow>(sql, {
    select: `p.id::text, d.title, p.platform, p.status::text, p.proof_url, c.name campaign_name, cr.display_name creator_name,
      ls.captured_at last_captured_at, ls.source last_source, ls.views::text views`,
    from: `from publications p
      join deliverables d on d.id = p.deliverable_id
      join campaigns c on c.id = p.campaign_id
      join creator_profiles cr on cr.id = p.creator_profile_id
      left join lateral (select m.* from publication_metrics_snapshots m where m.publication_id = p.id order by m.captured_at desc limit 1) ls on true`,
    conditions,
    orderBy: targetOrder[query.sort],
    tiebreaker: "p.id",
    query
  });
}
