import { DEV_PERSONA_COOKIE, isDevAuthBypassEnabled, isDevPersonaKey } from "@/server/auth/dev-auth-bypass";

/**
 * Dev-only persona switcher. Responds 404 unless the DEV AUTH BYPASS is enabled (NODE_ENV=development and
 * LANDER_DEV_AUTH_BYPASS=true), so it does not exist in production.
 * GET /api/dev/persona?persona=<key>[&redirect=/path]
 */
export async function GET(request: Request) {
  if (!isDevAuthBypassEnabled()) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const persona = url.searchParams.get("persona");
  if (!isDevPersonaKey(persona)) return Response.json({ error: { code: "INVALID_REQUEST" } }, { status: 400 });
  const redirect = url.searchParams.get("redirect") ?? "/";
  // Same-origin relative paths only.
  const location = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  return new Response(null, {
    status: 303,
    headers: {
      location,
      "set-cookie": `${DEV_PERSONA_COOKIE}=${persona}; Path=/; HttpOnly; SameSite=Lax`
    }
  });
}
