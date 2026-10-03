// Seeds the deterministic DEV AUTH BYPASS personas (see src/server/auth/dev-auth-bypass.ts). Idempotent.
// Personas are real users with real memberships, so authorization and tenant isolation remain enforced.
import postgres from "postgres";

const flag = process.env.LANDER_DEV_AUTH_BYPASS;
if (process.env.NODE_ENV === "production" || flag !== "true") {
  throw new Error("DEV_PERSONAS_GUARD: requires LANDER_DEV_AUTH_BYPASS=true and NODE_ENV!=production");
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = postgres(url, { max: 1, prepare: false });

const workspaces = {
  A: { id: "50000000-0000-0000-0000-00000000000a", name: "Lander Dev Workspace" },
  B: { id: "50000000-0000-0000-0000-00000000000b", name: "Lander Dev Isolated Workspace" }
};
const roleIds = {
  OWNER: "20000000-0000-0000-0000-000000000001",
  CAMPAIGN_MANAGER: "20000000-0000-0000-0000-000000000003",
  MARKETING: "20000000-0000-0000-0000-000000000004",
  SOCIAL_MEDIA: "20000000-0000-0000-0000-000000000005",
  FINANCE: "20000000-0000-0000-0000-000000000006",
  VIEWER: "20000000-0000-0000-0000-000000000007"
};
// Keep in sync with devPersonas in src/server/auth/dev-auth-bypass.ts (asserted by tests/dev-auth-bypass.test.ts).
const personas = [
  ["workspace_owner", "Dev Owner", "OWNER", "A"],
  ["workspace_marketing", "Dev Marketing", "MARKETING", "A"],
  ["workspace_campaign_manager", "Dev Campaign Manager", "CAMPAIGN_MANAGER", "A"],
  ["workspace_social_media", "Dev Social Media", "SOCIAL_MEDIA", "A"],
  ["workspace_finance", "Dev Financeiro", "FINANCE", "A"],
  ["workspace_viewer", "Dev Viewer", "VIEWER", "A"],
  ["creator", "Dev Creator", null, null],
  ["platform_admin", "Dev Platform Admin", null, null],
  ["isolated_owner", "Dev Isolated Owner", "OWNER", "B"]
];
const userId = (key) => `lander-dev-${key.replaceAll("_", "-")}`;

await sql.begin(async (tx) => {
  for (const [key, name] of personas) {
    const id = userId(key);
    await tx.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true) on conflict(id) do update set name=excluded.name,email=excluded.email,email_verified=true,updated_at=now()', [id, name, `${id}@lander.invalid`]);
    await tx.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE') on conflict(user_id) do update set status='ACTIVE',updated_at=now()", [id]);
  }
  for (const [label, w] of Object.entries(workspaces)) {
    const creator = userId(label === "A" ? "workspace_owner" : "isolated_owner");
    await tx.unsafe("insert into workspaces(id,name,type,status,created_by_user_id) values($1::uuid,$2,'INTERNAL','ACTIVE',$3) on conflict(id) do update set name=excluded.name,status='ACTIVE',updated_at=now()", [w.id, w.name, creator]);
  }
  for (const [key, , roleCode, label] of personas) {
    if (!roleCode) continue;
    const id = userId(key);
    await tx.unsafe("insert into memberships(user_id,workspace_id,role_id,status) values($1,$2::uuid,$3::uuid,'ACTIVE') on conflict(user_id,workspace_id) do update set role_id=excluded.role_id,status='ACTIVE',updated_at=now()", [id, workspaces[label].id, roleIds[roleCode]]);
    await tx.unsafe("insert into user_context_preferences(user_id,active_workspace_id) values($1,$2::uuid) on conflict(user_id) do update set active_workspace_id=excluded.active_workspace_id,updated_at=now()", [id, workspaces[label].id]);
  }
  await tx.unsafe("insert into creator_profiles(id,user_id,display_name,bio,country_code,language_code,timezone_code,status) values('46000000-0000-0000-0000-0000000000d1'::uuid,$1,'Dev Creator','Deterministic dev Creator','BR','pt-BR','America/Sao_Paulo','ACTIVE') on conflict(id) do update set status='ACTIVE',updated_at=now()", [userId("creator")]);
});
await sql.end();
console.log(`dev personas seeded: ${personas.length}`);
