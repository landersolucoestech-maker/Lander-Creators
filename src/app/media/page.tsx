import { redirect } from "next/navigation";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { listMediaAssets } from "@/server/media/media-service";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { ApplicationShell } from "../application-shell";
import { AccessDeniedState } from "../access-denied-state";
import { workspaceNavigation } from "../application-navigation";
import { MediaPanel } from "./media-panel";

export default async function MediaPage(){
 const actor=await resolveApplicationActor();if(!actor)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:actor.id,name:actor.name,email:actor.email});
  const active=await resolveActiveWorkspace(client,{userId:actor.id});if(!active)redirect("/workspace");
  if(!state.capabilities.media)return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><AccessDeniedState/></ApplicationShell>;
  const media=await listMediaAssets(client,{userId:actor.id,workspaceId:active.workspaceId});
  return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><MediaPanel workspaceId={active.workspaceId} media={media as never}/></ApplicationShell>;
 }finally{await client.end();}
}
