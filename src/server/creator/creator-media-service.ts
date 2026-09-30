import type { Sql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";
import { requireCreatorOwner } from "./creator-service";

async function assertAttachableMedia(sql:Sql,input:{userId:string;mediaAssetId:string}){
  const rows=await sql.unsafe(
    "select ma.id::text from media_assets ma where ma.id=$1::uuid and ma.created_by_user_id=$2 and ma.status='READY' and exists(select 1 from memberships m join roles r on r.id=m.role_id join role_permissions rp on rp.role_id=r.id join permission_definitions pd on pd.id=rp.permission_id where m.user_id=$2 and m.workspace_id=ma.workspace_id and m.status='ACTIVE' and pd.code='media.view')",
    [input.mediaAssetId,input.userId]
  );
  if(!rows[0])throw new DomainError("CREATOR_MEDIA_ACCESS_DENIED","Creator media attachment is not authorized",403);
}

export async function setCreatorAvatar(sql:Sql,input:{userId:string;creatorProfileId:string;mediaAssetId:string|null}){
  await requireCreatorOwner(sql,input);
  if(input.mediaAssetId)await assertAttachableMedia(sql,{userId:input.userId,mediaAssetId:input.mediaAssetId});
  const rows=await sql.unsafe("update creator_profiles set avatar_media_asset_id=$3::uuid,updated_at=now() where id=$1::uuid and user_id=$2 returning id::text,avatar_media_asset_id::text",[input.creatorProfileId,input.userId,input.mediaAssetId]);
  return rows[0];
}

export async function listCreatorAttachableMedia(sql:Sql,userId:string){
  return sql.unsafe(
    "select distinct ma.id::text,ma.original_file_name,ma.media_kind::text,ma.mime_type from media_assets ma where ma.created_by_user_id=$1 and ma.status='READY' and exists(select 1 from memberships m join roles r on r.id=m.role_id join role_permissions rp on rp.role_id=r.id join permission_definitions pd on pd.id=rp.permission_id where m.user_id=$1 and m.workspace_id=ma.workspace_id and m.status='ACTIVE' and pd.code='media.view') order by ma.original_file_name",
    [userId]
  );
}
