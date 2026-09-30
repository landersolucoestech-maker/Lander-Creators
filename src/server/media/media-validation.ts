import { createHash } from "node:crypto";
import { DomainError } from "@/server/shared/domain-error";

export const DEFAULT_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

function detect(bytes: Buffer) {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { mime: "image/png", kind: "IMAGE" as const, extension: "png" };
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  ) {
    return { mime: "image/jpeg", kind: "IMAGE" as const, extension: "jpg" };
  }

  if (bytes.length >= 4 && bytes.subarray(0, 4).toString() === "%PDF") {
    return {
      mime: "application/pdf",
      kind: "DOCUMENT" as const,
      extension: "pdf"
    };
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WAVE"
  ) {
    return { mime: "audio/wav", kind: "AUDIO" as const, extension: "wav" };
  }

  if (bytes.length >= 3 && bytes.subarray(0, 3).toString() === "ID3") {
    return { mime: "audio/mpeg", kind: "AUDIO" as const, extension: "mp3" };
  }

  return null;
}

export function validateMedia(input: {
  bytes: Buffer;
  declaredMime: string;
  originalFileName: string;
  maxBytes?: number;
}) {
  const maxBytes =
    input.maxBytes ??
    Number(process.env.MEDIA_MAX_BYTES ?? DEFAULT_MEDIA_MAX_BYTES);

  if (!input.bytes.length || input.bytes.length > maxBytes) {
    throw new DomainError(
      "MEDIA_TOO_LARGE",
      "Media size outside allowed range",
      413
    );
  }

  const detected = detect(input.bytes);

  if (!detected || detected.mime !== input.declaredMime) {
    throw new DomainError("INVALID_MEDIA_TYPE", "MIME mismatch", 415);
  }

  const extension = input.originalFileName.split(".").pop()?.toLowerCase();
  const extensionMatches =
    detected.extension === "jpg"
      ? ["jpg", "jpeg"].includes(extension ?? "")
      : extension === detected.extension;

  if (!extensionMatches) {
    throw new DomainError("INVALID_MEDIA_TYPE", "Extension mismatch", 415);
  }

  return {
    ...detected,
    fileName: `media.${detected.extension}`,
    checksumSha256: createHash("sha256").update(input.bytes).digest("hex"),
    sizeBytes: input.bytes.length
  };
}
