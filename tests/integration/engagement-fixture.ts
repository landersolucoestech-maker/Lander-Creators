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
