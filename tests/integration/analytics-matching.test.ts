import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createEngagementFixture, createUser } from "./engagement-fixture";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { createCreatorProfile } from "@/server/creator/creator-service";
import { campaignAnalytics, recordPublicationMetrics } from "@/server/analytics/service";
import { listCampaignMatches, recalculateCampaignMatches } from "@/server/matching/service";

const sql = createTestSql();
const zero = { views: 0, reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, source: "manual" };

async function publication(f: Awaited<ReturnType<typeof createEngagementFixture>>, status: string) {
  const d = await sql.unsafe(
    "insert into deliverables(engagement_id,campaign_id,workspace_id,creator_profile_id,title,platform,format,requirements_snapshot,status) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,'Reel','INSTAGRAM','REEL','15s','APPROVED') returning id::text",
    [f.engagementId, f.campaignId, f.workspaceId, f.creatorProfileId]
  );
  const cv = await sql.unsafe(
    "insert into content_versions(deliverable_id,version,external_url,status,submitted_by_user_id) values($1::uuid,1,'https://example.test/c','APPROVED',$2) returning id::text",
    [d[0].id, f.creatorUser]
  );
  const p = await sql.unsafe(
    "insert into publications(deliverable_id,approved_content_version_id,engagement_id,campaign_id,workspace_id,creator_profile_id,platform,mode,proof_url,status) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'INSTAGRAM','CREATOR_PROFILE','https://example.test/p',$7::publication_status) returning id::text",
    [d[0].id, cv[0].id, f.engagementId, f.campaignId, f.workspaceId, f.creatorProfileId, status]
  );
  return String(p[0].id);
}

afterAll(async () => sql.end());

describe("Analytics", () => {
  beforeEach(async () => resetSecurityData(sql));

  it("aggregates only the latest snapshot per publication and keeps history", async () => {
    const f = await createEngagementFixture(sql, "a1");
    const pubId = await publication(f, "VERIFIED");
    const base = { userId: f.owner, workspaceId: f.workspaceId, publicationId: pubId };
    await recordPublicationMetrics(sql, { ...base, ...zero, views: 100, likes: 10 });
    await recordPublicationMetrics(sql, { ...base, ...zero, views: 250, likes: 30 });

    expect((await sql.unsafe("select count(*)::int c from publication_metrics_snapshots"))[0].c).toBe(2);
    const a = await campaignAnalytics(sql, { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId });
    expect(a).toMatchObject({ publications: 1, verified_publications: 1, views: "250", likes: "30" });
  });

  it("rejects metrics for unpublished publications and foreign workspaces", async () => {
    const f = await createEngagementFixture(sql, "a2");
    const planned = await publication(f, "PLANNED");
    await expect(
      recordPublicationMetrics(sql, { userId: f.owner, workspaceId: f.workspaceId, publicationId: planned, ...zero })
    ).rejects.toMatchObject({ code: "PUBLICATION_NOT_METRIC_ELIGIBLE", status: 409 });

    const outsider = await createUser(sql, "out@a2.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "Other", type: "AGENCY", idempotencyKey: "a2-o" });
    const verified = await publication(f, "VERIFIED");
    await expect(
      recordPublicationMetrics(sql, { userId: outsider, workspaceId: f.workspaceId, publicationId: verified, ...zero })
    ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(
      recordPublicationMetrics(sql, { userId: outsider, workspaceId: String(otherWs.id), publicationId: verified, ...zero })
    ).rejects.toMatchObject({ code: "PUBLICATION_NOT_METRIC_ELIGIBLE" });
    await expect(
      campaignAnalytics(sql, { userId: outsider, workspaceId: String(otherWs.id), campaignId: f.campaignId })
    ).rejects.toMatchObject({ code: "CAMPAIGN_NOT_FOUND", status: 404 });
    await expect(
      campaignAnalytics(sql, { userId: outsider, workspaceId: f.workspaceId, campaignId: f.campaignId })
    ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
  });
});

describe("Matching", () => {
  beforeEach(async () => resetSecurityData(sql));

  async function visibleCreator(email: string, country: string) {
    const userId = await createUser(sql, email);
    const cp = await createCreatorProfile(sql, { userId, displayName: email, countryCode: country, languageCode: "pt-BR", timezoneCode: "America/Sao_Paulo" });
    await sql.unsafe("update creator_profiles set status='ACTIVE',marketplace_visibility='VISIBLE' where id=$1::uuid", [String(cp.id)]);
    return String(cp.id);
  }

  it("scores deterministically, explains reasons, excludes ineligible creators and is idempotent", async () => {
    const f = await createEngagementFixture(sql, "m1");
    const [genre] = await sql.unsafe("select id::text from taxonomy_values order by id limit 1");
    await sql.unsafe("insert into campaign_targeting(campaign_id) values($1::uuid) on conflict do nothing", [f.campaignId]);
    await sql.unsafe("insert into campaign_targeting_music_genres(campaign_id,taxonomy_value_id) values($1::uuid,$2::uuid)", [f.campaignId, genre.id]);
    await sql.unsafe("insert into campaign_targeting_countries(campaign_id,country_code) values($1::uuid,'BR')", [f.campaignId]);

    const fit = await visibleCreator("fit@m1.test", "BR");
    const offCountry = await visibleCreator("off@m1.test", "US");
    const hidden = await visibleCreator("hidden@m1.test", "BR");
    await sql.unsafe("update creator_profiles set marketplace_visibility='HIDDEN' where id=$1::uuid", [hidden]);
    await sql.unsafe("insert into creator_music_genres(creator_profile_id,taxonomy_value_id) values($1::uuid,$2::uuid)", [fit, genre.id]);

    const ctx = { userId: f.owner, workspaceId: f.workspaceId, campaignId: f.campaignId };
    await recalculateCampaignMatches(sql, ctx);
    await recalculateCampaignMatches(sql, ctx);

    const list = await listCampaignMatches(sql, ctx);
    const byId = new Map(list.map((m) => [String(m.creator_profile_id), m]));
    expect(byId.has(hidden)).toBe(false);
    expect(byId.get(fit)).toMatchObject({ music_fit: 100, audience_fit: 100, creator_fit: 100, overall_fit: 100 });
    expect(byId.get(offCountry)).toMatchObject({ music_fit: 0, audience_fit: 0, creator_fit: 100, overall_fit: 33 });
    expect(byId.get(fit)!.reasons).toEqual(["deterministic_targeting_v1"]);
    expect(list[0].creator_profile_id).toBe(fit);
    const rows = await sql.unsafe("select count(*)::int c from campaign_creator_match_snapshots where campaign_id=$1::uuid", [f.campaignId]);
    expect(rows[0].c).toBe(list.length);
  });

  it("denies outsiders and cross-workspace campaign access", async () => {
    const f = await createEngagementFixture(sql, "m2");
    const outsider = await createUser(sql, "out@m2.test");
    const otherWs = await createWorkspace(sql, { userId: outsider, name: "Other", type: "AGENCY", idempotencyKey: "m2-o" });
    await expect(recalculateCampaignMatches(sql, { userId: outsider, workspaceId: f.workspaceId, campaignId: f.campaignId })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(listCampaignMatches(sql, { userId: outsider, workspaceId: f.workspaceId, campaignId: f.campaignId })).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(recalculateCampaignMatches(sql, { userId: outsider, workspaceId: String(otherWs.id), campaignId: f.campaignId })).rejects.toMatchObject({ code: "CAMPAIGN_NOT_FOUND", status: 404 });
    expect(await listCampaignMatches(sql, { userId: outsider, workspaceId: String(otherWs.id), campaignId: f.campaignId })).toHaveLength(0);
  });
});
