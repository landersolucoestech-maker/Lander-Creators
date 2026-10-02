import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createNegotiationFixture } from "./engagement-fixture";
import { createWorkspaceProposal } from "@/server/proposal/service";

const actor = vi.hoisted(() => ({ id: "" }));
vi.mock("@/server/http/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/http/api")>();
  return { ...original, requireAuthenticatedUser: async () => ({ id: actor.id }) };
});

const sql = createTestSql();
afterAll(async () => sql.end());

async function patch(proposalId: string, body: unknown) {
  const { PATCH } = await import("@/app/api/proposals/[proposalId]/route");
  const response = await PATCH(
    new Request(`http://localhost/api/proposals/${proposalId}`, { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ proposalId }) }
  );
  return { status: response.status, json: await response.json() };
}

describe("PATCH /api/proposals/{id}", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("lets the Creator accept a pending proposal through the HTTP handler", async () => {
    const f = await createNegotiationFixture(sql, "pr1");
    const proposal = await createWorkspaceProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, participationId: f.participationId, amountMinor: 5000, currencyCode: "BRL", scopeSummary: "Reel" });
    actor.id = f.creatorUser;
    const result = await patch(String(proposal.id), { action: "ACCEPT" });
    expect(result).toMatchObject({ status: 200, json: { proposal: { status: "ACCEPTED" } } });
  });

  it("returns a stable public error code for a repeated answer", async () => {
    const f = await createNegotiationFixture(sql, "pr2");
    const proposal = await createWorkspaceProposal(sql, { userId: f.owner, workspaceId: f.workspaceId, participationId: f.participationId, amountMinor: 5000, currencyCode: "BRL", scopeSummary: "Reel" });
    actor.id = f.creatorUser;
    await patch(String(proposal.id), { action: "REJECT" });
    const again = await patch(String(proposal.id), { action: "ACCEPT" });
    expect(again.status).toBe(409);
    expect(again.json.error).toMatchObject({ code: "PROPOSAL_RESPONSE_NOT_ALLOWED", message: "Esta proposta não pode mais ser respondida." });
  });
});
