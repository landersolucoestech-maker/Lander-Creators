import { auth } from "@/server/auth/auth";
import { DomainError } from "@/server/shared/domain-error";
import { toPublicError } from "@/server/errors/public-error";

export async function requireAuthenticatedUser(request: Request) {
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
