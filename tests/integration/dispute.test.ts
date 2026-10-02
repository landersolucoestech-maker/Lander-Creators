import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createEngagementFixture, createUser } from "./engagement-fixture";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { listWorkspaceDisputes, openCreatorDispute, resolveDispute, startDisputeReview } from "@/server/dispute/service";

const sql = createTestSql();

async function auditActions(entityId: string) {
  const rows = await sql.unsafe("select action from audit_logs where entity_type='dispute' and entity_id=$1 order by created_at", [entityId]);
  return rows.map((r) => String(r.action));
}

describe("Disputes", () => {
  beforeEach(async () => resetSecurityData(sql));
  afterAll(async () => sql.end());

  it("lets only the engagement creator open a dispute and audits it", async () => {
    const f = await createEngagementFixture(sql, "d1");
    const stranger = await createUser(sql, "stranger@d1.test");
    await expect(
      openCreatorDispute(sql, { userId: stranger, engagementId: f.engagementId, reason: "x" })
    ).rejects.toMatchObject({ code: "CREATOR_PROFILE_REQUIRED" });

    const other = await createEngagementFixture(sql, "d1b");
    await expect(
      openCreatorDispute(sql, { userId: other.creatorUser, engagementId: f.engagementId, reason: "x" })
    ).rejects.toMatchObject({ code: "ENGAGEMENT_NOT_FOUND", status: 404 });

    const d = await openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "  Atraso  ", details: " d " });
    expect(d.status).toBe("OPEN");
    const row = await sql.unsafe("select reason,details,workspace_id::text w from disputes where id=$1::uuid", [d.id]);
    expect(row[0]).toMatchObject({ reason: "Atraso", details: "d", w: f.workspaceId });
    expect(await auditActions(String(d.id))).toEqual(["dispute.opened"]);
  });

  it("allows a single active dispute per engagement, even under concurrency", async () => {
    const f = await createEngagementFixture(sql, "d2");
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () => openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "Pagamento" }))
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    for (const a of attempts.filter((a) => a.status === "rejected")) {
      expect((a as PromiseRejectedResult).reason).toMatchObject({ code: "DISPUTE_ALREADY_ACTIVE", status: 409 });
    }
    const count = await sql.unsafe("select count(*)::int c from disputes where engagement_id=$1::uuid", [f.engagementId]);
    expect(count[0].c).toBe(1);
  });

  it("enforces tenant isolation on listing, review and resolution", async () => {
    const f = await createEngagementFixture(sql, "d3");
    const d = await openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "Escopo" });
    const outsider = await createUser(sql, "outsider@d3.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "Other", type: "AGENCY", idempotencyKey: "d3-other" });

    for (const [user, ws] of [[outsider, f.workspaceId], [f.creatorUser, f.workspaceId]] as const) {
      await expect(listWorkspaceDisputes(sql, { userId: user, workspaceId: ws })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
      await expect(
        resolveDispute(sql, { userId: user, workspaceId: ws, disputeId: String(d.id), resolution: "ok" })
      ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
      await expect(startDisputeReview(sql, { userId: user, workspaceId: ws, disputeId: String(d.id) })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    }

    // A member of another workspace cannot act on this dispute through their own workspace id.
    await expect(
      resolveDispute(sql, { userId: outsider, workspaceId: String(otherWs.id), disputeId: String(d.id), resolution: "ok" })
    ).rejects.toMatchObject({ code: "DISPUTE_RESOLUTION_NOT_ALLOWED" });
    expect(await listWorkspaceDisputes(sql, { userId: outsider, workspaceId: String(otherWs.id) })).toHaveLength(0);
    expect((await sql.unsafe("select status::text s from disputes where id=$1::uuid", [d.id]))[0].s).toBe("OPEN");
  });

  it("follows OPEN -> UNDER_REVIEW -> RESOLVED and rejects invalid transitions", async () => {
    const f = await createEngagementFixture(sql, "d4");
    const d = await openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "Qualidade" });
    const id = String(d.id);

    expect((await startDisputeReview(sql, { userId: f.owner, workspaceId: f.workspaceId, disputeId: id })).status).toBe("UNDER_REVIEW");
    await expect(startDisputeReview(sql, { userId: f.owner, workspaceId: f.workspaceId, disputeId: id })).rejects.toMatchObject({ code: "DISPUTE_REVIEW_NOT_ALLOWED", status: 409 });

    expect((await resolveDispute(sql, { userId: f.owner, workspaceId: f.workspaceId, disputeId: id, resolution: " Acordo " })).status).toBe("RESOLVED");
    await expect(resolveDispute(sql, { userId: f.owner, workspaceId: f.workspaceId, disputeId: id, resolution: "outra" })).rejects.toMatchObject({ code: "DISPUTE_RESOLUTION_NOT_ALLOWED" });
    await expect(startDisputeReview(sql, { userId: f.owner, workspaceId: f.workspaceId, disputeId: id })).rejects.toMatchObject({ code: "DISPUTE_REVIEW_NOT_ALLOWED" });

    const row = await sql.unsafe("select resolution,resolved_by_user_id from disputes where id=$1::uuid", [id]);
    expect(row[0]).toMatchObject({ resolution: "Acordo", resolved_by_user_id: f.owner });
    expect(await auditActions(id)).toEqual(["dispute.opened", "dispute.review_started", "dispute.resolved"]);

    // A resolved dispute no longer blocks a new one for the same engagement.
    expect((await openCreatorDispute(sql, { userId: f.creatorUser, engagementId: f.engagementId, reason: "Nova" })).status).toBe("OPEN");
  });
});
