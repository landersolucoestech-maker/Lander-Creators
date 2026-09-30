import { auth } from "@/server/auth/auth";
import { DomainError } from "@/server/shared/domain-error";
import { toPublicError } from "@/server/errors/public-error";

export function assertTrustedRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const allowedOrigins = new Set([new URL(request.url).origin]);
  const configuredBaseUrl = process.env.AUTH_BASE_URL;

  if (configuredBaseUrl) {
    allowedOrigins.add(new URL(configuredBaseUrl).origin);
  }

  if (!allowedOrigins.has(origin)) {
    throw new DomainError("UNTRUSTED_ORIGIN", "Request origin is not trusted", 403);
  }
}

export async function requireAuthenticatedUser(request: Request) {
  assertTrustedRequestOrigin(request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    throw new DomainError("AUTHENTICATION_REQUIRED", "Authentication required", 401);
  }
  return session.user;
}

export function apiErrorResponse(error: unknown) {
  const publicError = toPublicError(error);
  const status = error instanceof DomainError ? error.status : 500;
  return Response.json({ error: publicError }, { status });
}
