import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/server/config/env";
import {
  DEFAULT_DEV_PERSONA, DEV_AUTH_BYPASS_FLAG, DEV_PERSONA_COOKIE, devPersonas, isDevAuthBypassEnabled,
  readDevPersonaKey, resolveDevPersonaActor
} from "@/server/auth/dev-auth-bypass";

const base = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lander_creators",
  AUTH_SECRET: "01234567890123456789012345678901"
};

describe("DEV AUTH BYPASS guard", () => {
  it("is enabled only for development with the explicit flag", () => {
    expect(isDevAuthBypassEnabled({ NODE_ENV: "development", [DEV_AUTH_BYPASS_FLAG]: "true" })).toBe(true);
  });

  it("is never enabled in production, test, or without the exact flag value", () => {
    expect(isDevAuthBypassEnabled({ NODE_ENV: "production", [DEV_AUTH_BYPASS_FLAG]: "true" })).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: "test", [DEV_AUTH_BYPASS_FLAG]: "true" })).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: "development", [DEV_AUTH_BYPASS_FLAG]: "false" })).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: "development", [DEV_AUTH_BYPASS_FLAG]: "1" })).toBe(false);
    expect(isDevAuthBypassEnabled({ [DEV_AUTH_BYPASS_FLAG]: "true" })).toBe(false);
  });

  it("returns no actor (real authentication applies) when disabled", () => {
    const headers = new Headers({ cookie: `${DEV_PERSONA_COOKIE}=workspace_owner` });
    expect(resolveDevPersonaActor(headers, { NODE_ENV: "production", [DEV_AUTH_BYPASS_FLAG]: "true" })).toBeNull();
    expect(resolveDevPersonaActor(headers, { NODE_ENV: "development" })).toBeNull();
  });

  it("parseEnv rejects the bypass in production and accepts it in development", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "production", [DEV_AUTH_BYPASS_FLAG]: "true" })).toThrow(/must not be enabled in production/);
    expect(parseEnv({ ...base, NODE_ENV: "production", [DEV_AUTH_BYPASS_FLAG]: "false" }).NODE_ENV).toBe("production");
    expect(parseEnv({ ...base, NODE_ENV: "production" }).NODE_ENV).toBe("production");
    expect(parseEnv({ ...base, NODE_ENV: "development", [DEV_AUTH_BYPASS_FLAG]: "true" })[DEV_AUTH_BYPASS_FLAG]).toBe("true");
  });

  it("resolves each persona from its cookie, defaulting safely", () => {
    const env = { NODE_ENV: "development", [DEV_AUTH_BYPASS_FLAG]: "true" };
    const keys = Object.keys(devPersonas) as Array<keyof typeof devPersonas>;
    for (const key of keys) {
      const actor = resolveDevPersonaActor(new Headers({ cookie: `a=b; ${DEV_PERSONA_COOKIE}=${key}` }), env);
      expect(actor?.email).toMatch(/@lander\.invalid$/);
      expect(readDevPersonaKey(`${DEV_PERSONA_COOKIE}=${key}`)).toBe(key);
    }
    expect(readDevPersonaKey(null)).toBe(DEFAULT_DEV_PERSONA);
    expect(readDevPersonaKey(`${DEV_PERSONA_COOKIE}=not-a-persona`)).toBe(DEFAULT_DEV_PERSONA);
    expect(readDevPersonaKey(`${DEV_PERSONA_COOKIE}=__proto__`)).toBe(DEFAULT_DEV_PERSONA);
    const ids = new Set(keys.map((key) => resolveDevPersonaActor(new Headers({ cookie: `${DEV_PERSONA_COOKIE}=${key}` }), env)?.id));
    expect(ids.size).toBe(keys.length);
  });

  it("covers every required persona and the seed script stays in sync", () => {
    expect(Object.keys(devPersonas).sort()).toEqual([
      "creator", "isolated_owner", "platform_admin", "workspace_campaign_manager", "workspace_finance",
      "workspace_marketing", "workspace_owner", "workspace_social_media", "workspace_viewer"
    ]);
    const seed = readFileSync("scripts/bootstrap-dev-personas.mjs", "utf8");
    for (const persona of Object.values(devPersonas)) {
      const role = persona.roleCode ? `"${persona.roleCode}"` : "null";
      const workspace = persona.workspace ? `"${persona.workspace}"` : "null";
      expect(seed).toContain(`["${persona.key}", "${persona.name}", ${role}, ${workspace}]`);
    }
  });

  it("is not enabled by any versioned deployment artifact", () => {
    const files = [
      ...readdirSync(".github/workflows").map((name) => path.join(".github/workflows", name)),
      "Dockerfile", ".dockerignore", ".env.example"
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/LANDER_DEV_AUTH_BYPASS["']?\s*[:=]\s*["']?true/);
    }
  });
});
