import { auth } from "@/server/auth/auth";
import { DomainError } from "@/server/shared/domain-error";
import { toPublicError } from "@/server/errors/public-error";

export function assertTrustedRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
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
