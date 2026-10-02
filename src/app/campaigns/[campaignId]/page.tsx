import { notFound, redirect } from "next/navigation";
import { getApplicationShellState } from "@/server/application/application-context";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { getCampaign } from "@/server/campaign/service";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/shared/domain-error";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { ApplicationShell } from "../../application-shell";
import { workspaceNavigation } from "../../application-navigation";
import { CampaignDetail } from "./campaign-detail";

export default async function CampaignPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const actor = await resolveApplicationActor();
  if (!actor) redirect("/");

  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const state = await getApplicationShellState(client, {
      id: actor.id,
      name: actor.name,
      email: actor.email
    });
    const active = await resolveActiveWorkspace(client, { userId: actor.id });
    if (!active) redirect("/workspace");

    try {
      const { campaignId } = await params;
      const data = await getCampaign(client, {
        userId: actor.id,
        workspaceId: active.workspaceId,
        campaignId
      });
      return (
        <ApplicationShell
          state={state}
          navigation={workspaceNavigation(state)}
          context="workspace"
        >
          <CampaignDetail
            workspaceId={active.workspaceId}
            data={data as never}
          />
        </ApplicationShell>
      );
    } catch (error) {
      if (error instanceof DomainError && error.status === 404) notFound();
      throw error;
    }
  } finally {
    await client.end();
  }
}
