import { randomUUID } from "node:crypto";
import type { createTestSql } from "./test-db";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { createCreatorProfile } from "@/server/creator/creator-service";
import { createCampaign } from "@/server/campaign/service";

type TestSql = ReturnType<typeof createTestSql>;

export async function createUser(sql: TestSql, email: string) {
  const id = randomUUID();
  await sql.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true)', [id, email, email]);
  await sql.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE')", [id]);
  return id;
}

/** Workspace owner + creator + campaign + accepted proposal + ACTIVE engagement. */
export async function createEngagementFixture(sql: TestSql, tag: string) {
  const owner = await createUser(sql, `owner@${tag}.test`);
  const workspace = await createWorkspace(sql, { userId: owner, name: tag, type: "AGENCY", idempotencyKey: tag });
  const workspaceId = String(workspace.id);
  const creatorUser = await createUser(sql, `creator@${tag}.test`);
  const creator = await createCreatorProfile(sql, {
    userId: creatorUser,
    displayName: `Creator ${tag}`,
    countryCode: "BR",
    languageCode: "pt-BR",
    timezoneCode: "America/Sao_Paulo"
  });
  const creatorProfileId = String(creator.id);
  const campaign = await createCampaign(sql, { userId: owner, workspaceId, name: `Campaign ${tag}` });
  const campaignId = String(campaign.id);
  const participation = await sql.unsafe(
    "insert into campaign_participations(campaign_id,creator_profile_id,origin,status) values($1::uuid,$2::uuid,'APPLICATION','ACCEPTED') returning id::text",
    [campaignId, creatorProfileId]
  );
  const proposal = await sql.unsafe(
    "insert into campaign_proposals(participation_id,workspace_id,creator_profile_id,round,proposed_by,amount_minor,currency_code,scope_summary,status,created_by_user_id) values($1::uuid,$2::uuid,$3::uuid,1,'WORKSPACE',5000,'BRL','Reel','ACCEPTED',$4) returning id::text",
    [participation[0].id, workspaceId, creatorProfileId, owner]
  );
  const engagement = await sql.unsafe(
    "insert into campaign_engagements(participation_id,accepted_proposal_id,campaign_id,workspace_id,creator_profile_id,status,contracted_amount_minor,currency_code,scope_snapshot,created_by_user_id) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,'ACTIVE',5000,'BRL','Reel',$6) returning id::text",
    [participation[0].id, proposal[0].id, campaignId, workspaceId, creatorProfileId, owner]
  );
  return {
    owner,
    workspaceId,
    creatorUser,
    creatorProfileId,
    campaignId,
    engagementId: String(engagement[0].id)
  };
}

/** Deliverable + approved content version + publication for an engagement fixture. */
export async function createPublicationFixture(
  sql: TestSql,
  f: { engagementId: string; campaignId: string; workspaceId: string; creatorProfileId: string; creatorUser: string },
  opts: { deliverableStatus?: string; publicationStatus?: string | null; title?: string } = {}
) {
  const d = await sql.unsafe(
    "insert into deliverables(engagement_id,campaign_id,workspace_id,creator_profile_id,title,platform,format,requirements_snapshot,status) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,'INSTAGRAM','REEL','15s',$6::deliverable_status) returning id::text",
    [f.engagementId, f.campaignId, f.workspaceId, f.creatorProfileId, opts.title ?? "Reel", opts.deliverableStatus ?? "APPROVED"]
  );
  const cv = await sql.unsafe(
    "insert into content_versions(deliverable_id,version,external_url,status,submitted_by_user_id) values($1::uuid,1,'https://example.test/c','APPROVED',$2) returning id::text",
    [d[0].id, f.creatorUser]
  );
  let publicationId: string | null = null;
  if (opts.publicationStatus !== null) {
    const p = await sql.unsafe(
      "insert into publications(deliverable_id,approved_content_version_id,engagement_id,campaign_id,workspace_id,creator_profile_id,platform,mode,proof_url,status) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'INSTAGRAM','CREATOR_PROFILE','https://example.test/p',$7::publication_status) returning id::text",
      [d[0].id, cv[0].id, f.engagementId, f.campaignId, f.workspaceId, f.creatorProfileId, opts.publicationStatus ?? "VERIFIED"]
    );
    publicationId = String(p[0].id);
  }
  return { deliverableId: String(d[0].id), contentVersionId: String(cv[0].id), publicationId };
}

/** A second creator + ACTIVE engagement in an existing fixture's workspace/campaign. */
export async function addEngagement(sql: TestSql, f: { owner: string; workspaceId: string; campaignId: string }, tag: string) {
  const creatorUser = await createUser(sql, `creator@${tag}.test`);
  const creator = await createCreatorProfile(sql, {
    userId: creatorUser,
    displayName: `Creator ${tag}`,
    countryCode: "BR",
    languageCode: "pt-BR",
    timezoneCode: "America/Sao_Paulo"
  });
  const creatorProfileId = String(creator.id);
  const participation = await sql.unsafe(
    "insert into campaign_participations(campaign_id,creator_profile_id,origin,status) values($1::uuid,$2::uuid,'APPLICATION','ACCEPTED') returning id::text",
    [f.campaignId, creatorProfileId]
  );
  const proposal = await sql.unsafe(
    "insert into campaign_proposals(participation_id,workspace_id,creator_profile_id,round,proposed_by,amount_minor,currency_code,scope_summary,status,created_by_user_id) values($1::uuid,$2::uuid,$3::uuid,1,'WORKSPACE',7000,'BRL','Reel','ACCEPTED',$4) returning id::text",
    [participation[0].id, f.workspaceId, creatorProfileId, f.owner]
  );
  const engagement = await sql.unsafe(
    "insert into campaign_engagements(participation_id,accepted_proposal_id,campaign_id,workspace_id,creator_profile_id,status,contracted_amount_minor,currency_code,scope_snapshot,created_by_user_id) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,'ACTIVE',7000,'BRL','Reel',$6) returning id::text",
    [participation[0].id, proposal[0].id, f.campaignId, f.workspaceId, creatorProfileId, f.owner]
  );
  return { creatorUser, creatorProfileId, engagementId: String(engagement[0].id) };
}

/** Workspace + creator + campaign + participation (no proposal yet). */
export async function createNegotiationFixture(sql: TestSql, tag: string, participationStatus = "APPLIED") {
  const owner = await createUser(sql, `owner@${tag}.test`);
  const workspace = await createWorkspace(sql, { userId: owner, name: tag, type: "AGENCY", idempotencyKey: tag });
  const workspaceId = String(workspace.id);
  const creatorUser = await createUser(sql, `creator@${tag}.test`);
  const creator = await createCreatorProfile(sql, {
    userId: creatorUser,
    displayName: `Creator ${tag}`,
    countryCode: "BR",
    languageCode: "pt-BR",
    timezoneCode: "America/Sao_Paulo"
  });
  const creatorProfileId = String(creator.id);
  const campaign = await createCampaign(sql, { userId: owner, workspaceId, name: `Campaign ${tag}` });
  const campaignId = String(campaign.id);
  const participation = await sql.unsafe(
    "insert into campaign_participations(campaign_id,creator_profile_id,origin,status) values($1::uuid,$2::uuid,'APPLICATION',$3::campaign_participation_status) returning id::text",
    [campaignId, creatorProfileId, participationStatus]
  );
  return { owner, workspaceId, creatorUser, creatorProfileId, campaignId, participationId: String(participation[0].id) };
}

/** Adds an ACTIVE member with a system role to an existing workspace (direct SQL, no invitation flow). */
export async function addMember(sql: TestSql, workspaceId: string, roleCode: string, tag: string) {
  const userId = await createUser(sql, `${roleCode.toLowerCase()}@${tag}.test`);
  await sql.unsafe(
    "insert into memberships(user_id,workspace_id,role_id) select $1,$2::uuid,r.id from roles r where r.code=$3 and r.workspace_id is null",
    [userId, workspaceId, roleCode]
  );
  return userId;
}
