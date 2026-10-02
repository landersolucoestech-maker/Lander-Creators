import { handleWorkspaceList } from "@/server/http/list-route";
import { campaignAnalyticsListConfig, listWorkspaceCampaignAnalytics } from "@/server/application/operations/analytics";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handleWorkspaceList(request, params, campaignAnalyticsListConfig, (c) => listWorkspaceCampaignAnalytics(c.client, c));
}
