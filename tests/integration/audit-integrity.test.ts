import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createEngagementFixture } from "./engagement-fixture";
import { setCreatorAvailability } from "@/server/creator/creator-service";
import { addDeclaredSocialProfile, removeSocialProfile } from "@/server/creator/social-profile-service";
import { writeAudit, writeGlobalAudit } from "@/server/shared/audit";

const sql = createTestSql();
afterAll(async () => sql.end());

describe("audit_logs integrity", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("stores delta as a queryable JSON object for every writer", async () => {
    // Exercises the legacy writers (workspace, creator, campaign) and the shared writer.
    const f = await createEngagementFixture(sql, "au1");
    await writeAudit(sql, { actorId: f.owner, workspaceId: f.workspaceId, action: "test.shared", entityType: "test", entityId: "1", delta: { a: 1 } });
    const rows = await sql.unsafe("select action,jsonb_typeof(delta) t from audit_logs");
    expect(rows.length).toBeGreaterThan(2);
    // A missing delta (NULL) is legitimate; a JSON string is the double-serialization defect.
    expect(rows.filter((r) => r.t !== null && r.t !== "object").map((r) => r.action)).toEqual([]);
    const shared = await sql.unsafe("select delta->>'a' a from audit_logs where action='test.shared'");
    expect(shared[0].a).toBe("1");
  });

  it("audits Creator-context changes without a workspace and with a structured delta", async () => {
    const f = await createEngagementFixture(sql, "au2");
    await setCreatorAvailability(sql, { userId: f.creatorUser, creatorProfileId: f.creatorProfileId, availability: "LIMITED_AVAILABILITY" });
    const social = await addDeclaredSocialProfile(sql, { userId: f.creatorUser, creatorProfileId: f.creatorProfileId, platform: "YOUTUBE", handle: "canal", profileUrl: "https://youtube.com/@canal" });
    await removeSocialProfile(sql, { userId: f.creatorUser, creatorProfileId: f.creatorProfileId, socialProfileId: String((social as Record<string, unknown>).id) });
    const rows = await sql.unsafe("select action,workspace_id,entity_type,jsonb_typeof(delta) t from audit_logs where actor_id=$1 and action like 'creator.%' order by action", [f.creatorUser]);
    expect(rows.map((r) => r.action)).toEqual(["creator.availability_changed", "creator.created", "creator.social_added", "creator.social_removed"]);
    for (const row of rows) expect(row.workspace_id).toBeNull();
    expect(rows.find((r) => r.action === "creator.availability_changed")!.t).toBe("object");
  });

  it("rolls the audit row back together with the change when the transaction fails", async () => {
    const f = await createEngagementFixture(sql, "au3");
    await expect(
      sql.begin(async (tx) => {
        await tx.unsafe("update campaigns set name='Changed' where id=$1::uuid", [f.campaignId]);
        await writeAudit(tx, { actorId: f.owner, workspaceId: f.workspaceId, action: "test.rolled_back", entityType: "campaign", entityId: f.campaignId });
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect((await sql.unsafe("select name from campaigns where id=$1::uuid", [f.campaignId]))[0].name).toBe("Campaign au3");
    expect(await sql.unsafe("select 1 from audit_logs where action='test.rolled_back'")).toHaveLength(0);
  });

  it("accepts global audit rows for non-tenant records", async () => {
    const f = await createEngagementFixture(sql, "au4");
    await writeGlobalAudit(sql, { actorId: f.owner, action: "test.global", entityType: "user", entityId: f.owner });
    const rows = await sql.unsafe("select workspace_id,delta from audit_logs where action='test.global'");
    expect(rows).toHaveLength(1);
    expect(rows[0].workspace_id).toBeNull();
    expect(rows[0].delta).toBeNull();
  });
});
