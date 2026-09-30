import { parseEnv } from "@/server/config/env";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { getReferenceData } from "@/server/reference-data/reference-data-service";
import { DomainError } from "@/server/shared/domain-error";
import { listTaxonomies } from "@/server/taxonomy/taxonomy-service";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
    try {
      const context = await client.unsafe(
        "select active_workspace_id::text from user_context_preferences where user_id=$1",
        [user.id]
      );
      const workspaceId = (context[0] as Record<string, unknown> | undefined)?.active_workspace_id;
      if (!workspaceId) {
        throw new DomainError("WORKSPACE_ACCESS_DENIED", "Active Workspace required", 403);
      }
      await authorizeWorkspacePermission(client, {
        userId: user.id,
        workspaceId: String(workspaceId),
        permission: "taxonomy.view"
      });
      return Response.json({
        taxonomies: await listTaxonomies(client),
        referenceData: await getReferenceData(client)
      });
    } finally {
      await client.end();
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
