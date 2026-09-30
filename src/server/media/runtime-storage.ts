import { DomainError } from "@/server/shared/domain-error";
import { LocalEphemeralStorageAdapter } from "./local-storage-adapter";

const globalStorage = globalThis as typeof globalThis & {
  __lcMedia?: LocalEphemeralStorageAdapter;
};

export function getRuntimeMediaStorage() {
  if (process.env.MEDIA_STORAGE_MODE !== "ephemeral") {
    throw new DomainError(
      "MEDIA_STORAGE_UNAVAILABLE",
      "No authorized runtime media storage adapter is configured",
      503
    );
  }

  globalStorage.__lcMedia ??= new LocalEphemeralStorageAdapter();
  return globalStorage.__lcMedia;
}
