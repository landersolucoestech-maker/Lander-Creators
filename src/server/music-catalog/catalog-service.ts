import type { Sql, TransactionSql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { DomainError } from "@/server/shared/domain-error";
import { authorizeArtistAccess, authorizeReleaseAccess, authorizeTrackAccess } from "./catalog-access";
import { assertCatalogMedia, assertMusicGenre, assertReferenceCode, normalizeCatalogText, normalizeIsrc, validateHttpsUrl } from "./catalog-validation";

type QueryExecutor = Sql | TransactionSql;

function urls(input:Record<string,unknown>){
  return {
    preSaveUrl:validateHttpsUrl(input.preSaveUrl as string|undefined),
    spotifyUrl:validateHttpsUrl(input.spotifyUrl as string|undefined),
    appleMusicUrl:validateHttpsUrl(input.appleMusicUrl as string|undefined),
    deezerUrl:validateHttpsUrl(input.deezerUrl as string|undefined),
    youtubeUrl:validateHttpsUrl(input.youtubeUrl as string|undefined)
  };
}

export async function listCatalog(sql:Sql,input:{userId:string;workspaceId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"music_catalog.view"});
  const releases=await sql.unsafe(
    "select r.id::text,r.primary_artist_id::text,r.title,r.type::text,r.release_date,r.status::text,a.artistic_name from releases r join artists a on a.id=r.primary_artist_id join workspace_artist_access waa on waa.artist_id=r.primary_artist_id and waa.workspace_id=$1::uuid order by r.release_date desc nulls last,r.title",
    [input.workspaceId]
  );
  const tracks=await sql.unsafe(
    "select t.id::text,t.release_id::text,t.title,t.track_number,t.version::text,t.duration_ms,t.isrc,t.explicit_content,t.audio_media_asset_id::text,r.primary_artist_id::text from tracks t join releases r on r.id=t.release_id join workspace_artist_access waa on waa.artist_id=r.primary_artist_id and waa.workspace_id=$1::uuid order by r.id,t.track_number",
    [input.workspaceId]
  );
  const segments=await sql.unsafe(
    "select ts.id::text,ts.track_id::text,ts.start_ms,ts.end_ms,ts.label,ts.recommended,ts.authorized from track_segments ts join tracks t on t.id=ts.track_id join releases r on r.id=t.release_id join workspace_artist_access waa on waa.artist_id=r.primary_artist_id and waa.workspace_id=$1::uuid order by ts.track_id,ts.start_ms",
    [input.workspaceId]
  );
  const credits=await sql.unsafe(
    "select tac.track_id::text,tac.artist_id::text,tac.role::text,tac.position,a.artistic_name from track_artist_credits tac join artists a on a.id=tac.artist_id join tracks t on t.id=tac.track_id join releases r on r.id=t.release_id join workspace_artist_access waa on waa.artist_id=r.primary_artist_id and waa.workspace_id=$1::uuid order by tac.track_id,tac.role,tac.position",
    [input.workspaceId]
  );
  return {releases,tracks,segments,credits};
}

export async function createRelease(sql:Sql,input:{
  userId:string;workspaceId:string;primaryArtistId:string;title:string;type:"SINGLE"|"EP"|"ALBUM";releaseDate?:string|null;
  languageCode?:string|null;genreTaxonomyValueId?:string|null;subgenreTaxonomyValueId?:string|null;artworkMediaAssetId?:string|null;
  upc?:string|null;preSaveUrl?:string|null;spotifyUrl?:string|null;appleMusicUrl?:string|null;deezerUrl?:string|null;youtubeUrl?:string|null;
}){
  await authorizeArtistAccess(sql,{userId:input.userId,workspaceId:input.workspaceId,artistId:input.primaryArtistId,permission:"music_catalog.manage",requireManage:true});
  const title=input.title.trim();if(!title)throw new DomainError("RELEASE_INVALID","Release title is required",400);
  await assertReferenceCode(sql,"reference_languages",input.languageCode);
  const genre=await assertMusicGenre(sql,input.genreTaxonomyValueId);
  const subgenre=await assertMusicGenre(sql,input.subgenreTaxonomyValueId,genre);
  if(input.artworkMediaAssetId){
    await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"media.view"});
    await assertCatalogMedia(sql,{workspaceId:input.workspaceId,mediaAssetId:input.artworkMediaAssetId,kind:"IMAGE"});
  }
  const link=urls(input as unknown as Record<string,unknown>);
  const rows=await sql.unsafe(
    "insert into releases(primary_artist_id,title,normalized_title,type,release_date,language_code,genre_taxonomy_value_id,subgenre_taxonomy_value_id,artwork_media_asset_id,upc,pre_save_url,spotify_url,apple_music_url,deezer_url,youtube_url) values($1::uuid,$2,$3,$4::release_type,$5::date,$6,$7::uuid,$8::uuid,$9::uuid,$10,$11,$12,$13,$14,$15) returning id::text,primary_artist_id::text,title,type::text,release_date,status::text",
    [input.primaryArtistId,title,normalizeCatalogText(title),input.type,input.releaseDate||null,input.languageCode||null,genre,subgenre,input.artworkMediaAssetId||null,input.upc?.trim()||null,link.preSaveUrl,link.spotifyUrl,link.appleMusicUrl,link.deezerUrl,link.youtubeUrl]
  );
  const row=rows[0] as Record<string,unknown>;
  await sql.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values('USER',$1,$2::uuid,'release.created','release',$3,'API')",[input.userId,input.workspaceId,String(row.id)]);
  return row;
}

async function assertCreditArtists(sql:QueryExecutor,input:{userId:string;workspaceId:string;artistIds:string[]}){
  for(const artistId of [...new Set(input.artistIds)]){
    await authorizeArtistAccess(sql,{userId:input.userId,workspaceId:input.workspaceId,artistId,permission:"artist.view"});
  }
}

export async function createTrack(sql:Sql,input:{
  userId:string;workspaceId:string;releaseId:string;title:string;trackNumber:number;primaryArtistIds:string[];featuredArtistIds?:string[];
  releaseDate?:string|null;languageCode?:string|null;genreTaxonomyValueId?:string|null;subgenreTaxonomyValueId?:string|null;
  explicitContent?:boolean|null;version?:"ORIGINAL"|"REMIX"|"ACOUSTIC"|"LIVE"|"SPED_UP"|"SLOWED"|"CLEAN"|"EXTENDED"|"RADIO_EDIT"|"OTHER";
  versionLabel?:string|null;durationMs?:number|null;isrc?:string|null;preSaveUrl?:string|null;spotifyUrl?:string|null;appleMusicUrl?:string|null;deezerUrl?:string|null;youtubeUrl?:string|null;notes?:string|null;audioMediaAssetId?:string|null;sourceTrackId?:string|null;
}){
  const releaseAccess=await authorizeReleaseAccess(sql,{userId:input.userId,workspaceId:input.workspaceId,releaseId:input.releaseId,manage:true});
  const title=input.title.trim();if(!title)throw new DomainError("TRACK_INVALID","Track title is required",400);
  if(!Number.isInteger(input.trackNumber)||input.trackNumber<1)throw new DomainError("TRACK_INVALID","Track number is invalid",400);
  if(input.durationMs!=null&&(!Number.isInteger(input.durationMs)||input.durationMs<0))throw new DomainError("DURATION_INVALID","Track duration is invalid",400);
  if(input.primaryArtistIds.length<1)throw new DomainError("PRIMARY_ARTIST_REQUIRED","At least one primary Artist is required",400);
  await assertCreditArtists(sql,{userId:input.userId,workspaceId:input.workspaceId,artistIds:[...input.primaryArtistIds,...(input.featuredArtistIds??[])]});
  await assertReferenceCode(sql,"reference_languages",input.languageCode);
  const genre=await assertMusicGenre(sql,input.genreTaxonomyValueId);
  const subgenre=await assertMusicGenre(sql,input.subgenreTaxonomyValueId,genre);
  const isrc=normalizeIsrc(input.isrc);
  const link=urls(input as unknown as Record<string,unknown>);
  if(input.audioMediaAssetId){
    await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"media.view"});
    await assertCatalogMedia(sql,{workspaceId:input.workspaceId,mediaAssetId:input.audioMediaAssetId,kind:"AUDIO"});
  }
  if(input.sourceTrackId)await authorizeTrackAccess(sql,{userId:input.userId,workspaceId:input.workspaceId,trackId:input.sourceTrackId});
  return sql.begin(async tx=>{
    const rows=await tx.unsafe(
      "insert into tracks(release_id,title,normalized_title,track_number,release_date,language_code,genre_taxonomy_value_id,subgenre_taxonomy_value_id,explicit_content,version,version_label,duration_ms,isrc,pre_save_url,spotify_url,apple_music_url,deezer_url,youtube_url,notes,audio_media_asset_id,source_track_id) values($1::uuid,$2,$3,$4,$5::date,$6,$7::uuid,$8::uuid,$9,$10::track_version,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::uuid,$21::uuid) returning id::text,release_id::text,title,track_number,version::text,duration_ms,isrc,audio_media_asset_id::text",
      [input.releaseId,title,normalizeCatalogText(title),input.trackNumber,input.releaseDate||null,input.languageCode||null,genre,subgenre,input.explicitContent??null,input.version??"ORIGINAL",input.versionLabel?.trim()||null,input.durationMs??null,isrc,link.preSaveUrl,link.spotifyUrl,link.appleMusicUrl,link.deezerUrl,link.youtubeUrl,input.notes?.trim()||null,input.audioMediaAssetId||null,input.sourceTrackId||null]
    );
    const track=rows[0] as Record<string,unknown>;
    let position=1;
    for(const artistId of input.primaryArtistIds){
      await tx.unsafe("insert into track_artist_credits(track_id,artist_id,role,position) values($1::uuid,$2::uuid,'PRIMARY_ARTIST',$3)",[String(track.id),artistId,position++]);
    }
    position=1;
    for(const artistId of input.featuredArtistIds??[]){
      await tx.unsafe("insert into track_artist_credits(track_id,artist_id,role,position) values($1::uuid,$2::uuid,'FEATURED_ARTIST',$3)",[String(track.id),artistId,position++]);
    }
    if(input.audioMediaAssetId){
      await tx.unsafe("update media_assets set visibility='PRIVATE',updated_at=now() where id=$1::uuid",[input.audioMediaAssetId]);
    }
    await tx.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,delta,origin) values('USER',$1,$2::uuid,'track.created','track',$3,$4::jsonb,'API')",[input.userId,input.workspaceId,String(track.id),JSON.stringify({releaseArtistId:releaseAccess.artistId})]);
    return track;
  });
}

export async function createTrackSegment(sql:Sql,input:{userId:string;workspaceId:string;trackId:string;startMs:number;endMs:number;label?:string|null;recommended?:boolean;authorized?:boolean}){
  await authorizeTrackAccess(sql,{userId:input.userId,workspaceId:input.workspaceId,trackId:input.trackId,manage:true});
  if(!Number.isInteger(input.startMs)||!Number.isInteger(input.endMs)||input.startMs<0||input.endMs<=input.startMs)throw new DomainError("TRACK_SEGMENT_INVALID","Track segment boundaries are invalid",400);
  const track=await sql.unsafe("select duration_ms from tracks where id=$1::uuid",[input.trackId]);
  const duration=track[0]?.duration_ms==null?null:Number(track[0].duration_ms);
  if(duration!=null&&input.endMs>duration)throw new DomainError("TRACK_SEGMENT_INVALID","Track segment exceeds Track duration",400);
  const rows=await sql.unsafe(
    "insert into track_segments(track_id,start_ms,end_ms,label,recommended,authorized) values($1::uuid,$2,$3,$4,$5,$6) returning id::text,track_id::text,start_ms,end_ms,label,recommended,authorized",
    [input.trackId,input.startMs,input.endMs,input.label?.trim()||null,input.recommended??false,input.authorized??false]
  );
  await sql.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,delta,origin) values('USER',$1,$2::uuid,'track_segment.created','track_segment',$3,$4::jsonb,'API')",[input.userId,input.workspaceId,String(rows[0].id),JSON.stringify({authorized:input.authorized??false,recommended:input.recommended??false})]);
  return rows[0];
}


export async function updateTrack(sql:Sql,input:{
  userId:string;workspaceId:string;trackId:string;title:string;trackNumber:number;
  explicitContent?:boolean|null;version?:"ORIGINAL"|"REMIX"|"ACOUSTIC"|"LIVE"|"SPED_UP"|"SLOWED"|"CLEAN"|"EXTENDED"|"RADIO_EDIT"|"OTHER";
  versionLabel?:string|null;durationMs?:number|null;isrc?:string|null;preSaveUrl?:string|null;spotifyUrl?:string|null;appleMusicUrl?:string|null;deezerUrl?:string|null;youtubeUrl?:string|null;notes?:string|null;audioMediaAssetId?:string|null;
}){
  await authorizeTrackAccess(sql,{userId:input.userId,workspaceId:input.workspaceId,trackId:input.trackId,manage:true});
  const title=input.title.trim();if(!title)throw new DomainError("TRACK_INVALID","Track title is required",400);
  if(!Number.isInteger(input.trackNumber)||input.trackNumber<1)throw new DomainError("TRACK_INVALID","Track number is invalid",400);
  if(input.durationMs!=null&&(!Number.isInteger(input.durationMs)||input.durationMs<0))throw new DomainError("DURATION_INVALID","Track duration is invalid",400);
  if(input.audioMediaAssetId){
    await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"media.view"});
    await assertCatalogMedia(sql,{workspaceId:input.workspaceId,mediaAssetId:input.audioMediaAssetId,kind:"AUDIO"});
  }
  const link=urls(input as unknown as Record<string,unknown>);
  const rows=await sql.unsafe(
    "update tracks set title=$2,normalized_title=$3,track_number=$4,explicit_content=$5,version=$6::track_version,version_label=$7,duration_ms=$8,isrc=$9,pre_save_url=$10,spotify_url=$11,apple_music_url=$12,deezer_url=$13,youtube_url=$14,notes=$15,audio_media_asset_id=$16::uuid,updated_at=now() where id=$1::uuid returning id::text,release_id::text,title,track_number,version::text,duration_ms,isrc,audio_media_asset_id::text",
    [input.trackId,title,normalizeCatalogText(title),input.trackNumber,input.explicitContent??null,input.version??"ORIGINAL",input.versionLabel?.trim()||null,input.durationMs??null,normalizeIsrc(input.isrc),link.preSaveUrl,link.spotifyUrl,link.appleMusicUrl,link.deezerUrl,link.youtubeUrl,input.notes?.trim()||null,input.audioMediaAssetId||null]
  );
  if(!rows[0])throw new DomainError("TRACK_NOT_FOUND","Track not found",404);
  if(input.audioMediaAssetId)await sql.unsafe("update media_assets set visibility='PRIVATE',updated_at=now() where id=$1::uuid",[input.audioMediaAssetId]);
  await sql.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values('USER',$1,$2::uuid,'track.updated','track',$3,'API')",[input.userId,input.workspaceId,input.trackId]);
  return rows[0];
}
