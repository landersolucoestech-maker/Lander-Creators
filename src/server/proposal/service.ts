import type{Sql}from"postgres";import{authorizeWorkspacePermission}from"@/server/authorization/authorization-service";import{getCreatorProfileByUser}from"@/server/creator/creator-service";import{DomainError}from"@/server/shared/domain-error";import{writeAudit}from"@/server/shared/audit";

type Tx={unsafe:Sql["unsafe"]};
export type CreatorProposalRow={id:string;participation_id:string;round:number;proposed_by:"WORKSPACE"|"CREATOR";amount_minor:string;currency_code:string;scope_summary:string;rights_summary:string|null;status:string;campaign_name:string};
const OPEN_STATUSES="('PENDING_CREATOR','PENDING_WORKSPACE')";

function assertTerms(i:{amountMinor:number;scopeSummary:string;currencyCode?:string}){
  if(!Number.isSafeInteger(i.amountMinor)||i.amountMinor<0)throw new DomainError("PROPOSAL_INVALID","Amount must be a non-negative integer in minor units",400);
  if(!i.scopeSummary.trim())throw new DomainError("PROPOSAL_INVALID","Scope summary is required",400);
  if(i.currencyCode!==undefined&&!/^[A-Z]{3}$/.test(i.currencyCode.toUpperCase()))throw new DomainError("PROPOSAL_INVALID","Currency must be a 3-letter code",400);
}
/** Participation row lock: every proposal transition serializes here (lock order: participation, then proposal). */
async function lockParticipation(tx:Tx,id:string){
  const r=await tx.unsafe("select cp.id::text,cp.campaign_id::text,cp.creator_profile_id::text,cp.status::text,c.workspace_id::text from campaign_participations cp join campaigns c on c.id=cp.campaign_id where cp.id=$1::uuid for update of cp",[id]);
  if(!r[0])throw new DomainError("PARTICIPATION_NOT_FOUND","Participation not found",404);
  return r[0] as Record<string,unknown>;
}
/** Resolves a proposal only inside the caller's own scope; unknown and foreign ids are indistinguishable (404). */
async function proposalParticipationId(tx:Tx,id:string,scope:{creatorProfileId:string}|{workspaceId:string}){
  const r="creatorProfileId" in scope
    ?await tx.unsafe("select participation_id::text from campaign_proposals where id=$1::uuid and creator_profile_id=$2::uuid",[id,scope.creatorProfileId])
    :await tx.unsafe("select participation_id::text from campaign_proposals where id=$1::uuid and workspace_id=$2::uuid",[id,scope.workspaceId]);
  if(!r[0])throw new DomainError("PROPOSAL_NOT_FOUND","Proposal not found",404);
  return String(r[0].participation_id);
}
async function readProposal(tx:Tx,id:string){
  const r=await tx.unsafe("select id::text,participation_id::text,workspace_id::text,creator_profile_id::text,round,amount_minor::text,currency_code,status::text from campaign_proposals where id=$1::uuid",[id]);
  return r[0] as Record<string,unknown>|undefined;
}
async function answer(tx:Tx,input:{proposal:Record<string,unknown>;status:"ACCEPTED"|"REJECTED";actorId:string;notAllowed:string}){
  const pr=input.proposal;
  const upd=await tx.unsafe("update campaign_proposals set status=$2::campaign_proposal_status,responded_at=now(),updated_at=now() where id=$1::uuid and status in "+OPEN_STATUSES+" returning id::text",[String(pr.id),input.status]);
  if(!upd[0])throw new DomainError(input.notAllowed,"Proposal cannot be answered",409);
  if(input.status==="ACCEPTED"){
    const part=await tx.unsafe("update campaign_participations set status='ACCEPTED',responded_at=now(),updated_at=now() where id=$1::uuid and status in ('APPLIED','INVITED','SHORTLISTED') returning id::text",[String(pr.participation_id)]);
    if(!part[0])throw new DomainError(input.notAllowed,"Proposal cannot be answered",409);
  }
  await writeAudit(tx,{actorId:input.actorId,workspaceId:String(pr.workspace_id),action:input.status==="ACCEPTED"?"proposal.accepted":"proposal.rejected",entityType:"campaign_proposal",entityId:String(pr.id),delta:{round:pr.round,amountMinor:pr.amount_minor,currencyCode:pr.currency_code}});
  return{id:String(pr.id),status:input.status};
}

export async function createWorkspaceProposal(sql:Sql,input:{userId:string;workspaceId:string;participationId:string;amountMinor:number;currencyCode:string;scopeSummary:string;rightsSummary?:string|null}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"proposal.manage"});
  assertTerms(input);
  return sql.begin(async(tx)=>{
    const p=await lockParticipation(tx,input.participationId);
    if(p.workspace_id!==input.workspaceId)throw new DomainError("PARTICIPATION_NOT_FOUND","Participation not found",404);
    if(!["APPLIED","INVITED","SHORTLISTED"].includes(String(p.status)))throw new DomainError("PROPOSAL_NOT_ALLOWED","Participation cannot receive a proposal",409);
    const open=await tx.unsafe("select 1 from campaign_proposals where participation_id=$1::uuid and status in "+OPEN_STATUSES,[input.participationId]);
    if(open[0])throw new DomainError("PROPOSAL_ALREADY_OPEN","A proposal round is already open for this participation",409);
    const round=await tx.unsafe("select coalesce(max(round),0)+1 next from campaign_proposals where participation_id=$1::uuid",[input.participationId]);
    const r=await tx.unsafe("insert into campaign_proposals(participation_id,workspace_id,creator_profile_id,round,proposed_by,amount_minor,currency_code,scope_summary,rights_summary,status,created_by_user_id) values($1::uuid,$2::uuid,$3::uuid,$4,'WORKSPACE',$5,$6,$7,$8,'PENDING_CREATOR',$9) on conflict do nothing returning id::text,status::text,round",[input.participationId,input.workspaceId,String(p.creator_profile_id),Number(round[0].next),input.amountMinor,input.currencyCode.toUpperCase(),input.scopeSummary.trim(),input.rightsSummary?.trim()||null,input.userId]);
    if(!r[0])throw new DomainError("PROPOSAL_ALREADY_OPEN","A proposal round is already open for this participation",409);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"proposal.created",entityType:"campaign_proposal",entityId:String(r[0].id),delta:{participationId:input.participationId,round:r[0].round,amountMinor:input.amountMinor,currencyCode:input.currencyCode.toUpperCase()}});
    return r[0];
  });
}
export async function listCreatorProposals(sql:Sql,userId:string){const p=await getCreatorProfileByUser(sql,userId);if(!p)return[];return sql.unsafe<CreatorProposalRow[]>("select pr.id::text,pr.participation_id::text,pr.round,pr.proposed_by,pr.amount_minor::text,pr.currency_code,pr.scope_summary,pr.rights_summary,pr.status::text,c.name campaign_name from campaign_proposals pr join campaign_participations cp on cp.id=pr.participation_id join campaigns c on c.id=cp.campaign_id where pr.creator_profile_id=$1::uuid order by pr.updated_at desc",[String((p as Record<string,unknown>).id)]);}
export async function creatorRespondProposal(sql:Sql,input:{userId:string;proposalId:string;action:"ACCEPT"|"REJECT";amountMinor?:number;scopeSummary?:string;rightsSummary?:string|null}){
  const cp=await getCreatorProfileByUser(sql,input.userId);
  if(!cp)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  if(input.action!=="ACCEPT"&&input.action!=="REJECT")throw new DomainError("PROPOSAL_RESPONSE_NOT_ALLOWED","Proposal response not allowed",409);
  return sql.begin(async(tx)=>{
    await lockParticipation(tx,await proposalParticipationId(tx,input.proposalId,{creatorProfileId:String((cp as Record<string,unknown>).id)}));
    const pr=await readProposal(tx,input.proposalId);
    if(!pr||pr.creator_profile_id!==String((cp as Record<string,unknown>).id)||pr.status!=="PENDING_CREATOR")throw new DomainError("PROPOSAL_RESPONSE_NOT_ALLOWED","Proposal cannot be answered",409);
    return answer(tx,{proposal:pr,status:input.action==="ACCEPT"?"ACCEPTED":"REJECTED",actorId:input.userId,notAllowed:"PROPOSAL_RESPONSE_NOT_ALLOWED"});
  });
}
export async function creatorCounterProposal(sql:Sql,input:{userId:string;proposalId:string;amountMinor:number;scopeSummary:string;rightsSummary?:string|null}){
  const cp=await getCreatorProfileByUser(sql,input.userId);
  if(!cp)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  assertTerms(input);
  return sql.begin(async(tx)=>{
    const part=await lockParticipation(tx,await proposalParticipationId(tx,input.proposalId,{creatorProfileId:String((cp as Record<string,unknown>).id)}));
    const pr=await readProposal(tx,input.proposalId);
    if(!pr||pr.creator_profile_id!==String((cp as Record<string,unknown>).id)||pr.status!=="PENDING_CREATOR"||!["APPLIED","INVITED","SHORTLISTED"].includes(String(part.status)))throw new DomainError("PROPOSAL_COUNTER_NOT_ALLOWED","Proposal cannot be countered",409);
    const sup=await tx.unsafe("update campaign_proposals set status='SUPERSEDED',responded_at=now(),updated_at=now() where id=$1::uuid and status='PENDING_CREATOR' returning id::text",[input.proposalId]);
    if(!sup[0])throw new DomainError("PROPOSAL_COUNTER_NOT_ALLOWED","Proposal cannot be countered",409);
    const r=await tx.unsafe("insert into campaign_proposals(participation_id,workspace_id,creator_profile_id,round,proposed_by,amount_minor,currency_code,scope_summary,rights_summary,status,created_by_user_id) values($1::uuid,$2::uuid,$3::uuid,$4,'CREATOR',$5,$6,$7,$8,'PENDING_WORKSPACE',$9) returning id::text,status::text,round",[String(pr.participation_id),String(pr.workspace_id),String(pr.creator_profile_id),Number(pr.round)+1,input.amountMinor,String(pr.currency_code),input.scopeSummary.trim(),input.rightsSummary?.trim()||null,input.userId]);
    await writeAudit(tx,{actorId:input.userId,workspaceId:String(pr.workspace_id),action:"proposal.countered",entityType:"campaign_proposal",entityId:String(r[0].id),delta:{supersededProposalId:input.proposalId,round:r[0].round,amountMinor:input.amountMinor,currencyCode:pr.currency_code}});
    return r[0];
  });
}
export async function workspaceRespondProposal(sql:Sql,input:{userId:string;workspaceId:string;proposalId:string;action:"ACCEPT"|"REJECT"}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"proposal.manage"});
  return sql.begin(async(tx)=>{
    await lockParticipation(tx,await proposalParticipationId(tx,input.proposalId,{workspaceId:input.workspaceId}));
    const pr=await readProposal(tx,input.proposalId);
    if(!pr||pr.workspace_id!==input.workspaceId||pr.status!=="PENDING_WORKSPACE")throw new DomainError("PROPOSAL_RESPONSE_NOT_ALLOWED","Proposal cannot be answered",409);
    return answer(tx,{proposal:pr,status:input.action==="ACCEPT"?"ACCEPTED":"REJECTED",actorId:input.userId,notAllowed:"PROPOSAL_RESPONSE_NOT_ALLOWED"});
  });
}
