import { afterEach, describe, expect, it } from "vitest";
import { assertTrustedRequestOrigin } from "@/server/http/api";
import { toPublicError } from "@/server/errors/public-error";

const originalBaseUrl = process.env.AUTH_BASE_URL;

afterEach(() => {
  process.env.AUTH_BASE_URL = originalBaseUrl;
});

describe("HTTP security boundary", () => {
  it("accepts same-origin authenticated API requests", () => {
    const request = new Request("https://creators.example/api/workspaces", {
      headers: { origin: "https://creators.example" }
    });
    expect(() => assertTrustedRequestOrigin(request)).not.toThrow();
  });

  it("accepts the configured public origin when runtime URL uses an internal host", () => {
    process.env.AUTH_BASE_URL = "https://creators.example";
    const request = new Request("http://internal-runtime:3000/api/workspaces", {
      headers: { origin: "https://creators.example" }
    });
    expect(() => assertTrustedRequestOrigin(request)).not.toThrow();
  });

  it("rejects a mismatched browser origin", () => {
    process.env.AUTH_BASE_URL = "https://creators.example";
    const request = new Request("http://internal-runtime:3000/api/workspaces", {
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
