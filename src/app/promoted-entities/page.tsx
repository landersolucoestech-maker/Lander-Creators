import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { listWorkspacePromotedEntities } from "@/server/promoted-entities/service";
import { listTaxonomies } from "@/server/taxonomy/taxonomy-service";
import { getReferenceData } from "@/server/reference-data/reference-data-service";
import { listMediaAssets } from "@/server/media/media-service";
import { ApplicationShell } from "../application-shell";
import { AccessDeniedState } from "../access-denied-state";
import { workspaceNavigation } from "../application-navigation";
import { PromotedEntitiesPanel } from "./promoted-entities-panel";

export default async function PromotedEntitiesPage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:session.user.id,name:session.user.name,email:session.user.email});
  const active=await resolveActiveWorkspace(client,{userId:session.user.id});if(!active)redirect("/workspace");
  if(!state.capabilities.promoted)return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><AccessDeniedState/></ApplicationShell>;
  const[entities,taxonomies,referenceData,media]=await Promise.all([
   listWorkspacePromotedEntities(client,{userId:session.user.id,workspaceId:active.workspaceId}),
   listTaxonomies(client),getReferenceData(client),listMediaAssets(client,{userId:session.user.id,workspaceId:active.workspaceId})
  ]);
  return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace"><PromotedEntitiesPanel workspaceId={active.workspaceId} initialEntities={entities as never} taxonomies={taxonomies as never} referenceData={referenceData as never} media={media as never}/></ApplicationShell>;
 }finally{await client.end();}
}
