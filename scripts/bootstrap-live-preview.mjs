import postgres from "postgres";
if(process.env.LANDER_LIVE_PREVIEW!=="true")throw new Error("LIVE_PREVIEW_GUARD_REQUIRED");
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");
const sql=postgres(url,{max:1,prepare:false});
const userId="lander-live-preview-owner",email="preview-owner@lander.invalid",workspaceId="40000000-0000-0000-0000-000000000001",ownerRole="20000000-0000-0000-0000-000000000001";
await sql.begin(async tx=>{
 await tx.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true) on conflict(id) do update set name=excluded.name,email=excluded.email,email_verified=true,updated_at=now()',[userId,"LANDER CREATORS Preview Owner",email]);
 await tx.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE') on conflict(user_id) do update set status='ACTIVE',updated_at=now()",[userId]);
 await tx.unsafe("insert into workspaces(id,name,type,status,created_by_user_id) values($1::uuid,'LANDER CREATORS Preview','INTERNAL','ACTIVE',$2) on conflict(id) do update set name=excluded.name,status='ACTIVE',updated_at=now()",[workspaceId,userId]);
 await tx.unsafe("insert into memberships(user_id,workspace_id,role_id,status) values($1,$2::uuid,$3::uuid,'ACTIVE') on conflict(user_id,workspace_id) do update set role_id=excluded.role_id,status='ACTIVE',updated_at=now()",[userId,workspaceId,ownerRole]);
 await tx.unsafe("insert into user_context_preferences(user_id,active_workspace_id) values($1,$2::uuid) on conflict(user_id) do update set active_workspace_id=excluded.active_workspace_id,updated_at=now()",[userId,workspaceId]);
});
await sql.end();
