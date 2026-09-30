import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { inviteWorkspaceMember, acceptWorkspaceInvitation } from "@/server/workspace/membership-service";
import { createCreatorProfile, updateCreatorProfile, requireCreatorOwner, addCreatorTaxonomyValue, calculateCreatorReadiness, submitCreatorProfileForReview, setCreatorAvailability, setMarketplaceVisibility } from "@/server/creator/creator-service";
import { addDeclaredSocialProfile, addManualMetricsSnapshot, listSocialProfiles, removeSocialProfile } from "@/server/creator/social-profile-service";
import { setCreatorAvatar } from "@/server/creator/creator-media-service";
import { uploadMediaAsset } from "@/server/media/media-service";
import { LocalEphemeralStorageAdapter } from "@/server/media/local-storage-adapter";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const sql=createTestSql();
async function user(email:string){const id=randomUUID();await sql.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true)',[id,"Creator Test",email]);await sql.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE')",[id]);return id;}
async function profile(userId:string){return createCreatorProfile(sql,{userId,displayName:"Creator Test",bio:"Bio segura",countryCode:"BR",languageCode:"pt-BR",timezoneCode:"America/Sao_Paulo",city:"Governador Valadares",region:"MG"});}
async function taxonomyId(code:string){const r=await sql.unsafe("select tv.id::text from taxonomy_values tv join taxonomy_definitions td on td.id=tv.taxonomy_definition_id where tv.code=$1 and tv.status='ACTIVE' limit 1",[code]);return String((r[0] as Record<string,unknown>).id);}

describe("Creator foundation",()=>{
 beforeEach(async()=>{await resetSecurityData(sql);});
 afterAll(async()=>{await sql.end();});

 it("creates one CreatorProfile per User and updates owned profile",async()=>{
  const u=await user("creator@example.com");const p=await profile(u);
  await expect(profile(u)).rejects.toMatchObject({code:"CREATOR_PROFILE_ALREADY_EXISTS"});
  const updated=await updateCreatorProfile(sql,{userId:u,creatorProfileId:String((p as Record<string,unknown>).id),displayName:"Novo Nome",bio:"Texto",countryCode:"BR",languageCode:"pt-BR",timezoneCode:"America/Sao_Paulo"});
  expect(updated).toMatchObject({display_name:"Novo Nome",status:"DRAFT",marketplace_visibility:"HIDDEN",availability:"AVAILABLE"});
 });

 it("enforces Creator ownership independently from Workspace ADMIN",async()=>{
  const owner=await user("owner@example.com");const admin=await user("admin@example.com");const p=await profile(owner);
  const workspace=await createWorkspace(sql,{userId:owner,name:"Agency",type:"AGENCY",idempotencyKey:"x"});
  const invitation=await inviteWorkspaceMember(sql,{actorUserId:owner,workspaceId:String(workspace.id),recipientEmail:"admin@example.com",roleCode:"ADMIN"});
  await acceptWorkspaceInvitation(sql,{userId:admin,token:invitation.token});
  await expect(requireCreatorOwner(sql,{userId:admin,creatorProfileId:String((p as Record<string,unknown>).id)})).rejects.toMatchObject({code:"CREATOR_PROFILE_ACCESS_DENIED"});
 });

 it("blocks cross-user Creator reads, mutations and social changes",async()=>{
  const a=await user("owner-a@example.com");
  const b=await user("owner-b@example.com");
  const pa=await profile(a);
  const pb=await profile(b);
  const aid=String((pa as Record<string,unknown>).id);
  const bid=String((pb as Record<string,unknown>).id);

  await expect(
    requireCreatorOwner(sql,{userId:a,creatorProfileId:bid})
  ).rejects.toMatchObject({code:"CREATOR_PROFILE_ACCESS_DENIED"});

  await expect(
    updateCreatorProfile(sql,{userId:a,creatorProfileId:bid,displayName:"Ataque",bio:"x",countryCode:"BR",languageCode:"pt-BR",timezoneCode:"America/Sao_Paulo"})
  ).rejects.toMatchObject({code:"CREATOR_PROFILE_ACCESS_DENIED"});

  await expect(
    addDeclaredSocialProfile(sql,{userId:a,creatorProfileId:bid,platform:"INSTAGRAM",handle:"foreign",profileUrl:"https://instagram.com/foreign"})
  ).rejects.toMatchObject({code:"CREATOR_PROFILE_ACCESS_DENIED"});

  const social=await addDeclaredSocialProfile(sql,{userId:b,creatorProfileId:bid,platform:"INSTAGRAM",handle:"owned",profileUrl:"https://instagram.com/owned"});
  await expect(
    removeSocialProfile(sql,{userId:a,creatorProfileId:bid,socialProfileId:String((social as Record<string,unknown>).id)})
  ).rejects.toMatchObject({code:"CREATOR_PROFILE_ACCESS_DENIED"});

  const own=await updateCreatorProfile(sql,{userId:a,creatorProfileId:aid,displayName:"Owner A",bio:"ok",countryCode:"BR",languageCode:"pt-BR",timezoneCode:"America/Sao_Paulo"});
  expect(own).toMatchObject({display_name:"Owner A"});
 });

 it("uses canonical taxonomies and rejects wrong/deprecated values",async()=>{
  const u=await user("tax@example.com");const p=await profile(u);const id=String((p as Record<string,unknown>).id);
  const niche=await taxonomyId("MUSIC");const style=await taxonomyId("TUTORIAL");const genre=await taxonomyId("POP");
  await addCreatorTaxonomyValue(sql,{userId:u,creatorProfileId:id,taxonomyValueId:niche,kind:"NICHE",primary:true});
  await addCreatorTaxonomyValue(sql,{userId:u,creatorProfileId:id,taxonomyValueId:niche,kind:"NICHE",primary:false});
  await addCreatorTaxonomyValue(sql,{userId:u,creatorProfileId:id,taxonomyValueId:style,kind:"CONTENT_STYLE"});
  await addCreatorTaxonomyValue(sql,{userId:u,creatorProfileId:id,taxonomyValueId:genre,kind:"MUSIC_GENRE"});
  const count=await sql.unsafe("select count(*)::int count from creator_profile_niches where creator_profile_id=$1::uuid",[id]);expect(Number((count[0] as Record<string,unknown>).count)).toBe(1);
  await expect(addCreatorTaxonomyValue(sql,{userId:u,creatorProfileId:id,taxonomyValueId:genre,kind:"NICHE"})).rejects.toMatchObject({code:"CREATOR_TAXONOMY_INVALID"});
  await sql.unsafe("update taxonomy_values set status='DEPRECATED' where id=$1::uuid",[style]);
  await expect(addCreatorTaxonomyValue(sql,{userId:u,creatorProfileId:id,taxonomyValueId:style,kind:"CONTENT_STYLE"})).rejects.toMatchObject({code:"TAXONOMY_VALUE_DEPRECATED"});
  await sql.unsafe("update taxonomy_values set status='ACTIVE' where id=$1::uuid",[style]);
 });

 it("keeps SocialProfile truthful, validates HTTPS/provider URL and stable external identity",async()=>{
  const a=await user("a@example.com");const b=await user("b@example.com");const pa=await profile(a);const pb=await profile(b);
  const aid=String((pa as Record<string,unknown>).id),bid=String((pb as Record<string,unknown>).id);
  await expect(addDeclaredSocialProfile(sql,{userId:a,creatorProfileId:aid,platform:"INSTAGRAM",handle:"@creator",profileUrl:"javascript:alert(1)"})).rejects.toMatchObject({code:"SOCIAL_PROFILE_INVALID"});
  const social=await addDeclaredSocialProfile(sql,{userId:a,creatorProfileId:aid,platform:"INSTAGRAM",handle:"@Creator",profileUrl:"https://instagram.com/creator"});
  expect(social).toMatchObject({provenance:"DECLARED",connection_status:"NOT_CONNECTED",normalized_handle:"creator",external_account_id:null});
  const sa=String((social as Record<string,unknown>).id);
  const other=await addDeclaredSocialProfile(sql,{userId:b,creatorProfileId:bid,platform:"INSTAGRAM",handle:"other",profileUrl:"https://instagram.com/other"});
  const sb=String((other as Record<string,unknown>).id);
  await sql.unsafe("update social_profiles set external_account_id='ig-123' where id=$1::uuid",[sa]);
  await expect(sql.unsafe("update social_profiles set external_account_id='ig-123' where id=$1::uuid",[sb])).rejects.toBeDefined();
 });

 it("stores metrics snapshots with manual provenance, timestamp and null unknowns",async()=>{
  const u=await user("metrics@example.com");const p=await profile(u);const id=String((p as Record<string,unknown>).id);
  const social=await addDeclaredSocialProfile(sql,{userId:u,creatorProfileId:id,platform:"YOUTUBE",handle:"channel",profileUrl:"https://youtube.com/@channel"});
  const capturedAt=new Date("2026-09-30T00:00:00Z");
  await addManualMetricsSnapshot(sql,{userId:u,creatorProfileId:id,socialProfileId:String((social as Record<string,unknown>).id),capturedAt,followers:1200,averageViews:null});
  const listed=await listSocialProfiles(sql,{userId:u,creatorProfileId:id});expect(listed[0]).toMatchObject({metrics_source:"MANUAL_DECLARED",followers:"1200",average_views:null});expect(new Date(String((listed[0] as Record<string,unknown>).captured_at)).toISOString()).toBe(capturedAt.toISOString());
 });

 it("calculates readiness and only submits explicitly for review",async()=>{
  const u=await user("ready@example.com");const p=await profile(u);const id=String((p as Record<string,unknown>).id);
  expect((await calculateCreatorReadiness(sql,u)).technicalReady).toBe(false);
  await expect(submitCreatorProfileForReview(sql,{userId:u,creatorProfileId:id})).rejects.toMatchObject({code:"CREATOR_PROFILE_INCOMPLETE"});
  await addCreatorTaxonomyValue(sql,{userId:u,creatorProfileId:id,taxonomyValueId:await taxonomyId("MUSIC"),kind:"NICHE",primary:true});
  await addDeclaredSocialProfile(sql,{userId:u,creatorProfileId:id,platform:"TIKTOK",handle:"ready",profileUrl:"https://tiktok.com/@ready"});
  const readiness=await calculateCreatorReadiness(sql,u);expect(readiness).toMatchObject({technicalReady:true,legalGate:"CREATOR_TERMS_GATE_DEFERRED"});
  expect(await submitCreatorProfileForReview(sql,{userId:u,creatorProfileId:id})).toMatchObject({status:"UNDER_REVIEW"});
  await expect(setMarketplaceVisibility(sql,{userId:u,creatorProfileId:id,visibility:"VISIBLE"})).rejects.toMatchObject({code:"CREATOR_NOT_MARKETPLACE_ELIGIBLE"});
 });

 it("keeps availability independent from lifecycle",async()=>{
  const u=await user("availability@example.com");const p=await profile(u);const id=String((p as Record<string,unknown>).id);
  expect(await setCreatorAvailability(sql,{userId:u,creatorProfileId:id,availability:"UNAVAILABLE"})).toMatchObject({availability:"UNAVAILABLE"});
  const row=await sql.unsafe("select status::text from creator_profiles where id=$1::uuid",[id]);expect((row[0] as Record<string,unknown>).status).toBe("DRAFT");
 });

 it("prevents foreign Creator media attachment while reusing Shared Media",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"creator-media-"));try{
   const a=await user("media-a@example.com");const b=await user("media-b@example.com");const pa=await profile(a);const pb=await profile(b);
   const workspace=await createWorkspace(sql,{userId:a,name:"Media",type:"AGENCY",idempotencyKey:"media"});const storage=new LocalEphemeralStorageAdapter(root);
   const png=Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082","hex");
   const media=await uploadMediaAsset(sql,storage,{userId:a,workspaceId:String(workspace.id),originalFileName:"avatar.png",declaredMime:"image/png",bytes:png});
   await expect(setCreatorAvatar(sql,{userId:b,creatorProfileId:String((pb as Record<string,unknown>).id),mediaAssetId:media.id})).rejects.toMatchObject({code:"CREATOR_MEDIA_ACCESS_DENIED"});
   expect(await setCreatorAvatar(sql,{userId:a,creatorProfileId:String((pa as Record<string,unknown>).id),mediaAssetId:media.id})).toMatchObject({avatar_media_asset_id:media.id});
  }finally{await rm(root,{recursive:true,force:true});}
 });
});
