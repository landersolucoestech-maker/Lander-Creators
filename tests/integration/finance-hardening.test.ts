import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { addEngagement, createEngagementFixture, createPublicationFixture, createUser } from "./engagement-fixture";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { ensureEngagementPayable, recordPaid, refreshPayableEligibility, releasePayable } from "@/server/finance/service";

const sql = createTestSql();
afterAll(async () => sql.end());

async function audits(entityId: string) {
  const rows = await sql.unsafe("select action from audit_logs where entity_type='campaign_payable' and entity_id=$1 order by created_at,id", [entityId]);
  return rows.map((r) => String(r.action));
}

async function eligiblePayable(tag: string) {
  const f = await createEngagementFixture(sql, tag);
  const pub = await createPublicationFixture(sql, f);
  const ctx = { userId: f.owner, workspaceId: f.workspaceId };
  const p = await ensureEngagementPayable(sql, { ...ctx, engagementId: f.engagementId });
  await refreshPayableEligibility(sql, { ...ctx, payableId: String(p.id) });
  return { f, pub, ctx, payableId: String(p.id) };
}

describe("Finance hardening", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("audits the whole payable lifecycle in order", async () => {
    const { ctx, payableId } = await eligiblePayable("fh1");
    await releasePayable(sql, { ...ctx, payableId });
    await recordPaid(sql, { ...ctx, payableId, externalPaymentReference: "ref-1" });
    expect(await audits(payableId)).toEqual(["payable.created", "payable.eligible", "payable.released", "payable.paid"]);
  });

  it("creates the payable once, even concurrently, and audits creation once", async () => {
    const f = await createEngagementFixture(sql, "fh2");
    const ctx = { userId: f.owner, workspaceId: f.workspaceId, engagementId: f.engagementId };
    const results = await Promise.all(Array.from({ length: 5 }, () => ensureEngagementPayable(sql, ctx)));
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(await audits(String(results[0].id))).toEqual(["payable.created"]);
  });

  it("releases exactly once under concurrency", async () => {
    const { ctx, payableId } = await eligiblePayable("fh3");
    const out = await Promise.allSettled(Array.from({ length: 6 }, () => releasePayable(sql, { ...ctx, payableId })));
    expect(out.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    for (const o of out.filter((o) => o.status === "rejected")) {
      expect((o as PromiseRejectedResult).reason).toMatchObject({ code: "PAYABLE_RELEASE_NOT_ALLOWED", status: 409 });
    }
    expect((await audits(payableId)).filter((a) => a === "payable.released")).toHaveLength(1);
  });

  it("re-verifies publications at release time", async () => {
    const { ctx, pub, payableId } = await eligiblePayable("fh4");
    await sql.unsafe("update publications set status='FAILED' where id=$1::uuid", [pub.publicationId]);
    await expect(releasePayable(sql, { ...ctx, payableId })).rejects.toMatchObject({ code: "PAYABLE_NOT_ELIGIBLE", status: 409 });
    expect((await sql.unsafe("select status::text s from campaign_payables where id=$1::uuid", [payableId]))[0].s).toBe("ELIGIBLE");
  });

  it("requires every non-cancelled deliverable to have a verified publication", async () => {
    const f = await createEngagementFixture(sql, "fh5");
    await createPublicationFixture(sql, f, { title: "A" });
    await createPublicationFixture(sql, f, { title: "B", publicationStatus: null });
    await createPublicationFixture(sql, f, { title: "C", deliverableStatus: "CANCELLED", publicationStatus: null });
    const ctx = { userId: f.owner, workspaceId: f.workspaceId };
    const p = await ensureEngagementPayable(sql, { ...ctx, engagementId: f.engagementId });
    await expect(refreshPayableEligibility(sql, { ...ctx, payableId: String(p.id) })).rejects.toMatchObject({ code: "PAYABLE_NOT_ELIGIBLE" });
    await sql.unsafe("update deliverables set status='CANCELLED' where engagement_id=$1::uuid and title='B'", [f.engagementId]);
    expect((await refreshPayableEligibility(sql, { ...ctx, payableId: String(p.id) })).status).toBe("ELIGIBLE");
  });

  it("requires a payment reference and treats a repeated identical record as an idempotent replay", async () => {
    const { ctx, payableId } = await eligiblePayable("fh6");
    await releasePayable(sql, { ...ctx, payableId });
    await expect(recordPaid(sql, { ...ctx, payableId, externalPaymentReference: "  " })).rejects.toMatchObject({ code: "PAYABLE_REFERENCE_REQUIRED", status: 400 });
    await expect(recordPaid(sql, { ...ctx, payableId, externalPaymentReference: null })).rejects.toMatchObject({ code: "PAYABLE_REFERENCE_REQUIRED" });

    const out = await Promise.all(Array.from({ length: 5 }, () => recordPaid(sql, { ...ctx, payableId, externalPaymentReference: " pix-9 " })));
    expect(out.every((o) => o.status === "PAID")).toBe(true);
    expect((await audits(payableId)).filter((a) => a === "payable.paid")).toHaveLength(1);
    const row = await sql.unsafe("select external_payment_reference r from campaign_payables where id=$1::uuid", [payableId]);
    expect(row[0].r).toBe("pix-9");

    await expect(recordPaid(sql, { ...ctx, payableId, externalPaymentReference: "other" })).rejects.toMatchObject({ code: "PAYABLE_ALREADY_PAID", status: 409 });
  });

  it("rejects a payment reference already used by another payable in the workspace", async () => {
    const a = await eligiblePayable("fh7");
    await releasePayable(sql, { ...a.ctx, payableId: a.payableId });
    await recordPaid(sql, { ...a.ctx, payableId: a.payableId, externalPaymentReference: "dup" });

    const second = await addEngagement(sql, a.f, "fh7b");
    await createPublicationFixture(sql, { ...a.f, ...second });
    const p2 = await ensureEngagementPayable(sql, { ...a.ctx, engagementId: second.engagementId });
    await refreshPayableEligibility(sql, { ...a.ctx, payableId: String(p2.id) });
    await releasePayable(sql, { ...a.ctx, payableId: String(p2.id) });
    await expect(recordPaid(sql, { ...a.ctx, payableId: String(p2.id), externalPaymentReference: "dup" })).rejects.toMatchObject({ code: "PAYABLE_REFERENCE_IN_USE", status: 409 });
    expect((await sql.unsafe("select status::text s from campaign_payables where id=$1::uuid", [String(p2.id)]))[0].s).toBe("RELEASED");
  });

  it("denies outsiders and cross-workspace payable ids", async () => {
    const { f, payableId } = await eligiblePayable("fh8");
    const outsider = await createUser(sql, "out@fh8.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "O", type: "AGENCY", idempotencyKey: "fh8-o" });
    await expect(releasePayable(sql, { userId: outsider, workspaceId: f.workspaceId, payableId })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(releasePayable(sql, { userId: outsider, workspaceId: String(otherWs.id), payableId })).rejects.toMatchObject({ code: "PAYABLE_RELEASE_NOT_ALLOWED" });
    await expect(recordPaid(sql, { userId: outsider, workspaceId: String(otherWs.id), payableId, externalPaymentReference: "x" })).rejects.toMatchObject({ code: "PAYABLE_PAYMENT_NOT_ALLOWED" });
    await expect(refreshPayableEligibility(sql, { userId: outsider, workspaceId: String(otherWs.id), payableId })).rejects.toMatchObject({ code: "PAYABLE_NOT_FOUND" });
    await expect(ensureEngagementPayable(sql, { userId: outsider, workspaceId: String(otherWs.id), engagementId: f.engagementId })).rejects.toMatchObject({ code: "ENGAGEMENT_NOT_FOUND" });
  });
});
