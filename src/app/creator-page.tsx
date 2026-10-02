import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { Sql } from "postgres";
import { getApplicationShellState } from "@/server/application/application-context";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { ApplicationShell } from "./application-shell";
import { creatorNavigation } from "./application-navigation";

/** Shared server-side frame for Creator-context pages: session, Creator profile guard and shell. */
export async function renderCreatorPage(load: (context: { client: Sql; userId: string }) => Promise<ReactNode>) {
  const actor = await resolveApplicationActor();
  if (!actor) redirect("/");

  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const state = await getApplicationShellState(client, { id: actor.id, name: actor.name, email: actor.email });
    if (!state.creator) redirect("/creator");
    const content = await load({ client, userId: actor.id });
    return (
      <ApplicationShell state={state} navigation={creatorNavigation()} context="creator">
        {content}
      </ApplicationShell>
    );
  } finally {
    await client.end();
  }
}
