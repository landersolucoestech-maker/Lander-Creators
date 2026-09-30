import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { verifyMediaAccessToken } from "@/server/media/media-access";
import { getRuntimeMediaStorage } from "@/server/media/runtime-storage";
import { readMediaAsset } from "@/server/media/media-service";
import { DomainError } from "@/server/shared/domain-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; mediaAssetId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId, mediaAssetId } = await params;
    const accessToken = request.headers.get("x-media-access");
    if (!accessToken) {
      throw new DomainError("MEDIA_ACCESS_DENIED", "Media access token required", 403);
    }

    const env = parseEnv(process.env);
    verifyMediaAccessToken(accessToken, {
      userId: user.id,
      workspaceId,
      mediaAssetId,
      secret: env.AUTH_SECRET
    });

    const { client } = createDatabaseClient(env.DATABASE_URL);
    try {
      const media = await readMediaAsset(client, getRuntimeMediaStorage(), {
        userId: user.id,
        workspaceId,
        mediaAssetId
      });
      return new Response(new Uint8Array(media.bytes), {
        headers: {
          "Content-Type": media.mimeType,
          "Content-Disposition": `inline; filename="${media.fileName}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } finally {
      await client.end();
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
