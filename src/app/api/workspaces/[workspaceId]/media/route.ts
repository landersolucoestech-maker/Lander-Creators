import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { getRuntimeMediaStorage } from "@/server/media/runtime-storage";
import { DEFAULT_MEDIA_MAX_BYTES } from "@/server/media/media-validation";
import { listMediaAssets, uploadMediaAsset } from "@/server/media/media-service";
import { DomainError } from "@/server/shared/domain-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId } = await params;
    const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
    try {
      return Response.json({
        media: await listMediaAssets(client, { userId: user.id, workspaceId })
      });
    } finally {
      await client.end();
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId } = await params;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      const error = new Error("Invalid file");
      error.name = "ValidationError";
      throw error;
    }

    const maxBytes = Number(process.env.MEDIA_MAX_BYTES ?? DEFAULT_MEDIA_MAX_BYTES);
    if (!file.size || file.size > maxBytes) {
      throw new DomainError("MEDIA_TOO_LARGE", "Media size outside allowed range", 413);
    }

    const visibility =
      form.get("visibility") === "WORKSPACE_AVAILABLE"
        ? "WORKSPACE_AVAILABLE"
        : "PRIVATE";
    const bytes = Buffer.from(await file.arrayBuffer());
    const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);

    try {
      return Response.json(
        {
          media: await uploadMediaAsset(client, getRuntimeMediaStorage(), {
            userId: user.id,
            workspaceId,
            originalFileName: file.name,
            declaredMime: file.type,
            bytes,
            visibility
          })
        },
        { status: 201 }
      );
    } finally {
      await client.end();
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
