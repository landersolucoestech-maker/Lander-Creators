import { handleWorkspaceList } from "@/server/http/list-route";
import { disputeListConfig, listWorkspaceDisputes } from "@/server/dispute/service";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, disputeListConfig, (c) => listWorkspaceDisputes(c.client, c));
}
