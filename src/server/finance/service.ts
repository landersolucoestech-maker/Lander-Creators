import type{Sql}from"postgres";import{authorizeWorkspacePermission}from"@/server/authorization/authorization-service";import{getCreatorProfileByUser}from"@/server/creator/creator-service";import{DomainError}from"@/server/shared/domain-error";import{writeAudit}from"@/server/shared/audit";

type Tx={unsafe:Sql["unsafe"]};
type PayableInput={userId:string;workspaceId:string;payableId:string};

/** Every non-cancelled deliverable of the engagement needs a VERIFIED publication, and at least one must exist. */
async function publicationsVerified(tx:Tx,engagementId:string){
  const r=await tx.unsafe("select count(*) filter (where d.status<>'CANCELLED')::int required,count(*) filter (where d.status<>'CANCELLED' and not exists(select 1 from publications p where p.deliverable_id=d.id and p.status='VERIFIED'))::int unverified from deliverables d where d.engagement_id=$1::uuid",[engagementId]);
  return Number(r[0].required)>0&&Number(r[0].unverified)===0;
}
async function lockPayable(tx:Tx,i:PayableInput){
  const r=await tx.unsafe("select id::text,engagement_id::text,status::text,amount_minor::text,currency_code,external_payment_reference from campaign_payables where id=$1::uuid and workspace_id=$2::uuid for update",[i.payableId,i.workspaceId]);
  return r[0];
}

export async function ensureEngagementPayable(sql:Sql,input:{userId:string;workspaceId:string;engagementId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"finance.manage"});
  return sql.begin(async(tx)=>{
    const e=await tx.unsafe("select id::text,campaign_id::text,workspace_id::text,creator_profile_id::text,contracted_amount_minor::text,currency_code,status::text from campaign_engagements where id=$1::uuid and workspace_id=$2::uuid for share",[input.engagementId,input.workspaceId]);
    if(!e[0])throw new DomainError("ENGAGEMENT_NOT_FOUND","Engagement not found",404);
    if(!["ACTIVE","COMPLETED"].includes(e[0].status))throw new DomainError("PAYABLE_REQUIRES_ACTIVE_ENGAGEMENT","Active engagement required",409);
    const created=await tx.unsafe("insert into campaign_payables(engagement_id,campaign_id,workspace_id,creator_profile_id,amount_minor,currency_code) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6) on conflict(engagement_id) do nothing returning id::text,status::text",[input.engagementId,e[0].campaign_id,input.workspaceId,e[0].creator_profile_id,e[0].contracted_amount_minor,e[0].currency_code]);
    if(created[0]){
      await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"payable.created",entityType:"campaign_payable",entityId:String(created[0].id),delta:{engagementId:input.engagementId,amountMinor:e[0].contracted_amount_minor,currencyCode:e[0].currency_code}});
      return created[0];
    }
    const existing=await tx.unsafe("select id::text,status::text from campaign_payables where engagement_id=$1::uuid and workspace_id=$2::uuid",[input.engagementId,input.workspaceId]);
    return existing[0];
  });
}

export async function refreshPayableEligibility(sql:Sql,input:PayableInput){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"finance.manage"});
  return sql.begin(async(tx)=>{
    const p=await lockPayable(tx,input);
    if(!p)throw new DomainError("PAYABLE_NOT_FOUND","Payable not found",404);
    if(p.status!=="PENDING")return{id:p.id,status:p.status};
    if(!await publicationsVerified(tx,String(p.engagement_id)))throw new DomainError("PAYABLE_NOT_ELIGIBLE","All required publications must be verified",409);
    const r=await tx.unsafe("update campaign_payables set status='ELIGIBLE',eligible_at=now(),updated_at=now() where id=$1::uuid and status='PENDING' returning id::text,status::text",[input.payableId]);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"payable.eligible",entityType:"campaign_payable",entityId:input.payableId,delta:{engagementId:p.engagement_id}});
    return r[0];
  });
}

export async function releasePayable(sql:Sql,input:PayableInput){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"finance.manage"});
  return sql.begin(async(tx)=>{
    const p=await lockPayable(tx,input);
    if(!p||p.status!=="ELIGIBLE")throw new DomainError("PAYABLE_RELEASE_NOT_ALLOWED","Payable cannot be released",409);
    // Publications can regress after eligibility; the gate is re-proven under the payable lock.
    if(!await publicationsVerified(tx,String(p.engagement_id)))throw new DomainError("PAYABLE_NOT_ELIGIBLE","All required publications must be verified",409);
    const r=await tx.unsafe("update campaign_payables set status='RELEASED',released_at=now(),updated_at=now() where id=$1::uuid and status='ELIGIBLE' returning id::text,status::text",[input.payableId]);
    await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"payable.released",entityType:"campaign_payable",entityId:input.payableId,delta:{from:"ELIGIBLE",to:"RELEASED",amountMinor:p.amount_minor,currencyCode:p.currency_code}});
    return r[0];
  });
}

export async function recordPaid(sql:Sql,input:PayableInput&{externalPaymentReference?:string|null}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"finance.manage"});
  const reference=input.externalPaymentReference?.trim();
  if(!reference)throw new DomainError("PAYABLE_REFERENCE_REQUIRED","External payment reference required",400);
  try{
    return await sql.begin(async(tx)=>{
      const p=await lockPayable(tx,input);
      if(!p)throw new DomainError("PAYABLE_PAYMENT_NOT_ALLOWED","Payable cannot be marked paid",409);
      if(p.status==="PAID"){
        // Identical replay is idempotent and has no new effect; a different reference is a conflict.
        if(p.external_payment_reference===reference)return{id:p.id,status:p.status};
        throw new DomainError("PAYABLE_ALREADY_PAID","Payable was already paid with another reference",409);
      }
      if(p.status!=="RELEASED")throw new DomainError("PAYABLE_PAYMENT_NOT_ALLOWED","Payable cannot be marked paid",409);
      const r=await tx.unsafe("update campaign_payables set status='PAID',paid_at=now(),external_payment_reference=$3,updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status='RELEASED' returning id::text,status::text",[input.payableId,input.workspaceId,reference]);
      await writeAudit(tx,{actorId:input.userId,workspaceId:input.workspaceId,action:"payable.paid",entityType:"campaign_payable",entityId:input.payableId,delta:{from:"RELEASED",to:"PAID",externalPaymentReference:reference}});
      return r[0];
    });
  }catch(error){
    if((error as{code?:string}).code==="23505")throw new DomainError("PAYABLE_REFERENCE_IN_USE","Payment reference already used",409);
    throw error;
  }
}

export async function listCreatorPayables(sql:Sql,userId:string){const cp=await getCreatorProfileByUser(sql,userId);if(!cp)return[];return sql.unsafe("select p.id::text,p.amount_minor::text,p.currency_code,p.status::text,p.eligible_at,p.released_at,p.paid_at,c.name campaign_name from campaign_payables p join campaigns c on c.id=p.campaign_id where p.creator_profile_id=$1::uuid order by p.updated_at desc",[String((cp as Record<string,unknown>).id)]);}
