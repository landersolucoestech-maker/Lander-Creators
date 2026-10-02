import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createEngagementFixture } from "./engagement-fixture";
import { writeAudit } from "@/server/shared/audit";

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
});
