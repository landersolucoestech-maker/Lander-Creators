import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.(ts|tsx)$/.test(full) ? [full] : [];
  });
}

describe("audit_logs has a single writer", () => {
  const files = sourceFiles(path.resolve("src"));

  it("only src/server/shared/audit.ts inserts into audit_logs", () => {
    const offenders = files
      .filter((file) => !file.endsWith(path.join("shared", "audit.ts")))
      .filter((file) => /insert\s+into\s+audit_logs/i.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it("no module writes audit rows through the drizzle table object", () => {
    const offenders = files
      .filter((file) => !file.endsWith(path.join("db", "schema.ts")))
      .filter((file) => /insert\(\s*auditLogs\s*\)/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });
});
