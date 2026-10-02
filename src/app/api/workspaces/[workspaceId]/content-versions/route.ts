import { handleWorkspaceList } from "@/server/http/list-route";
import { contentReviewListConfig, listWorkspaceContentVersions } from "@/server/application/operations/content-review";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const deliverableId = new URL(request.url).searchParams.get("deliverableId");
  return handleWorkspaceList(request, params, contentReviewListConfig, (c) => listWorkspaceContentVersions(c.client, { ...c, deliverableId }));
}
