import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { issueMediaAccessToken } from "@/server/media/media-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; mediaAssetId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId, mediaAssetId } = await params;
    const env = parseEnv(process.env);
    const { client } = createDatabaseClient(env.DATABASE_URL);
    try {
      const token = await issueMediaAccessToken(client, {
        userId: user.id,
        workspaceId,
        mediaAssetId,
        secret: env.AUTH_SECRET
      });
      return Response.json({ accessToken: token, expiresInSeconds: 300 });
    } finally {
      await client.end();
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
