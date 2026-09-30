import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { listMediaAssets } from "@/server/media/media-service";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { ApplicationShell } from "../application-shell";
import { workspaceNavigation } from "../application-navigation";
import { MediaPanel } from "./media-panel";

export default async function MediaPage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:session.user.id,name:session.user.name,email:session.user.email});
  const active=await resolveActiveWorkspace(client,{userId:session.user.id});if(!active)redirect("/workspace");
  const media=await listMediaAssets(client,{userId:session.user.id,workspaceId:active.workspaceId});
  return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><MediaPanel workspaceId={active.workspaceId} media={media as never}/></ApplicationShell>;
 }finally{await client.end();}
}
