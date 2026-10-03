import { createHash, randomBytes } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";
import { writeAudit } from "@/server/shared/audit";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";

type QueryExecutor = Sql | TransactionSql;
export type SystemRoleCode =
  | "OWNER"
  | "ADMIN"
  | "CAMPAIGN_MANAGER"
  | "MARKETING"
  | "SOCIAL_MEDIA"
  | "FINANCE"
  | "VIEWER";

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function lockWorkspace(tx: QueryExecutor, workspaceId: string) {
  const rows = await tx.unsafe(
    "select id from workspaces where id=$1::uuid for update",
    [workspaceId]
  );
  if (!rows[0]) throw new DomainError("WORKSPACE_NOT_FOUND", "Workspace not found", 404);
}

async function systemRoleId(tx: QueryExecutor, code: string) {
  const rows = await tx.unsafe(
    "select id::text from roles where workspace_id is null and code=$1 and kind='SYSTEM' limit 1",
    [code]
  );
  if (!rows[0]) {
    throw new DomainError("AUTHORIZATION_CONFIGURATION_ERROR", "Role missing", 500);
  }
  return String((rows[0] as Record<string, unknown>).id);
}

async function audit(
  tx: QueryExecutor,
  input: {
    actorUserId: string;
    workspaceId: string;
    action: string;
    entityType: string;
    entityId?: string;
    delta?: Record<string, unknown>;
  }
) {
  await writeAudit(tx, {
    actorId: input.actorUserId,
    workspaceId: input.workspaceId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    delta: input.delta ?? {}
  });
}

async function getMembershipRole(
  tx: QueryExecutor,
  workspaceId: string,
  membershipId: string
) {
  const rows = await tx.unsafe(
    "select r.code,m.status::text as status from memberships m join roles r on r.id=m.role_id where m.id=$1::uuid and m.workspace_id=$2::uuid",
    [membershipId, workspaceId]
  );
  return rows[0] as Record<string, unknown> | undefined;
}

async function requireOwnershipAuthorityForOwnerMutation(
  tx: QueryExecutor,
  input: { actorUserId: string; workspaceId: string; membershipId: string }
) {
  const target = await getMembershipRole(tx, input.workspaceId, input.membershipId);
  if (!target) {
    throw new DomainError("MEMBERSHIP_NOT_FOUND", "Membership not found", 404);
  }
  if (target.code === "OWNER") {
    await authorizeWorkspacePermission(tx, {
      userId: input.actorUserId,
      workspaceId: input.workspaceId,
      permission: "workspace.ownership.transfer"
    });
  }
  return target;
}

async function protectLastOwner(
  tx: QueryExecutor,
  workspaceId: string,
  membershipId: string
) {
  const row = await getMembershipRole(tx, workspaceId, membershipId);
  if (row?.code !== "OWNER" || row?.status !== "ACTIVE") return;

  const owners = await tx.unsafe(
    "select count(*)::int as count from memberships m join roles r on r.id=m.role_id where m.workspace_id=$1::uuid and m.status='ACTIVE' and r.code='OWNER'",
    [workspaceId]
  );
  if (Number((owners[0] as Record<string, unknown>).count) <= 1) {
    throw new DomainError(
      "LAST_OWNER_PROTECTED",
      "Final active Owner cannot be changed",
      409
    );
  }
}

async function authorizeRoleAssignment(
  sql: QueryExecutor,
  input: { actorUserId: string; workspaceId: string; roleCode: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.actorUserId,
    workspaceId: input.workspaceId,
    permission: "team.role.assign"
  });

  if (input.roleCode === "OWNER") {
    await authorizeWorkspacePermission(sql, {
      userId: input.actorUserId,
      workspaceId: input.workspaceId,
      permission: "workspace.ownership.transfer"
    });
  }
}

export type WorkspaceMemberRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: string;
  role_code: string;
  created_at: Date;
};

export async function listWorkspaceMembers(
  sql: Sql,
  input: { actorUserId: string; workspaceId: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.actorUserId,
    workspaceId: input.workspaceId,
    permission: "team.member.view"
  });

  return sql.unsafe<WorkspaceMemberRow[]>(
    'select m.id::text,u.id as user_id,u.name,u.email,m.status::text as status,r.code as role_code,m.created_at from memberships m join "user" u on u.id=m.user_id join roles r on r.id=m.role_id where m.workspace_id=$1::uuid and m.status<>\'REMOVED\' order by u.name,u.email',
    [input.workspaceId]
  );
}

export async function inviteWorkspaceMember(
  sql: Sql,
  input: {
    actorUserId: string;
    workspaceId: string;
    recipientEmail: string;
    roleCode: SystemRoleCode;
    expiresInSeconds?: number;
  }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.actorUserId,
    workspaceId: input.workspaceId,
    permission: "team.member.invite"
  });
  await authorizeRoleAssignment(sql, input);

  const token = randomBytes(32).toString("base64url");
  const expires = input.expiresInSeconds ?? 604800;

  return sql.begin(async (tx) => {
    const roleId = await systemRoleId(tx, input.roleCode);
    const rows = await tx.unsafe(
      "insert into workspace_invitations (workspace_id,recipient_email,intended_role_id,token_hash,invited_by_user_id,expires_at) values ($1::uuid,lower($2),$3::uuid,$4,$5,now()+($6*interval '1 second')) returning id::text",
      [
        input.workspaceId,
        input.recipientEmail,
        roleId,
        hashToken(token),
        input.actorUserId,
        expires
      ]
    );
    const invitationId = String((rows[0] as Record<string, unknown>).id);

    await audit(tx, {
      actorUserId: input.actorUserId,
      workspaceId: input.workspaceId,
      action: "membership.invited",
      entityType: "workspace_invitation",
      entityId: invitationId,
      delta: { roleCode: input.roleCode }
    });

    return { invitationId, token };
  });
}

export async function acceptWorkspaceInvitation(
  sql: Sql,
  input: { userId: string; token: string }
) {
  return sql.begin(async (tx) => {
    const user = await tx.unsafe(
      'select u.email,ip.status::text as status from "user" u join identity_profiles ip on ip.user_id=u.id where u.id=$1 for update',
      [input.userId]
    );
    const identity = user[0] as Record<string, unknown> | undefined;
    if (identity?.status !== "ACTIVE") {
      throw new DomainError("ACCOUNT_ACCESS_DENIED", "User must be active", 403);
    }

    const rows = await tx.unsafe(
      "update workspace_invitations set accepted_at=now() where token_hash=$1 and accepted_at is null and revoked_at is null and expires_at>now() returning id::text,workspace_id::text,intended_role_id::text,recipient_email",
      [hashToken(input.token)]
    );
    const invitation = rows[0] as Record<string, unknown> | undefined;
    if (!invitation) {
      throw new DomainError(
        "INVITATION_EXPIRED",
        "Invitation invalid, expired or already used",
        410
      );
    }

    if (
      String(identity.email).toLowerCase() !==
      String(invitation.recipient_email).toLowerCase()
    ) {
      throw new DomainError(
        "INVITATION_RECIPIENT_MISMATCH",
        "Invitation belongs to another email",
        403
      );
    }

    const membership = await tx.unsafe(
      "insert into memberships (user_id,workspace_id,role_id,status) values ($1,$2::uuid,$3::uuid,'ACTIVE') on conflict (user_id,workspace_id) do update set role_id=excluded.role_id,status='ACTIVE',activated_at=now(),suspended_at=null,removed_at=null,updated_at=now() returning id::text",
      [
        input.userId,
        String(invitation.workspace_id),
        String(invitation.intended_role_id)
      ]
    );
    const membershipId = String((membership[0] as Record<string, unknown>).id);

    await audit(tx, {
      actorUserId: input.userId,
      workspaceId: String(invitation.workspace_id),
      action: "membership.activated",
      entityType: "membership",
      entityId: membershipId
    });

    return {
      membershipId,
      workspaceId: String(invitation.workspace_id)
    };
  });
}

export async function changeMembershipRole(
  sql: Sql,
  input: {
    actorUserId: string;
    workspaceId: string;
    membershipId: string;
    roleCode: SystemRoleCode;
  }
) {
  await authorizeRoleAssignment(sql, input);

  return sql.begin(async (tx) => {
    await lockWorkspace(tx, input.workspaceId);

    const current = await requireOwnershipAuthorityForOwnerMutation(tx, input);
    const previousRole = current.code;
    if (current.status !== "ACTIVE") {
      throw new DomainError("MEMBERSHIP_INACTIVE", "Membership is not active", 403);
    }

    if (input.roleCode !== "OWNER") {
      await protectLastOwner(tx, input.workspaceId, input.membershipId);
    }

    const roleId = await systemRoleId(tx, input.roleCode);
    await tx.unsafe(
      "update memberships set role_id=$1::uuid,updated_at=now() where id=$2::uuid and workspace_id=$3::uuid and status='ACTIVE'",
      [roleId, input.membershipId, input.workspaceId]
    );

    await audit(tx, {
      actorUserId: input.actorUserId,
      workspaceId: input.workspaceId,
      action: "membership.role_changed",
      entityType: "membership",
      entityId: input.membershipId,
      delta: { from: previousRole, to: input.roleCode }
    });

    return { membershipId: input.membershipId, roleCode: input.roleCode };
  });
}

export async function suspendWorkspaceMember(
  sql: Sql,
  input: { actorUserId: string; workspaceId: string; membershipId: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.actorUserId,
    workspaceId: input.workspaceId,
    permission: "team.member.suspend"
  });

  return sql.begin(async (tx) => {
    await lockWorkspace(tx, input.workspaceId);
    await requireOwnershipAuthorityForOwnerMutation(tx, input);
    await protectLastOwner(tx, input.workspaceId, input.membershipId);

    const rows = await tx.unsafe(
      "update memberships set status='SUSPENDED',suspended_at=now(),updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status='ACTIVE' returning user_id",
      [input.membershipId, input.workspaceId]
    );
    const target = rows[0] as Record<string, unknown> | undefined;
    if (!target) {
      throw new DomainError("MEMBERSHIP_NOT_FOUND", "Membership not found", 404);
    }

    await tx.unsafe(
      "update user_context_preferences set active_workspace_id=null,updated_at=now() where user_id=$1 and active_workspace_id=$2::uuid",
      [String(target.user_id), input.workspaceId]
    );
    await audit(tx, {
      actorUserId: input.actorUserId,
      workspaceId: input.workspaceId,
      action: "membership.suspended",
      entityType: "membership",
      entityId: input.membershipId
    });

    return { membershipId: input.membershipId, status: "SUSPENDED" as const };
  });
}

export async function removeWorkspaceMember(
  sql: Sql,
  input: { actorUserId: string; workspaceId: string; membershipId: string }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.actorUserId,
    workspaceId: input.workspaceId,
    permission: "team.member.remove"
  });

  return sql.begin(async (tx) => {
    await lockWorkspace(tx, input.workspaceId);
    await requireOwnershipAuthorityForOwnerMutation(tx, input);
    await protectLastOwner(tx, input.workspaceId, input.membershipId);

    const rows = await tx.unsafe(
      "update memberships set status='REMOVED',removed_at=now(),updated_at=now() where id=$1::uuid and workspace_id=$2::uuid and status<>'REMOVED' returning user_id",
      [input.membershipId, input.workspaceId]
    );
    const target = rows[0] as Record<string, unknown> | undefined;
    if (!target) {
      throw new DomainError("MEMBERSHIP_NOT_FOUND", "Membership not found", 404);
    }

    await tx.unsafe(
      "update user_context_preferences set active_workspace_id=null,updated_at=now() where user_id=$1 and active_workspace_id=$2::uuid",
      [String(target.user_id), input.workspaceId]
    );
    await audit(tx, {
      actorUserId: input.actorUserId,
      workspaceId: input.workspaceId,
      action: "membership.removed",
      entityType: "membership",
      entityId: input.membershipId
    });

    return { membershipId: input.membershipId, status: "REMOVED" as const };
  });
}
