import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { Sql } from "postgres";
import { getApplicationShellState, hasWorkspacePermission, type ApplicationCapability } from "@/server/application/application-context";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import type { PermissionCode } from "@/server/authorization/permissions";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/shared/domain-error";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { AccessDeniedState } from "./access-denied-state";
import { ApplicationShell } from "./application-shell";
import { workspaceNavigation } from "./application-navigation";

/**
 * Shared server-side frame for Workspace-context pages: session, active Workspace, capability guard and shell.
 * The capability check here only decides what to render; every list and mutation re-authorizes on the server.
 * `permissions` resolves which row actions the current member may see (the API enforces them regardless).
 */
export async function renderWorkspacePage(options: {
  capability: ApplicationCapability;
  permissions?: PermissionCode[];
  load: (context: { client: Sql; userId: string; workspaceId: string; can: Record<string, boolean> }) => Promise<ReactNode>;
}) {
  const actor = await resolveApplicationActor();
  if (!actor) redirect("/");

  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const state = await getApplicationShellState(client, { id: actor.id, name: actor.name, email: actor.email });
    const active = await resolveActiveWorkspace(client, { userId: actor.id });
    if (!active) redirect("/workspace");

    const navigation = workspaceNavigation(state);
    if (!state.capabilities[options.capability]) {
      return (
        <ApplicationShell state={state} navigation={navigation} context="workspace">
          <AccessDeniedState />
        </ApplicationShell>
      );
    }

    const can: Record<string, boolean> = {};
    for (const permission of options.permissions ?? []) {
      can[permission] = await hasWorkspacePermission(client, actor.id, active.workspaceId, permission);
    }
    let content: ReactNode;
    try {
      content = await options.load({ client, userId: actor.id, workspaceId: active.workspaceId, can });
    } catch (error) {
      // A service-level refusal (403) means the member lacks a permission the navigation capability did not cover.
      if (error instanceof DomainError && error.status === 403) content = <AccessDeniedState />;
      else throw error;
    }
    return (
      <ApplicationShell state={state} navigation={navigation} context="workspace">
        {content}
      </ApplicationShell>
    );
  } finally {
    await client.end();
  }
}
