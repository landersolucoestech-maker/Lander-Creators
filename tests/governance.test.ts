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

  it("prohibits Vercel and preserves owner-controlled infrastructure decisions", () => {
    const policy = readFileSync("VISUAL-DEVELOPMENT-POLICY.md", "utf8");
    expect(policy).toContain("Vercel is prohibited.");
    expect(policy).toContain("GitHub, GitHub Actions");
    expect(policy).toContain("No managed hosting, deployment platform or additional third-party infrastructure may be introduced without explicit owner approval.");
  });

  it("keeps visual inspection GitHub-only and downstream of validation", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("visual_inspection:");
    expect(workflow).toContain("needs: validate");
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain("lander-creators-visual-inspection");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).not.toContain("pull_request:");
    expect(workflow.toLowerCase()).not.toContain("vercel");
    expect(workflow.toLowerCase()).not.toContain("railway");
  });

  it("contains no known external deployment configuration", () => {
    expect(existsSync("vercel.json")).toBe(false);
    expect(existsSync("railway.json")).toBe(false);
    expect(existsSync("railway.toml")).toBe(false);
  });
});
