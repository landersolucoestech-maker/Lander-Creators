import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
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
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:session.user.id,name:session.user.name,email:session.user.email});
  const profile=await getCreatorProfileByUser(client,session.user.id);
  const[taxonomies,referenceData,attachableMedia]=await Promise.all([listTaxonomies(client),getReferenceData(client),listCreatorAttachableMedia(client,session.user.id)]);
  const relations=profile?await listCreatorTaxonomies(client,String((profile as Record<string,unknown>).id)):{niches:[],contentStyles:[],musicGenres:[]};
  const socials=profile?await listSocialProfiles(client,{userId:session.user.id,creatorProfileId:String((profile as Record<string,unknown>).id)}):[];
  const readiness=profile?await calculateCreatorReadiness(client,session.user.id):null;
  return <ApplicationShell state={state} navigation={creatorNavigation()} context="creator"><CreatorPanel profile={profile as never} taxonomies={taxonomies as never} referenceData={referenceData as never} relations={relations as never} socials={socials as never} readiness={readiness as never} attachableMedia={attachableMedia as never}/></ApplicationShell>;
 }finally{await client.end();}
}
