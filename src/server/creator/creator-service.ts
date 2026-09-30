import type { Sql, TransactionSql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";
import { assertTaxonomyValueSelectable } from "@/server/taxonomy/taxonomy-service";

type QueryExecutor = Sql | TransactionSql;
export type CreatorStatus = "DRAFT" | "UNDER_REVIEW" | "ACTIVE" | "LIMITED" | "SUSPENDED" | "DISABLED";
export type CreatorAvailability = "AVAILABLE" | "LIMITED_AVAILABILITY" | "UNAVAILABLE";
export type MarketplaceVisibility = "VISIBLE" | "HIDDEN";

async function audit(sql: QueryExecutor, input: {
  userId: string;
  action: string;
  entityId: string;
  delta?: Record<string, unknown>;
}) {
  await sql.unsafe(
    "insert into audit_logs(actor_type,actor_id,action,entity_type,entity_id,delta,origin) values('USER',$1,$2,'creator_profile',$3,$4::jsonb,'API')",
    [input.userId, input.action, input.entityId, JSON.stringify(input.delta ?? {})]
  );
}

export async function getCreatorProfileByUser(sql: Sql, userId: string) {
  const rows = await sql.unsafe(
    "select cp.id::text,cp.user_id,cp.display_name,cp.bio,cp.country_code,cp.language_code,cp.timezone_code,cp.region,cp.city,cp.status::text,cp.marketplace_visibility::text,cp.availability::text,cp.avatar_media_asset_id::text,cp.created_at,cp.updated_at from creator_profiles cp where cp.user_id=$1 limit 1",
    [userId]
  );
  return rows[0] ?? null;
}

export async function requireCreatorOwner(sql: QueryExecutor, input: {
  userId: string;
  creatorProfileId: string;
}) {
  const rows = await sql.unsafe(
    "select id::text,user_id,status::text from creator_profiles where id=$1::uuid limit 1",
    [input.creatorProfileId]
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new DomainError("CREATOR_PROFILE_NOT_FOUND", "Creator profile not found", 404);
  if (row.user_id !== input.userId) {
    throw new DomainError("CREATOR_PROFILE_ACCESS_DENIED", "Creator profile ownership required", 403);
  }
  return row;
}

async function assertReference(sql: QueryExecutor, table: "reference_countries" | "reference_languages" | "reference_timezones", code: string) {
  const rows = await sql.unsafe(`select 1 from ${table} where code=$1 and active=true`, [code]);
  if (!rows[0]) throw new DomainError("INVALID_REFERENCE_DATA", "Reference value is invalid", 400);
}

export async function createCreatorProfile(sql: Sql, input: {
  userId: string;
  displayName: string;
  bio?: string | null;
  countryCode: string;
  languageCode: string;
  timezoneCode: string;
  region?: string | null;
  city?: string | null;
}) {
  return sql.begin(async tx => {
    const existing = await tx.unsafe("select id from creator_profiles where user_id=$1", [input.userId]);
    if (existing[0]) throw new DomainError("CREATOR_PROFILE_ALREADY_EXISTS", "Creator profile already exists", 409);
    await assertReference(tx, "reference_countries", input.countryCode);
    await assertReference(tx, "reference_languages", input.languageCode);
    await assertReference(tx, "reference_timezones", input.timezoneCode);
    const rows = await tx.unsafe(
      "insert into creator_profiles(user_id,display_name,bio,country_code,language_code,timezone_code,region,city) values($1,$2,$3,$4,$5,$6,$7,$8) returning id::text,user_id,display_name,bio,country_code,language_code,timezone_code,region,city,status::text,marketplace_visibility::text,availability::text,avatar_media_asset_id::text,created_at,updated_at",
      [input.userId,input.displayName.trim(),input.bio?.trim()||null,input.countryCode,input.languageCode,input.timezoneCode,input.region?.trim()||null,input.city?.trim()||null]
    );
    const profile = rows[0] as Record<string, unknown>;
    await audit(tx,{userId:input.userId,action:"creator.created",entityId:String(profile.id)});
    return profile;
  });
}

export async function updateCreatorProfile(sql: Sql, input: {
  userId: string;
  creatorProfileId: string;
  displayName: string;
  bio?: string | null;
  countryCode: string;
  languageCode: string;
  timezoneCode: string;
  region?: string | null;
  city?: string | null;
}) {
  await requireCreatorOwner(sql,input);
  await assertReference(sql,"reference_countries",input.countryCode);
  await assertReference(sql,"reference_languages",input.languageCode);
  await assertReference(sql,"reference_timezones",input.timezoneCode);
  const rows=await sql.unsafe(
    "update creator_profiles set display_name=$3,bio=$4,country_code=$5,language_code=$6,timezone_code=$7,region=$8,city=$9,updated_at=now() where id=$1::uuid and user_id=$2 returning id::text,user_id,display_name,bio,country_code,language_code,timezone_code,region,city,status::text,marketplace_visibility::text,availability::text,avatar_media_asset_id::text,created_at,updated_at",
    [input.creatorProfileId,input.userId,input.displayName.trim(),input.bio?.trim()||null,input.countryCode,input.languageCode,input.timezoneCode,input.region?.trim()||null,input.city?.trim()||null]
  );
  return rows[0];
}

async function assertTaxonomyDefinition(sql: QueryExecutor, taxonomyValueId: string, expectedCode: string) {
  await assertTaxonomyValueSelectable(sql as Sql,taxonomyValueId);
  const rows=await sql.unsafe(
    "select td.code from taxonomy_values tv join taxonomy_definitions td on td.id=tv.taxonomy_definition_id where tv.id=$1::uuid",
    [taxonomyValueId]
  );
  if ((rows[0] as Record<string,unknown>|undefined)?.code!==expectedCode) {
    throw new DomainError("CREATOR_TAXONOMY_INVALID","Taxonomy value belongs to another definition",400);
  }
}

export async function addCreatorTaxonomyValue(sql: Sql, input: {
  userId: string;
  creatorProfileId: string;
  taxonomyValueId: string;
  kind: "NICHE" | "CONTENT_STYLE" | "MUSIC_GENRE";
  primary?: boolean;
}) {
  await requireCreatorOwner(sql,input);
  const map={
    NICHE:{definition:"CREATOR_NICHE",table:"creator_profile_niches"},
    CONTENT_STYLE:{definition:"CONTENT_STYLE",table:"creator_profile_content_styles"},
    MUSIC_GENRE:{definition:"MUSIC_GENRE",table:"creator_music_genres"}
  } as const;
  const target=map[input.kind];
  await assertTaxonomyDefinition(sql,input.taxonomyValueId,target.definition);
  if(input.kind==="NICHE" && input.primary){
    await sql.begin(async tx=>{
      await tx.unsafe("update creator_profile_niches set is_primary=false where creator_profile_id=$1::uuid",[input.creatorProfileId]);
      await tx.unsafe("insert into creator_profile_niches(creator_profile_id,taxonomy_value_id,is_primary) values($1::uuid,$2::uuid,true) on conflict(creator_profile_id,taxonomy_value_id) do update set is_primary=true",[input.creatorProfileId,input.taxonomyValueId]);
    });
  } else {
    const primaryColumn=input.kind==="NICHE"?",is_primary":"";
    const primaryValue=input.kind==="NICHE"?",false":"";
    await sql.unsafe(
      `insert into ${target.table}(creator_profile_id,taxonomy_value_id${primaryColumn}) values($1::uuid,$2::uuid${primaryValue}) on conflict do nothing`,
      [input.creatorProfileId,input.taxonomyValueId]
    );
  }
  return {creatorProfileId:input.creatorProfileId,taxonomyValueId:input.taxonomyValueId,kind:input.kind};
}

export async function listCreatorTaxonomies(sql: Sql, creatorProfileId: string) {
  const niches=await sql.unsafe("select tv.id::text,tv.code,tv.display_label_pt_br label,cn.is_primary from creator_profile_niches cn join taxonomy_values tv on tv.id=cn.taxonomy_value_id where cn.creator_profile_id=$1::uuid order by cn.is_primary desc,tv.display_label_pt_br",[creatorProfileId]);
  const contentStyles=await sql.unsafe("select tv.id::text,tv.code,tv.display_label_pt_br label from creator_profile_content_styles cs join taxonomy_values tv on tv.id=cs.taxonomy_value_id where cs.creator_profile_id=$1::uuid order by tv.display_label_pt_br",[creatorProfileId]);
  const musicGenres=await sql.unsafe("select tv.id::text,tv.code,tv.display_label_pt_br label from creator_music_genres mg join taxonomy_values tv on tv.id=mg.taxonomy_value_id where mg.creator_profile_id=$1::uuid order by tv.display_label_pt_br",[creatorProfileId]);
  return {niches,contentStyles,musicGenres};
}

export async function calculateCreatorReadiness(sql: Sql, userId: string) {
  const rows=await sql.unsafe(
    "select cp.id::text,cp.display_name,cp.country_code,cp.language_code,u.email_verified,exists(select 1 from creator_profile_niches n where n.creator_profile_id=cp.id) has_niche,exists(select 1 from social_profiles sp where sp.creator_profile_id=cp.id and sp.provenance='DECLARED') has_social from creator_profiles cp join \"user\" u on u.id=cp.user_id where cp.user_id=$1",
    [userId]
  );
  const row=rows[0] as Record<string,unknown>|undefined;
  if(!row) throw new DomainError("CREATOR_PROFILE_NOT_FOUND","Creator profile not found",404);
  const missing:string[]=[];
  if(!String(row.display_name??"").trim())missing.push("MISSING_DISPLAY_NAME");
  if(!row.country_code)missing.push("MISSING_COUNTRY");
  if(!row.language_code)missing.push("MISSING_LANGUAGE");
  if(!row.has_niche)missing.push("MISSING_NICHE");
  if(!row.has_social)missing.push("MISSING_SOCIAL_PROFILE");
  if(!row.email_verified)missing.push("EMAIL_VERIFICATION_REQUIRED");
  return {
    technicalReady:missing.length===0,
    missing,
    legalGate:"CREATOR_TERMS_GATE_DEFERRED" as const
  };
}

export async function submitCreatorProfileForReview(sql: Sql,input:{userId:string;creatorProfileId:string}) {
  await requireCreatorOwner(sql,input);
  const readiness=await calculateCreatorReadiness(sql,input.userId);
  if(!readiness.technicalReady) throw new DomainError("CREATOR_PROFILE_INCOMPLETE","Creator profile is incomplete",409);
  const rows=await sql.unsafe(
    "update creator_profiles set status='UNDER_REVIEW',marketplace_visibility='HIDDEN',updated_at=now() where id=$1::uuid and user_id=$2 and status in ('DRAFT','UNDER_REVIEW') returning id::text,status::text",
    [input.creatorProfileId,input.userId]
  );
  if(!rows[0])throw new DomainError("INVALID_CREATOR_STATUS_TRANSITION","Creator status transition rejected",409);
  await audit(sql,{userId:input.userId,action:"creator.submitted_for_review",entityId:input.creatorProfileId});
  return rows[0];
}

export async function setCreatorAvailability(sql:Sql,input:{userId:string;creatorProfileId:string;availability:CreatorAvailability}){
  await requireCreatorOwner(sql,input);
  const rows=await sql.unsafe("update creator_profiles set availability=$3::creator_availability,updated_at=now() where id=$1::uuid and user_id=$2 returning id::text,availability::text",[input.creatorProfileId,input.userId,input.availability]);
  await audit(sql,{userId:input.userId,action:"creator.availability_changed",entityId:input.creatorProfileId,delta:{availability:input.availability}});
  return rows[0];
}

export async function setMarketplaceVisibility(sql:Sql,input:{userId:string;creatorProfileId:string;visibility:MarketplaceVisibility}){
  const profile=await requireCreatorOwner(sql,input);
  const status=String(profile.status) as CreatorStatus;
  if(input.visibility==="VISIBLE" && status!=="ACTIVE"){
    throw new DomainError("CREATOR_NOT_MARKETPLACE_ELIGIBLE","Creator is not eligible for marketplace visibility",409);
  }
  if(["SUSPENDED","DISABLED","LIMITED"].includes(status) && input.visibility==="VISIBLE"){
    throw new DomainError("CREATOR_NOT_MARKETPLACE_ELIGIBLE","Creator is not eligible for marketplace visibility",409);
  }
  const rows=await sql.unsafe("update creator_profiles set marketplace_visibility=$3::creator_marketplace_visibility,updated_at=now() where id=$1::uuid and user_id=$2 returning id::text,marketplace_visibility::text",[input.creatorProfileId,input.userId,input.visibility]);
  await audit(sql,{userId:input.userId,action:"creator.visibility_changed",entityId:input.creatorProfileId,delta:{visibility:input.visibility}});
  return rows[0];
}
