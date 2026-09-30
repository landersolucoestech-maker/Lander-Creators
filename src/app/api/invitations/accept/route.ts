import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { acceptWorkspaceInvitation } from "@/server/workspace/membership-service";

const schema = z.object({ token: z.string().min(32).max(256) });

export async function POST(request: Request) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const body = schema.parse(await request.json());
    const membership = await acceptWorkspaceInvitation(client, {
      userId: user.id,
      token: body.token
    });
    return Response.json({ membership });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
