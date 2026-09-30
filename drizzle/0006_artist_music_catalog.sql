create type artist_status as enum ('DRAFT','ACTIVE','ARCHIVED');
--> statement-breakpoint
create type artist_access_level as enum ('VIEW','MANAGE');
--> statement-breakpoint
create type release_type as enum ('SINGLE','EP','ALBUM');
--> statement-breakpoint
create type catalog_status as enum ('DRAFT','ACTIVE','ARCHIVED');
--> statement-breakpoint
create type track_version as enum ('ORIGINAL','REMIX','ACOUSTIC','LIVE','SPED_UP','SLOWED','CLEAN','EXTENDED','RADIO_EDIT','OTHER');
--> statement-breakpoint
create type artist_credit_role as enum ('PRIMARY_ARTIST','FEATURED_ARTIST');
--> statement-breakpoint
create type music_import_status as enum ('UPLOADED','VALIDATED','RESOLUTION_REQUIRED','READY','IMPORTED','FAILED');
--> statement-breakpoint
create type music_import_row_class as enum ('NEW','EXISTING','POSSIBLE_DUPLICATE','INVALID');
--> statement-breakpoint

create table artists (
  id uuid primary key default gen_random_uuid(),
  artistic_name text not null,
  normalized_artistic_name text not null,
  civil_name text,
  normalized_civil_name text,
  bio text,
  country_code text references reference_countries(code) on delete restrict,
  language_code text references reference_languages(code) on delete restrict,
  avatar_media_asset_id uuid references media_assets(id) on delete set null,
  status artist_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(artistic_name)) > 0)
);
--> statement-breakpoint
create index artists_artistic_name_idx on artists(normalized_artistic_name);
--> statement-breakpoint
create index artists_civil_name_idx on artists(normalized_civil_name) where normalized_civil_name is not null;
--> statement-breakpoint

create table workspace_artist_access (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  access_level artist_access_level not null,
  granted_by_user_id text not null references "user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, artist_id)
);
--> statement-breakpoint
create index workspace_artist_access_artist_idx on workspace_artist_access(artist_id, workspace_id);
--> statement-breakpoint

create table releases (
  id uuid primary key default gen_random_uuid(),
  primary_artist_id uuid not null references artists(id) on delete restrict,
  title text not null,
  normalized_title text not null,
  type release_type not null,
  release_date date,
  language_code text references reference_languages(code) on delete restrict,
  genre_taxonomy_value_id uuid references taxonomy_values(id) on delete restrict,
  subgenre_taxonomy_value_id uuid references taxonomy_values(id) on delete restrict,
  artwork_media_asset_id uuid references media_assets(id) on delete set null,
  upc text,
  pre_save_url text,
  spotify_url text,
  apple_music_url text,
  deezer_url text,
  youtube_url text,
  status catalog_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) > 0)
);
--> statement-breakpoint
create index releases_primary_artist_idx on releases(primary_artist_id, release_date desc);
--> statement-breakpoint

create table tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references releases(id) on delete cascade,
  title text not null,
  normalized_title text not null,
  track_number integer not null,
  release_date date,
  language_code text references reference_languages(code) on delete restrict,
  genre_taxonomy_value_id uuid references taxonomy_values(id) on delete restrict,
  subgenre_taxonomy_value_id uuid references taxonomy_values(id) on delete restrict,
  explicit_content boolean,
  version track_version not null default 'ORIGINAL',
  version_label text,
  duration_ms integer,
  isrc text,
  pre_save_url text,
  spotify_url text,
  apple_music_url text,
  deezer_url text,
  youtube_url text,
  notes text,
  audio_media_asset_id uuid references media_assets(id) on delete set null,
  source_track_id uuid references tracks(id) on delete set null,
  status catalog_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (release_id, track_number),
  check (length(trim(title)) > 0),
  check (track_number > 0),
  check (duration_ms is null or duration_ms >= 0),
  check (source_track_id is null or source_track_id <> id)
);
--> statement-breakpoint
create index tracks_release_idx on tracks(release_id, track_number);
--> statement-breakpoint
create index tracks_isrc_idx on tracks(isrc) where isrc is not null;
--> statement-breakpoint

create table track_artist_credits (
  track_id uuid not null references tracks(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete restrict,
  role artist_credit_role not null,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (track_id, artist_id, role),
  unique (track_id, role, position),
  check (position > 0)
);
--> statement-breakpoint

create table track_segments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  start_ms integer not null,
  end_ms integer not null,
  label text,
  recommended boolean not null default false,
  authorized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_ms >= 0),
  check (end_ms > start_ms)
);
--> statement-breakpoint
create index track_segments_track_idx on track_segments(track_id, start_ms);
--> statement-breakpoint

create table music_import_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_by_user_id text not null references "user"(id) on delete restrict,
  source_filename text not null,
  source_fingerprint text not null,
  status music_import_status not null default 'UPLOADED',
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  unique (workspace_id, source_fingerprint)
);
--> statement-breakpoint

create table music_import_rows (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references music_import_sessions(id) on delete cascade,
  row_number integer not null,
  row_fingerprint text not null,
  classification music_import_row_class not null,
  normalized_data jsonb not null,
  error_codes jsonb not null default '[]'::jsonb,
  resolution jsonb,
  created_entity_ids jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, row_number),
  check (row_number > 1)
);
--> statement-breakpoint
create index music_import_rows_session_idx on music_import_rows(session_id, row_number);
--> statement-breakpoint

insert into permission_definitions (id,code,description) values
('10000000-0000-0000-0000-000000000016','artist.view','View Artists assigned to the Workspace'),
('10000000-0000-0000-0000-000000000017','artist.manage','Create and manage Artists assigned to the Workspace'),
('10000000-0000-0000-0000-000000000018','music_catalog.view','View Releases, Tracks and TrackSegments for assigned Artists'),
('10000000-0000-0000-0000-000000000019','music_catalog.manage','Create and manage Releases, Tracks and TrackSegments for assigned Artists'),
('10000000-0000-0000-0000-000000000020','music_catalog.import','Preview, resolve and confirm Music Catalog XLSX imports');
--> statement-breakpoint
insert into role_permissions (role_id,permission_id)
select '20000000-0000-0000-0000-000000000001'::uuid,id from permission_definitions
where code in ('artist.view','artist.manage','music_catalog.view','music_catalog.manage','music_catalog.import');
--> statement-breakpoint
insert into role_permissions (role_id,permission_id)
select '20000000-0000-0000-0000-000000000002'::uuid,id from permission_definitions
where code in ('artist.view','artist.manage','music_catalog.view','music_catalog.manage','music_catalog.import');
--> statement-breakpoint
insert into role_permissions (role_id,permission_id)
select r.id,p.id from roles r cross join permission_definitions p
where r.code in ('CAMPAIGN_MANAGER','MARKETING','SOCIAL_MEDIA')
  and p.code in ('artist.view','music_catalog.view');
