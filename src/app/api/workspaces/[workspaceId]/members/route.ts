import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { listWorkspaceMembers } from "@/server/workspace/membership-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId } = await context.params;
    const members = await listWorkspaceMembers(client, {
      actorUserId: user.id,
      workspaceId
    });
    return Response.json({ members });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
