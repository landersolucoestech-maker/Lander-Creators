import { describe,expect,it } from "vitest";import { toPublicError } from "@/server/errors/public-error";
describe("public error mapping",()=>{it("does not expose raw technical error messages",()=>{const raw=new Error("database password leaked here");const mapped=toPublicError(raw);expect(mapped.message).not.toContain(raw.message);expect(mapped.code).toBe("INTERNAL_ERROR");});});
