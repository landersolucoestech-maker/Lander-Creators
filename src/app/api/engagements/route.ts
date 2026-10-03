import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { listCreatorEngagements } from "@/server/engagement/service";

/** The authenticated Creator's own engagements (Creator context; Workspace members use /api/workspaces/{id}/engagements). */
export async function GET(request: Request) {
  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    return Response.json({ engagements: await listCreatorEngagements(client, user.id) });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
