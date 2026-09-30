import type { Sql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { DomainError } from "@/server/shared/domain-error";
import { normalizeCatalogText, assertReferenceCode, assertCatalogMedia } from "./catalog-validation";
import { authorizeArtistAccess } from "./catalog-access";

function artistView(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    artisticName: String(row.artistic_name),
    civilName: row.civil_name ? String(row.civil_name) : null,
    bio: row.bio ? String(row.bio) : null,
    countryCode: row.country_code ? String(row.country_code) : null,
    languageCode: row.language_code ? String(row.language_code) : null,
    avatarMediaAssetId: row.avatar_media_asset_id ? String(row.avatar_media_asset_id) : null,
    status: String(row.status),
    accessLevel: row.access_level ? String(row.access_level) : null
  };
}

export async function listWorkspaceArtists(sql: Sql, input: { userId: string; workspaceId: string }) {
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"artist.view"});
  const rows=await sql.unsafe(
    "select a.id::text,a.artistic_name,a.civil_name,a.bio,a.country_code,a.language_code,a.avatar_media_asset_id::text,a.status::text,waa.access_level::text from workspace_artist_access waa join artists a on a.id=waa.artist_id where waa.workspace_id=$1::uuid order by a.normalized_artistic_name,a.id",
    [input.workspaceId]
  );
  return rows.map(r=>artistView(r as Record<string,unknown>));
}

export async function createArtist(sql: Sql,input:{
  userId:string;workspaceId:string;artisticName:string;civilName?:string|null;bio?:string|null;
  countryCode?:string|null;languageCode?:string|null;avatarMediaAssetId?:string|null;
}) {
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"artist.manage"});
  const artisticName=input.artisticName.trim();
  if(!artisticName)throw new DomainError("ARTIST_INVALID","Artist name is required",400);
  await assertReferenceCode(sql,"reference_countries",input.countryCode);
  await assertReferenceCode(sql,"reference_languages",input.languageCode);
  if(input.avatarMediaAssetId){
    await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"media.view"});
    await assertCatalogMedia(sql,{workspaceId:input.workspaceId,mediaAssetId:input.avatarMediaAssetId,kind:"IMAGE"});
  }
  return sql.begin(async tx=>{
    const rows=await tx.unsafe(
      "insert into artists(artistic_name,normalized_artistic_name,civil_name,normalized_civil_name,bio,country_code,language_code,avatar_media_asset_id) values($1,$2,$3,$4,$5,$6,$7,$8::uuid) returning id::text,artistic_name,civil_name,bio,country_code,language_code,avatar_media_asset_id::text,status::text",
      [artisticName,normalizeCatalogText(artisticName),input.civilName?.trim()||null,input.civilName?.trim()?normalizeCatalogText(input.civilName):null,input.bio?.trim()||null,input.countryCode||null,input.languageCode||null,input.avatarMediaAssetId||null]
    );
    const artist=rows[0] as Record<string,unknown>;
    await tx.unsafe("insert into workspace_artist_access(workspace_id,artist_id,access_level,granted_by_user_id) values($1::uuid,$2::uuid,'MANAGE',$3)",[input.workspaceId,String(artist.id),input.userId]);
    await tx.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values('USER',$1,$2::uuid,'artist.created','artist',$3,'API')",[input.userId,input.workspaceId,String(artist.id)]);
    return artistView({...artist,access_level:"MANAGE"});
  });
}

export async function updateArtist(sql:Sql,input:{
  userId:string;workspaceId:string;artistId:string;artisticName:string;civilName?:string|null;bio?:string|null;
  countryCode?:string|null;languageCode?:string|null;avatarMediaAssetId?:string|null;status?:"DRAFT"|"ACTIVE"|"ARCHIVED";
}){
  await authorizeArtistAccess(sql,{userId:input.userId,workspaceId:input.workspaceId,artistId:input.artistId,permission:"artist.manage",requireManage:true});
  await assertReferenceCode(sql,"reference_countries",input.countryCode);
  await assertReferenceCode(sql,"reference_languages",input.languageCode);
  if(input.avatarMediaAssetId){
    await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"media.view"});
    await assertCatalogMedia(sql,{workspaceId:input.workspaceId,mediaAssetId:input.avatarMediaAssetId,kind:"IMAGE"});
  }
  const name=input.artisticName.trim();
  if(!name)throw new DomainError("ARTIST_INVALID","Artist name is required",400);
  const rows=await sql.unsafe(
    "update artists set artistic_name=$2,normalized_artistic_name=$3,civil_name=$4,normalized_civil_name=$5,bio=$6,country_code=$7,language_code=$8,avatar_media_asset_id=$9::uuid,status=coalesce($10::artist_status,status),updated_at=now() where id=$1::uuid returning id::text,artistic_name,civil_name,bio,country_code,language_code,avatar_media_asset_id::text,status::text",
    [input.artistId,name,normalizeCatalogText(name),input.civilName?.trim()||null,input.civilName?.trim()?normalizeCatalogText(input.civilName):null,input.bio?.trim()||null,input.countryCode||null,input.languageCode||null,input.avatarMediaAssetId||null,input.status||null]
  );
  if(!rows[0])throw new DomainError("ARTIST_NOT_FOUND","Artist not found",404);
  await sql.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values('USER',$1,$2::uuid,'artist.updated','artist',$3,'API')",[input.userId,input.workspaceId,input.artistId]);
  return artistView({...rows[0],access_level:"MANAGE"} as Record<string,unknown>);
}

export async function revokeWorkspaceArtistAccess(sql:Sql,input:{userId:string;workspaceId:string;artistId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"artist.manage"});
  const rows=await sql.unsafe("delete from workspace_artist_access where workspace_id=$1::uuid and artist_id=$2::uuid returning artist_id::text",[input.workspaceId,input.artistId]);
  if(!rows[0])throw new DomainError("ARTIST_ACCESS_DENIED","Artist access not found",404);
  await sql.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values('USER',$1,$2::uuid,'artist.access.revoked','artist',$3,'API')",[input.userId,input.workspaceId,input.artistId]);
  return {artistId:input.artistId,revoked:true};
}
