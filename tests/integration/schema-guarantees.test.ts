import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createEngagementFixture } from "./engagement-fixture";

const sql = createTestSql();
afterAll(async () => sql.end());

class Rollback extends Error {}

/** DDL is transactional in PostgreSQL: the scenario runs inside a transaction that is always rolled back. */
async function scenario(run: (tx: typeof sql) => Promise<void>) {
  await sql
    .begin(async (tx) => {
      await run(tx as unknown as typeof sql);
      throw new Rollback();
    })
    .catch((error) => {
      if (!(error instanceof Rollback)) throw error;
    });
}

const byName = (rows: Array<Record<string, unknown>>) => new Map(rows.map((row) => [String(row.name), row]));

describe("schema guarantees are never silently missing", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("reports every guarantee as applied on a healthy database", async () => {
    const rows = byName(await sql.unsafe("select * from refresh_schema_guarantees()"));
    for (const name of [
      "disputes_single_active_idx",
      "campaign_payables_external_ref_uidx",
      "campaign_proposals_single_accepted_idx"
    ]) {
      expect(rows.get(name)).toMatchObject({ status: "APPLIED", conflict_count: 0 });
    }
    for (const name of ["campaign_payables_paid_evidence_ck", "campaign_payables_currency_ck"]) {
      expect(rows.get(name)).toMatchObject({ status: "VALIDATED", conflict_count: 0 });
    }
  });

  it("explains a skipped index: which one, why, how many conflicts and how to fix it", async () => {
    const f = await createEngagementFixture(sql, "sg1");
    await scenario(async (tx) => {
      await tx.unsafe("drop index disputes_single_active_idx");
      for (const reason of ["a", "b", "c"]) {
        await tx.unsafe(
          "insert into disputes(engagement_id,workspace_id,creator_profile_id,opened_by_user_id,reason) values($1::uuid,$2::uuid,$3::uuid,$4,$5)",
          [f.engagementId, f.workspaceId, f.creatorProfileId, f.creatorUser, reason]
        );
      }
      const rows = byName(await tx.unsafe("select * from refresh_schema_guarantees()"));
      const row = rows.get("disputes_single_active_idx")!;
      expect(row).toMatchObject({ status: "SKIPPED_LEGACY_CONFLICTS", conflict_count: 2, table_name: "disputes" });
      expect(String(row.reason)).toContain("2");
      expect(String(row.remediation)).toContain("refresh_schema_guarantees");
      // Data is never modified by the diagnostic: without apply the duplicates and the missing index remain.
      expect((await tx.unsafe("select count(*)::int c from disputes where engagement_id=$1::uuid", [f.engagementId]))[0].c).toBe(3);
      expect(await tx.unsafe("select 1 from pg_indexes where indexname='disputes_single_active_idx'")).toHaveLength(0);
    });
  });

  it("restores the guarantee only when no conflicts remain and apply is requested", async () => {
    const f = await createEngagementFixture(sql, "sg2");
    await scenario(async (tx) => {
      await tx.unsafe("drop index disputes_single_active_idx");
      const ids: string[] = [];
      for (const reason of ["a", "b"]) {
        const row = await tx.unsafe(
          "insert into disputes(engagement_id,workspace_id,creator_profile_id,opened_by_user_id,reason) values($1::uuid,$2::uuid,$3::uuid,$4,$5) returning id::text",
          [f.engagementId, f.workspaceId, f.creatorProfileId, f.creatorUser, reason]
        );
        ids.push(String(row[0].id));
      }
      // Conflicts exist: apply must not create the index.
      let rows = byName(await tx.unsafe("select * from refresh_schema_guarantees(true)"));
      expect(rows.get("disputes_single_active_idx")?.status).toBe("SKIPPED_LEGACY_CONFLICTS");
      // Operator resolves the duplicate through the business workflow, then re-runs with apply.
      await tx.unsafe("update disputes set status='RESOLVED',resolution='ok' where id=$1::uuid", [ids[1]]);
      rows = byName(await tx.unsafe("select * from refresh_schema_guarantees(false)"));
      expect(rows.get("disputes_single_active_idx")).toMatchObject({ status: "MISSING", conflict_count: 0 });
      rows = byName(await tx.unsafe("select * from refresh_schema_guarantees(true)"));
      expect(rows.get("disputes_single_active_idx")?.status).toBe("APPLIED");
      expect(await tx.unsafe("select 1 from pg_indexes where indexname='disputes_single_active_idx'")).toHaveLength(1);
    });
  });

  it("flags NOT VALID constraints that legacy rows still violate", async () => {
    const f = await createEngagementFixture(sql, "sg3");
    await scenario(async (tx) => {
      await tx.unsafe("alter table campaign_payables drop constraint campaign_payables_paid_evidence_ck");
      await tx.unsafe(
        "insert into campaign_payables(engagement_id,campaign_id,workspace_id,creator_profile_id,amount_minor,currency_code,status) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,1,'BRL','PAID')",
        [f.engagementId, f.campaignId, f.workspaceId, f.creatorProfileId]
      );
      await tx.unsafe("alter table campaign_payables add constraint campaign_payables_paid_evidence_ck check (status <> 'PAID' or (paid_at is not null and external_payment_reference is not null)) not valid");
      const row = byName(await tx.unsafe("select * from refresh_schema_guarantees()")).get("campaign_payables_paid_evidence_ck")!;
      expect(row).toMatchObject({ status: "NOT_VALIDATED", conflict_count: 1 });
      expect(String(row.remediation)).toContain("PAID");
    });
  });
});
