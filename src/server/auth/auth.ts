import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { identityProfiles } from "@/server/db/schema";
import { writeGlobalAudit } from "@/server/shared/audit";
import { createAuthEmailSender } from "./email-sender";

const env = parseEnv(process.env);
const { client, db, schema } = createDatabaseClient(env.DATABASE_URL);
const emailSender = createAuthEmailSender(env.EMAIL_DELIVERY_MODE);

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.AUTH_BASE_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  advanced: {
    database: {
      generateId: () => randomUUID()
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      await emailSender.send({ kind: "PASSWORD_RESET", to: user.email, url, token });
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 3600,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url, token }) => {
      await emailSender.send({ kind: "EMAIL_VERIFICATION", to: user.email, url, token });
    }
  },
  verification: {
    storeIdentifier: "hashed"
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await db.insert(identityProfiles).values({ userId: createdUser.id });
          await writeGlobalAudit(client, { actorId: createdUser.id, action: "identity.signup", entityType: "user", entityId: createdUser.id });
        }
      },
      update: {
        after: async (updatedUser) => {
          if (updatedUser.emailVerified) {
            await db
              .update(identityProfiles)
              .set({ status: "ACTIVE", updatedAt: new Date() })
              .where(eq(identityProfiles.userId, updatedUser.id));
          }
        }
      }
    },
    session: {
      create: {
        before: async (sessionData) => {
          const rows = await db
            .select({ status: identityProfiles.status })
            .from(identityProfiles)
            .where(eq(identityProfiles.userId, sessionData.userId))
            .limit(1);
          const status = rows[0]?.status;
          if (!status || status === "SUSPENDED" || status === "DISABLED" || status === "DELETED") {
            throw new APIError("FORBIDDEN", { message: "ACCOUNT_ACCESS_DENIED" });
          }
          return { data: sessionData };
        },
        after: async (createdSession) => {
          await writeGlobalAudit(client, { actorId: createdSession.userId, action: "auth.session_created", entityType: "session", entityId: createdSession.id });
        }
      },
      delete: {
        after: async (deletedSession) => {
          await writeGlobalAudit(client, { actorId: deletedSession.userId, action: "auth.session_revoked", entityType: "session", entityId: deletedSession.id });
        }
      }
    }
  }
});
