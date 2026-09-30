import type { Sql } from "postgres";
import { authorizeArtistAccess } from "./catalog-access";

export async function authorizeTrackBoundMediaRead(
  sql: Sql,
  input: { userId: string; workspaceId: string; mediaAssetId: string }
) {
  const rows=await sql.unsafe(
    "select r.primary_artist_id::text from tracks t join releases r on r.id=t.release_id where t.audio_media_asset_id=$1::uuid limit 1",
    [input.mediaAssetId]
  );
  if(!rows[0])return;
  await authorizeArtistAccess(sql,{
    userId:input.userId,
    workspaceId:input.workspaceId,
    artistId:String(rows[0].primary_artist_id),
    permission:"music_catalog.view"
  });
}
