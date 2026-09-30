import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { resolveActiveWorkspace } from "@/server/workspace/workspace-service";
import { listWorkspacePromotedEntities } from "@/server/promoted-entities/service";
import { listTaxonomies } from "@/server/taxonomy/taxonomy-service";
import { getReferenceData } from "@/server/reference-data/reference-data-service";
import { listMediaAssets } from "@/server/media/media-service";
import { PromotedEntitiesPanel } from "./promoted-entities-panel";

export default async function PromotedEntitiesPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/");
  const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try{
    const active=await resolveActiveWorkspace(client,{userId:session.user.id});
    if(!active)redirect("/");
    const[entities,taxonomies,referenceData,media]=await Promise.all([
      listWorkspacePromotedEntities(client,{userId:session.user.id,workspaceId:active.workspaceId}),
      listTaxonomies(client),
      getReferenceData(client),
      listMediaAssets(client,{userId:session.user.id,workspaceId:active.workspaceId})
    ]);
    return <PromotedEntitiesPanel workspaceId={active.workspaceId} initialEntities={entities as never} taxonomies={taxonomies as never} referenceData={referenceData as never} media={media as never}/>;
  }finally{await client.end();}
}
