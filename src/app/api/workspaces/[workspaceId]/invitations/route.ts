import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import {
  inviteWorkspaceMember,
  type SystemRoleCode
} from "@/server/workspace/membership-service";
import { createWorkspaceInvitationEmailSender } from "@/server/workspace/invitation-email-sender";

const roleCodes = [
  "OWNER",
  "ADMIN",
  "CAMPAIGN_MANAGER",
  "MARKETING",
  "SOCIAL_MEDIA",
  "FINANCE",
  "VIEWER"
] as const;

const schema = z.object({
  recipientEmail: z.string().email(),
  roleCode: z.enum(roleCodes)
});

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId } = await context.params;
    const body = schema.parse(await request.json());
    const invitation = await inviteWorkspaceMember(client, {
      actorUserId: user.id,
      workspaceId,
      recipientEmail: body.recipientEmail,
      roleCode: body.roleCode as SystemRoleCode
    });

    const sender = createWorkspaceInvitationEmailSender(env.EMAIL_DELIVERY_MODE);
    await sender.send({
      to: body.recipientEmail,
      url: `${env.AUTH_BASE_URL}/invitations/accept?token=${encodeURIComponent(invitation.token)}`
    });

    return Response.json(
      { invitation: { id: invitation.invitationId } },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
