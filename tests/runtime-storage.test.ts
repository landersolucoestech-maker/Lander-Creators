import { afterEach, describe, expect, it } from "vitest";
import { getRuntimeMediaStorage } from "@/server/media/runtime-storage";

const originalMode = process.env.MEDIA_STORAGE_MODE;

afterEach(() => {
  if (originalMode === undefined) delete process.env.MEDIA_STORAGE_MODE;
  else process.env.MEDIA_STORAGE_MODE = originalMode;
});

describe("runtime media storage boundary", () => {
  it("refuses implicit local persistence when ephemeral mode is not authorized", () => {
    delete process.env.MEDIA_STORAGE_MODE;
    expect(() => getRuntimeMediaStorage()).toThrowError(
      "No authorized runtime media storage adapter is configured"
    );
  });

  it("allows the explicit ephemeral adapter for CI/test use", () => {
    process.env.MEDIA_STORAGE_MODE = "ephemeral";
    expect(getRuntimeMediaStorage()).toBeDefined();
  });
});
