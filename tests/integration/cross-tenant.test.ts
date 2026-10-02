import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createUser, createEngagementFixture } from "./engagement-fixture";
import { createWorkspace } from "@/server/workspace/workspace-service";
import {
  setBuilderStepCompletion, transitionCampaign, updateCampaignBudgetCapacity, updateCampaignGoalContext,
  updateCampaignRightsRequirements, updateCampaignSchedule, updateCampaignTargeting, updateCampaignTracking
} from "@/server/campaign/service";
import { createArtist, updateArtist } from "@/server/music-catalog/artist-service";
import { createCompany, activatePromotedEntity, updateCommercialEntity } from "@/server/promoted-entities/service";

const sql = createTestSql();
afterAll(async () => sql.end());

async function foreignWorkspace(tag: string) {
  const userId = await createUser(sql, `foreign@${tag}.test`);
  const w = await createWorkspace(sql, { userId, name: `Foreign ${tag}`, type: "AGENCY", idempotencyKey: `foreign-${tag}` });
  return { userId, workspaceId: String(w.id) };
}
async function revisionOf(campaignId: string) {
  return Number((await sql.unsafe("select revision from campaigns where id=$1::uuid", [campaignId]))[0].revision);
}

describe("Cross-tenant and role isolation for mutations", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("campaign mutators never operate on a campaign of another workspace", async () => {
    const f = await createEngagementFixture(sql, "ct1");
    const x = await foreignWorkspace("ct1");
    const revision = await revisionOf(f.campaignId);
    const base = { userId: x.userId, campaignId: f.campaignId, revision };
    const calls: Array<[string, (workspaceId: string) => Promise<unknown>]> = [
      ["goal", (workspaceId) => updateCampaignGoalContext(sql, { ...base, workspaceId, name: "Hijack", goalCode: "AWARENESS" })],
      ["targeting", (workspaceId) => updateCampaignTargeting(sql, { ...base, workspaceId, platforms: [], nicheIds: [], contentStyleIds: [], musicGenreIds: [], countryCodes: [], languageCodes: [] })],
      ["schedule", (workspaceId) => updateCampaignSchedule(sql, { ...base, workspaceId, mode: "EVERGREEN", startsAt: null, endsAt: null, timezoneCode: "UTC" })],
      ["budget", (workspaceId) => updateCampaignBudgetCapacity(sql, { ...base, workspaceId, budgetMinor: 1, targetCreatorCount: 1, maximumCreatorCount: 1 })],
      ["rights", (workspaceId) => updateCampaignRightsRequirements(sql, { ...base, workspaceId, organicUsageDays: 1, paidMediaAllowed: false, whitelistingRequired: false, exclusivityRequired: false, usageDurationDays: 1 })],
      ["tracking", (workspaceId) => updateCampaignTracking(sql, { ...base, workspaceId, objectives: [] })],
      ["step", (workspaceId) => setBuilderStepCompletion(sql, { userId: x.userId, workspaceId, campaignId: f.campaignId, step: 1, completed: true })],
      ["transition", (workspaceId) => transitionCampaign(sql, { userId: x.userId, workspaceId, campaignId: f.campaignId, to: "CANCELLED" })]
    ];
    for (const [label, run] of calls) {
      await expect(run(x.workspaceId), `${label} via own workspace`).rejects.toMatchObject({ code: "CAMPAIGN_NOT_FOUND" });
      await expect(run(f.workspaceId), `${label} via victim workspace`).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    }
    const row = await sql.unsafe("select name,status::text s,revision from campaigns where id=$1::uuid", [f.campaignId]);
    expect(row[0].name).toBe("Campaign ct1");
    expect(row[0].s).not.toBe("CANCELLED");
    expect(Number(row[0].revision)).toBe(revision);
  });

  it("a Viewer cannot run privileged campaign mutations", async () => {
    const f = await createEngagementFixture(sql, "ct2");
    const viewer = await sql.unsafe("select id::text from roles where code='VIEWER' and workspace_id is null");
    await sql.unsafe("update memberships set role_id=$2::uuid where workspace_id=$1::uuid and user_id=$3", [f.workspaceId, String(viewer[0].id), f.owner]);
    const revision = await revisionOf(f.campaignId);
    await expect(updateCampaignGoalContext(sql, { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, revision, name: "x", goalCode: "AWARENESS" })).rejects.toMatchObject({ code: "MISSING_PERMISSION" });
    await expect(transitionCampaign(sql, { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, to: "ACTIVE" })).rejects.toMatchObject({ code: "MISSING_PERMISSION" });
    expect((await sql.unsafe("select name from campaigns where id=$1::uuid", [f.campaignId]))[0].name).toBe("Campaign ct2");
  });

  it("artist and promoted-entity mutations are denied across workspaces and leave data unchanged", async () => {
    const owner = await createUser(sql, "owner@ct3.test");
    const w = await createWorkspace(sql, { userId: owner, name: "Owner", type: "LABEL", idempotencyKey: "ct3" });
    const workspaceId = String(w.id);
    const x = await foreignWorkspace("ct3");

    const artist = await createArtist(sql, { userId: owner, workspaceId, artisticName: "Original Artist" });
    await expect(updateArtist(sql, { userId: x.userId, workspaceId: x.workspaceId, artistId: String(artist.id), artisticName: "Hijacked" })).rejects.toBeDefined();
    await expect(updateArtist(sql, { userId: x.userId, workspaceId, artistId: String(artist.id), artisticName: "Hijacked" })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    expect((await sql.unsafe("select artistic_name n from artists where id=$1::uuid", [String(artist.id)]))[0].n).toBe("Original Artist");

    const company = await createCompany(sql, { userId: owner, workspaceId, tradeName: "Original Company" });
    const entityId = String(company.id);
    await expect(updateCommercialEntity(sql, { userId: x.userId, workspaceId: x.workspaceId, entityType: "COMPANY", entityId, name: "Hijacked" })).rejects.toMatchObject({ code: "PROMOTED_ENTITY_ACCESS_DENIED" });
    await expect(activatePromotedEntity(sql, { userId: x.userId, workspaceId: x.workspaceId, entityType: "COMPANY", entityId })).rejects.toMatchObject({ code: "PROMOTED_ENTITY_ACCESS_DENIED" });
    await expect(updateCommercialEntity(sql, { userId: x.userId, workspaceId, entityType: "COMPANY", entityId, name: "Hijacked" })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    const row = await sql.unsafe("select trade_name n,status::text s from companies where id=$1::uuid", [entityId]);
    expect(row[0].n).toBe("Original Company");
    expect(row[0].s).not.toBe("ACTIVE");
  });
});
