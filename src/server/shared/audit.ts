import type { Sql } from "postgres";

type AuditExecutor = { unsafe: Sql["unsafe"] };

export type AuditEntry = {
  actorId: string;
  /** Tenant of the change. Null/absent only for global (Creator-context) records; see writeGlobalAudit. */
  workspaceId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  /** Structured evidence of the change. Absent stores SQL NULL. */
  delta?: Record<string, unknown>;
};

/**
 * Single writer of `audit_logs` for user-initiated domain changes (actor_type USER, origin API).
 * Call it with the same transaction handle as the state change it records, so a change is never
 * committed without its audit row.
 *
 * `delta` is passed as JSON text: the application's database client is wrapped by drizzle, which disables the
 * driver's own JSON serializer, so a jsonb parameter must already be a string (an object makes the query fail).
 * Plain postgres.js clients serialize that string once more; migration 0021 normalizes it.
 */
export async function writeAudit(executor: AuditExecutor, entry: AuditEntry) {
  await executor.unsafe(
    "insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,delta,origin) values('USER',$1,$2::uuid,$3,$4,$5,$6::jsonb,'API')",
    [
      entry.actorId,
      entry.workspaceId ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.delta === undefined ? null : JSON.stringify(entry.delta)
    ]
  );
}

/**
 * Audit for global, non-tenant records: Creator context (CreatorProfile, SocialProfile) and Identity events.
 * A Creator is a professional identity owned by a User, not by a Workspace, and authentication events
 * precede any Workspace, so these rows intentionally carry no workspace_id.
 */
export async function writeGlobalAudit(executor: AuditExecutor, entry: Omit<AuditEntry, "workspaceId">) {
  await writeAudit(executor, { ...entry, workspaceId: null });
}
