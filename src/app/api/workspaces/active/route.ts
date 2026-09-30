import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { switchActiveWorkspace } from "@/server/workspace/workspace-service";

const schema = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: Request) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const body = schema.parse(await request.json());
    const context = await switchActiveWorkspace(client, {
      userId: user.id,
      workspaceId: body.workspaceId
    });
    return Response.json({ context });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
