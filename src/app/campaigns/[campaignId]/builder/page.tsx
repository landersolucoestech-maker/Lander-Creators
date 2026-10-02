import { redirect } from "next/navigation";
import { getApplicationShellState } from "@/server/application/application-context";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import {
  getCampaign,
  listCampaignGoals,
  listCampaignPromotedObjectOptions
} from "@/server/campaign/service";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { listMediaAssets } from "@/server/media/media-service";
import { getReferenceData } from "@/server/reference-data/reference-data-service";
import { listTaxonomies } from "@/server/taxonomy/taxonomy-service";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { ApplicationShell } from "../../../application-shell";
import { workspaceNavigation } from "../../../application-navigation";
import { CampaignBuilder } from "./campaign-builder";

export default async function Builder({
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

    const { campaignId } = await params;
    const [data, objects, goals, media, referenceData, taxonomies] =
      await Promise.all([
        getCampaign(client, {
          userId: actor.id,
          workspaceId: active.workspaceId,
          campaignId
        }),
        listCampaignPromotedObjectOptions(client, {
          userId: actor.id,
          workspaceId: active.workspaceId
        }),
        listCampaignGoals(client),
        listMediaAssets(client, {
          userId: actor.id,
          workspaceId: active.workspaceId
        }),
        getReferenceData(client),
        listTaxonomies(client)
      ]);

    return (
      <ApplicationShell
        state={state}
        navigation={workspaceNavigation(state)}
        context="workspace"
      >
        <CampaignBuilder
          workspaceId={active.workspaceId}
          data={data as never}
          objects={objects}
          goals={goals as never}
          media={media as never}
          referenceData={referenceData as never}
          taxonomies={taxonomies as never}
        />
      </ApplicationShell>
    );
  } finally {
    await client.end();
  }
}
