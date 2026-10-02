import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { addEngagement, createEngagementFixture, createUser } from "./engagement-fixture";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { createDeliverable, reviewContentVersion, submitContentVersion } from "@/server/deliverable/service";
import { planPublication, submitPublicationProof, verifyPublication } from "@/server/publication/service";

const sql = createTestSql();
afterAll(async () => sql.end());

type Fixture = Awaited<ReturnType<typeof createEngagementFixture>>;

async function newDeliverable(f: Fixture, title = "Reel") {
  const d = await createDeliverable(sql, { userId: f.owner, workspaceId: f.workspaceId, engagementId: f.engagementId, title, platform: "INSTAGRAM", format: "REEL", requirementsSnapshot: "15s" });
  return String(d.id);
}
const submit = (f: Fixture, deliverableId: string, externalUrl: string | null = "https://example.test/video") =>
  submitContentVersion(sql, { userId: f.creatorUser, deliverableId, externalUrl });
const review = (f: Fixture, contentVersionId: string, decision: "APPROVE" | "REQUEST_CHANGES" | "REJECT") =>
  reviewContentVersion(sql, { userId: f.owner, workspaceId: f.workspaceId, contentVersionId, decision });
async function approvedDeliverable(f: Fixture, title = "Reel") {
  const deliverableId = await newDeliverable(f, title);
  const v = await submit(f, deliverableId);
  await review(f, String(v.id), "APPROVE");
  return { deliverableId, versionId: String(v.id) };
}
async function statusOf(table: string, id: string) {
  return (await sql.unsafe(`select status::text s from ${table} where id=$1::uuid`, [id]))[0].s as string;
}
const fulfilled = (r: PromiseSettledResult<unknown>[]) => r.filter((x) => x.status === "fulfilled").length;
const reasons = (r: PromiseSettledResult<unknown>[]) => r.filter((x) => x.status === "rejected").map((x) => (x as PromiseRejectedResult).reason);

describe("Deliverable and Publication hardening", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("audits the full content-to-verification lifecycle in order", async () => {
    const f = await createEngagementFixture(sql, "dp1");
    const { deliverableId } = await approvedDeliverable(f);
    const pub = await planPublication(sql, { userId: f.owner, workspaceId: f.workspaceId, deliverableId, mode: "CREATOR_PROFILE" });
    await submitPublicationProof(sql, { userId: f.creatorUser, publicationId: String(pub.id), proofUrl: "https://example.test/post" });
    await verifyPublication(sql, { userId: f.owner, workspaceId: f.workspaceId, publicationId: String(pub.id) });
    const rows = await sql.unsafe("select action from audit_logs where workspace_id=$1::uuid and (action like 'deliverable.%' or action like 'content_version.%' or action like 'publication.%') order by created_at,id", [f.workspaceId]);
    expect(rows.map((r) => r.action)).toEqual([
      "deliverable.created", "content_version.submitted", "content_version.approved",
      "publication.planned", "publication.proof_submitted", "publication.verified"
    ]);
  });

  it("lets exactly one concurrent review win and keeps deliverable and version consistent", async () => {
    const f = await createEngagementFixture(sql, "dp2");
    const deliverableId = await newDeliverable(f);
    const v = await submit(f, deliverableId);
    const out = await Promise.allSettled([review(f, String(v.id), "APPROVE"), review(f, String(v.id), "REJECT"), review(f, String(v.id), "APPROVE"), review(f, String(v.id), "REQUEST_CHANGES")]);
    expect(fulfilled(out)).toBe(1);
    for (const r of reasons(out)) expect(r).toMatchObject({ code: "CONTENT_REVIEW_NOT_ALLOWED", status: 409 });
    const versionStatus = await statusOf("content_versions", String(v.id));
    const deliverableStatus = await statusOf("deliverables", deliverableId);
    expect(deliverableStatus).toBe(versionStatus);
    const audits = await sql.unsafe("select count(*)::int c from audit_logs where action like 'content_version.%' and action<>'content_version.submitted'");
    expect(audits[0].c).toBe(1);
  });

  it("serializes concurrent submissions without leaking raw constraint errors", async () => {
    const f = await createEngagementFixture(sql, "dp3");
    const deliverableId = await newDeliverable(f);
    const out = await Promise.allSettled(Array.from({ length: 4 }, () => submit(f, deliverableId)));
    expect(fulfilled(out)).toBe(1);
    for (const r of reasons(out)) expect(r).toMatchObject({ code: "CONTENT_SUBMISSION_NOT_ALLOWED", status: 409 });
    expect((await sql.unsafe("select count(*)::int c from content_versions where deliverable_id=$1::uuid", [deliverableId]))[0].c).toBe(1);
  });

  it("supersedes the previous version on resubmission after changes were requested", async () => {
    const f = await createEngagementFixture(sql, "dp4");
    const deliverableId = await newDeliverable(f);
    const v1 = await submit(f, deliverableId);
    await review(f, String(v1.id), "REQUEST_CHANGES");
    const v2 = await submit(f, deliverableId, "https://example.test/v2");
    expect(v2.version).toBe(2);
    expect(await statusOf("deliverables", deliverableId)).toBe("SUBMITTED");
    await expect(review(f, String(v1.id), "APPROVE")).rejects.toMatchObject({ code: "CONTENT_REVIEW_NOT_ALLOWED" });
  });

  it("validates content references and deliverable creation preconditions", async () => {
    const f = await createEngagementFixture(sql, "dp5");
    const deliverableId = await newDeliverable(f);
    await expect(submit(f, deliverableId, null)).rejects.toMatchObject({ code: "CONTENT_REFERENCE_REQUIRED", status: 400 });
    await expect(submit(f, deliverableId, "javascript:alert(1)")).rejects.toMatchObject({ code: "CONTENT_URL_INVALID", status: 400 });
    await sql.unsafe("update campaign_engagements set status='COMPLETED' where id=$1::uuid", [f.engagementId]);
    await expect(newDeliverable(f, "Late")).rejects.toMatchObject({ code: "DELIVERABLE_REQUIRES_ACTIVE_ENGAGEMENT" });
  });

  it("enforces tenant and creator ownership on deliverable operations", async () => {
    const f = await createEngagementFixture(sql, "dp6");
    const other = await addEngagement(sql, f, "dp6b");
    const outsider = await createUser(sql, "out@dp6.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "O", type: "AGENCY", idempotencyKey: "dp6-o" });
    const deliverableId = await newDeliverable(f);
    await expect(createDeliverable(sql, { userId: outsider, workspaceId: String(otherWs.id), engagementId: f.engagementId, title: "x", platform: "INSTAGRAM", format: "REEL", requirementsSnapshot: "x" })).rejects.toMatchObject({ code: "ENGAGEMENT_NOT_FOUND" });
    await expect(createDeliverable(sql, { userId: outsider, workspaceId: f.workspaceId, engagementId: f.engagementId, title: "x", platform: "INSTAGRAM", format: "REEL", requirementsSnapshot: "x" })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(submitContentVersion(sql, { userId: other.creatorUser, deliverableId, externalUrl: "https://example.test/x" })).rejects.toMatchObject({ code: "DELIVERABLE_NOT_FOUND" });
    const v = await submit(f, deliverableId);
    await expect(reviewContentVersion(sql, { userId: outsider, workspaceId: String(otherWs.id), contentVersionId: String(v.id), decision: "APPROVE" })).rejects.toMatchObject({ code: "CONTENT_VERSION_NOT_FOUND" });
    await expect(reviewContentVersion(sql, { userId: outsider, workspaceId: f.workspaceId, contentVersionId: String(v.id), decision: "APPROVE" })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    expect(await statusOf("content_versions", String(v.id))).toBe("SUBMITTED");
  });

  it("plans a publication only for approved content and only once, even concurrently", async () => {
    const f = await createEngagementFixture(sql, "dp7");
    const draft = await newDeliverable(f, "Draft");
    await expect(planPublication(sql, { userId: f.owner, workspaceId: f.workspaceId, deliverableId: draft, mode: "CREATOR_PROFILE" })).rejects.toMatchObject({ code: "PUBLICATION_REQUIRES_APPROVED_CONTENT", status: 409 });
    const outsider = await createUser(sql, "out@dp7.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "O", type: "AGENCY", idempotencyKey: "dp7-o" });
    const { deliverableId } = await approvedDeliverable(f, "Approved");
    await expect(planPublication(sql, { userId: outsider, workspaceId: String(otherWs.id), deliverableId, mode: "CREATOR_PROFILE" })).rejects.toMatchObject({ code: "DELIVERABLE_NOT_FOUND" });
    const out = await Promise.allSettled(Array.from({ length: 4 }, () => planPublication(sql, { userId: f.owner, workspaceId: f.workspaceId, deliverableId, mode: "CREATOR_PROFILE" })));
    expect(fulfilled(out)).toBe(1);
    for (const r of reasons(out)) expect(r).toMatchObject({ code: "PUBLICATION_ALREADY_PLANNED", status: 409 });
  });

  it("guards proof submission and verification transitions", async () => {
    const f = await createEngagementFixture(sql, "dp8");
    const other = await addEngagement(sql, f, "dp8b");
    const { deliverableId } = await approvedDeliverable(f);
    const pub = await planPublication(sql, { userId: f.owner, workspaceId: f.workspaceId, deliverableId, mode: "CREATOR_PROFILE" });
    const publicationId = String(pub.id);
    const verifyCtx = { userId: f.owner, workspaceId: f.workspaceId, publicationId };

    await expect(verifyPublication(sql, verifyCtx)).rejects.toMatchObject({ code: "PUBLICATION_VERIFY_NOT_ALLOWED" });
    await expect(submitPublicationProof(sql, { userId: f.creatorUser, publicationId, proofUrl: "javascript:x" })).rejects.toMatchObject({ code: "PUBLICATION_PROOF_URL_INVALID", status: 400 });
    await expect(submitPublicationProof(sql, { userId: other.creatorUser, publicationId, proofUrl: "https://example.test/p" })).rejects.toMatchObject({ code: "PUBLICATION_PROOF_NOT_ALLOWED" });

    const proofs = await Promise.allSettled(Array.from({ length: 3 }, () => submitPublicationProof(sql, { userId: f.creatorUser, publicationId, proofUrl: "https://example.test/p" })));
    expect(fulfilled(proofs)).toBe(1);

    const outsider = await createUser(sql, "out@dp8.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "O", type: "AGENCY", idempotencyKey: "dp8-o" });
    await expect(verifyPublication(sql, { userId: outsider, workspaceId: f.workspaceId, publicationId })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(verifyPublication(sql, { userId: outsider, workspaceId: String(otherWs.id), publicationId })).rejects.toMatchObject({ code: "PUBLICATION_VERIFY_NOT_ALLOWED" });

    const verifies = await Promise.allSettled(Array.from({ length: 3 }, () => verifyPublication(sql, verifyCtx)));
    expect(fulfilled(verifies)).toBe(1);
    await expect(submitPublicationProof(sql, { userId: f.creatorUser, publicationId, proofUrl: "https://example.test/other" })).rejects.toMatchObject({ code: "PUBLICATION_PROOF_NOT_ALLOWED" });
    expect((await sql.unsafe("select proof_url from publications where id=$1::uuid", [publicationId]))[0].proof_url).toBe("https://example.test/p");
  });
});
