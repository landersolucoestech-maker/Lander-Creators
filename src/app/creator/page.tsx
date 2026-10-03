import { redirect } from "next/navigation";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { getCreatorProfileByUser, listCreatorTaxonomies, calculateCreatorReadiness } from "@/server/creator/creator-service";
import { listSocialProfiles } from "@/server/creator/social-profile-service";
import { listCreatorAttachableMedia } from "@/server/creator/creator-media-service";
import { listTaxonomies } from "@/server/taxonomy/taxonomy-service";
import { getReferenceData } from "@/server/reference-data/reference-data-service";
import { ApplicationShell } from "../application-shell";
import { creatorNavigation } from "../application-navigation";
import { CreatorPanel } from "./creator-panel";

export default async function CreatorPage(){
 const actor=await resolveApplicationActor();if(!actor)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:actor.id,name:actor.name,email:actor.email});
  const profile=await getCreatorProfileByUser(client,actor.id);
  const[taxonomies,referenceData,attachableMedia]=await Promise.all([listTaxonomies(client),getReferenceData(client),listCreatorAttachableMedia(client,actor.id)]);
  const relations=profile?await listCreatorTaxonomies(client,profile.id):{niches:[],contentStyles:[],musicGenres:[]};
  const socials=profile?await listSocialProfiles(client,{userId:actor.id,creatorProfileId:profile.id}):[];
  const readiness=profile?await calculateCreatorReadiness(client,actor.id):null;
  return <ApplicationShell state={state} navigation={creatorNavigation()} context="creator"><CreatorPanel profile={profile} taxonomies={taxonomies} referenceData={referenceData} relations={relations} socials={socials} readiness={readiness} attachableMedia={attachableMedia}/></ApplicationShell>;
 }finally{await client.end();}
}
