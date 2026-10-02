import { describe,expect,it } from "vitest";import { toPublicError } from "@/server/errors/public-error";
describe("public error mapping",()=>{it("does not expose raw technical error messages",()=>{const raw=new Error("database password leaked here");const mapped=toPublicError(raw);expect(mapped.message).not.toContain(raw.message);expect(mapped.code).toBe("INTERNAL_ERROR");});});

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DomainError } from "@/server/shared/domain-error";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith(".ts") ? [full] : [];
  });
}

describe("public error catalogue", () => {
  it("has a specific PT-BR message for every DomainError code raised in src/server", () => {
    const codes = new Set<string>();
    for (const file of sourceFiles(path.resolve("src/server"))) {
      for (const match of readFileSync(file, "utf8").matchAll(/new DomainError\(\s*"([A-Z0-9_]+)"/g)) codes.add(match[1]);
    }
    expect(codes.size).toBeGreaterThan(50);
    const generic = toPublicError(new Error("x")).message;
    const missing = [...codes].filter((code) => toPublicError(new DomainError(code, "internal detail", 400)).message === generic).sort();
    expect(missing).toEqual([]);
  });
});
