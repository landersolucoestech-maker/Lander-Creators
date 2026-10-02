import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createEngagementFixture } from "./engagement-fixture";
import { transitionCampaign, updateCampaignBudgetCapacity, updateCampaignGoalContext } from "@/server/campaign/service";

const sql = createTestSql();
afterAll(async () => sql.end());

const fulfilled = (r: PromiseSettledResult<unknown>[]) => r.filter((x) => x.status === "fulfilled").length;

async function revisionOf(campaignId: string) {
  return Number((await sql.unsafe("select revision from campaigns where id=$1::uuid", [campaignId]))[0].revision);
}

describe("Campaign mutations are atomic and audited", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("applies a transition once under concurrency and audits it once", async () => {
    const f = await createEngagementFixture(sql, "ch1");
    await sql.unsafe("update campaigns set status='ACTIVE' where id=$1::uuid", [f.campaignId]);
    const before = await revisionOf(f.campaignId);
    const ctx = { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, to: "PAUSED" as const };
    const out = await Promise.allSettled([transitionCampaign(sql, ctx), transitionCampaign(sql, ctx), transitionCampaign(sql, ctx)]);
    // Racing callers that lose observe the target status and return without a second write.
    expect(fulfilled(out)).toBe(3);
    const audits = await sql.unsafe("select count(*)::int c from audit_logs where action='campaign.paused' and entity_id=$1", [f.campaignId]);
    expect(audits[0].c).toBe(1);
    expect(await revisionOf(f.campaignId)).toBe(before + 1);
  });

  it("does not bump the revision when the guarded update fails validation", async () => {
    const f = await createEngagementFixture(sql, "ch2");
    const before = await revisionOf(f.campaignId);
    await expect(
      updateCampaignBudgetCapacity(sql, { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, revision: before, budgetMinor: -5, targetCreatorCount: null, maximumCreatorCount: null })
    ).rejects.toMatchObject({ code: "CAMPAIGN_BUDGET_INVALID" });
    expect(await revisionOf(f.campaignId)).toBe(before);
  });

  it("applies exactly one of two concurrent writes with the same revision and audits that one", async () => {
    const f = await createEngagementFixture(sql, "ch3");
    const revision = await revisionOf(f.campaignId);
    const budget = (n: number) => updateCampaignBudgetCapacity(sql, { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, revision, budgetMinor: n, targetCreatorCount: null, maximumCreatorCount: null });
    const out = await Promise.allSettled([budget(100), budget(200), budget(300)]);
    expect(fulfilled(out)).toBe(1);
    for (const r of out.filter((x) => x.status === "rejected")) expect((r as PromiseRejectedResult).reason).toMatchObject({ code: "CAMPAIGN_STALE_WRITE" });
    const audits = await sql.unsafe("select count(*)::int c from audit_logs where action='campaign.budget_capacity.updated' and entity_id=$1", [f.campaignId]);
    expect(audits[0].c).toBe(1);
    expect(await revisionOf(f.campaignId)).toBe(revision + 1);
  });

  it("rejects goal updates on a campaign without a promoted object with a stable code", async () => {
    const f = await createEngagementFixture(sql, "ch4");
    const revision = await revisionOf(f.campaignId);
    await expect(
      updateCampaignGoalContext(sql, { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, revision, name: "X", goalCode: "AWARENESS" })
    ).rejects.toMatchObject({ code: "CAMPAIGN_PROMOTED_OBJECT_REQUIRED", status: 409 });
    expect(await revisionOf(f.campaignId)).toBe(revision);
  });
});
