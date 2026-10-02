import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createNegotiationFixture, createUser } from "./engagement-fixture";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { applyToCampaign, inviteCreator, updateParticipationStatus, withdrawApplication } from "@/server/participation/service";
import { createWorkspaceProposal, creatorCounterProposal, creatorRespondProposal, workspaceRespondProposal } from "@/server/proposal/service";
import { createEngagementContract, createEngagementFromAcceptedProposal, creatorSignContract, sendContract, workspaceSignContract } from "@/server/engagement/service";

const sql = createTestSql();
afterAll(async () => sql.end());

type F = Awaited<ReturnType<typeof createNegotiationFixture>>;
const fulfilled = (r: PromiseSettledResult<unknown>[]) => r.filter((x) => x.status === "fulfilled").length;
const reasons = (r: PromiseSettledResult<unknown>[]) => r.filter((x) => x.status === "rejected").map((x) => (x as PromiseRejectedResult).reason);
const propose = (f: F, over: Partial<{ amountMinor: number; currencyCode: string }> = {}) =>
  createWorkspaceProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, participationId: f.participationId, amountMinor: 5000, currencyCode: "BRL", scopeSummary: "Reel", ...over });
async function one(sqlText: string, params: unknown[]) {
  return (await sql.unsafe(sqlText, params as never))[0];
}
const participationStatus = async (f: F) => String((await one("select status::text s from campaign_participations where id=$1::uuid", [f.participationId])).s);
const proposalStatuses = async (f: F) => (await sql.unsafe("select status::text s from campaign_proposals where participation_id=$1::uuid order by round", [f.participationId])).map((r) => String(r.s));
async function auditActions(f: F) {
  const rows = await sql.unsafe("select action from audit_logs where workspace_id=$1::uuid and (action like 'proposal.%' or action like 'engagement.%' or action like 'contract.%' or action like 'participation.%') order by created_at,action", [f.workspaceId]);
  return rows.map((r) => String(r.action));
}
async function acceptedEngagement(f: F) {
  const p = await propose(f);
  await creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: String(p.id), action: "ACCEPT" });
  const e = await createEngagementFromAcceptedProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, proposalId: String(p.id) });
  return { proposalId: String(p.id), engagementId: String(e.id) };
}

describe("Negotiation, engagement and contract hardening", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("audits the whole negotiation to activation lifecycle in order", async () => {
    const f = await createNegotiationFixture(sql, "ng1");
    const p1 = await propose(f);
    const p2 = await creatorCounterProposal(sql, { userId: f.creatorUser, proposalId: String(p1.id), amountMinor: 6000, scopeSummary: "Reel+Story" });
    await workspaceRespondProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, proposalId: String(p2.id), action: "ACCEPT" });
    const e = await createEngagementFromAcceptedProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, proposalId: String(p2.id) });
    const c = await createEngagementContract(sql, { userId: f.owner, workspaceId: f.workspaceId, engagementId: String(e.id), scopeOfWork: "s", rightsTerms: "r", paymentTerms: "p" });
    await sendContract(sql, { userId: f.owner, workspaceId: f.workspaceId, contractId: String(c.id) });
    await creatorSignContract(sql, { userId: f.creatorUser, contractId: String(c.id) });
    await workspaceSignContract(sql, { userId: f.owner, workspaceId: f.workspaceId, contractId: String(c.id) });
    expect(await auditActions(f)).toEqual([
      "proposal.created", "proposal.countered", "proposal.accepted", "engagement.created",
      "contract.created", "contract.sent", "contract.signed_creator", "contract.signed_workspace", "engagement.activated"
    ]);
    expect(await participationStatus(f)).toBe("ACCEPTED");
    expect(String((await one("select status::text s from campaign_engagements where id=$1::uuid", [String(e.id)])).s)).toBe("ACTIVE");
    expect(await proposalStatuses(f)).toEqual(["SUPERSEDED", "ACCEPTED"]);
  });

  it("lets exactly one concurrent answer win and never leaves a split negotiation state", async () => {
    const f = await createNegotiationFixture(sql, "ng2");
    const p = await propose(f);
    const id = String(p.id);
    const out = await Promise.allSettled([
      creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: id, action: "ACCEPT" }),
      creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: id, action: "ACCEPT" }),
      creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: id, action: "REJECT" }),
      creatorCounterProposal(sql, { userId: f.creatorUser, proposalId: id, amountMinor: 9000, scopeSummary: "x" })
    ]);
    expect(fulfilled(out)).toBe(1);
    for (const r of reasons(out)) expect(["PROPOSAL_RESPONSE_NOT_ALLOWED", "PROPOSAL_COUNTER_NOT_ALLOWED"]).toContain((r as { code: string }).code);
    const statuses = await proposalStatuses(f);
    const accepted = statuses.filter((s) => s === "ACCEPTED").length;
    const open = statuses.filter((s) => s.startsWith("PENDING_")).length;
    expect(accepted + open + statuses.filter((s) => s === "REJECTED").length).toBeLessThanOrEqual(1);
    expect(accepted > 0).toBe((await participationStatus(f)) === "ACCEPTED");
    expect(accepted > 0 && open > 0).toBe(false);
  });

  it("closes open proposals when the participation ends and never resurrects it", async () => {
    const f = await createNegotiationFixture(sql, "ng3");
    const p = await propose(f);
    await withdrawApplication(sql, { userId: f.creatorUser, campaignId: f.campaignId });
    expect(await proposalStatuses(f)).toEqual(["WITHDRAWN"]);
    await expect(creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: String(p.id), action: "ACCEPT" })).rejects.toMatchObject({ code: "PROPOSAL_RESPONSE_NOT_ALLOWED" });
    expect(await participationStatus(f)).toBe("WITHDRAWN");

    const g = await createNegotiationFixture(sql, "ng3b");
    const q = await propose(g);
    await updateParticipationStatus(sql, { userId: g.owner, workspaceId: g.workspaceId, campaignId: g.campaignId, participationId: g.participationId, status: "REJECTED" });
    expect(await proposalStatuses(g)).toEqual(["WITHDRAWN"]);
    await expect(creatorRespondProposal(sql, { userId: g.creatorUser, proposalId: String(q.id), action: "ACCEPT" })).rejects.toMatchObject({ code: "PROPOSAL_RESPONSE_NOT_ALLOWED" });
    expect(await participationStatus(g)).toBe("REJECTED");
  });

  it("validates proposals, keeps one open round and isolates tenants", async () => {
    const f = await createNegotiationFixture(sql, "ng4");
    await expect(propose(f, { amountMinor: -1 })).rejects.toMatchObject({ code: "PROPOSAL_INVALID", status: 400 });
    await expect(propose(f, { amountMinor: 1.5 })).rejects.toMatchObject({ code: "PROPOSAL_INVALID" });
    await expect(propose(f, { currencyCode: "XX$" })).rejects.toMatchObject({ code: "PROPOSAL_INVALID" });
    const out = await Promise.allSettled(Array.from({ length: 4 }, () => propose(f)));
    expect(fulfilled(out)).toBe(1);
    for (const r of reasons(out)) expect(r).toMatchObject({ code: "PROPOSAL_ALREADY_OPEN", status: 409 });

    const outsider = await createUser(sql, "out@ng4.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "O", type: "AGENCY", idempotencyKey: "ng4-o" });
    await expect(createWorkspaceProposal(sql, { userId: outsider, workspaceId: String(otherWs.id), participationId: f.participationId, amountMinor: 1, currencyCode: "BRL", scopeSummary: "x" })).rejects.toMatchObject({ code: "PROPOSAL_NOT_ALLOWED" });
    await expect(createWorkspaceProposal(sql, { userId: outsider, workspaceId: f.workspaceId, participationId: f.participationId, amountMinor: 1, currencyCode: "BRL", scopeSummary: "x" })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
  });

  it("guards who can answer which proposal and in which state", async () => {
    const f = await createNegotiationFixture(sql, "ng5");
    const g = await createNegotiationFixture(sql, "ng5b");
    const p = await propose(f);
    const id = String(p.id);
    await expect(creatorRespondProposal(sql, { userId: g.creatorUser, proposalId: id, action: "ACCEPT" })).rejects.toMatchObject({ code: "PROPOSAL_RESPONSE_NOT_ALLOWED" });
    await expect(workspaceRespondProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, proposalId: id, action: "ACCEPT" })).rejects.toMatchObject({ code: "PROPOSAL_RESPONSE_NOT_ALLOWED" });
    await expect(workspaceRespondProposal(sql, { userId: g.owner, workspaceId: g.workspaceId, proposalId: id, action: "ACCEPT" })).rejects.toMatchObject({ code: "PROPOSAL_RESPONSE_NOT_ALLOWED" });
    await creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: id, action: "REJECT" });
    await expect(creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: id, action: "ACCEPT" })).rejects.toMatchObject({ code: "PROPOSAL_RESPONSE_NOT_ALLOWED" });
    await expect(creatorCounterProposal(sql, { userId: f.creatorUser, proposalId: id, amountMinor: 1, scopeSummary: "x" })).rejects.toMatchObject({ code: "PROPOSAL_COUNTER_NOT_ALLOWED" });
    expect(await participationStatus(f)).toBe("APPLIED");
  });

  it("creates one engagement per accepted proposal, even concurrently", async () => {
    const f = await createNegotiationFixture(sql, "ng6");
    const p = await propose(f);
    const id = String(p.id);
    await expect(createEngagementFromAcceptedProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, proposalId: id })).rejects.toMatchObject({ code: "ENGAGEMENT_REQUIRES_ACCEPTED_PROPOSAL" });
    await creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: id, action: "ACCEPT" });
    const other = await createNegotiationFixture(sql, "ng6b");
    await expect(createEngagementFromAcceptedProposal(sql, { userId: other.owner, workspaceId: other.workspaceId, proposalId: id })).rejects.toMatchObject({ code: "PROPOSAL_NOT_FOUND" });
    const out = await Promise.allSettled(Array.from({ length: 4 }, () => createEngagementFromAcceptedProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, proposalId: id })));
    expect(fulfilled(out)).toBe(1);
    for (const r of reasons(out)) expect(r).toMatchObject({ code: "ENGAGEMENT_ALREADY_EXISTS", status: 409 });
    expect((await auditActions(f)).filter((a) => a === "engagement.created")).toHaveLength(1);
  });

  it("enforces contract signing order, ownership and single live contract", async () => {
    const f = await createNegotiationFixture(sql, "ng7");
    const g = await createNegotiationFixture(sql, "ng7b");
    const { engagementId } = await acceptedEngagement(f);
    const mk = () => createEngagementContract(sql, { userId: f.owner, workspaceId: f.workspaceId, engagementId, scopeOfWork: "s", rightsTerms: "r", paymentTerms: "p" });
    const made = await Promise.allSettled([mk(), mk(), mk()]);
    expect(fulfilled(made)).toBe(1);
    for (const r of reasons(made)) expect(r).toMatchObject({ code: "CONTRACT_ALREADY_LIVE", status: 409 });
    const winner = made.find((m): m is PromiseFulfilledResult<Awaited<ReturnType<typeof mk>>> => m.status === "fulfilled");
    const contractId = String(winner!.value.id);

    const ws = { userId: f.owner, workspaceId: f.workspaceId, contractId };
    await expect(workspaceSignContract(sql, ws)).rejects.toMatchObject({ code: "CONTRACT_SIGN_NOT_ALLOWED" });
    await expect(creatorSignContract(sql, { userId: f.creatorUser, contractId })).rejects.toMatchObject({ code: "CONTRACT_SIGN_NOT_ALLOWED" });
    await expect(sendContract(sql, { userId: g.owner, workspaceId: g.workspaceId, contractId })).rejects.toMatchObject({ code: "CONTRACT_SEND_NOT_ALLOWED" });
    await sendContract(sql, ws);
    await expect(sendContract(sql, ws)).rejects.toMatchObject({ code: "CONTRACT_SEND_NOT_ALLOWED" });
    await expect(creatorSignContract(sql, { userId: g.creatorUser, contractId })).rejects.toMatchObject({ code: "CONTRACT_SIGN_NOT_ALLOWED" });
    await expect(workspaceSignContract(sql, ws)).rejects.toMatchObject({ code: "CONTRACT_SIGN_NOT_ALLOWED" });
    expect(String((await one("select status::text s from campaign_engagements where id=$1::uuid", [engagementId])).s)).toBe("PENDING_CREATOR_SIGNATURE");

    const signs = await Promise.allSettled(Array.from({ length: 3 }, () => creatorSignContract(sql, { userId: f.creatorUser, contractId })));
    expect(fulfilled(signs)).toBe(1);
    const wsSigns = await Promise.allSettled(Array.from({ length: 3 }, () => workspaceSignContract(sql, ws)));
    expect(fulfilled(wsSigns)).toBe(1);
    expect(String((await one("select status::text s from campaign_engagements where id=$1::uuid", [engagementId])).s)).toBe("ACTIVE");
    await expect(mk()).rejects.toMatchObject({ code: "CONTRACT_NOT_ALLOWED" });
  });

  it("serializes applications and enforces invitation and transition rules", async () => {
    const f = await createNegotiationFixture(sql, "ng8", "REJECTED");
    await sql.unsafe("update campaigns set status='ACTIVE',visibility='OPEN',recruitment_status='OPEN' where id=$1::uuid", [f.campaignId]);
    await sql.unsafe("update creator_profiles set status='ACTIVE',marketplace_visibility='VISIBLE' where id=$1::uuid", [f.creatorProfileId]);
    await sql.unsafe("delete from campaign_participations where campaign_id=$1::uuid", [f.campaignId]);
    const apps = await Promise.allSettled(Array.from({ length: 3 }, () => applyToCampaign(sql, { userId: f.creatorUser, campaignId: f.campaignId })));
    expect(fulfilled(apps)).toBe(1);
    for (const r of reasons(apps)) expect(r).toMatchObject({ code: "PARTICIPATION_ALREADY_EXISTS" });

    const pid = String((await one("select id::text from campaign_participations where campaign_id=$1::uuid", [f.campaignId])).id);
    const ctx = { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, participationId: pid };
    expect((await updateParticipationStatus(sql, { ...ctx, status: "SHORTLISTED" })).status).toBe("SHORTLISTED");
    await updateParticipationStatus(sql, { ...ctx, status: "REJECTED" });
    await expect(updateParticipationStatus(sql, { ...ctx, status: "ACCEPTED" })).rejects.toMatchObject({ code: "PARTICIPATION_TRANSITION_REJECTED" });
    await expect(inviteCreator(sql, { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId, creatorProfileId: f.creatorProfileId })).rejects.toMatchObject({ code: "PARTICIPATION_ALREADY_EXISTS" });

    const outsider = await createUser(sql, "out@ng8.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "O", type: "AGENCY", idempotencyKey: "ng8-o" });
    await expect(updateParticipationStatus(sql, { ...ctx, userId: outsider, workspaceId: String(otherWs.id), status: "SHORTLISTED" })).rejects.toMatchObject({ code: "CAMPAIGN_NOT_FOUND" });
    await expect(inviteCreator(sql, { userId: outsider, workspaceId: String(otherWs.id), campaignId: f.campaignId, creatorProfileId: f.creatorProfileId })).rejects.toMatchObject({ code: "CAMPAIGN_NOT_FOUND" });
    const actions = await auditActions(f);
    expect(actions).toContain("participation.applied");
    expect(actions).toContain("participation.shortlisted");
    expect(actions).toContain("participation.rejected");
  });
});
