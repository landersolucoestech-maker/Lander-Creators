import { createHash, randomBytes } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";

type QueryExecutor = Sql | TransactionSql;
import { DomainError } from "@/server/shared/domain-error";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";

function hashToken(value: string) { return createHash("sha256").update(value).digest("hex"); }
async function lockWorkspace(tx: QueryExecutor, workspaceId: string) { await tx.unsafe("select id from workspaces where id=$1::uuid for update", [workspaceId]); }
async function roleId(tx: QueryExecutor, code: string) { const rows=await tx.unsafe("select id::text from roles where workspace_id is null and code=$1 limit 1",[code]); if(!rows[0]) throw new DomainError("AUTHORIZATION_CONFIGURATION_ERROR","Role missing",500); return String((rows[0] as Record<string,unknown>).id); }
async function protectLastOwner(tx: QueryExecutor, workspaceId: string, membershipId: string) {
  const target=await tx.unsafe("select r.code,m.status::text as status from memberships m join roles r on r.id=m.role_id where m.id=$1::uuid and m.workspace_id=$2::uuid",[membershipId,workspaceId]);
  const row=target[0] as Record<string,unknown>|undefined;
  if(row?.code!=="OWNER"||row?.status!=="ACTIVE") return;
  const owners=await tx.unsafe("select count(*)::int as count from memberships m join roles r on r.id=m.role_id where m.workspace_id=$1::uuid and m.status='ACTIVE' and r.code='OWNER'",[workspaceId]);
  if(Number((owners[0] as Record<string,unknown>).count)<=1) throw new DomainError("LAST_OWNER_PROTECTED","Final active Owner cannot be changed",409);
}
export async function inviteWorkspaceMember(sql: Sql,input:{actorUserId:string;workspaceId:string;recipientEmail:string;roleCode:string;expiresInSeconds?:number}) {
  await authorizeWorkspacePermission(sql,{userId:input.actorUserId,workspaceId:input.workspaceId,permission:"team.member.invite"});
  const token=randomBytes(32).toString("base64url");
  const rid=await roleId(sql,input.roleCode);
  const expires=input.expiresInSeconds??604800;
  const rows=await sql.unsafe("insert into workspace_invitations (workspace_id,recipient_email,intended_role_id,token_hash,invited_by_user_id,expires_at) values ($1::uuid,lower($2),$3::uuid,$4,$5,now()+($6*interval '1 second')) returning id::text",[input.workspaceId,input.recipientEmail,rid,hashToken(token),input.actorUserId,expires]);
  return { invitationId:String((rows[0] as Record<string,unknown>).id), token };
}
export async function acceptWorkspaceInvitation(sql: Sql,input:{userId:string;token:string}) {
  return sql.begin(async tx=>{
    const user=await tx.unsafe('select u.email,ip.status::text as status from "user" u join identity_profiles ip on ip.user_id=u.id where u.id=$1 for update',[input.userId]);
    const ur=user[0] as Record<string,unknown>|undefined;
    if(ur?.status!=="ACTIVE") throw new DomainError("ACCOUNT_ACCESS_DENIED","User must be active",403);
    const rows=await tx.unsafe("update workspace_invitations set accepted_at=now() where token_hash=$1 and accepted_at is null and revoked_at is null and expires_at>now() returning workspace_id::text,intended_role_id::text,recipient_email",[hashToken(input.token)]);
    const inv=rows[0] as Record<string,unknown>|undefined;
    if(!inv) throw new DomainError("INVITATION_EXPIRED","Invitation invalid or already used",410);
    if(String(ur.email).toLowerCase()!==String(inv.recipient_email).toLowerCase()) throw new DomainError("INVITATION_RECIPIENT_MISMATCH","Invitation belongs to another email",403);
    const membership=await tx.unsafe("insert into memberships (user_id,workspace_id,role_id,status) values ($1,$2::uuid,$3::uuid,'ACTIVE') on conflict (user_id,workspace_id) do update set role_id=excluded.role_id,status='ACTIVE',suspended_at=null,removed_at=null,updated_at=now() returning id::text",[input.userId,String(inv.workspace_id),String(inv.intended_role_id)]);
    return { membershipId:String((membership[0] as Record<string,unknown>).id), workspaceId:String(inv.workspace_id) };
  });
}
export async function changeMembershipRole(sql: Sql,input:{actorUserId:string;workspaceId:string;membershipId:string;roleCode:string}) {
  await authorizeWorkspacePermission(sql,{userId:input.actorUserId,workspaceId:input.workspaceId,permission:"team.role.assign"});
  return sql.begin(async tx=>{ await lockWorkspace(tx,input.workspaceId); if(input.roleCode!=="OWNER") await protectLastOwner(tx,input.workspaceId,input.membershipId); const rid=await roleId(tx,input.roleCode); await tx.unsafe("update memberships set role_id=$1::uuid,updated_at=now() where id=$2::uuid and workspace_id=$3::uuid and status='ACTIVE'",[rid,input.membershipId,input.workspaceId]); return {membershipId:input.membershipId,roleCode:input.roleCode}; });
}
export async function removeWorkspaceMember(sql: Sql,input:{actorUserId:string;workspaceId:string;membershipId:string}) {
  await authorizeWorkspacePermission(sql,{userId:input.actorUserId,workspaceId:input.workspaceId,permission:"team.member.remove"});
  return sql.begin(async tx=>{ await lockWorkspace(tx,input.workspaceId); await protectLastOwner(tx,input.workspaceId,input.membershipId); const rows=await tx.unsafe("update memberships set status='REMOVED',removed_at=now(),updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status<>'REMOVED' returning user_id",[input.membershipId,input.workspaceId]); if(!rows[0]) throw new DomainError("MEMBERSHIP_NOT_FOUND","Membership not found",404); return {membershipId:input.membershipId,status:"REMOVED" as const}; });
}
