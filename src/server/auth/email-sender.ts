import { logger } from "@/server/logging/logger";

export type AuthEmailKind = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export type AuthEmail = {
  kind: AuthEmailKind;
  to: string;
  url: string;
  token?: string;
};

export interface AuthEmailSender {
  send(message: AuthEmail): Promise<void>;
}

const capturedTestEmails: AuthEmail[] = [];

export function consumeCapturedAuthEmailsForTests(): AuthEmail[] {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("AUTH_TEST_EMAIL_CAPTURE_NOT_AVAILABLE");
  }
  return capturedTestEmails.splice(0, capturedTestEmails.length);
}

export function createAuthEmailSender(mode: string | undefined): AuthEmailSender {
  if (mode === "safe-log") {
    return {
      async send(message) {
        if (process.env.NODE_ENV === "test") {
          capturedTestEmails.push(message);
        }
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
