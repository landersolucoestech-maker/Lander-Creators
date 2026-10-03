import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData, testDatabaseUrl } from "./test-db";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { permissionCodes, type PermissionCode } from "@/server/authorization/permissions";
import { DEV_AUTH_BYPASS_FLAG, DEV_PERSONA_COOKIE, devPersonas, resolveDevPersonaActor, type DevPersonaKey } from "@/server/auth/dev-auth-bypass";
import { getApplicationShellState } from "@/server/application/application-context";

const sql = createTestSql();
const workspaceA = "50000000-0000-0000-0000-00000000000a";
const workspaceB = "50000000-0000-0000-0000-00000000000b";
const env = { NODE_ENV: "development", [DEV_AUTH_BYPASS_FLAG]: "true" };

function seed(extra: Record<string, string> = {}) {
  execFileSync("node", ["scripts/bootstrap-dev-personas.mjs"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl, LANDER_DEV_AUTH_BYPASS: "true", NODE_ENV: "test", ...extra },
    stdio: "pipe"
  });
}

function actorOf(key: DevPersonaKey) {
  const actor = resolveDevPersonaActor(new Headers({ cookie: `${DEV_PERSONA_COOKIE}=${key}` }), env);
  if (!actor) throw new Error("bypass disabled");
  return actor;
}

async function grantedPermissions(key: DevPersonaKey, workspaceId: string) {
  const granted = new Set<PermissionCode>();
  for (const permission of permissionCodes) {
    try {
      await authorizeWorkspacePermission(sql, { userId: actorOf(key).id, workspaceId, permission });
      granted.add(permission);
    } catch (error) {
      expect((error as { status?: number }).status).toBe(403);
    }
  }
  return granted;
}

describe("DEV AUTH BYPASS personas keep real authorization", () => {
  beforeAll(async () => {
    await resetSecurityData(sql);
    seed();
  });
  afterAll(async () => {
    await resetSecurityData(sql);
    await sql.end();
  });

  it("seeding is idempotent and every persona is a real active user", async () => {
    seed();
    for (const key of Object.keys(devPersonas) as DevPersonaKey[]) {
      const rows = await sql.unsafe("select 1 from identity_profiles where user_id=$1 and status='ACTIVE'", [actorOf(key).id]);
      expect(rows.length, key).toBe(1);
    }
  });

  it("the seed script refuses to run in production or without the flag", () => {
    expect(() => seed({ NODE_ENV: "production" })).toThrow();
    expect(() => seed({ LANDER_DEV_AUTH_BYPASS: "" })).toThrow();
  });

  it("the Owner persona holds every capability while the other roles do not (no allow-all)", async () => {
    const owner = await grantedPermissions("workspace_owner", workspaceA);
    expect(owner.size).toBe(permissionCodes.length);
    const others = ["workspace_marketing", "workspace_campaign_manager", "workspace_social_media", "workspace_finance", "workspace_viewer"] as const;
    for (const key of others) {
      const granted = await grantedPermissions(key, workspaceA);
      expect(granted.has("workspace.view"), key).toBe(true);
      expect(granted.size, key).toBeLessThan(owner.size);
      expect(granted.has("workspace.ownership.transfer"), key).toBe(false);
    }
  });

  it("a persona without the capability is blocked with MISSING_PERMISSION", async () => {
    const userId = actorOf("workspace_viewer").id;
    await expect(authorizeWorkspacePermission(sql, { userId, workspaceId: workspaceA, permission: "campaign.create" }))
      .rejects.toMatchObject({ code: "MISSING_PERMISSION", status: 403 });
    await expect(authorizeWorkspacePermission(sql, { userId, workspaceId: workspaceA, permission: "finance.manage" }))
      .rejects.toMatchObject({ code: "MISSING_PERMISSION", status: 403 });
  });

  it("workspaces stay isolated from each other", async () => {
    await expect(authorizeWorkspacePermission(sql, { userId: actorOf("workspace_owner").id, workspaceId: workspaceB, permission: "workspace.view" }))
      .rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    await expect(authorizeWorkspacePermission(sql, { userId: actorOf("isolated_owner").id, workspaceId: workspaceA, permission: "workspace.view" }))
      .rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
    expect((await grantedPermissions("isolated_owner", workspaceB)).size).toBe(permissionCodes.length);
  });

  it("Creator and Platform Admin personas have an identity but no workspace authority", async () => {
    for (const key of ["creator", "platform_admin"] as const) {
      for (const workspaceId of [workspaceA, workspaceB]) {
        await expect(authorizeWorkspacePermission(sql, { userId: actorOf(key).id, workspaceId, permission: "workspace.view" }))
          .rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
      }
    }
    const state = await getApplicationShellState(sql, actorOf("creator"));
    expect(state.creator?.displayName).toBe("Dev Creator");
    expect(state.activeWorkspace).toBeNull();
    expect(Object.values(state.capabilities).every((granted) => granted === false)).toBe(true);
  });

  it("the application shell reflects each role's real capabilities", async () => {
    const owner = await getApplicationShellState(sql, actorOf("workspace_owner"));
    const viewer = await getApplicationShellState(sql, actorOf("workspace_viewer"));
    expect(owner.activeWorkspace?.id).toBe(workspaceA);
    expect(Object.values(owner.capabilities).every(Boolean)).toBe(true);
    expect(viewer.capabilities.workspace).toBe(true);
    expect(viewer.capabilities.workspaceSettings).toBe(false);
    expect(Object.values(viewer.capabilities).every(Boolean)).toBe(false);
  });
});
