import { handleWorkspaceList } from "@/server/http/list-route";
import { listWorkspacePayables, payableListConfig } from "@/server/application/operations/payables";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, payableListConfig, (c) => listWorkspacePayables(c.client, c));
}
