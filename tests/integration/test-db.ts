import postgres from "postgres";

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/lander_creators_test";

export function createTestSql() {
  return postgres(testDatabaseUrl, { max: 10, prepare: false });
}

export async function resetSecurityData(sql: ReturnType<typeof createTestSql>) {
  await sql.unsafe("delete from audit_logs");
  await sql.unsafe("delete from content_versions");
  await sql.unsafe("delete from deliverables");
  await sql.unsafe("delete from engagement_contracts");
  await sql.unsafe("delete from campaign_engagements");
  await sql.unsafe("delete from campaign_proposals");
  await sql.unsafe("delete from campaign_participations");
  await sql.unsafe("delete from campaign_builder_steps");
  await sql.unsafe("delete from campaign_tracking_config");
  await sql.unsafe("delete from campaign_rights_requirements");
  await sql.unsafe("delete from campaign_assets");
  await sql.unsafe("delete from campaign_content_requirements");
  await sql.unsafe("delete from campaign_targeting_languages");
  await sql.unsafe("delete from campaign_targeting_countries");
  await sql.unsafe("delete from campaign_targeting_music_genres");
  await sql.unsafe("delete from campaign_targeting_content_styles");
  await sql.unsafe("delete from campaign_targeting_niches");
  await sql.unsafe("delete from campaign_targeting_platforms");
  await sql.unsafe("delete from campaign_targeting");
  await sql.unsafe("delete from campaigns");
  await sql.unsafe("delete from workspace_promoted_entity_access");
  await sql.unsafe("delete from institutional_initiatives");
  await sql.unsafe("delete from promoted_projects");
  await sql.unsafe("delete from promoted_events");
  await sql.unsafe("delete from promoted_platforms");
  await sql.unsafe("delete from services");
  await sql.unsafe("delete from products");
  await sql.unsafe("delete from brands");
  await sql.unsafe("delete from companies");
  await sql.unsafe("delete from music_import_rows");
  await sql.unsafe("delete from music_import_sessions");
  await sql.unsafe("delete from track_segments");
  await sql.unsafe("delete from track_artist_credits");
  await sql.unsafe("delete from tracks");
  await sql.unsafe("delete from releases");
  await sql.unsafe("delete from workspace_artist_access");
  await sql.unsafe("delete from artists");
  await sql.unsafe("delete from social_metrics_snapshots");
  await sql.unsafe("delete from social_profiles");
  await sql.unsafe("delete from creator_music_genres");
  await sql.unsafe("delete from creator_profile_content_styles");
  await sql.unsafe("delete from creator_profile_niches");
  await sql.unsafe("delete from creator_profiles");
  await sql.unsafe("delete from media_assets");
  await sql.unsafe("delete from workspace_creation_requests");
  await sql.unsafe("delete from membership_grants");
  await sql.unsafe("delete from workspace_invitations");
  await sql.unsafe("delete from user_context_preferences");
  await sql.unsafe("delete from memberships");
  await sql.unsafe("delete from roles where workspace_id is not null");
  await sql.unsafe("delete from workspaces");
  await sql.unsafe("delete from account");
  await sql.unsafe("delete from session");
  await sql.unsafe("delete from verification");
  await sql.unsafe("delete from identity_profiles");
  await sql.unsafe('delete from "user"');
}
