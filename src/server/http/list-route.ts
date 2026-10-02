import type { Sql } from "postgres";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { parseListQuery, type ListQuery, type ListQueryConfig, type Page } from "@/server/shared/list-query";

/**
 * Shared GET handler for Workspace list endpoints. Authorization is enforced by the list service itself
 * (`authorizeWorkspacePermission` + workspace-scoped SQL); this wrapper only handles session, query parsing,
 * the database client lifecycle and the safe error envelope.
 */
export async function handleWorkspaceList<S extends string, Row>(
  request: Request,
  params: Promise<{ workspaceId: string }>,
  config: ListQueryConfig<S>,
  run: (context: { client: Sql; userId: string; workspaceId: string; query: ListQuery<S> }) => Promise<Page<Row>>
) {
  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId } = await params;
    const search = Object.fromEntries(new URL(request.url).searchParams.entries());
    const result = await run({ client, userId: user.id, workspaceId, query: parseListQuery(search, config) });
    return Response.json({ rows: result.rows, total: result.total, page: result.page, pageSize: result.pageSize, pageCount: result.pageCount });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
