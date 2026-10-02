import { handleWorkspaceList } from "@/server/http/list-route";
import { contractListConfig, listWorkspaceContracts } from "@/server/application/operations/engagements";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, contractListConfig, (c) => listWorkspaceContracts(c.client, c));
}
