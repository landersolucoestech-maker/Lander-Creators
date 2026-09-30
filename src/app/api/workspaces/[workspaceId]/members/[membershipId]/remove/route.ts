import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { removeWorkspaceMember } from "@/server/workspace/membership-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string; membershipId: string }> }
) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId, membershipId } = await context.params;
    const membership = await removeWorkspaceMember(client, {
      actorUserId: user.id,
      workspaceId,
      membershipId
    });
    return Response.json({ membership });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
