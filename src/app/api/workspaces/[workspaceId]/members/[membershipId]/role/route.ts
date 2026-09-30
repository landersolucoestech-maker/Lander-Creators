import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import {
  changeMembershipRole,
  type SystemRoleCode
} from "@/server/workspace/membership-service";

const roleCodes = [
  "OWNER",
  "ADMIN",
  "CAMPAIGN_MANAGER",
  "MARKETING",
  "SOCIAL_MEDIA",
  "FINANCE",
  "VIEWER"
] as const;
const schema = z.object({ roleCode: z.enum(roleCodes) });

export async function POST(
  request: Request,
  context: {
    params: Promise<{ workspaceId: string; membershipId: string }>;
  }
) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId, membershipId } = await context.params;
    const body = schema.parse(await request.json());
    const membership = await changeMembershipRole(client, {
      actorUserId: user.id,
      workspaceId,
      membershipId,
      roleCode: body.roleCode as SystemRoleCode
    });
    return Response.json({ membership });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
