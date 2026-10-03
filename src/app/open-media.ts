/**
 * Opens a Workspace media asset through the existing short-lived access flow
 * (token request, then authorized content fetch). Returns an error message or null.
 */
export async function openMediaAsset(workspaceId: string, mediaAssetId: string): Promise<string | null> {
  const access = await fetch(`/api/workspaces/${workspaceId}/media/${mediaAssetId}/access`, { method: "POST" });
  const accessPayload = await access.json().catch(() => ({}));
  if (!access.ok) return accessPayload?.error?.message ?? "Não foi possível abrir o arquivo.";
  const content = await fetch(`/api/workspaces/${workspaceId}/media/${mediaAssetId}/content`, {
    headers: { "x-media-access": String(accessPayload.accessToken) }
  });
  if (!content.ok) {
    const payload = await content.json().catch(() => ({}));
    return payload?.error?.message ?? "Não foi possível abrir o arquivo.";
  }
  const objectUrl = URL.createObjectURL(await content.blob());
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  return null;
}
