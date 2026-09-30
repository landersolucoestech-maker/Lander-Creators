import { createHash } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { authorizeWorkspacePermission } from "@/server/authorization/authorization-service";
import { DomainError } from "@/server/shared/domain-error";
import { MUSIC_IMPORT_HEADERS, parseMusicCatalogXlsx } from "./xlsx";
import { normalizeCatalogText, normalizeIsrc, parseDurationText, validateHttpsUrl } from "./catalog-validation";

type QueryExecutor=Sql|TransactionSql;
type ArtistResolution={name:string;normalizedName:string;kind:"EXISTING"|"NEW"|"POSSIBLE_DUPLICATE";artistId?:string;candidates?:{id:string;artisticName:string}[]};
type NormalizedRow={
  trackTitle:string;releaseTitle:string;releaseType:"SINGLE"|"EP"|"ALBUM";trackNumber:number;
  primaryArtists:ArtistResolution[];featuredArtists:ArtistResolution[];releaseDate:string|null;languageCode:string|null;
  genreTaxonomyValueId:string|null;subgenreTaxonomyValueId:string|null;explicitContent:boolean|null;version:string;versionLabel:string|null;
  durationMs:number|null;isrc:string|null;preSaveUrl:string|null;spotifyUrl:string|null;appleMusicUrl:string|null;deezerUrl:string|null;youtubeUrl:string|null;notes:string|null;
  existingTrackId?:string|null;existingReleaseId?:string|null;
};
const releaseLabels:Record<string,"SINGLE"|"EP"|"ALBUM">={"single":"SINGLE","ep":"EP","álbum":"ALBUM","album":"ALBUM"};
const versionLabels:Record<string,string>={
  "":"ORIGINAL","original":"ORIGINAL","remix":"REMIX","acústica":"ACOUSTIC","acustica":"ACOUSTIC","ao vivo":"LIVE",
  "acelerada":"SPED_UP","sped up":"SPED_UP","desacelerada":"SLOWED","slowed":"SLOWED","clean":"CLEAN",
  "estendida":"EXTENDED","extended":"EXTENDED","radio edit":"RADIO_EDIT","edição de rádio":"RADIO_EDIT","edicao de radio":"RADIO_EDIT"
};
function rowHash(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
function jsonValue<T>(value:unknown):T{
  if(typeof value==="string")return JSON.parse(value) as T;
  return value as T;
}
function fileHash(bytes:Buffer){return createHash("sha256").update(bytes).digest("hex");}
function splitArtists(value:string){return value.split(";").map(x=>x.trim()).filter(Boolean);}
function parseExplicit(value:string){
  if(!value)return null;
  const v=normalizeCatalogText(value);
  if(v==="sim")return true;if(v==="nao")return false;
  throw new DomainError("MUSIC_IMPORT_INVALID","Explicit flag is invalid",400);
}
function normalizeDate(value:string){
  if(!value)return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  if(/^\d+(?:\.\d+)?$/.test(value)){
    const serial=Math.floor(Number(value));if(serial<1||serial>100000)throw new DomainError("MUSIC_IMPORT_INVALID","Release date is invalid",400);
    const d=new Date(Date.UTC(1899,11,30)+serial*86400000);return d.toISOString().slice(0,10);
  }
  const pt=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(pt){const iso=`${pt[3]}-${pt[2]}-${pt[1]}`;const d=new Date(iso+"T00:00:00Z");if(!Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===iso)return iso;}
  throw new DomainError("MUSIC_IMPORT_INVALID","Release date is invalid",400);
}
async function resolveLanguage(sql:QueryExecutor,label:string){
  if(!label)return null;
  const normalized=normalizeCatalogText(label);
  const rows=await sql.unsafe("select code,display_name_pt_br from reference_languages where active=true");
  const row=rows.find(r=>String(r.code).toLowerCase()===label.toLowerCase()||normalizeCatalogText(String(r.display_name_pt_br))===normalized);
  if(!row)throw new DomainError("LANGUAGE_INVALID","Language is invalid",400);
  return String(row.code);
}
async function resolveGenre(sql:QueryExecutor,label:string,parentId?:string|null){
  if(!label)return null;
  const normalized=normalizeCatalogText(label);
  const rows=await sql.unsafe(
    "select tv.id::text,tv.parent_id::text,tv.display_label_pt_br,ta.normalized_alias from taxonomy_values tv join taxonomy_definitions td on td.id=tv.taxonomy_definition_id left join taxonomy_aliases ta on ta.taxonomy_value_id=tv.id where td.code='MUSIC_GENRE' and tv.status='ACTIVE'"
  );
  const candidates=rows.filter(r=>normalizeCatalogText(String(r.display_label_pt_br))===normalized||normalizeCatalogText(String(r.normalized_alias??""))===normalized);
  const row=parentId?candidates.find(r=>String(r.parent_id??"")===parentId):candidates.find(r=>!r.parent_id)??candidates[0];
  if(!row)throw new DomainError("GENRE_INVALID","Genre is invalid",400);
  return String(row.id);
}
async function classifyArtist(sql:QueryExecutor,workspaceId:string,name:string):Promise<ArtistResolution>{
  const normalizedName=normalizeCatalogText(name);
  const assigned=await sql.unsafe(
    "select a.id::text,a.artistic_name from artists a join workspace_artist_access waa on waa.artist_id=a.id where waa.workspace_id=$1::uuid and a.normalized_artistic_name=$2",
    [workspaceId,normalizedName]
  );
  if(assigned.length===1)return{name,normalizedName,kind:"EXISTING",artistId:String(assigned[0].id)};
  if(assigned.length>1)return{name,normalizedName,kind:"POSSIBLE_DUPLICATE",candidates:assigned.map(r=>({id:String(r.id),artisticName:String(r.artistic_name)}))};
  const global=await sql.unsafe("select id::text,artistic_name from artists where normalized_artistic_name=$1",[normalizedName]);
  if(global.length)return{name,normalizedName,kind:"POSSIBLE_DUPLICATE",candidates:global.map(r=>({id:String(r.id),artisticName:String(r.artistic_name)}))};
  return{name,normalizedName,kind:"NEW"};
}
async function normalizeRow(sql:QueryExecutor,workspaceId:string,row:{rowNumber:number;values:Record<string,string>}){
  const v=row.values;const errors:string[]=[];
  const trackTitle=v["Música"]?.trim();if(!trackTitle)errors.push("TRACK_TITLE_REQUIRED");
  const releaseType=releaseLabels[normalizeCatalogText(v["Tipo de Lançamento"]??"")];if(!releaseType)errors.push("RELEASE_TYPE_INVALID");
  const primaryNames=splitArtists(v["Artista Principal"]??"");if(!primaryNames.length)errors.push("PRIMARY_ARTIST_REQUIRED");
  let releaseTitle=(v["Nome do Lançamento"]??"").trim();
  let trackNumber=Number((v["Número da Faixa"]??"").trim());
  if(releaseType==="SINGLE"){if(!releaseTitle)releaseTitle=trackTitle||"";if(!Number.isInteger(trackNumber)||trackNumber<1)trackNumber=1;}
  if(releaseType==="EP"||releaseType==="ALBUM"){if(!releaseTitle)errors.push("RELEASE_TITLE_REQUIRED");if(!Number.isInteger(trackNumber)||trackNumber<1)errors.push("TRACK_NUMBER_REQUIRED");}
  let releaseDate:null|string=null,languageCode:null|string=null,genreId:null|string=null,subgenreId:null|string=null,explicitContent:boolean|null=null,durationMs:number|null=null,isrc:string|null=null;
  let preSaveUrl:string|null=null,spotifyUrl:string|null=null,appleMusicUrl:string|null=null,deezerUrl:string|null=null,youtubeUrl:string|null=null;
  try{releaseDate=normalizeDate(v["Data de Lançamento"]??"");}catch{errors.push("RELEASE_DATE_INVALID");}
  try{languageCode=await resolveLanguage(sql,v["Idioma"]??"");}catch{errors.push("LANGUAGE_INVALID");}
  try{genreId=await resolveGenre(sql,v["Gênero"]??"");}catch{if(v["Gênero"])errors.push("GENRE_INVALID");}
  try{subgenreId=await resolveGenre(sql,v["Subgênero"]??"",genreId);}catch{if(v["Subgênero"])errors.push("GENRE_INVALID");}
  try{explicitContent=parseExplicit(v["Explícita"]??"");}catch{errors.push("EXPLICIT_INVALID");}
  try{durationMs=parseDurationText(v["Duração"]??"");}catch{errors.push("DURATION_INVALID");}
  try{isrc=normalizeIsrc(v["ISRC"]??"");}catch{errors.push("ISRC_INVALID");}
  for(const [key,target] of [["Pré-save","preSaveUrl"],["Spotify","spotifyUrl"],["Apple Music","appleMusicUrl"],["Deezer","deezerUrl"],["YouTube","youtubeUrl"]] as const){
    try{const value=validateHttpsUrl(v[key]??"");if(target==="preSaveUrl")preSaveUrl=value;if(target==="spotifyUrl")spotifyUrl=value;if(target==="appleMusicUrl")appleMusicUrl=value;if(target==="deezerUrl")deezerUrl=value;if(target==="youtubeUrl")youtubeUrl=value;}catch{errors.push("URL_INVALID");}
  }
  const versionInput=normalizeCatalogText(v["Versão"]??"");const version=versionLabels[versionInput]??(versionInput?"OTHER":"ORIGINAL");
  const versionLabel=version==="OTHER"?(v["Versão"]??"").trim()||null:null;
  const primaryArtists=await Promise.all(primaryNames.map(name=>classifyArtist(sql,workspaceId,name)));
  const featuredArtists=await Promise.all(splitArtists(v["Participação / Feat"]??"").map(name=>classifyArtist(sql,workspaceId,name)));
  let existingTrackId:null|string=null,existingReleaseId:null|string=null;
  if(isrc){
    const matches=await sql.unsafe("select t.id::text,t.title,r.id::text as release_id,r.title as release_title from tracks t join releases r on r.id=t.release_id where t.isrc=$1",[isrc]);
    if(matches.length===1){
      const m=matches[0];const sameTitle=normalizeCatalogText(String(m.title))===normalizeCatalogText(trackTitle||"");
      if(sameTitle){existingTrackId=String(m.id);existingReleaseId=String(m.release_id);}else errors.push("ISRC_CONFLICT");
    }else if(matches.length>1)errors.push("ISRC_CONFLICT");
  }
  const normalized:NormalizedRow={trackTitle:trackTitle||"",releaseTitle,releaseType:releaseType??"SINGLE",trackNumber:Number.isInteger(trackNumber)&&trackNumber>0?trackNumber:1,primaryArtists,featuredArtists,releaseDate,languageCode,genreTaxonomyValueId:genreId,subgenreTaxonomyValueId:subgenreId,explicitContent,version,versionLabel,durationMs,isrc,preSaveUrl,spotifyUrl,appleMusicUrl,deezerUrl,youtubeUrl,notes:(v["Observações"]??"").trim()||null,existingTrackId,existingReleaseId};
  const possible=primaryArtists.concat(featuredArtists).some(a=>a.kind==="POSSIBLE_DUPLICATE")||errors.includes("ISRC_CONFLICT");
  return{rowNumber:row.rowNumber,normalized,errors,classification:errors.length?"INVALID":possible?"POSSIBLE_DUPLICATE":existingTrackId?"EXISTING":"NEW" as const};
}

export async function previewMusicCatalogImport(sql:Sql,input:{userId:string;workspaceId:string;sourceFilename:string;bytes:Buffer}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"music_catalog.import"});
  const parsed=parseMusicCatalogXlsx(input.bytes);
  const fingerprint=fileHash(input.bytes);
  const existing=await sql.unsafe("select id::text,status::text from music_import_sessions where workspace_id=$1::uuid and source_fingerprint=$2",[input.workspaceId,fingerprint]);
  if(existing[0]){
    const rows=await getMusicCatalogImport(sql,{userId:input.userId,workspaceId:input.workspaceId,sessionId:String(existing[0].id)});
    return rows;
  }
  const normalized: Awaited<ReturnType<typeof normalizeRow>>[]=[];for(const row of parsed)normalized.push(await normalizeRow(sql,input.workspaceId,row));
  const status=normalized.some(r=>r.classification==="INVALID"||r.classification==="POSSIBLE_DUPLICATE")?"RESOLUTION_REQUIRED":"READY";
  return sql.begin(async tx=>{
    const s=await tx.unsafe("insert into music_import_sessions(workspace_id,created_by_user_id,source_filename,source_fingerprint,status,row_count) values($1::uuid,$2,$3,$4,$5::music_import_status,$6) returning id::text,status::text,source_filename,row_count",[input.workspaceId,input.userId,input.sourceFilename,fingerprint,status,normalized.length]);
    const session=s[0];
    for(const row of normalized)await tx.unsafe(
      "insert into music_import_rows(session_id,row_number,row_fingerprint,classification,normalized_data,error_codes) values($1::uuid,$2,$3,$4::music_import_row_class,$5::jsonb,$6::jsonb)",
      [String(session.id),row.rowNumber,rowHash(row.normalized),row.classification,JSON.stringify(row.normalized),JSON.stringify(row.errors)]
    );
    return getMusicCatalogImport(tx as TransactionSql,{userId:input.userId,workspaceId:input.workspaceId,sessionId:String(session.id)});
  });
}

export async function getMusicCatalogImport(sql:QueryExecutor,input:{userId:string;workspaceId:string;sessionId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"music_catalog.import"});
  const s=await sql.unsafe("select id::text,source_filename,status::text,row_count,created_at,imported_at from music_import_sessions where id=$1::uuid and workspace_id=$2::uuid",[input.sessionId,input.workspaceId]);
  if(!s[0])throw new DomainError("MUSIC_IMPORT_INVALID","Import session not found",404);
  const rows=await sql.unsafe("select id::text,row_number,classification::text,normalized_data,error_codes,resolution,created_entity_ids from music_import_rows where session_id=$1::uuid order by row_number",[input.sessionId]);
  return{session:s[0],rows:rows.map(row=>({
    id:String(row.id),
    row_number:Number(row.row_number),
    classification:String(row.classification),
    normalized_data:jsonValue<NormalizedRow>(row.normalized_data),
    error_codes:jsonValue<string[]>(row.error_codes),
    resolution:row.resolution==null?null:jsonValue<Record<string,unknown>>(row.resolution),
    created_entity_ids:row.created_entity_ids==null?null:jsonValue<Record<string,unknown>>(row.created_entity_ids)
  }))};
}

export async function resolveMusicImportRow(sql:Sql,input:{userId:string;workspaceId:string;sessionId:string;rowId:string;artistResolutions:Record<string,string>}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"music_catalog.import"});
  const rows=await sql.unsafe("select mir.normalized_data from music_import_rows mir join music_import_sessions mis on mis.id=mir.session_id where mir.id=$1::uuid and mis.id=$2::uuid and mis.workspace_id=$3::uuid",[input.rowId,input.sessionId,input.workspaceId]);
  if(!rows[0])throw new DomainError("MUSIC_IMPORT_INVALID","Import row not found",404);
  const data=jsonValue<NormalizedRow>(rows[0].normalized_data);
  for(const artist of [...data.primaryArtists,...data.featuredArtists]){
    if(artist.kind==="POSSIBLE_DUPLICATE"){
      const choice=input.artistResolutions[artist.normalizedName];
      if(!choice)throw new DomainError("MUSIC_IMPORT_DUPLICATE_RESOLUTION_REQUIRED","Artist duplicate resolution is required",409);
      if(choice!=="CREATE_NEW"&&!artist.candidates?.some(c=>c.id===choice))throw new DomainError("MUSIC_IMPORT_INVALID","Artist resolution is invalid",400);
    }
  }
  await sql.unsafe("update music_import_rows set resolution=$2::jsonb,classification='NEW' where id=$1::uuid",[input.rowId,JSON.stringify({artistResolutions:input.artistResolutions})]);
  const unresolved=await sql.unsafe("select count(*)::int as count from music_import_rows where session_id=$1::uuid and classification in ('INVALID','POSSIBLE_DUPLICATE')",[input.sessionId]);
  await sql.unsafe("update music_import_sessions set status=case when $2::int=0 then 'READY'::music_import_status else 'RESOLUTION_REQUIRED'::music_import_status end,updated_at=now() where id=$1::uuid",[input.sessionId,Number(unresolved[0].count)]);
  return getMusicCatalogImport(sql,input);
}
async function resolveArtistId(tx:TransactionSql,input:{workspaceId:string;userId:string;artist:ArtistResolution;resolution?:Record<string,string>}){
  if(input.artist.kind==="EXISTING"&&input.artist.artistId)return input.artist.artistId;
  if(input.artist.kind==="POSSIBLE_DUPLICATE"){
    const choice=input.resolution?.[input.artist.normalizedName];
    if(!choice)throw new DomainError("MUSIC_IMPORT_DUPLICATE_RESOLUTION_REQUIRED","Artist duplicate resolution is required",409);
    if(choice!=="CREATE_NEW"){
      const candidate=input.artist.candidates?.find(c=>c.id===choice);if(!candidate)throw new DomainError("MUSIC_IMPORT_INVALID","Artist resolution is invalid",400);
      await tx.unsafe("insert into workspace_artist_access(workspace_id,artist_id,access_level,granted_by_user_id) values($1::uuid,$2::uuid,'MANAGE',$3) on conflict(workspace_id,artist_id) do update set access_level='MANAGE',updated_at=now()",[input.workspaceId,choice,input.userId]);
      return choice;
    }
  }
  const created=await tx.unsafe("insert into artists(artistic_name,normalized_artistic_name,status) values($1,$2,'DRAFT') returning id::text",[input.artist.name,input.artist.normalizedName]);
  const id=String(created[0].id);await tx.unsafe("insert into workspace_artist_access(workspace_id,artist_id,access_level,granted_by_user_id) values($1::uuid,$2::uuid,'MANAGE',$3)",[input.workspaceId,id,input.userId]);return id;
}
export async function confirmMusicCatalogImport(sql:Sql,input:{userId:string;workspaceId:string;sessionId:string}){
  await authorizeWorkspacePermission(sql,{userId:input.userId,workspaceId:input.workspaceId,permission:"music_catalog.import"});
  return sql.begin(async tx=>{
    const sessions=await tx.unsafe("select status::text from music_import_sessions where id=$1::uuid and workspace_id=$2::uuid for update",[input.sessionId,input.workspaceId]);
    if(!sessions[0])throw new DomainError("MUSIC_IMPORT_INVALID","Import session not found",404);
    if(sessions[0].status==="IMPORTED")return getMusicCatalogImport(tx,input);
    if(sessions[0].status!=="READY")throw new DomainError("MUSIC_IMPORT_DUPLICATE_RESOLUTION_REQUIRED","Import is not ready for confirmation",409);
    const rows=await tx.unsafe("select id::text,row_number,classification::text,normalized_data,resolution,created_entity_ids from music_import_rows where session_id=$1::uuid order by row_number for update",[input.sessionId]);
    const releaseCache=new Map<string,string>();
    for(const row of rows){
      if(row.created_entity_ids)continue;
      const data=jsonValue<NormalizedRow>(row.normalized_data);const resolution=(row.resolution==null?null:jsonValue<{artistResolutions?:Record<string,string>}>(row.resolution))?.artistResolutions;
      if(data.existingTrackId){await tx.unsafe("update music_import_rows set created_entity_ids=$2::jsonb where id=$1::uuid",[String(row.id),JSON.stringify({trackId:data.existingTrackId,releaseId:data.existingReleaseId,matched:true})]);continue;}
      const primaryIds=[];for(const artist of data.primaryArtists)primaryIds.push(await resolveArtistId(tx,{workspaceId:input.workspaceId,userId:input.userId,artist,resolution}));
      const featuredIds=[];for(const artist of data.featuredArtists)featuredIds.push(await resolveArtistId(tx,{workspaceId:input.workspaceId,userId:input.userId,artist,resolution}));
      const releaseKey=rowHash({title:normalizeCatalogText(data.releaseTitle),type:data.releaseType,primary:primaryIds[0],date:data.releaseDate});
      let releaseId=releaseCache.get(releaseKey)??null;
      if(!releaseId){
        const existing=await tx.unsafe("select id::text from releases where primary_artist_id=$1::uuid and normalized_title=$2 and type=$3::release_type and release_date is not distinct from $4::date limit 1",[primaryIds[0],normalizeCatalogText(data.releaseTitle),data.releaseType,data.releaseDate]);
        releaseId=existing[0]?String(existing[0].id):null;
        if(!releaseId){
          const created=await tx.unsafe("insert into releases(primary_artist_id,title,normalized_title,type,release_date,language_code,genre_taxonomy_value_id,subgenre_taxonomy_value_id,pre_save_url,spotify_url,apple_music_url,deezer_url,youtube_url) values($1::uuid,$2,$3,$4::release_type,$5::date,$6,$7::uuid,$8::uuid,$9,$10,$11,$12,$13) returning id::text",[primaryIds[0],data.releaseTitle,normalizeCatalogText(data.releaseTitle),data.releaseType,data.releaseDate,data.languageCode,data.genreTaxonomyValueId,data.subgenreTaxonomyValueId,data.preSaveUrl,data.spotifyUrl,data.appleMusicUrl,data.deezerUrl,data.youtubeUrl]);
          releaseId=String(created[0].id);
        }
        releaseCache.set(releaseKey,releaseId);
      }
      const existingNumber=await tx.unsafe("select id::text,title from tracks where release_id=$1::uuid and track_number=$2",[releaseId,data.trackNumber]);
      if(existingNumber[0])throw new DomainError("MUSIC_IMPORT_INVALID","Track number conflicts with existing Release",409);
      const t=await tx.unsafe("insert into tracks(release_id,title,normalized_title,track_number,release_date,language_code,genre_taxonomy_value_id,subgenre_taxonomy_value_id,explicit_content,version,version_label,duration_ms,isrc,pre_save_url,spotify_url,apple_music_url,deezer_url,youtube_url,notes) values($1::uuid,$2,$3,$4,$5::date,$6,$7::uuid,$8::uuid,$9,$10::track_version,$11,$12,$13,$14,$15,$16,$17,$18,$19) returning id::text",[releaseId,data.trackTitle,normalizeCatalogText(data.trackTitle),data.trackNumber,data.releaseDate,data.languageCode,data.genreTaxonomyValueId,data.subgenreTaxonomyValueId,data.explicitContent,data.version,data.versionLabel,data.durationMs,data.isrc,data.preSaveUrl,data.spotifyUrl,data.appleMusicUrl,data.deezerUrl,data.youtubeUrl,data.notes]);
      const trackId=String(t[0].id);let pos=1;for(const id of primaryIds)await tx.unsafe("insert into track_artist_credits(track_id,artist_id,role,position) values($1::uuid,$2::uuid,'PRIMARY_ARTIST',$3)",[trackId,id,pos++]);
      pos=1;for(const id of featuredIds)await tx.unsafe("insert into track_artist_credits(track_id,artist_id,role,position) values($1::uuid,$2::uuid,'FEATURED_ARTIST',$3)",[trackId,id,pos++]);
      await tx.unsafe("update music_import_rows set created_entity_ids=$2::jsonb where id=$1::uuid",[String(row.id),JSON.stringify({trackId,releaseId,created:true})]);
    }
    await tx.unsafe("update music_import_sessions set status='IMPORTED',imported_at=now(),updated_at=now() where id=$1::uuid",[input.sessionId]);
    await tx.unsafe("insert into audit_logs(actor_type,actor_id,workspace_id,action,entity_type,entity_id,origin) values('USER',$1,$2::uuid,'music_import.confirmed','music_import_session',$3,'API')",[input.userId,input.workspaceId,input.sessionId]);
    return getMusicCatalogImport(tx,input);
  });
}

export { MUSIC_IMPORT_HEADERS };
