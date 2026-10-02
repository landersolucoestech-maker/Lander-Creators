import type{Sql}from"postgres";import{authorizeWorkspacePermission}from"@/server/authorization/authorization-service";import{getCreatorProfileByUser}from"@/server/creator/creator-service";import{DomainError}from"@/server/shared/domain-error";import{writeAudit}from"@/server/shared/audit";import{isHttpsUrl}from"@/server/shared/https-url";
export async function createDeliverable(sql:Sql,input:{userId:string;workspaceId:string;engagementId:string;title:string;platform:string;format:string;requirementsSnapshot:string;dueAt?:string|null}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"deliverable.manage"});
  return sql.begin(async(tx)=>{
    const e=await tx.unsafe("select id::text,campaign_id::text,workspace_id::text,creator_profile_id::text,status::text from campaign_engagements where id=$1::uuid and workspace_id=$2::uuid for share",[input.engagementId,input.workspaceId]);
    if(!e[0])throw new DomainError("ENGAGEMENT_NOT_FOUND","Engagement not found",404);
    if(e[0].status!=="ACTIVE")throw new DomainError("DELIVERABLE_REQUIRES_ACTIVE_ENGAGEMENT","Active engagement required",409);
    const r=await tx.unsafe("insert into deliverables(engagement_id,campaign_id,workspace_id,creator_profile_id,title,platform,format,requirements_snapshot,due_at) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9::timestamptz) returning id::text,status::text",[input.engagementId,e[0].campaign_id,input.workspaceId,e[0].creator_profile_id,input.title.trim(),input.platform.trim(),input.format.trim(),input.requirementsSnapshot.trim(),input.dueAt??null]);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"deliverable.created",entityType:"deliverable",entityId:String(r[0].id),delta:{engagementId:input.engagementId,title:input.title.trim(),platform:input.platform.trim(),format:input.format.trim()}});
    return r[0];
  });
}
export async function listCreatorDeliverables(sql:Sql,userId:string){const cp=await getCreatorProfileByUser(sql,userId);if(!cp)return[];return sql.unsafe("select d.id::text,d.title,d.platform,d.format,d.requirements_snapshot,d.due_at,d.status::text,c.name campaign_name from deliverables d join campaigns c on c.id=d.campaign_id where d.creator_profile_id=$1::uuid order by d.updated_at desc",[String((cp as Record<string,unknown>).id)]);}
export async function submitContentVersion(sql:Sql,input:{userId:string;deliverableId:string;mediaAssetId?:string|null;externalUrl?:string|null;creatorNote?:string|null}){
  const cp=await getCreatorProfileByUser(sql,input.userId);
  if(!cp)throw new DomainError("CREATOR_PROFILE_REQUIRED","Creator profile required",409);
  const externalUrl=input.externalUrl?.trim()||null;
  if(!input.mediaAssetId&&!externalUrl)throw new DomainError("CONTENT_REFERENCE_REQUIRED","Media asset or external URL required",400);
  if(externalUrl&&!isHttpsUrl(externalUrl))throw new DomainError("CONTENT_URL_INVALID","External URL must be https",400);
  return sql.begin(async(tx)=>{
    // The deliverable row lock serializes submissions and reviews of the same deliverable.
    const d=await tx.unsafe("select id::text,workspace_id::text,creator_profile_id::text,status::text from deliverables where id=$1::uuid for update",[input.deliverableId]);
    if(!d[0]||d[0].creator_profile_id!==String((cp as Record<string,unknown>).id))throw new DomainError("DELIVERABLE_NOT_FOUND","Deliverable not found",404);
    if(!["PENDING","IN_PROGRESS","CHANGES_REQUESTED"].includes(d[0].status))throw new DomainError("CONTENT_SUBMISSION_NOT_ALLOWED","Content cannot be submitted",409);
    if(input.mediaAssetId){const m=await tx.unsafe("select id from media_assets where id=$1::uuid and workspace_id=$2::uuid and status='READY'",[input.mediaAssetId,d[0].workspace_id]);if(!m[0])throw new DomainError("MEDIA_NOT_AVAILABLE","Media asset not available",409);}
    const superseded=await tx.unsafe("update content_versions set status='SUPERSEDED' where deliverable_id=$1::uuid and status='SUBMITTED' returning id::text",[input.deliverableId]);
    const v=await tx.unsafe("select coalesce(max(version),0)+1 next from content_versions where deliverable_id=$1::uuid",[input.deliverableId]);
    const r=await tx.unsafe("insert into content_versions(deliverable_id,version,media_asset_id,external_url,creator_note,submitted_by_user_id) values($1::uuid,$2,$3::uuid,$4,$5,$6) returning id::text,status::text,version",[input.deliverableId,Number(v[0].next),input.mediaAssetId??null,externalUrl,input.creatorNote?.trim()||null,input.userId]);
    await tx.unsafe("update deliverables set status='SUBMITTED',updated_at=now() where id=$1::uuid",[input.deliverableId]);
    await writeAudit(tx,{actorId:input.userId,workspaceId:String(d[0].workspace_id),action:"content_version.submitted",entityType:"content_version",entityId:String(r[0].id),delta:{deliverableId:input.deliverableId,version:r[0].version,supersededVersionIds:superseded.map(x=>x.id)}});
    return r[0];
  });
}
export async function reviewContentVersion(sql:Sql,input:{userId:string;workspaceId:string;contentVersionId:string;decision:"APPROVE"|"REQUEST_CHANGES"|"REJECT";reviewNote?:string|null}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"deliverable.manage"});
  const map={APPROVE:["APPROVED","APPROVED","content_version.approved"],REQUEST_CHANGES:["CHANGES_REQUESTED","CHANGES_REQUESTED","content_version.changes_requested"],REJECT:["REJECTED","REJECTED","content_version.rejected"]} as const;
  const[vs,ds,action]=map[input.decision];
  return sql.begin(async(tx)=>{
    const cv=await tx.unsafe("select cv.deliverable_id::text,d.workspace_id::text from content_versions cv join deliverables d on d.id=cv.deliverable_id where cv.id=$1::uuid",[input.contentVersionId]);
    if(!cv[0]||cv[0].workspace_id!==input.workspaceId)throw new DomainError("CONTENT_VERSION_NOT_FOUND","Content version not found",404);
    await tx.unsafe("select id from deliverables where id=$1::uuid for update",[cv[0].deliverable_id]);
    // Compare-and-set on the version: concurrent or repeated reviews cannot both succeed.
    const v=await tx.unsafe("update content_versions set status=$2::content_version_status,review_note=$3,reviewed_by_user_id=$4,reviewed_at=now() where id=$1::uuid and status='SUBMITTED' returning id::text",[input.contentVersionId,vs,input.reviewNote?.trim()||null,input.userId]);
    if(!v[0])throw new DomainError("CONTENT_REVIEW_NOT_ALLOWED","Content version cannot be reviewed",409);
    await tx.unsafe("update deliverables set status=$2::deliverable_status,approved_at=case when $2='APPROVED' then now() else approved_at end,updated_at=now() where id=$1::uuid",[cv[0].deliverable_id,ds]);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action,entityType:"content_version",entityId:input.contentVersionId,delta:{deliverableId:cv[0].deliverable_id,deliverableStatus:ds,reviewNote:input.reviewNote?.trim()||null}});
    return{id:input.contentVersionId,status:vs,deliverableStatus:ds};
  });
}