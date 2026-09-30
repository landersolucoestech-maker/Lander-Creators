import type { Sql, TransactionSql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";
import type { PermissionCode } from "./permissions";

type QueryExecutor = Sql | TransactionSql;

export async function authorizeWorkspacePermission(
  sql: QueryExecutor,
  input: { userId: string; workspaceId: string; permission: PermissionCode }
) {
  const rows = await sql.unsafe(
    "select m.id::text as membership_id, r.code as role_code, ip.status::text as user_status, w.status::text as workspace_status, m.status::text as membership_status, exists (select 1 from role_permissions rp join permission_definitions pd on pd.id = rp.permission_id where rp.role_id = m.role_id and pd.code = $3) as role_permission, exists (select 1 from membership_grants mg join permission_definitions pd on pd.id = mg.permission_id where mg.membership_id = m.id and pd.code = $3 and (mg.expires_at is null or mg.expires_at > now()) and mg.scope = 'WORKSPACE' and (mg.scope_id is null or mg.scope_id = $2)) as grant_permission from memberships m join roles r on r.id = m.role_id join identity_profiles ip on ip.user_id = m.user_id join workspaces w on w.id = m.workspace_id where m.user_id = $1 and m.workspace_id = $2::uuid limit 1",
    [input.userId, input.workspaceId, input.permission]
  );

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new DomainError("WORKSPACE_ACCESS_DENIED", "Workspace membership not found", 403);
  if (row.user_status !== "ACTIVE") throw new DomainError("ACCOUNT_ACCESS_DENIED", "User account is not active", 403);
  if (row.workspace_status !== "ACTIVE") throw new DomainError("WORKSPACE_ACCESS_DENIED", "Workspace is not active", 403);
  if (row.membership_status !== "ACTIVE") throw new DomainError("MEMBERSHIP_INACTIVE", "Membership is not active", 403);
  if (!row.role_permission && !row.grant_permission) {
    throw new DomainError("MISSING_PERMISSION", "Required permission is missing", 403);
  }

  return {
    membershipId: String(row.membership_id),
    roleCode: String(row.role_code)
  };
}
