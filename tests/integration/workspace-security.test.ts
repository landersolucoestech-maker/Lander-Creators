import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { createWorkspace, switchActiveWorkspace } from "@/server/workspace/workspace-service";
import { acceptWorkspaceInvitation, changeMembershipRole, inviteWorkspaceMember, removeWorkspaceMember } from "@/server/workspace/membership-service";
import { createTestSql, resetSecurityData } from "./test-db";

const sql = createTestSql();

async function user(email: string) {
  const id = randomUUID();
  await sql.unsafe("insert into \"user\" (id,name,email,email_verified) values ($1,'Test User',$2,true)", [id,email]);
  await sql.unsafe("insert into identity_profiles (user_id,status) values ($1,'ACTIVE')", [id]);
  return id;
}

describe("Identity Workspace Authorization foundation", () => {
  beforeEach(async () => { await resetSecurityData(sql); });
  afterAll(async () => { await sql.end(); });

  it("creates Workspace with one active Owner and idempotent retry", async () => {
    const owner=await user("owner@example.com");
    const first=await createWorkspace(sql,{userId:owner,name:"Agency",type:"AGENCY",idempotencyKey:"create-1"});
    const second=await createWorkspace(sql,{userId:owner,name:"Ignored",type:"LABEL",idempotencyKey:"create-1"});
    expect(String(second.workspace_id ?? second.id)).toBe(String(first.id));
    const rows=await sql.unsafe("select r.code,m.status::text as status from memberships m join roles r on r.id=m.role_id where m.user_id=$1",[owner]);
    expect(rows[0]).toMatchObject({code:"OWNER",status:"ACTIVE"});
  });

  it("blocks cross-tenant access and active-context guessing", async () => {
    const a=await user("a@example.com");
    const b=await user("b@example.com");
    const wa=await createWorkspace(sql,{userId:a,name:"A",type:"AGENCY",idempotencyKey:"a"});
    const wb=await createWorkspace(sql,{userId:b,name:"B",type:"AGENCY",idempotencyKey:"b"});
    await expect(authorizeWorkspacePermission(sql,{userId:a,workspaceId:String(wb.id),permission:"workspace.view"})).rejects.toMatchObject({code:"WORKSPACE_ACCESS_DENIED"});
    await expect(switchActiveWorkspace(sql,{userId:a,workspaceId:String(wb.id)})).rejects.toMatchObject({code:"WORKSPACE_ACCESS_DENIED"});
    await expect(authorizeWorkspacePermission(sql,{userId:a,workspaceId:String(wa.id),permission:"workspace.view"})).resolves.toMatchObject({roleCode:"OWNER"});
  });

  it("binds invitation to recipient and enforces single use", async () => {
    const owner=await user("owner@example.com");
    const member=await user("member@example.com");
    const w=await createWorkspace(sql,{userId:owner,name:"A",type:"AGENCY",idempotencyKey:"a"});
    const invitation=await inviteWorkspaceMember(sql,{actorUserId:owner,workspaceId:String(w.id),recipientEmail:"member@example.com",roleCode:"VIEWER"});
    await expect(acceptWorkspaceInvitation(sql,{userId:member,token:invitation.token})).resolves.toMatchObject({workspaceId:String(w.id)});
    await expect(acceptWorkspaceInvitation(sql,{userId:member,token:invitation.token})).rejects.toMatchObject({code:"INVITATION_EXPIRED"});
  });

  it("protects final Owner", async () => {
    const owner=await user("owner@example.com");
    const w=await createWorkspace(sql,{userId:owner,name:"A",type:"AGENCY",idempotencyKey:"a"});
    const rows=await sql.unsafe("select id::text from memberships where user_id=$1",[owner]);
    const membershipId=String((rows[0] as Record<string,unknown>).id);
    await expect(removeWorkspaceMember(sql,{actorUserId:owner,workspaceId:String(w.id),membershipId})).rejects.toMatchObject({code:"LAST_OWNER_PROTECTED"});
    await expect(changeMembershipRole(sql,{actorUserId:owner,workspaceId:String(w.id),membershipId,roleCode:"ADMIN"})).rejects.toMatchObject({code:"LAST_OWNER_PROTECTED"});
  });

  it("preserves one Owner under concurrent demotion", async () => {
    const ownerA=await user("owner-a@example.com");
    const ownerB=await user("owner-b@example.com");
    const w=await createWorkspace(sql,{userId:ownerA,name:"A",type:"AGENCY",idempotencyKey:"a"});
    const invitation=await inviteWorkspaceMember(sql,{actorUserId:ownerA,workspaceId:String(w.id),recipientEmail:"owner-b@example.com",roleCode:"OWNER"});
    await acceptWorkspaceInvitation(sql,{userId:ownerB,token:invitation.token});
    const rows=await sql.unsafe("select user_id,id::text from memberships where workspace_id=$1::uuid",[String(w.id)]);
    const a=rows.find((row)=>String((row as Record<string,unknown>).user_id)===ownerA) as Record<string,unknown>;
    const b=rows.find((row)=>String((row as Record<string,unknown>).user_id)===ownerB) as Record<string,unknown>;
    const results=await Promise.allSettled([
      changeMembershipRole(sql,{actorUserId:ownerA,workspaceId:String(w.id),membershipId:String(a.id),roleCode:"ADMIN"}),
      changeMembershipRole(sql,{actorUserId:ownerB,workspaceId:String(w.id),membershipId:String(b.id),roleCode:"ADMIN"})
    ]);
    expect(results.filter((r)=>r.status==="fulfilled")).toHaveLength(1);
    const owners=await sql.unsafe("select count(*)::int as count from memberships m join roles r on r.id=m.role_id where m.workspace_id=$1::uuid and m.status='ACTIVE' and r.code='OWNER'",[String(w.id)]);
    expect(Number((owners[0] as Record<string,unknown>).count)).toBe(1);
  });
});
