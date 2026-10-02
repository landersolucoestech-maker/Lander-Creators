import type{Sql}from"postgres";import{authorizeWorkspacePermission}from"@/server/authorization/authorization-service";import{getCreatorProfileByUser}from"@/server/creator/creator-service";import{DomainError}from"@/server/shared/domain-error";import{writeAudit}from"@/server/shared/audit";import{Conditions,runPagedList}from"@/server/shared/paged-sql";import type{ListQuery,Page}from"@/server/shared/list-query";

type Tx={unsafe:Sql["unsafe"]};
async function audit(tx:Tx,i:{userId:string;workspaceId:string;disputeId:string;action:string;delta?:Record<string,unknown>}){await writeAudit(tx,{actorId:i.userId,workspaceId:i.workspaceId,action:i.action,entityType:"dispute",entityId:i.disputeId,delta:i.delta});}

export async function openCreatorDispute(sql:Sql,input:{userId:string;engagementId:string;reason:string;details?:string|null}){
  const cp=await getCreatorProfileByUser(sql,input.userId);
  if(!cp)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  const creatorProfileId=String((cp as Record<string,unknown>).id);
  return sql.begin(async(tx)=>{
    // Row lock serializes concurrent openings for the same engagement.
    const e=await tx.unsafe("select id::text,workspace_id::text,creator_profile_id::text from campaign_engagements where id=$1::uuid and creator_profile_id=$2::uuid for update",[input.engagementId,creatorProfileId]);
    if(!e[0])throw new DomainError("ENGAGEMENT_NOT_FOUND","Engagement not found",404);
    const active=await tx.unsafe("select 1 from disputes where engagement_id=$1::uuid and status in ('OPEN','UNDER_REVIEW')",[input.engagementId]);
    if(active[0])throw new DomainError("DISPUTE_ALREADY_ACTIVE","An active dispute already exists for this engagement",409);
    const r=await tx.unsafe("insert into disputes(engagement_id,workspace_id,creator_profile_id,opened_by_user_id,reason,details) values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6) returning id::text,status::text",[input.engagementId,e[0].workspace_id,e[0].creator_profile_id,input.userId,input.reason.trim(),input.details?.trim()||null]);
    await audit(tx,{userId:input.userId,workspaceId:String(e[0].workspace_id),disputeId:String(r[0].id),action:"dispute.opened",delta:{engagementId:input.engagementId}});
    return r[0];
  });
}
export const disputeListConfig={sorts:["updated_at","created_at","status","creator","campaign"] as const,defaultSort:"updated_at" as const,statuses:["OPEN","UNDER_REVIEW","RESOLVED","CLOSED"] as const};
export type DisputeSort=(typeof disputeListConfig.sorts)[number];
const disputeOrder:Record<DisputeSort,string>={updated_at:"d.updated_at",created_at:"d.created_at",status:"d.status",creator:"cp.display_name",campaign:"c.name"};
export type WorkspaceDisputeRow={id:string;engagement_id:string;reason:string;details:string|null;status:string;resolution:string|null;created_at:Date;updated_at:Date;resolved_at:Date|null;creator_name:string;campaign_name:string};
export async function listWorkspaceDisputes(sql:Sql,input:{userId:string;workspaceId:string;query:ListQuery<DisputeSort>}):Promise<Page<WorkspaceDisputeRow>>{
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"dispute.view"});
  const{query}=input;
  const conditions=new Conditions().add("d.workspace_id = ?::uuid",input.workspaceId);
  if(query.status)conditions.add("d.status = ?::dispute_status",query.status);
  conditions.search(["c.name","cp.display_name","d.reason"],query.q);
  return runPagedList<WorkspaceDisputeRow>(sql,{select:"d.id::text,d.engagement_id::text,d.reason,d.details,d.status::text,d.resolution,d.created_at,d.updated_at,d.resolved_at,cp.display_name creator_name,c.name campaign_name",from:"from disputes d join creator_profiles cp on cp.id=d.creator_profile_id join campaign_engagements e on e.id=d.engagement_id join campaigns c on c.id=e.campaign_id",conditions,orderBy:disputeOrder[query.sort],tiebreaker:"d.id",query});
}
export async function startDisputeReview(sql:Sql,input:{userId:string;workspaceId:string;disputeId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"dispute.manage"});
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update disputes set status='UNDER_REVIEW',updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status='OPEN' returning id::text,status::text",[input.disputeId,input.workspaceId]);
    if(!r[0])throw new DomainError("DISPUTE_REVIEW_NOT_ALLOWED","Dispute review cannot be started",409);
    await audit(tx,{userId:input.userId,workspaceId:input.workspaceId,disputeId:input.disputeId,action:"dispute.review_started"});
    return r[0];
  });
}
export async function resolveDispute(sql:Sql,input:{userId:string;workspaceId:string;disputeId:string;resolution:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"dispute.manage"});
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update disputes set status='RESOLVED',resolution=$4,resolved_by_user_id=$3,resolved_at=now(),updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status in ('OPEN','UNDER_REVIEW') returning id::text,status::text",[input.disputeId,input.workspaceId,input.userId,input.resolution.trim()]);
    if(!r[0])throw new DomainError("DISPUTE_RESOLUTION_NOT_ALLOWED","Dispute cannot be resolved",409);
    await audit(tx,{userId:input.userId,workspaceId:input.workspaceId,disputeId:input.disputeId,action:"dispute.resolved"});
    return r[0];
  });
}
