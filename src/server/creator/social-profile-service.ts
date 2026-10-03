import type { Sql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";
import { writeGlobalAudit } from "@/server/shared/audit";
import { requireCreatorOwner } from "./creator-service";

export type SocialPlatform="TIKTOK"|"INSTAGRAM"|"YOUTUBE";
const hosts:Record<SocialPlatform,string[]>={
  TIKTOK:["tiktok.com","www.tiktok.com"],
  INSTAGRAM:["instagram.com","www.instagram.com"],
  YOUTUBE:["youtube.com","www.youtube.com","youtu.be"]
};

export function normalizeHandle(value:string){
  return value.trim().replace(/^@/,"").toLowerCase();
}

function validateProfileUrl(platform:SocialPlatform,value?:string|null){
  if(!value)return null;
  let url:URL;
  try{url=new URL(value);}catch{throw new DomainError("SOCIAL_PROFILE_INVALID","Malformed social URL",400);}
  if(url.protocol!=="https:"||!hosts[platform].includes(url.hostname.toLowerCase())){
    throw new DomainError("SOCIAL_PROFILE_INVALID","Unsupported social URL",400);
  }
  return url.toString();
}

export async function addDeclaredSocialProfile(sql:Sql,input:{
  userId:string;creatorProfileId:string;platform:SocialPlatform;handle:string;profileUrl?:string|null;displayName?:string|null;
}){
  await requireCreatorOwner(sql,input);
  const normalized=normalizeHandle(input.handle);
  if(!normalized)throw new DomainError("SOCIAL_PROFILE_INVALID","Social handle required",400);
  const profileUrl=validateProfileUrl(input.platform,input.profileUrl);
  try{
    return await sql.begin(async tx=>{
      const rows=await tx.unsafe(
      "insert into social_profiles(creator_profile_id,platform,external_account_id,handle,normalized_handle,profile_url,display_name,provenance,connection_status) values($1::uuid,$2::social_platform,$3,$4,$5,$6,$7,'DECLARED','NOT_CONNECTED') returning id::text,creator_profile_id::text,platform::text,external_account_id,handle,normalized_handle,profile_url,display_name,provenance::text,connection_status::text,created_at,updated_at",
      [input.creatorProfileId,input.platform,null,input.handle.trim(),normalized,profileUrl,input.displayName?.trim()||null]
      );
      await writeGlobalAudit(tx,{actorId:input.userId,action:"creator.social_added",entityType:"social_profile",entityId:String((rows[0] as Record<string,unknown>).id),delta:{platform:input.platform,provenance:"DECLARED"}});
      return rows[0];
    });
  }catch(error){
    if(error instanceof DomainError)throw error;
    const message=error instanceof Error?error.message:"";
    if(message.includes("unique"))throw new DomainError("SOCIAL_PROFILE_ALREADY_LINKED","Social profile already linked",409);
    throw error;
  }
}

export type SocialProfileRow = {
  id: string;
  platform: string;
  external_account_id: string | null;
  handle: string;
  profile_url: string | null;
  display_name: string | null;
  provenance: string;
  connection_status: string;
  captured_at: Date | null;
  metrics_source: string | null;
  followers: string | null;
  following: string | null;
  total_likes: string | null;
  average_views: string | null;
  engagement_rate_basis_points: number | null;
};

export async function listSocialProfiles(sql:Sql,input:{userId:string;creatorProfileId:string}){
  await requireCreatorOwner(sql,input);
  return sql.unsafe<SocialProfileRow[]>(
    "select sp.id::text,sp.platform::text,sp.external_account_id,sp.handle,sp.profile_url,sp.display_name,sp.provenance::text,sp.connection_status::text,latest.captured_at,latest.source::text metrics_source,latest.followers,latest.following,latest.total_likes,latest.average_views,latest.engagement_rate_basis_points from social_profiles sp left join lateral(select * from social_metrics_snapshots sm where sm.social_profile_id=sp.id order by sm.captured_at desc limit 1) latest on true where sp.creator_profile_id=$1::uuid order by sp.created_at",
    [input.creatorProfileId]
  );
}

export async function removeSocialProfile(sql:Sql,input:{userId:string;creatorProfileId:string;socialProfileId:string}){
  await requireCreatorOwner(sql,input);
  await sql.begin(async tx=>{
    const rows=await tx.unsafe("delete from social_profiles where id=$1::uuid and creator_profile_id=$2::uuid returning id::text",[input.socialProfileId,input.creatorProfileId]);
    if(!rows[0])throw new DomainError("SOCIAL_PROFILE_NOT_FOUND","Social profile not found",404);
    await writeGlobalAudit(tx,{actorId:input.userId,action:"creator.social_removed",entityType:"social_profile",entityId:input.socialProfileId});
  });
  return {socialProfileId:input.socialProfileId};
}

export async function addManualMetricsSnapshot(sql:Sql,input:{
  userId:string;creatorProfileId:string;socialProfileId:string;capturedAt:Date;followers?:number|null;following?:number|null;totalLikes?:number|null;averageViews?:number|null;engagementRateBasisPoints?:number|null;
}){
  await requireCreatorOwner(sql,input);
  const owned=await sql.unsafe("select 1 from social_profiles where id=$1::uuid and creator_profile_id=$2::uuid",[input.socialProfileId,input.creatorProfileId]);
  if(!owned[0])throw new DomainError("SOCIAL_PROFILE_NOT_FOUND","Social profile not found",404);
  const rows=await sql.unsafe(
    "insert into social_metrics_snapshots(social_profile_id,captured_at,source,followers,following,total_likes,average_views,engagement_rate_basis_points) values($1::uuid,$2::timestamptz,'MANUAL_DECLARED',$3,$4,$5,$6,$7) returning id::text,captured_at,source::text,followers,following,total_likes,average_views,engagement_rate_basis_points",
    [input.socialProfileId,input.capturedAt.toISOString(),input.followers??null,input.following??null,input.totalLikes??null,input.averageViews??null,input.engagementRateBasisPoints??null]
  );
  return rows[0];
}
