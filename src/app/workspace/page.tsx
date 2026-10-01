import { redirect } from "next/navigation";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { ApplicationShell } from "../application-shell";
import { workspaceNavigation } from "../application-navigation";
import { WorkspacePanel } from "./workspace-panel";

export default async function WorkspacePage(){
 const actor=await resolveApplicationActor();if(!actor)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:actor.id,name:actor.name,email:actor.email});
  return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><WorkspacePanel workspaces={state.workspaces}/></ApplicationShell>;
 }finally{await client.end();}
}
