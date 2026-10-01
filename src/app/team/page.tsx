import { redirect } from "next/navigation";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { listWorkspaceMembers } from "@/server/workspace/membership-service";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { ApplicationShell } from "../application-shell";
import { AccessDeniedState } from "../access-denied-state";
import { workspaceNavigation } from "../application-navigation";
import { TeamPanel } from "./team-panel";

export default async function TeamPage(){
 const actor=await resolveApplicationActor();if(!actor)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:actor.id,name:actor.name,email:actor.email});
  const active=await resolveActiveWorkspace(client,{userId:actor.id});if(!active)redirect("/workspace");
  if(!state.capabilities.team)return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><AccessDeniedState/></ApplicationShell>;
  const members=await listWorkspaceMembers(client,{actorUserId:actor.id,workspaceId:active.workspaceId});
  return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><TeamPanel workspaceId={active.workspaceId} workspaceName={state.activeWorkspace?.name??"Workspace"} members={members as never}/></ApplicationShell>;
 }finally{await client.end();}
}
