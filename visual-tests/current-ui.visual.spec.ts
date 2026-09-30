import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";

type VisualStatus = "PASS" | "ISSUE";

function record(input: {
  project: string;
  screen: string;
  route: string;
  screenshot: string;
  status: VisualStatus;
  finding: string;
  accessibility: string;
}) {
  mkdirSync("visual", { recursive: true });
  appendFileSync(
    "visual/results.ndjson",
    JSON.stringify({
      sha: process.env.GITHUB_SHA ?? "local",
      runId: process.env.GITHUB_RUN_ID ?? "local",
      viewport: input.project,
      ...input
    }) + "\n"
  );
}

async function capture(
  page: Parameters<typeof test>[0] extends never ? never : any,
  project: string,
  name: string,
  route: string,
  finding: string
) {
  const dir = path.join("visual", project);
  mkdirSync(dir, { recursive: true });
  const screenshot = path.join(dir, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((item) =>
    item.impact === "critical" || item.impact === "serious"
  );

  record({
    project,
    screen: name,
    route,
    screenshot,
    status: blocking.length === 0 ? "PASS" : "ISSUE",
    finding,
    accessibility:
      blocking.length === 0
        ? "No serious or critical axe violations."
        : blocking.map((item) => `${item.id}: ${item.help}`).join("; ")
  });

  expect(blocking, `Blocking accessibility issues on ${route}`).toEqual([]);
}

async function verifyNoHorizontalOverflow(page: any) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
}

test("captures current LANDER CREATORS user-visible flow", async ({ page }, testInfo) => {
  const project = testInfo.project.name;
  const suffix = `${process.env.GITHUB_RUN_ID ?? "local"}-${project}`;
  const email = `visual-${suffix}@example.test`;
  const password = "VisualInspection123!";

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "home",
    "/",
    "Authentication entry renders sign-in, sign-up and recovery forms in PT-BR."
  );

  const signIn = page.locator("form").filter({ hasText: "Entrar" }).first();
  await signIn.getByLabel("E-mail").fill(email);
  await signIn.getByLabel("Senha").fill("WrongVisualPassword123!");
  await signIn.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail, senha ou verificação inválidos.")).toBeVisible();
  await capture(
    page,
    project,
    "authentication-error",
    "/",
    "Authentication error is rendered as user-facing PT-BR copy."
  );

  const signUp = page.locator("form").filter({ hasText: "Criar conta" });
  await signUp.getByLabel("Nome").fill("Inspeção Visual");
  await signUp.getByLabel("E-mail").fill(email);
  await signUp.getByLabel("Senha").fill(password);
  await signUp.getByRole("button", { name: "Cadastrar" }).click();
  await expect(
    page.getByText("Cadastro recebido. Verifique seu e-mail para ativar a conta.")
  ).toBeVisible();

  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    await sql.unsafe(
      'update "user" set email_verified=true, updated_at=now() where email=$1',
      [email]
    );
    await sql.unsafe(
      'update identity_profiles set status=\'ACTIVE\', updated_at=now() where user_id=(select id from "user" where email=$1)',
      [email]
    );
  } finally {
    await sql.end();
  }

  await signIn.getByLabel("E-mail").fill(email);
  await signIn.getByLabel("Senha").fill(password);
  await signIn.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Fundação de acesso" })).toBeVisible();
  await expect(page.getByText("Você ainda não possui workspace.")).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "workspace-empty",
    "/",
    "Authenticated empty Workspace state renders without fabricated product modules."
  );

  const workspaceForm = page.locator("form").filter({ hasText: "Criar workspace" });
  await workspaceForm.getByLabel("Nome do workspace").fill(`Visual Workspace ${project}`);
  await workspaceForm.getByLabel("Tipo").selectOption("AGENCY");
  await workspaceForm.getByRole("button", { name: "Criar workspace" }).click();

  await expect(page.getByText("Workspace criado.")).toBeVisible();
  await expect(page.getByText(`Visual Workspace ${project}`)).toBeVisible();
  await expect(page.getByText("Workspace ativo:")).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "workspace",
    "/",
    "Workspace creation and active Workspace state render from real PostgreSQL-backed data."
  );

  await expect(page.getByRole("heading", { name: "Equipe" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await capture(
    page,
    project,
    "team",
    "/",
    "Team management renders the authenticated owner Membership and invitation controls."
  );

  await page.goto("/reset-password?token=visual-inspection-placeholder");
  await expect(page.getByRole("heading", { name: "Definir nova senha" })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "reset-password",
    "/reset-password",
    "Password reset form renders safely without requiring a real recovery secret."
  );

  await page.goto("/invitations/accept?token=visual-inspection-placeholder");
  await expect(page.getByRole("heading", { name: "Convite de workspace" })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "invitation",
    "/invitations/accept",
    "Invitation acceptance route renders for the authenticated disposable test identity."
  );
});
