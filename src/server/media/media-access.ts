import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { DomainError } from "@/server/shared/domain-error";

type AccessPayload = {
  userId: string;
  workspaceId: string;
  mediaAssetId: string;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export async function issueMediaAccessToken(
  sql: Sql,
  input: {
    userId: string;
    workspaceId: string;
    mediaAssetId: string;
    secret: string;
    expiresInSeconds?: number;
  }
) {
  await authorizeWorkspacePermission(sql, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    permission: "media.view"
  });

  const rows = await sql.unsafe(
    "select 1 from media_assets where id=$1::uuid and workspace_id=$2::uuid and status='READY'",
    [input.mediaAssetId, input.workspaceId]
  );
  if (!rows[0]) {
    throw new DomainError("MEDIA_NOT_FOUND", "Media asset not found", 404);
  }

  const payload: AccessPayload = {
    userId: input.userId,
    workspaceId: input.workspaceId,
    mediaAssetId: input.mediaAssetId,
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 300)
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, input.secret)}`;
}

export function verifyMediaAccessToken(
  token: string,
  expected: {
    userId: string;
    workspaceId: string;
    mediaAssetId: string;
    secret: string;
  }
) {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) {
    throw new DomainError("MEDIA_ACCESS_DENIED", "Invalid media access token", 403);
  }

  const expectedSignature = sign(encoded, expected.secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new DomainError("MEDIA_ACCESS_DENIED", "Invalid media access token", 403);
  }

  let payload: AccessPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AccessPayload;
  } catch {
    throw new DomainError("MEDIA_ACCESS_DENIED", "Invalid media access token", 403);
  }

  if (
    payload.exp <= Math.floor(Date.now() / 1000) ||
    payload.userId !== expected.userId ||
    payload.workspaceId !== expected.workspaceId ||
    payload.mediaAssetId !== expected.mediaAssetId
  ) {
    throw new DomainError(
      "MEDIA_ACCESS_DENIED",
      "Expired or mismatched media access token",
      403
    );
  }

  return payload;
}
