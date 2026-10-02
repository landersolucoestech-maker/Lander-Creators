/** True only for absolute https URLs; rejects http:, javascript:, data:, file: and malformed values. */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
