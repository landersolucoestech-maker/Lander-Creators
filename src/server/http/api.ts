import { resolveApplicationActor } from "@/server/auth/application-actor";
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
  const actor = await resolveApplicationActor(request);
  if (!actor) throw new DomainError("AUTHENTICATION_REQUIRED", "Authentication required", 401);
  return actor;
}

export function apiErrorResponse(error: unknown) {
  const publicError = toPublicError(error);
  // Validation failures are the caller's mistake (400), never a server error.
  const status = error instanceof DomainError ? error.status : publicError.code === "INVALID_REQUEST" ? 400 : 500;
  return Response.json({ error: publicError }, { status });
}
