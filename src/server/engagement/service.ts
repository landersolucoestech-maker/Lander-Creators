import type{Sql}from"postgres";import{authorizeWorkspacePermission}from"@/server/authorization/authorization-service";import{getCreatorProfileByUser}from"@/server/creator/creator-service";import{DomainError}from"@/server/shared/domain-error";import{writeAudit}from"@/server/shared/audit";

type Tx={unsafe:Sql["unsafe"]};
export type CreatorEngagementRow={id:string;status:string;campaign_name:string;contractor_name:string;amount_minor:string;currency_code:string;scope_snapshot:string;activated_at:Date|null;created_at:Date;dispute_status:string|null;dispute_resolution:string|null};
export type CreatorContractRow={id:string;version:number;status:string;scope_of_work:string;rights_terms:string;payment_terms:string;campaign_name:string;contracted_amount_minor:string;currency_code:string};
const LIVE_CONTRACT="('DRAFT','SENT','SIGNED_CREATOR','SIGNED_WORKSPACE')";

/** Moves the engagement between expected states; a miss means the pair (contract, engagement) diverged, so the whole transaction aborts. */
async function moveEngagement(tx:Tx,engagementId:string,from:string,to:string,extra=""){
  const r=await tx.unsafe(`update campaign_engagements set status='${to}'${extra},updated_at=now() where id=$1::uuid and status='${from}' returning id::text`,[engagementId]);
  if(!r[0])throw new DomainError("ENGAGEMENT_STATE_CONFLICT","Engagement is not in the expected state",409);
}

export async function createEngagementFromAcceptedProposal(sql:Sql,input:{userId:string;workspaceId:string;proposalId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"engagement.manage"});
  return sql.begin(async(tx)=>{
    const ref=await tx.unsafe("select participation_id::text from campaign_proposals where id=$1::uuid and workspace_id=$2::uuid",[input.proposalId,input.workspaceId]);
    if(!ref[0])throw new DomainError("PROPOSAL_NOT_FOUND","Proposal not found",404);
    // Same lock order as the proposal service: participation first.
    await tx.unsafe("select id from campaign_participations where id=$1::uuid for update",[ref[0].participation_id]);
    const p=await tx.unsafe("select pr.id::text,pr.participation_id::text,pr.creator_profile_id::text,pr.amount_minor::text,pr.currency_code,pr.scope_summary,pr.rights_summary,pr.status::text,cp.campaign_id::text from campaign_proposals pr join campaign_participations cp on cp.id=pr.participation_id where pr.id=$1::uuid",[input.proposalId]);
    if(p[0].status!=="ACCEPTED")throw new DomainError("ENGAGEMENT_REQUIRES_ACCEPTED_PROPOSAL","Accepted proposal required",409);
    const r=await tx.unsafe("insert into campaign_engagements(participation_id,accepted_proposal_id,campaign_id,workspace_id,creator_profile_id,contracted_amount_minor,currency_code,scope_snapshot,rights_snapshot,created_by_user_id) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10) on conflict do nothing returning id::text,status::text",[p[0].participation_id,p[0].id,p[0].campaign_id,input.workspaceId,p[0].creator_profile_id,p[0].amount_minor,p[0].currency_code,p[0].scope_summary,p[0].rights_summary,input.userId]);
    if(!r[0])throw new DomainError("ENGAGEMENT_ALREADY_EXISTS","Engagement already exists",409);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"engagement.created",entityType:"campaign_engagement",entityId:String(r[0].id),delta:{acceptedProposalId:input.proposalId,amountMinor:p[0].amount_minor,currencyCode:p[0].currency_code}});
    return r[0];
  });
}
export async function createEngagementContract(sql:Sql,input:{userId:string;workspaceId:string;engagementId:string;scopeOfWork:string;rightsTerms:string;paymentTerms:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"engagement.manage"});
  return sql.begin(async(tx)=>{
    const e=await tx.unsafe("select id::text,status::text from campaign_engagements where id=$1::uuid and workspace_id=$2::uuid for update",[input.engagementId,input.workspaceId]);
    if(!e[0])throw new DomainError("ENGAGEMENT_NOT_FOUND","Engagement not found",404);
    if(e[0].status!=="DRAFT")throw new DomainError("CONTRACT_NOT_ALLOWED","Contract cannot be created for this engagement",409);
    const live=await tx.unsafe("select 1 from engagement_contracts where engagement_id=$1::uuid and status in "+LIVE_CONTRACT,[input.engagementId]);
    if(live[0])throw new DomainError("CONTRACT_ALREADY_LIVE","A live contract already exists for this engagement",409);
    const version=await tx.unsafe("select coalesce(max(version),0)+1 next from engagement_contracts where engagement_id=$1::uuid",[input.engagementId]);
    const r=await tx.unsafe("insert into engagement_contracts(engagement_id,version,scope_of_work,rights_terms,payment_terms,created_by_user_id) values($1::uuid,$2,$3,$4,$5,$6) returning id::text,status::text,version",[input.engagementId,Number(version[0].next),input.scopeOfWork.trim(),input.rightsTerms.trim(),input.paymentTerms.trim(),input.userId]);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"contract.created",entityType:"engagement_contract",entityId:String(r[0].id),delta:{engagementId:input.engagementId,version:r[0].version}});
    return r[0];
  });
}
export async function sendContract(sql:Sql,input:{userId:string;workspaceId:string;contractId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"engagement.manage"});
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update engagement_contracts c set status='SENT',updated_at=now() from campaign_engagements e where c.id=$1::uuid and c.engagement_id=e.id and e.workspace_id=$2::uuid and c.status='DRAFT' returning c.id::text,c.engagement_id::text",[input.contractId,input.workspaceId]);
    if(!r[0])throw new DomainError("CONTRACT_SEND_NOT_ALLOWED","Contract cannot be sent",409);
    await moveEngagement(tx,String(r[0].engagement_id),"DRAFT","PENDING_CREATOR_SIGNATURE");
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"contract.sent",entityType:"engagement_contract",entityId:input.contractId,delta:{engagementId:r[0].engagement_id}});
    return{id:r[0].id,status:"SENT"};
  });
}
export async function creatorSignContract(sql:Sql,input:{userId:string;contractId:string}){
  const cp=await getCreatorProfileByUser(sql,input.userId);if(!cp)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update engagement_contracts c set status='SIGNED_CREATOR',creator_signed_at=now(),updated_at=now() from campaign_engagements e where c.id=$1::uuid and c.engagement_id=e.id and e.creator_profile_id=$2::uuid and c.status='SENT' returning c.id::text,c.engagement_id::text,e.workspace_id::text",[input.contractId,String((cp as Record<string,unknown>).id)]);
    if(!r[0])throw new DomainError("CONTRACT_SIGN_NOT_ALLOWED","Contract cannot be signed",409);
    await moveEngagement(tx,String(r[0].engagement_id),"PENDING_CREATOR_SIGNATURE","PENDING_WORKSPACE_SIGNATURE");
    await writeAudit(tx,{actorId:input.userId,workspaceId:String(r[0].workspace_id),action:"contract.signed_creator",entityType:"engagement_contract",entityId:input.contractId,delta:{engagementId:r[0].engagement_id}});
    return{id:r[0].id,status:"SIGNED_CREATOR"};
  });
}
export async function workspaceSignContract(sql:Sql,input:{userId:string;workspaceId:string;contractId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"engagement.manage"});
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update engagement_contracts c set status='EXECUTED',workspace_signed_at=now(),executed_at=now(),updated_at=now() from campaign_engagements e where c.id=$1::uuid and c.engagement_id=e.id and e.workspace_id=$2::uuid and c.status='SIGNED_CREATOR' returning c.id::text,c.engagement_id::text",[input.contractId,input.workspaceId]);
    if(!r[0])throw new DomainError("CONTRACT_SIGN_NOT_ALLOWED","Contract cannot be signed",409);
    await moveEngagement(tx,String(r[0].engagement_id),"PENDING_WORKSPACE_SIGNATURE","ACTIVE",",activated_at=now()");
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"contract.signed_workspace",entityType:"engagement_contract",entityId:input.contractId,delta:{engagementId:r[0].engagement_id}});
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"engagement.activated",entityType:"campaign_engagement",entityId:String(r[0].engagement_id),delta:{contractId:input.contractId}});
    return{id:r[0].id,status:"EXECUTED"};
  });
}
export async function listCreatorContracts(sql:Sql,userId:string){const cp=await getCreatorProfileByUser(sql,userId);if(!cp)return[];return sql.unsafe<CreatorContractRow[]>("select ec.id::text,ec.version,ec.status::text,ec.scope_of_work,ec.rights_terms,ec.payment_terms,c.name campaign_name,ce.contracted_amount_minor::text,ce.currency_code from engagement_contracts ec join campaign_engagements ce on ce.id=ec.engagement_id join campaigns c on c.id=ce.campaign_id where ce.creator_profile_id=$1::uuid and ec.status<>'DRAFT' order by ec.updated_at desc",[String((cp as Record<string,unknown>).id)]);}
/** The Creator's own engagements, with the state of their latest dispute. Only columns the Creator may see are selected. */
export async function listCreatorEngagements(sql:Sql,userId:string){const cp=await getCreatorProfileByUser(sql,userId);if(!cp)return[];return sql.unsafe<CreatorEngagementRow[]>("select e.id::text,e.status::text,c.name campaign_name,w.name contractor_name,e.contracted_amount_minor::text amount_minor,e.currency_code,e.scope_snapshot,e.activated_at,e.created_at,ld.status::text dispute_status,ld.resolution dispute_resolution from campaign_engagements e join campaigns c on c.id=e.campaign_id join workspaces w on w.id=e.workspace_id left join lateral (select d.status,d.resolution from disputes d where d.engagement_id=e.id order by d.created_at desc limit 1) ld on true where e.creator_profile_id=$1::uuid order by e.created_at desc",[String((cp as Record<string,unknown>).id)]);}
