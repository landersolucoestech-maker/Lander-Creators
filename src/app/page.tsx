import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { getDashboardSummary } from "@/server/application/dashboard-service";
import { AuthPanel } from "./auth-panel";
import { ApplicationShell } from "./application-shell";
import { workspaceNavigation } from "./application-navigation";
import { DashboardView } from "./dashboard-view";
import { WorkspacePanel } from "./workspace/workspace-panel";

export default async function HomePage(){
 const actor=await resolveApplicationActor();
 if(!actor)return <AuthPanel/>;
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:actor.id,name:actor.name,email:actor.email});
  const navigation=workspaceNavigation(state);
  if(!state.activeWorkspace){
   return <ApplicationShell state={state} navigation={navigation} context="workspace"><WorkspacePanel workspaces={state.workspaces}/></ApplicationShell>;
  }
  const summary=await getDashboardSummary(client,{userId:actor.id,workspaceId:state.activeWorkspace.id});
  return <ApplicationShell state={state} navigation={navigation} context="workspace"><DashboardView workspaceName={state.activeWorkspace.name} summary={summary}/></ApplicationShell>;
 }finally{await client.end();}
}
