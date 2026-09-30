import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { isAPIError } from "better-auth/api";
import { auth } from "@/server/auth/auth";
import { consumeCapturedAuthEmailsForTests } from "@/server/auth/email-sender";
import { createTestSql, resetSecurityData } from "./test-db";

const sql = createTestSql();

function cookieHeader(headers: Headers): Headers {
  const cookies = headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  return new Headers({ cookie: cookies });
}

async function signUpAndVerify(email: string) {
  await auth.api.signUpEmail({
    body: {
      name: "Usuário de Teste",
      email,
      password: "SecurePassword123!"
    }
  });

  const messages = consumeCapturedAuthEmailsForTests();
  const verification = messages.find((message) => message.kind === "EMAIL_VERIFICATION");
  if (!verification) throw new Error("Verification email was not captured");

  const token = new URL(verification.url).searchParams.get("token");
  if (!token) throw new Error("Verification token missing from captured URL");

  await auth.api.verifyEmail({ query: { token } });
}

describe("Better Auth identity integration", () => {
  beforeEach(async () => {
    await resetSecurityData(sql);
    consumeCapturedAuthEmailsForTests();
  });

  afterAll(async () => {
    await sql.end();
  });

  it("signs up, verifies email, signs in, resolves session and signs out", async () => {
    const email = "auth@example.com";
    await signUpAndVerify(email);

    const profile = await sql.unsafe(
      "select ip.status::text as status, u.email_verified from identity_profiles ip join \"user\" u on u.id=ip.user_id where u.email=$1",
      [email]
    );
    expect(profile[0]).toMatchObject({ status: "ACTIVE", email_verified: true });

    const signedIn = await auth.api.signInEmail({
      returnHeaders: true,
      body: { email, password: "SecurePassword123!" }
    });

    const headers = cookieHeader(signedIn.headers);
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe(email);

    await auth.api.signOut({ headers });
    const afterSignOut = await auth.api.getSession({ headers });
    expect(afterSignOut).toBeNull();
  });

  it("rejects invalid credentials", async () => {
    const email = "invalid@example.com";
    await signUpAndVerify(email);

    let code = "";
    try {
      await auth.api.signInEmail({
        body: { email, password: "WrongPassword123!" }
      });
    } catch (error) {
      if (isAPIError(error)) code = error.status;
    }
    expect(code).not.toBe("");
  });

  it("blocks new sessions for a suspended application identity", async () => {
    const email = "suspended@example.com";
    await signUpAndVerify(email);
    await sql.unsafe(
      "update identity_profiles set status='SUSPENDED' where user_id=(select id from \"user\" where email=$1)",
      [email]
    );

    await expect(
      auth.api.signInEmail({
        body: { email, password: "SecurePassword123!" }
      })
    ).rejects.toMatchObject({ message: "ACCOUNT_ACCESS_DENIED" });
  });
});
