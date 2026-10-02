import { redirect } from "next/navigation";
import { getApplicationShellState } from "@/server/application/application-context";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { listCampaigns } from "@/server/campaign/service";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { AccessDeniedState } from "../access-denied-state";
import { ApplicationShell } from "../application-shell";
import { workspaceNavigation } from "../application-navigation";
import { CampaignsPanel } from "./campaigns-panel";

export default async function CampaignsPage() {
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

    if (!state.capabilities.campaign) {
      return (
        <ApplicationShell
          state={state}
          navigation={workspaceNavigation(state)}
          context="workspace"
        >
          <AccessDeniedState />
        </ApplicationShell>
      );
    }

    const campaigns = await listCampaigns(client, {
      userId: actor.id,
      workspaceId: active.workspaceId
    });

    return (
      <ApplicationShell
        state={state}
        navigation={workspaceNavigation(state)}
        context="workspace"
      >
        <CampaignsPanel
          workspaceId={active.workspaceId}
          initialCampaigns={campaigns as never}
        />
      </ApplicationShell>
    );
  } finally {
    await client.end();
  }
}
