import type {Sql} from "postgres";
import {authorizeWorkspacePermission} from "@/server/authorization/authorization-service";
import {DomainError} from "@/server/shared/domain-error";
import {getCreatorProfileByUser} from "@/server/creator/creator-service";
import {writeAudit} from "@/server/shared/audit";

async function campaign(sql:Sql,campaignId:string){const r=await sql.unsafe("select id::text,workspace_id::text,name,status::text,visibility::text,recruitment_status::text,recruitment_opens_at,recruitment_closes_at,promoted_object_display_name_snapshot,brief from campaigns where id=$1::uuid",[campaignId]);if(!r[0])throw new DomainError("CAMPAIGN_NOT_FOUND","Campaign not found",404);return r[0] as Record<string,unknown>;}
function recruitmentOpen(c:Record<string,unknown>){const now=Date.now(),opens=c.recruitment_opens_at?new Date(String(c.recruitment_opens_at)).getTime():null,closes=c.recruitment_closes_at?new Date(String(c.recruitment_closes_at)).getTime():null;return c.status==="ACTIVE"&&c.visibility==="OPEN"&&c.recruitment_status==="OPEN"&&(opens===null||opens<=now)&&(closes===null||closes>=now);}
export async function listCreatorOpportunities(sql:Sql,userId:string){const p=await getCreatorProfileByUser(sql,userId);if(!p)return[];return sql.unsafe(`select c.id::text campaign_id,c.name,c.promoted_object_display_name_snapshot,c.brief,c.starts_at,c.ends_at,c.recruitment_closes_at,cp.status::text participation_status from campaigns c left join campaign_participations cp on cp.campaign_id=c.id and cp.creator_profile_id=$1::uuid where ((c.status='ACTIVE' and c.visibility='OPEN' and c.recruitment_status='OPEN' and (c.recruitment_opens_at is null or c.recruitment_opens_at<=now()) and (c.recruitment_closes_at is null or c.recruitment_closes_at>=now())) or cp.id is not null) order by c.updated_at desc`,[String((p as Record<string,unknown>).id)]);}
export async function applyToCampaign(sql:Sql,input:{userId:string;campaignId:string;message?:string|null}){
  const p=await getCreatorProfileByUser(sql,input.userId);if(!p)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  const profile=p as Record<string,unknown>;
  if(profile.status!=="ACTIVE"||profile.availability==="UNAVAILABLE")throw new DomainError("CREATOR_NOT_ELIGIBLE","Creator is not eligible to apply",409);
  const c=await campaign(sql,input.campaignId);
  if(!recruitmentOpen(c))throw new DomainError("CAMPAIGN_NOT_ACCEPTING_APPLICATIONS","Campaign is not accepting applications",409);
  return sql.begin(async(tx)=>{
    const rows=await tx.unsafe("insert into campaign_participations(campaign_id,creator_profile_id,origin,status,message,applied_at) values($1::uuid,$2::uuid,'APPLICATION','APPLIED',$3,now()) on conflict(campaign_id,creator_profile_id) do nothing returning id::text,status::text",[input.campaignId,String(profile.id),input.message?.trim()||null]);
    if(!rows[0])throw new DomainError("PARTICIPATION_ALREADY_EXISTS","Participation already exists",409);
    await writeAudit(tx,{actorId:input.userId,workspaceId:String(c.workspace_id),action:"participation.applied",entityType:"campaign_participation",entityId:String(rows[0].id),delta:{campaignId:input.campaignId,creatorProfileId:String(profile.id)}});
    return rows[0];
  });
}
/** A participation that ends can no longer be negotiated: its open proposal rounds are closed in the same transaction. */
async function closeOpenProposals(tx:{unsafe:Sql["unsafe"]},participationId:string){
  await tx.unsafe("update campaign_proposals set status='WITHDRAWN',responded_at=now(),updated_at=now() where participation_id=$1::uuid and status in ('PENDING_CREATOR','PENDING_WORKSPACE')",[participationId]);
}
export async function withdrawApplication(sql:Sql,input:{userId:string;campaignId:string}){
  const p=await getCreatorProfileByUser(sql,input.userId);if(!p)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  return sql.begin(async(tx)=>{
    const lock=await tx.unsafe("select cp.id::text,c.workspace_id::text from campaign_participations cp join campaigns c on c.id=cp.campaign_id where cp.campaign_id=$1::uuid and cp.creator_profile_id=$2::uuid for update of cp",[input.campaignId,String((p as Record<string,unknown>).id)]);
    const r=lock[0]?await tx.unsafe("update campaign_participations set status='WITHDRAWN',responded_at=now(),updated_at=now() where id=$1::uuid and status in ('APPLIED','SHORTLISTED') returning id::text,status::text",[lock[0].id]):[];
    if(!r[0])throw new DomainError("PARTICIPATION_TRANSITION_REJECTED","Participation cannot be withdrawn",409);
    await closeOpenProposals(tx,String(r[0].id));
    await writeAudit(tx,{actorId:input.userId,workspaceId:String(lock[0].workspace_id),action:"participation.withdrawn",entityType:"campaign_participation",entityId:String(r[0].id),delta:{campaignId:input.campaignId}});
    return r[0];
  });
}
export async function listCampaignParticipations(sql:Sql,input:{userId:string;workspaceId:string;campaignId:string}){await authorizeWorkspacePermission(sql,{...input,permission:"participation.view"});const c=await campaign(sql,input.campaignId);if(c.workspace_id!==input.workspaceId)throw new DomainError("CAMPAIGN_NOT_FOUND","Campaign not found",404);return sql.unsafe("select cp.id::text,cp.status::text,cp.origin::text,cp.message,cp.created_at,cr.id::text creator_profile_id,cr.display_name,cr.country_code,cr.availability::text from campaign_participations cp join creator_profiles cr on cr.id=cp.creator_profile_id where cp.campaign_id=$1::uuid order by cp.updated_at desc",[input.campaignId]);}
export async function inviteCreator(sql:Sql,input:{userId:string;workspaceId:string;campaignId:string;creatorProfileId:string;message?:string|null}){
  await authorizeWorkspacePermission(sql,{...input,permission:"participation.manage"});
  const c=await campaign(sql,input.campaignId);if(c.workspace_id!==input.workspaceId)throw new DomainError("CAMPAIGN_NOT_FOUND","Campaign not found",404);
  return sql.begin(async(tx)=>{
    const cr=await tx.unsafe("select id from creator_profiles where id=$1::uuid and status='ACTIVE' and marketplace_visibility='VISIBLE' and availability<>'UNAVAILABLE'",[input.creatorProfileId]);
    if(!cr[0])throw new DomainError("CREATOR_NOT_INVITABLE","Creator is not available for invitation",409);
    const r=await tx.unsafe("insert into campaign_participations(campaign_id,creator_profile_id,origin,status,message,invited_by_user_id,invited_at) values($1::uuid,$2::uuid,'DIRECT_INVITATION','INVITED',$3,$4,now()) on conflict(campaign_id,creator_profile_id) do nothing returning id::text,status::text",[input.campaignId,input.creatorProfileId,input.message?.trim()||null,input.userId]);
    if(!r[0])throw new DomainError("PARTICIPATION_ALREADY_EXISTS","Participation already exists",409);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"participation.invited",entityType:"campaign_participation",entityId:String(r[0].id),delta:{campaignId:input.campaignId,creatorProfileId:input.creatorProfileId}});
    return r[0];
  });
}
export async function updateParticipationStatus(sql:Sql,input:{userId:string;workspaceId:string;campaignId:string;participationId:string;status:"SHORTLISTED"|"REJECTED"|"ACCEPTED"}){
  await authorizeWorkspacePermission(sql,{...input,permission:"participation.manage"});
  const c=await campaign(sql,input.campaignId);if(c.workspace_id!==input.workspaceId)throw new DomainError("CAMPAIGN_NOT_FOUND","Campaign not found",404);
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update campaign_participations set status=$3::campaign_participation_status,responded_at=case when $3::text in ('REJECTED','ACCEPTED') then now() else responded_at end,updated_at=now() where id=$1::uuid and campaign_id=$2::uuid and status in ('APPLIED','INVITED','SHORTLISTED') returning id::text,status::text",[input.participationId,input.campaignId,input.status]);
    if(!r[0])throw new DomainError("PARTICIPATION_TRANSITION_REJECTED","Participation transition rejected",409);
    // Rejecting or accepting directly ends the negotiation, so no round may stay open.
    if(input.status==="REJECTED"||input.status==="ACCEPTED")await closeOpenProposals(tx,String(r[0].id));
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:`participation.${input.status.toLowerCase()}`,entityType:"campaign_participation",entityId:String(r[0].id),delta:{campaignId:input.campaignId}});
    return r[0];
  });
}