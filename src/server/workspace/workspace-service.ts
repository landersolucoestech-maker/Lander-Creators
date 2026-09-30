import type { Sql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";

export type WorkspaceType = "LABEL" | "MANAGEMENT" | "COMPANY" | "AGENCY" | "INTERNAL";

export async function createWorkspace(
  sql: Sql,
  input: { userId: string; name: string; type: WorkspaceType; idempotencyKey: string }
) {
  return sql.begin(async (tx) => {
    const users = await tx.unsafe(
      "select status::text as status from identity_profiles where user_id = $1 for update",
      [input.userId]
    );
    if ((users[0] as Record<string, unknown> | undefined)?.status !== "ACTIVE") {
      throw new DomainError("ACCOUNT_ACCESS_DENIED", "User must be active", 403);
    }

    const existing = await tx.unsafe(
      "select workspace_id::text from workspace_creation_requests where user_id = $1 and idempotency_key = $2",
      [input.userId, input.idempotencyKey]
    );
    if (existing[0]) return existing[0];

    const owners = await tx.unsafe(
      "select id::text from roles where workspace_id is null and code = 'OWNER' limit 1"
    );
    if (!owners[0]) {
      throw new DomainError("AUTHORIZATION_CONFIGURATION_ERROR", "Owner role missing", 500);
    }

    const ownerRoleId = String((owners[0] as Record<string, unknown>).id);
    const created = await tx.unsafe(
      "insert into workspaces (name,type,created_by_user_id) values ($1,$2::workspace_type,$3) returning id::text,name,type::text,status::text",
      [input.name, input.type, input.userId]
    );
    const workspace = created[0] as Record<string, unknown>;

    await tx.unsafe(
      "insert into memberships (user_id,workspace_id,role_id,status) values ($1,$2::uuid,$3::uuid,'ACTIVE')",
      [input.userId, String(workspace.id), ownerRoleId]
    );
    await tx.unsafe(
      "insert into user_context_preferences (user_id,active_workspace_id) values ($1,$2::uuid) on conflict (user_id) do update set active_workspace_id=excluded.active_workspace_id,updated_at=now()",
      [input.userId, String(workspace.id)]
    );
    await tx.unsafe(
      "insert into workspace_creation_requests (user_id,idempotency_key,workspace_id) values ($1,$2,$3::uuid)",
      [input.userId, input.idempotencyKey, String(workspace.id)]
    );
    await tx.unsafe(
      "insert into audit_logs (actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values ('USER',$1,$2::uuid,'workspace.created','workspace',$2,'API')",
      [input.userId, String(workspace.id)]
    );

    return workspace;
  });
}

export async function listUserWorkspaces(sql: Sql, userId: string) {
  return sql.unsafe(
    "select w.id::text,w.name,w.type::text,w.status::text,r.code as role_code,(ucp.active_workspace_id=w.id) as active from memberships m join workspaces w on w.id=m.workspace_id join roles r on r.id=m.role_id join identity_profiles ip on ip.user_id=m.user_id left join user_context_preferences ucp on ucp.user_id=m.user_id where m.user_id=$1 and m.status='ACTIVE' and ip.status='ACTIVE' order by w.name",
    [userId]
  );
}

export async function switchActiveWorkspace(
  sql: Sql,
  input: { userId: string; workspaceId: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    permission: "workspace.view"
  });

  await sql.unsafe(
    "insert into user_context_preferences (user_id,active_workspace_id) values ($1,$2::uuid) on conflict (user_id) do update set active_workspace_id=excluded.active_workspace_id,updated_at=now()",
    [input.userId, input.workspaceId]
  );

  return { workspaceId: input.workspaceId };
}

export async function resolveActiveWorkspace(
  sql: Sql,
  input: { userId: string }
) {
  const rows = await sql.unsafe(
    "select active_workspace_id::text as workspace_id from user_context_preferences where user_id=$1",
    [input.userId]
  );
  const workspaceId = (rows[0] as Record<string, unknown> | undefined)?.workspace_id;
  if (!workspaceId) return null;

  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: String(workspaceId),
    permission: "workspace.view"
  });

  return { workspaceId: String(workspaceId) };
}
