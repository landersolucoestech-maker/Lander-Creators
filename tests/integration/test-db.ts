import postgres from "postgres";

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/lander_creators_test";

export function createTestSql() {
  return postgres(testDatabaseUrl, { max: 10, prepare: false });
}

export async function resetSecurityData(sql: ReturnType<typeof createTestSql>) {
  await sql.unsafe(
    "truncate table audit_logs,workspace_creation_requests,membership_grants,workspace_invitations,user_context_preferences,memberships,workspaces,account,session,verification,identity_profiles,\"user\" restart identity cascade"
  );
}
