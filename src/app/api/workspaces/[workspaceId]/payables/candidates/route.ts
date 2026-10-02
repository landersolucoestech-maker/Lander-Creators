import { handleWorkspaceList } from "@/server/http/list-route";
import { listWorkspacePayableCandidates, payableCandidateListConfig } from "@/server/application/operations/payables";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, payableCandidateListConfig, (c) => listWorkspacePayableCandidates(c.client, c));
}
