import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createEngagementFixture, createPublicationFixture, createUser } from "./engagement-fixture";

const actor = vi.hoisted(() => ({ id: "" }));
vi.mock("@/server/http/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/http/api")>();
  return { ...original, requireAuthenticatedUser: async () => ({ id: actor.id }) };
});

const sql = createTestSql();
afterAll(async () => sql.end());

const routes: Array<[string, () => Promise<{ GET: (request: Request, context: { params: Promise<{ workspaceId: string }> }) => Promise<Response> }>]> = [
  ["negotiations", () => import("@/app/api/workspaces/[workspaceId]/negotiations/route")],
  ["engagements", () => import("@/app/api/workspaces/[workspaceId]/engagements/route")],
  ["contracts", () => import("@/app/api/workspaces/[workspaceId]/contracts/route")],
  ["content-versions", () => import("@/app/api/workspaces/[workspaceId]/content-versions/route")],
  ["publications", () => import("@/app/api/workspaces/[workspaceId]/publications/route")],
  ["publications/plannable", () => import("@/app/api/workspaces/[workspaceId]/publications/plannable/route")],
  ["payables", () => import("@/app/api/workspaces/[workspaceId]/payables/route")],
  ["payables/candidates", () => import("@/app/api/workspaces/[workspaceId]/payables/candidates/route")],
  ["analytics/campaigns", () => import("@/app/api/workspaces/[workspaceId]/analytics/campaigns/route")],
  ["analytics/publications", () => import("@/app/api/workspaces/[workspaceId]/analytics/publications/route")],
  ["disputes", () => import("@/app/api/workspaces/[workspaceId]/disputes/route")]
];

async function get(load: (typeof routes)[number][1], workspaceId: string, query = "") {
  const { GET } = await load();
  const response = await GET(new Request(`http://localhost/api/workspaces/${workspaceId}/x${query}`), { params: Promise.resolve({ workspaceId }) });
  return { status: response.status, json: await response.json() };
}

describe("Workspace list endpoints", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("return the paginated envelope for an authorized member", async () => {
    const f = await createEngagementFixture(sql, "lr1");
    await createPublicationFixture(sql, f);
    actor.id = f.owner;
    for (const [name, load] of routes) {
      const { status, json } = await get(load, f.workspaceId, "?pageSize=5&page=1");
      expect(status, name).toBe(200);
      expect(json, name).toMatchObject({ page: 1, pageSize: 5 });
      expect(Array.isArray(json.rows), name).toBe(true);
      expect(typeof json.total, name).toBe("number");
      expect(json.pageCount, name).toBeGreaterThanOrEqual(1);
    }
  });

  it("answer 403 with a stable code to outsiders and Creators", async () => {
    const f = await createEngagementFixture(sql, "lr2");
    const outsider = await createUser(sql, "outsider@lr2.test");
    for (const user of [outsider, f.creatorUser]) {
      actor.id = user;
      for (const [name, load] of routes) {
        const { status, json } = await get(load, f.workspaceId);
        expect(status, name).toBe(403);
        expect(json.error.code, name).toBe("WORKSPACE_ACCESS_DENIED");
      }
    }
  });

  it("treat hostile or malformed query parameters as defaults, never as a server error", async () => {
    const f = await createEngagementFixture(sql, "lr3");
    actor.id = f.owner;
    const hostile = "?sort=%27%3B%20drop%20table%20users%3B--&status=NOPE&dir=sideways&page=-1&pageSize=99999999&q=%25%5C";
    for (const [name, load] of routes) {
      const { status, json } = await get(load, f.workspaceId, hostile);
      expect(status, name).toBe(200);
      expect(json.pageSize, name).toBeLessThanOrEqual(100);
    }
  });
});
