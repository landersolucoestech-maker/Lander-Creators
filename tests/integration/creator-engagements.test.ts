import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { addEngagement, createEngagementFixture, createUser } from "./engagement-fixture";
import { listCreatorEngagements } from "@/server/engagement/service";
import { openCreatorDispute, resolveDispute } from "@/server/dispute/service";

const sql = createTestSql();
afterAll(async () => sql.end());

describe("Creator engagement list", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("shows a creator only their own engagements", async () => {
    const f = await createEngagementFixture(sql, "ce1");
    const other = await addEngagement(sql, f, "ce1b");
    const mine = await listCreatorEngagements(sql, f.creatorUser);
    const theirs = await listCreatorEngagements(sql, other.creatorUser);
    expect(mine.map((r) => r.id)).toEqual([f.engagementId]);
    expect(theirs.map((r) => r.id)).toEqual([other.engagementId]);
    expect(mine[0]).toMatchObject({ status: "ACTIVE", amount_minor: "5000", currency_code: "BRL", dispute_status: null, campaign_name: "Campaign ce1" });
  });

  it("returns nothing to users without a Creator profile or with no engagement", async () => {
    const stranger = await createUser(sql, "stranger@ce2.test");
    expect(await listCreatorEngagements(sql, stranger)).toEqual([]);
  });

  it("does not expose Workspace-internal data", async () => {
    const f = await createEngagementFixture(sql, "ce3");
    const row = (await listCreatorEngagements(sql, f.creatorUser))[0] as Record<string, unknown>;
    for (const key of ["workspace_id", "created_by_user_id", "participation_id", "accepted_proposal_id"]) expect(row).not.toHaveProperty(key);
  });

  it("reports the dispute lifecycle on the engagement and allows a new one only after resolution", async () => {
    const f = await createEngagementFixture(sql, "ce4");
    const open = await openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "Atraso" });
    expect((await listCreatorEngagements(sql, f.creatorUser))[0]).toMatchObject({ dispute_status: "OPEN", dispute_resolution: null });
    await expect(openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "Outra" })).rejects.toMatchObject({ code: "DISPUTE_ALREADY_ACTIVE" });
    await resolveDispute(sql, { userId: f.owner, workspaceId: f.workspaceId, disputeId: String(open.id), resolution: "Acordo fechado" });
    expect((await listCreatorEngagements(sql, f.creatorUser))[0]).toMatchObject({ dispute_status: "RESOLVED", dispute_resolution: "Acordo fechado" });
  });
});
