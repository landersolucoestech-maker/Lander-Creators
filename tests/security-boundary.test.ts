import { describe, expect, it } from "vitest";
import { assertTrustedRequestOrigin } from "@/server/http/api";
import { toPublicError } from "@/server/errors/public-error";

describe("HTTP security boundary", () => {
  it("accepts same-origin authenticated API requests", () => {
    const request = new Request("https://creators.example/api/workspaces", {
      headers: { origin: "https://creators.example" }
    });
    expect(() => assertTrustedRequestOrigin(request)).not.toThrow();
  });

  it("rejects a mismatched browser origin", () => {
    const request = new Request("https://creators.example/api/workspaces", {
      headers: { origin: "https://attacker.example" }
    });
    expect(() => assertTrustedRequestOrigin(request)).toThrowError(
      "Request origin is not trusted"
    );
  });

  it("never maps raw database text into public errors", () => {
    const raw = new Error("postgres password=super-secret");
    const mapped = toPublicError(raw);
    expect(mapped.message).not.toContain("super-secret");
    expect(mapped.code).toBe("INTERNAL_ERROR");
  });
});
