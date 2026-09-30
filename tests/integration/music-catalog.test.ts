import { randomUUID } from "node:crypto";
import { afterAll,beforeEach,describe,expect,it } from "vitest";
import { createTestSql,resetSecurityData } from "./test-db";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { inviteWorkspaceMember,acceptWorkspaceInvitation } from "@/server/workspace/membership-service";
import { createArtist,listWorkspaceArtists,revokeWorkspaceArtistAccess } from "@/server/music-catalog/artist-service";
import { authorizeArtistAccess,authorizeReleaseAccess,authorizeTrackAccess } from "@/server/music-catalog/catalog-access";
import { createRelease,createTrack,createTrackSegment,updateTrack } from "@/server/music-catalog/catalog-service";
import { uploadMediaAsset,readMediaAsset,archiveMediaAsset } from "@/server/media/media-service";
import { LocalEphemeralStorageAdapter } from "@/server/media/local-storage-adapter";
import { mkdtemp,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const sql=createTestSql();
async function user(email:string){const id=randomUUID();await sql.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true)',[id,"Catalog Test",email]);await sql.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE')",[id]);return id;}
async function setup(email="owner@catalog.test"){const userId=await user(email);const w=await createWorkspace(sql,{userId,name:"Catalog",type:"LABEL",idempotencyKey:email});return{userId,workspaceId:String(w.id)};}
async function genre(code="POP"){const r=await sql.unsafe("select tv.id::text from taxonomy_values tv where tv.code=$1 limit 1",[code]);return String(r[0].id);}

describe("Artist and Music Catalog foundation",()=>{
 beforeEach(async()=>{await resetSecurityData(sql);});
 afterAll(async()=>{await sql.end();});

 it("creates global Artist with explicit Workspace access and blocks unassigned Workspace",async()=>{
  const a=await setup("a@catalog.test");const b=await setup("b@catalog.test");
  const artist=await createArtist(sql,{userId:a.userId,workspaceId:a.workspaceId,artisticName:"Artista Um",civilName:"Nome Civil",countryCode:"BR",languageCode:"pt-BR"});
  expect((await listWorkspaceArtists(sql,a))[0]).toMatchObject({artisticName:"Artista Um",accessLevel:"MANAGE"});
  await expect(authorizeArtistAccess(sql,{userId:b.userId,workspaceId:b.workspaceId,artistId:String(artist.id),permission:"artist.view"})).rejects.toMatchObject({code:"ARTIST_ACCESS_DENIED"});
  const release=await createRelease(sql,{userId:a.userId,workspaceId:a.workspaceId,primaryArtistId:String(artist.id),title:"Privado",type:"SINGLE"});
  await expect(authorizeReleaseAccess(sql,{userId:b.userId,workspaceId:b.workspaceId,releaseId:String(release.id)})).rejects.toMatchObject({code:"ARTIST_ACCESS_DENIED"});
  await expect(createRelease(sql,{userId:b.userId,workspaceId:b.workspaceId,primaryArtistId:String(artist.id),title:"Ataque",type:"SINGLE"})).rejects.toMatchObject({code:"ARTIST_ACCESS_DENIED"});
 });

 it("requires both Workspace permission and Artist relationship",async()=>{
  const owner=await setup("owner@catalog.test");const viewer=await user("viewer@catalog.test");
  const artist=await createArtist(sql,{userId:owner.userId,workspaceId:owner.workspaceId,artisticName:"Artista"});
  const invite=await inviteWorkspaceMember(sql,{actorUserId:owner.userId,workspaceId:owner.workspaceId,recipientEmail:"viewer@catalog.test",roleCode:"VIEWER"});
  await acceptWorkspaceInvitation(sql,{userId:viewer,token:invite.token});
  await sql.unsafe("insert into workspace_artist_access(workspace_id,artist_id,access_level,granted_by_user_id) values($1::uuid,$2::uuid,'VIEW',$3) on conflict do nothing",[owner.workspaceId,String(artist.id),owner.userId]);
  await expect(authorizeArtistAccess(sql,{userId:viewer,workspaceId:owner.workspaceId,artistId:String(artist.id),permission:"artist.view"})).rejects.toMatchObject({code:"MISSING_PERMISSION"});
 });

 it("creates Release, ordered Artist credits, Track versions and valid TrackSegments",async()=>{
  const x=await setup();const main=await createArtist(sql,{userId:x.userId,workspaceId:x.workspaceId,artisticName:"Main"});const feat=await createArtist(sql,{userId:x.userId,workspaceId:x.workspaceId,artisticName:"Feat"});
  const release=await createRelease(sql,{userId:x.userId,workspaceId:x.workspaceId,primaryArtistId:String(main.id),title:"Meu Single",type:"SINGLE",languageCode:"pt-BR",genreTaxonomyValueId:await genre()});
  const track=await createTrack(sql,{userId:x.userId,workspaceId:x.workspaceId,releaseId:String(release.id),title:"Minha Música",trackNumber:1,primaryArtistIds:[String(main.id)],featuredArtistIds:[String(feat.id)],version:"REMIX",durationMs:180000,explicitContent:false,isrc:"BRABC2600001"});
  const credits=await sql.unsafe("select role::text,position,artist_id::text from track_artist_credits where track_id=$1::uuid order by role,position",[String(track.id)]);
  expect(credits).toHaveLength(2);expect(credits.some(r=>r.role==="PRIMARY_ARTIST"&&Number(r.position)===1)).toBe(true);expect(credits.some(r=>r.role==="FEATURED_ARTIST"&&Number(r.position)===1)).toBe(true);
  expect(await createTrackSegment(sql,{userId:x.userId,workspaceId:x.workspaceId,trackId:String(track.id),startMs:15000,endMs:30000,label:"Refrão",recommended:true,authorized:false})).toMatchObject({recommended:true,authorized:false});
  await expect(createTrackSegment(sql,{userId:x.userId,workspaceId:x.workspaceId,trackId:String(track.id),startMs:170000,endMs:190000})).rejects.toMatchObject({code:"TRACK_SEGMENT_INVALID"});
  expect(await updateTrack(sql,{userId:x.userId,workspaceId:x.workspaceId,trackId:String(track.id),title:"Minha Música Editada",trackNumber:1,version:"RADIO_EDIT",durationMs:179000,isrc:"BRABC2600001"})).toMatchObject({title:"Minha Música Editada",version:"RADIO_EDIT"});
 });

 it("rejects guessed Track after Artist access revocation",async()=>{
  const x=await setup();const artist=await createArtist(sql,{userId:x.userId,workspaceId:x.workspaceId,artisticName:"Revogado"});const release=await createRelease(sql,{userId:x.userId,workspaceId:x.workspaceId,primaryArtistId:String(artist.id),title:"Album",type:"ALBUM"});const track=await createTrack(sql,{userId:x.userId,workspaceId:x.workspaceId,releaseId:String(release.id),title:"Faixa",trackNumber:1,primaryArtistIds:[String(artist.id)]});
  await revokeWorkspaceArtistAccess(sql,{userId:x.userId,workspaceId:x.workspaceId,artistId:String(artist.id)});
  await expect(authorizeTrackAccess(sql,{userId:x.userId,workspaceId:x.workspaceId,trackId:String(track.id)})).rejects.toMatchObject({code:"ARTIST_ACCESS_DENIED"});
 });

 it("protects Track audio even when generic Media ID is guessed",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"catalog-audio-"));try{
    const owner=await setup("audio-owner@test");const viewer=await user("audio-viewer@test");
    const invite=await inviteWorkspaceMember(sql,{actorUserId:owner.userId,workspaceId:owner.workspaceId,recipientEmail:"audio-viewer@test",roleCode:"VIEWER"});await acceptWorkspaceInvitation(sql,{userId:viewer,token:invite.token});
    const artist=await createArtist(sql,{userId:owner.userId,workspaceId:owner.workspaceId,artisticName:"Audio Artist"});
    const storage=new LocalEphemeralStorageAdapter(root);const wav=Buffer.concat([Buffer.from("RIFF"),Buffer.alloc(4),Buffer.from("WAVEfmt "),Buffer.alloc(24)]);
    const media=await uploadMediaAsset(sql,storage,{userId:owner.userId,workspaceId:owner.workspaceId,originalFileName:"master.wav",declaredMime:"audio/wav",bytes:wav,visibility:"WORKSPACE_AVAILABLE"});
    const release=await createRelease(sql,{userId:owner.userId,workspaceId:owner.workspaceId,primaryArtistId:String(artist.id),title:"Audio",type:"SINGLE"});
    await createTrack(sql,{userId:owner.userId,workspaceId:owner.workspaceId,releaseId:String(release.id),title:"Audio",trackNumber:1,primaryArtistIds:[String(artist.id)],audioMediaAssetId:media.id});
    const row=await sql.unsafe("select visibility::text from media_assets where id=$1::uuid",[media.id]);expect(row[0].visibility).toBe("PRIVATE");
    await expect(readMediaAsset(sql,storage,{userId:viewer,workspaceId:owner.workspaceId,mediaAssetId:media.id})).rejects.toMatchObject({code:"MISSING_PERMISSION"});
    expect((await readMediaAsset(sql,storage,{userId:owner.userId,workspaceId:owner.workspaceId,mediaAssetId:media.id})).bytes.length).toBeGreaterThan(0);
    await archiveMediaAsset(sql,storage,{userId:owner.userId,workspaceId:owner.workspaceId,mediaAssetId:media.id});
    await expect(readMediaAsset(sql,storage,{userId:owner.userId,workspaceId:owner.workspaceId,mediaAssetId:media.id})).rejects.toMatchObject({code:"MEDIA_NOT_FOUND"});
  }finally{await rm(root,{recursive:true,force:true});}
 });
});
