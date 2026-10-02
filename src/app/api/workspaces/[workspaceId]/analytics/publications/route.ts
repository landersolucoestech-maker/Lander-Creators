import { handleWorkspaceList } from "@/server/http/list-route";
import { listWorkspaceMetricTargets, metricTargetListConfig } from "@/server/application/operations/analytics";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, metricTargetListConfig, (c) => listWorkspaceMetricTargets(c.client, c));
}
