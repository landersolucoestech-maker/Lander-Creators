import { logger } from "@/server/logging/logger";

export interface WorkspaceInvitationEmailSender {
  send(input: { to: string; url: string }): Promise<void>;
}

export function createWorkspaceInvitationEmailSender(
  mode: string | undefined
): WorkspaceInvitationEmailSender {
  if (mode === "safe-log") {
    return {
      async send() {
        logger.info("Workspace invitation email dispatch requested");
      }
    };
  }

  return {
    async send() {
      throw new Error("WORKSPACE_INVITATION_EMAIL_PROVIDER_NOT_CONFIGURED");
    }
  };
}
