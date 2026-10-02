import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createNegotiationFixture } from "./engagement-fixture";
import { createWorkspaceProposal, creatorCounterProposal, creatorRespondProposal, workspaceRespondProposal } from "@/server/proposal/service";

const sql = createTestSql();
afterAll(async () => sql.end());

async function outcome(run: () => Promise<unknown>) {
  try {
    await run();
    return { ok: true as const };
  } catch (error) {
    const e = error as { code?: string; status?: number; message?: string };
    return { ok: false as const, code: e.code, status: e.status, message: e.message };
  }
}

describe("proposal and participation ids cannot be probed across tenants", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("answers an unknown id and another tenant's id identically", async () => {
    const victim = await createNegotiationFixture(sql, "en1");
    const attacker = await createNegotiationFixture(sql, "en1b");
    const proposal = await createWorkspaceProposal(sql, { userId: victim.owner, workspaceId: victim.workspaceId, participationId: victim.participationId, amountMinor: 1000, currencyCode: "BRL", scopeSummary: "x" });
    const foreignId = String(proposal.id);
    const unknownId = randomUUID();

    const creatorOps: Array<[string, (id: string) => Promise<unknown>]> = [
      ["creator accept", (id) => creatorRespondProposal(sql, { userId: attacker.creatorUser, proposalId: id, action: "ACCEPT" })],
      ["creator counter", (id) => creatorCounterProposal(sql, { userId: attacker.creatorUser, proposalId: id, amountMinor: 1, scopeSummary: "x" })]
    ];
    const workspaceOps: Array<[string, (id: string) => Promise<unknown>]> = [
      ["workspace answer", (id) => workspaceRespondProposal(sql, { userId: attacker.owner, workspaceId: attacker.workspaceId, proposalId: id, action: "ACCEPT" })]
    ];
    for (const [label, run] of [...creatorOps, ...workspaceOps]) {
      const foreign = await outcome(() => run(foreignId));
      const unknown = await outcome(() => run(unknownId));
      expect(foreign, label).toEqual(unknown);
      expect(foreign, label).toMatchObject({ ok: false, code: "PROPOSAL_NOT_FOUND", status: 404 });
    }
    // The proposal was untouched by all attempts.
    expect((await sql.unsafe("select status::text s from campaign_proposals where id=$1::uuid", [foreignId]))[0].s).toBe("PENDING_CREATOR");
  });

  it("answers an unknown participation and another workspace's participation identically", async () => {
    const victim = await createNegotiationFixture(sql, "en2");
    const attacker = await createNegotiationFixture(sql, "en2b");
    const propose = (participationId: string) => createWorkspaceProposal(sql, { userId: attacker.owner, workspaceId: attacker.workspaceId, participationId, amountMinor: 1, currencyCode: "BRL", scopeSummary: "x" });
    const foreign = await outcome(() => propose(victim.participationId));
    const unknown = await outcome(() => propose(randomUUID()));
    expect(foreign).toEqual(unknown);
    expect(foreign).toMatchObject({ ok: false, code: "PARTICIPATION_NOT_FOUND", status: 404 });
  });

  it("still gives the legitimate owner a precise state error", async () => {
    const f = await createNegotiationFixture(sql, "en3");
    const proposal = await createWorkspaceProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, participationId: f.participationId, amountMinor: 1000, currencyCode: "BRL", scopeSummary: "x" });
    await creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: String(proposal.id), action: "REJECT" });
    expect(await outcome(() => creatorRespondProposal(sql, { userId: f.creatorUser, proposalId: String(proposal.id), action: "ACCEPT" }))).toMatchObject({ ok: false, code: "PROPOSAL_RESPONSE_NOT_ALLOWED", status: 409 });
    // The workspace owner of a proposal that is waiting for the creator also gets the precise state error.
    const g = await createNegotiationFixture(sql, "en3b");
    const waiting = await createWorkspaceProposal(sql, { userId: g.owner, workspaceId: g.workspaceId, participationId: g.participationId, amountMinor: 1000, currencyCode: "BRL", scopeSummary: "x" });
    expect(await outcome(() => workspaceRespondProposal(sql, { userId: g.owner, workspaceId: g.workspaceId, proposalId: String(waiting.id), action: "ACCEPT" }))).toMatchObject({ ok: false, code: "PROPOSAL_RESPONSE_NOT_ALLOWED", status: 409 });
  });
});
