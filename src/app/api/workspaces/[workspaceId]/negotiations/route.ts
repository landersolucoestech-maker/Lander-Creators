import { handleWorkspaceList } from "@/server/http/list-route";
import { listWorkspaceNegotiations, negotiationListConfig } from "@/server/application/operations/negotiations";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, negotiationListConfig, (c) => listWorkspaceNegotiations(c.client, c));
}
