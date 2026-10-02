import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { addMember, createEngagementFixture, createNegotiationFixture, createPublicationFixture, createUser } from "./engagement-fixture";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { parseListQuery, type ListQueryConfig } from "@/server/shared/list-query";
import { ensureEngagementPayable } from "@/server/finance/service";
import { openCreatorDispute, disputeListConfig, listWorkspaceDisputes } from "@/server/dispute/service";
import { createWorkspaceProposal } from "@/server/proposal/service";
import { listWorkspaceNegotiations, negotiationListConfig } from "@/server/application/operations/negotiations";
import { contractListConfig, engagementListConfig, listWorkspaceContracts, listWorkspaceEngagements } from "@/server/application/operations/engagements";
import { contentReviewListConfig, listWorkspaceContentVersions } from "@/server/application/operations/content-review";
import { listWorkspacePlannableDeliverables, listWorkspacePublications, plannableListConfig, publicationListConfig } from "@/server/application/operations/publications";
import { listWorkspacePayableCandidates, listWorkspacePayables, payableCandidateListConfig, payableListConfig } from "@/server/application/operations/payables";
import { campaignAnalyticsListConfig, listWorkspaceCampaignAnalytics, listWorkspaceMetricTargets, metricTargetListConfig } from "@/server/application/operations/analytics";

const sql = createTestSql();
afterAll(async () => sql.end());

const q = <S extends string>(config: ListQueryConfig<S>, params: Record<string, string> = {}) => parseListQuery(params, config);

type Fixture = Awaited<ReturnType<typeof createEngagementFixture>>;

/** One list area: how to call it and which permission-less role must be refused. */
const areas: Array<{ name: string; deniedRole: string; call: (f: { userId: string; workspaceId: string }) => Promise<{ rows: unknown[] }> }> = [
  { name: "negotiations", deniedRole: "", call: (c) => listWorkspaceNegotiations(sql, { ...c, query: q(negotiationListConfig) }) },
  { name: "engagements", deniedRole: "", call: (c) => listWorkspaceEngagements(sql, { ...c, query: q(engagementListConfig) }) },
  { name: "contracts", deniedRole: "", call: (c) => listWorkspaceContracts(sql, { ...c, query: q(contractListConfig) }) },
  { name: "content versions", deniedRole: "", call: (c) => listWorkspaceContentVersions(sql, { ...c, query: q(contentReviewListConfig) }) },
  { name: "publications", deniedRole: "", call: (c) => listWorkspacePublications(sql, { ...c, query: q(publicationListConfig) }) },
  { name: "plannable deliverables", deniedRole: "", call: (c) => listWorkspacePlannableDeliverables(sql, { ...c, query: q(plannableListConfig) }) },
  { name: "payables", deniedRole: "MARKETING", call: (c) => listWorkspacePayables(sql, { ...c, query: q(payableListConfig) }) },
  { name: "payable candidates", deniedRole: "MARKETING", call: (c) => listWorkspacePayableCandidates(sql, { ...c, query: q(payableCandidateListConfig) }) },
  { name: "campaign analytics", deniedRole: "", call: (c) => listWorkspaceCampaignAnalytics(sql, { ...c, query: q(campaignAnalyticsListConfig) }) },
  { name: "metric targets", deniedRole: "", call: (c) => listWorkspaceMetricTargets(sql, { ...c, query: q(metricTargetListConfig) }) },
  { name: "disputes", deniedRole: "MARKETING", call: (c) => listWorkspaceDisputes(sql, { ...c, query: q(disputeListConfig) }) }
];

describe("Workspace read models: authorization and tenant isolation", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("serves authorized members and refuses outsiders, other workspaces and Creators on every list", async () => {
    const f = await createEngagementFixture(sql, "rm1");
    await createPublicationFixture(sql, f);
    const outsider = await createUser(sql, "outsider@rm1.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "Other", type: "AGENCY", idempotencyKey: "rm1-o" });
    for (const area of areas) {
      await expect(area.call({ userId: f.owner, workspaceId: f.workspaceId }), `${area.name}: owner`).resolves.toHaveProperty("rows");
      // authenticated user with no membership in the workspace
      await expect(area.call({ userId: outsider, workspaceId: f.workspaceId }), `${area.name}: outsider`).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
      // the Creator of the engagement is not a Workspace member either
      await expect(area.call({ userId: f.creatorUser, workspaceId: f.workspaceId }), `${area.name}: creator`).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
      // a foreign member, through their own workspace, sees none of this tenant's data
      const own = await area.call({ userId: outsider, workspaceId: String(otherWs.id) });
      expect(own.rows, `${area.name}: foreign workspace`).toHaveLength(0);
    }
  });

  it("refuses a member of the same workspace whose role lacks the view permission", async () => {
    const f = await createEngagementFixture(sql, "rm2");
    const marketing = await addMember(sql, f.workspaceId, "MARKETING", "rm2");
    for (const area of areas.filter((a) => a.deniedRole === "MARKETING")) {
      await expect(area.call({ userId: marketing, workspaceId: f.workspaceId }), area.name).rejects.toMatchObject({ code: "MISSING_PERMISSION" });
    }
    // The same role may read areas it holds a permission for.
    await expect(listWorkspaceEngagements(sql, { userId: marketing, workspaceId: f.workspaceId, query: q(engagementListConfig) })).resolves.toHaveProperty("rows");
  });
});

describe("Workspace read models: content, filters, sorting and pagination", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("projects an engagement with its cross-domain status summary", async () => {
    const f = await createEngagementFixture(sql, "rm3");
    await createPublicationFixture(sql, f);
    await ensureEngagementPayable(sql, { userId: f.owner, workspaceId: f.workspaceId, engagementId: f.engagementId });
    await openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "Atraso" });
    const page = await listWorkspaceEngagements(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(engagementListConfig) });
    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({
      id: f.engagementId, status: "ACTIVE", amount_minor: "5000", currency_code: "BRL", deliverables_total: 1, deliverables_approved: 1,
      publications_verified: 1, payable_status: "PENDING", has_active_dispute: true, contract_status: null
    });
    const payables = await listWorkspacePayables(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(payableListConfig) });
    expect(payables.rows[0]).toMatchObject({ status: "PENDING", deliverables_required: 1, publications_verified: 1, has_active_dispute: true });
    const candidates = await listWorkspacePayableCandidates(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(payableCandidateListConfig) });
    expect(candidates.rows).toHaveLength(0);
  });

  it("projects a negotiation as the participation with its latest proposal round", async () => {
    const f = await createNegotiationFixture(sql, "rm4");
    expect((await listWorkspaceNegotiations(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(negotiationListConfig) })).rows[0]).toMatchObject({ proposal_id: null, participation_status: "APPLIED" });
    await createWorkspaceProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, participationId: f.participationId, amountMinor: 7000, currencyCode: "BRL", scopeSummary: "Reel" });
    const row = (await listWorkspaceNegotiations(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(negotiationListConfig) })).rows[0];
    expect(row).toMatchObject({ proposal_round: 1, proposal_status: "PENDING_CREATOR", proposed_by: "WORKSPACE", proposal_amount_minor: "7000", engagement_id: null });
  });

  it("lists plannable deliverables only until a publication is planned and exposes content history", async () => {
    const f = await createEngagementFixture(sql, "rm5");
    await createPublicationFixture(sql, f, { title: "Planned", publicationStatus: "READY" });
    await createPublicationFixture(sql, f, { title: "Waiting", publicationStatus: null });
    const plannable = await listWorkspacePlannableDeliverables(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(plannableListConfig) });
    expect(plannable.rows.map((r) => r.title)).toEqual(["Waiting"]);
    const versions = await listWorkspaceContentVersions(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(contentReviewListConfig) });
    expect(versions.total).toBe(2);
    const one = await listWorkspaceContentVersions(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(contentReviewListConfig), deliverableId: plannable.rows[0].id });
    expect(one.rows).toHaveLength(1);
  });

  it("filters by status and text, sorts by whitelisted keys and paginates without overlap", async () => {
    const f = await createEngagementFixture(sql, "rm6");
    for (const [i, status] of ["VERIFIED", "READY", "VERIFIED", "FAILED", "READY"].entries()) {
      await createPublicationFixture(sql, f, { title: `Item ${i}`, publicationStatus: status });
    }
    const run = (params: Record<string, string>) => listWorkspacePublications(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(publicationListConfig, params) });
    expect((await run({ status: "VERIFIED" })).total).toBe(2);
    expect((await run({ q: "item 3" })).rows.map((r) => r.deliverable_title)).toEqual(["Item 3"]);
    expect((await run({ q: "100%" })).total).toBe(0); // LIKE wildcards are escaped, not interpreted
    const sorted = await run({ sort: "deliverable", dir: "asc" });
    expect(sorted.rows.map((r) => r.deliverable_title)).toEqual(["Item 0", "Item 1", "Item 2", "Item 3", "Item 4"]);
    const first = await run({ sort: "deliverable", dir: "asc", pageSize: "2", page: "1" });
    const second = await run({ sort: "deliverable", dir: "asc", pageSize: "2", page: "2" });
    const third = await run({ sort: "deliverable", dir: "asc", pageSize: "2", page: "3" });
    expect([...first.rows, ...second.rows, ...third.rows].map((r) => r.deliverable_title)).toEqual(["Item 0", "Item 1", "Item 2", "Item 3", "Item 4"]);
    expect(first).toMatchObject({ total: 5, pageCount: 3, page: 1 });
    // A hostile sort/status value falls back to defaults instead of reaching SQL.
    const hostile = await run({ sort: "p.id; drop table publications", status: "x' or '1'='1" });
    expect(hostile.total).toBe(5);
  });

  it("reports campaign analytics from the latest immutable snapshot only and flags publications without metrics", async () => {
    const f = await createEngagementFixture(sql, "rm7");
    const a = await createPublicationFixture(sql, f, { title: "A" });
    await createPublicationFixture(sql, f, { title: "B" });
    for (const views of [100, 300]) {
      await sql.unsafe("insert into publication_metrics_snapshots(publication_id,views,source,captured_at) values($1::uuid,$2,'manual',$3::timestamptz)", [a.publicationId, views, new Date(Date.now() + views * 1000).toISOString()]);
    }
    const analytics = await listWorkspaceCampaignAnalytics(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(campaignAnalyticsListConfig) });
    expect(analytics.rows[0]).toMatchObject({ publications: 2, verified_publications: 2, with_metrics: 1, views: "300" });
    const targets = await listWorkspaceMetricTargets(sql, { userId: f.owner, workspaceId: f.workspaceId, query: q(metricTargetListConfig) });
    expect(targets.total).toBe(2);
    expect(targets.rows.find((r) => r.title === "B")).toMatchObject({ views: null, last_captured_at: null });
  });
});
