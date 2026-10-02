import { handleWorkspaceList } from "@/server/http/list-route";
import { listWorkspacePlannableDeliverables, plannableListConfig } from "@/server/application/operations/publications";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, plannableListConfig, (c) => listWorkspacePlannableDeliverables(c.client, c));
}
