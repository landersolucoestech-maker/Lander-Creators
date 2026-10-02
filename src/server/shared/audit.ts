import type { Sql } from "postgres";

type AuditExecutor = { unsafe: Sql["unsafe"] };

export type AuditEntry = {
  actorId: string;
  workspaceId: string;
  action: string;
  entityType: string;
  entityId: string;
  delta?: Record<string, unknown>;
};

/**
 * Writes one audit row. Call it with the same transaction handle as the state change it records.
 *
 * `delta` is passed as JSON text: the application's database client is wrapped by drizzle, which disables the
 * driver's own JSON serializer, so a jsonb parameter must already be a string (an object makes the query fail).
 * Plain postgres.js clients (tests, scripts) serialize that string once more; migration 0021 normalizes it.
 */
export async function writeAudit(executor: AuditExecutor, entry: AuditEntry) {
  await executor.unsafe(
    "insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,delta,origin) values('USER',$1,$2::uuid,$3,$4,$5,$6::jsonb,'API')",
    [entry.actorId, entry.workspaceId, entry.action, entry.entityType, entry.entityId, JSON.stringify(entry.delta ?? {})]
  );
}
