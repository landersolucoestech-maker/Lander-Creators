import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { listUserWorkspaces } from "@/server/workspace/workspace-service";
import { listWorkspaceMembers } from "@/server/workspace/membership-service";
import { listTaxonomies } from "@/server/taxonomy/taxonomy-service";
import { getReferenceData } from "@/server/reference-data/reference-data-service";
import { listMediaAssets } from "@/server/media/media-service";
import { FoundationPanel } from "./foundation-panel";
import { AuthPanel } from "./auth-panel";
import {
  WorkspaceDashboard,
  type MemberView,
  type WorkspaceView
} from "./workspace-dashboard";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <AuthPanel />;

  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);

  try {
    const workspaceRows = await listUserWorkspaces(client, session.user.id);
    const workspaces = workspaceRows as unknown as WorkspaceView[];
    const active = workspaces.find((workspace) => workspace.active);
    const members = active
      ? ((await listWorkspaceMembers(client, {
          actorUserId: session.user.id,
          workspaceId: active.id
        })) as unknown as MemberView[])
      : [];

    const taxonomies = active ? await listTaxonomies(client) : [];
    const referenceData = active ? await getReferenceData(client) : { languages: [], countries: [], currencies: [], timezones: [] };
    const media = active ? await listMediaAssets(client,{ userId: session.user.id, workspaceId: active.id }) : [];

    return (
      <>
      <WorkspaceDashboard
        userName={session.user.name}
        workspaces={workspaces}
        members={members}
      />
      {active ? <div className="app-shell foundation-shell"><FoundationPanel workspaceId={active.id} taxonomies={taxonomies as never} referenceData={referenceData as never} media={media as never}/></div> : null}
      </>
    );
  } finally {
    await client.end();
  }
}
