import { handleWorkspaceList } from "@/server/http/list-route";
import { listWorkspacePublications, publicationListConfig } from "@/server/application/operations/publications";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, publicationListConfig, (c) => listWorkspacePublications(c.client, c));
}
