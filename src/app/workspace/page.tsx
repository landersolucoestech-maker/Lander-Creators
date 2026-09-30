import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { ApplicationShell } from "../application-shell";
import { workspaceNavigation } from "../application-navigation";
import { WorkspacePanel } from "./workspace-panel";

export default async function WorkspacePage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:session.user.id,name:session.user.name,email:session.user.email});
  return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><WorkspacePanel workspaces={state.workspaces}/></ApplicationShell>;
 }finally{await client.end();}
}
