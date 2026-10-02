import type{Sql}from"postgres";import{authorizeWorkspacePermission}from"@/server/authorization/authorization-service";import{getCreatorProfileByUser}from"@/server/creator/creator-service";import{DomainError}from"@/server/shared/domain-error";import{writeAudit}from"@/server/shared/audit";import{isHttpsUrl}from"@/server/shared/https-url";
export type CreatorPublicationRow={id:string;platform:string;mode:string;scheduled_at:Date|null;published_at:Date|null;proof_url:string|null;status:string;title:string;campaign_name:string};
export async function planPublication(sql:Sql,input:{userId:string;workspaceId:string;deliverableId:string;mode:"CREATOR_PROFILE"|"CONTRACTOR_PROFILE"|"COLLAB";scheduledAt?:string|null}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"publication.manage"});
  return sql.begin(async(tx)=>{
    const d=await tx.unsafe("select id::text,engagement_id::text,campaign_id::text,creator_profile_id::text,platform,status::text from deliverables where id=$1::uuid and workspace_id=$2::uuid for update",[input.deliverableId,input.workspaceId]);
    if(!d[0])throw new DomainError("DELIVERABLE_NOT_FOUND","Deliverable not found",404);
    const cv=d[0].status==="APPROVED"?await tx.unsafe("select id::text from content_versions where deliverable_id=$1::uuid and status='APPROVED' order by version desc limit 1",[input.deliverableId]):[];
    if(!cv[0])throw new DomainError("PUBLICATION_REQUIRES_APPROVED_CONTENT","Approved content required",409);
    const r=await tx.unsafe("insert into publications(deliverable_id,approved_content_version_id,engagement_id,campaign_id,workspace_id,creator_profile_id,platform,mode,scheduled_at,status) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7,$8::publication_mode,$9::timestamptz,'READY') on conflict(deliverable_id) do nothing returning id::text,status::text",[input.deliverableId,cv[0].id,d[0].engagement_id,d[0].campaign_id,input.workspaceId,d[0].creator_profile_id,d[0].platform,input.mode,input.scheduledAt??null]);
    if(!r[0])throw new DomainError("PUBLICATION_ALREADY_PLANNED","A publication is already planned for this deliverable",409);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"publication.planned",entityType:"publication",entityId:String(r[0].id),delta:{deliverableId:input.deliverableId,approvedContentVersionId:cv[0].id,mode:input.mode,scheduledAt:input.scheduledAt??null}});
    return r[0];
  });
}
export async function listCreatorPublications(sql:Sql,userId:string){const cp=await getCreatorProfileByUser(sql,userId);if(!cp)return[];return sql.unsafe<CreatorPublicationRow[]>("select p.id::text,p.platform,p.mode::text,p.scheduled_at,p.published_at,p.proof_url,p.status::text,d.title,c.name campaign_name from publications p join deliverables d on d.id=p.deliverable_id join campaigns c on c.id=p.campaign_id where p.creator_profile_id=$1::uuid order by p.updated_at desc",[String((cp as Record<string,unknown>).id)]);}
export async function submitPublicationProof(sql:Sql,input:{userId:string;publicationId:string;proofUrl:string}){
  const cp=await getCreatorProfileByUser(sql,input.userId);
  if(!cp)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  const proofUrl=input.proofUrl.trim();
  if(!isHttpsUrl(proofUrl))throw new DomainError("PUBLICATION_PROOF_URL_INVALID","Proof URL must be https",400);
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update publications set proof_url=$3,published_at=now(),status='PUBLISHED',updated_at=now() where id=$1::uuid and creator_profile_id=$2::uuid and status='READY' returning id::text,status::text,workspace_id::text",[input.publicationId,String((cp as Record<string,unknown>).id),proofUrl]);
    if(!r[0])throw new DomainError("PUBLICATION_PROOF_NOT_ALLOWED","Publication proof cannot be submitted",409);
    await writeAudit(tx,{actorId:input.userId,workspaceId:String(r[0].workspace_id),action:"publication.proof_submitted",entityType:"publication",entityId:input.publicationId,delta:{proofUrl}});
    return{id:r[0].id,status:r[0].status};
  });
}
export async function verifyPublication(sql:Sql,input:{userId:string;workspaceId:string;publicationId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"publication.manage"});
  return sql.begin(async(tx)=>{
    const r=await tx.unsafe("update publications set status='VERIFIED',verified_at=now(),updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status='PUBLISHED' and proof_url is not null returning id::text,status::text",[input.publicationId,input.workspaceId]);
    if(!r[0])throw new DomainError("PUBLICATION_VERIFY_NOT_ALLOWED","Publication cannot be verified",409);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"publication.verified",entityType:"publication",entityId:input.publicationId});
    return r[0];
  });
}