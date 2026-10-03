import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { handleWorkspaceList } from "@/server/http/list-route";
import { listWorkspaceMatches, matchListConfig } from "@/server/application/operations/matching";
import { recalculateCampaignMatches } from "@/server/matching/service";

type Context = { params: Promise<{ workspaceId: string; campaignId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { campaignId } = await params;
  return handleWorkspaceList(request, params, matchListConfig, (c) => listWorkspaceMatches(c.client, { ...c, campaignId }));
}

export async function POST(request: Request, { params }: Context) {
  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const { workspaceId, campaignId } = await params;
    return Response.json({ matches: await recalculateCampaignMatches(client, { userId: user.id, workspaceId, campaignId }) });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
