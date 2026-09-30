import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("main-only repository governance", () => {
  it("keeps main as the only documented working branch", () => {
    const policy = readFileSync("BRANCH-POLICY.md", "utf8");
    const gitRule = readFileSync(".claude/rules/git.md", "utf8");
    expect(policy).toContain("only valid working branch is `main`");
    expect(gitRule).toContain("Work exclusively on `main`");
  });

  it("keeps CI on direct main pushes without a pull-request trigger", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).not.toContain("pull_request:");
  });

  it("does not keep branch-producing Dependabot configuration", () => {
    expect(existsSync(".github/dependabot.yml")).toBe(false);
  });

  it("prohibits Vercel and requires visual deployment for user-visible stages", () => {
    const policy = readFileSync("VISUAL-DEVELOPMENT-POLICY.md", "utf8");
    expect(policy).toContain("**Vercel is prohibited.**");
    expect(policy).toContain("exact validated \`main\` commit");
    expect(policy).toContain("IMPLEMENTATION_COMPLETE_VISUAL_DEPLOYMENT_BLOCKED");
  });
});
