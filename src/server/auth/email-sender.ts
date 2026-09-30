import { logger } from "@/server/logging/logger";

export type AuthEmailKind = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export type AuthEmail = {
  kind: AuthEmailKind;
  to: string;
  url: string;
};

export interface AuthEmailSender {
  send(message: AuthEmail): Promise<void>;
}

export function createAuthEmailSender(mode: string | undefined): AuthEmailSender {
  if (mode === "safe-log") {
    return {
      async send(message) {
        logger.info("Auth email dispatch requested", { kind: message.kind });
      }
    };
  }

  return {
    async send() {
      throw new Error("AUTH_EMAIL_PROVIDER_NOT_CONFIGURED");
    }
  };
}
