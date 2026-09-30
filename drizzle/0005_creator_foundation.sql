create type creator_status as enum ('DRAFT','UNDER_REVIEW','ACTIVE','LIMITED','SUSPENDED','DISABLED');
--> statement-breakpoint
create type creator_marketplace_visibility as enum ('VISIBLE','HIDDEN');
--> statement-breakpoint
create type creator_availability as enum ('AVAILABLE','LIMITED_AVAILABILITY','UNAVAILABLE');
--> statement-breakpoint
create type social_platform as enum ('TIKTOK','INSTAGRAM','YOUTUBE');
--> statement-breakpoint
create type social_profile_provenance as enum ('DECLARED','MANUAL_VERIFIED','PROVIDER');
--> statement-breakpoint
create type social_connection_status as enum ('NOT_CONNECTED','CONNECTED','REAUTH_REQUIRED','PERMISSION_LIMITED','ERROR','REVOKED');
--> statement-breakpoint
create type social_metrics_source as enum ('MANUAL_DECLARED','PROVIDER');
--> statement-breakpoint

create table creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique references "user"(id) on delete restrict,
  display_name text not null,
  bio text,
  country_code text not null references reference_countries(code) on delete restrict,
  language_code text not null references reference_languages(code) on delete restrict,
  timezone_code text not null references reference_timezones(code) on delete restrict,
  region text,
  city text,
  status creator_status not null default 'DRAFT',
  marketplace_visibility creator_marketplace_visibility not null default 'HIDDEN',
  availability creator_availability not null default 'AVAILABLE',
  avatar_media_asset_id uuid references media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create index creator_profiles_status_idx on creator_profiles(status, marketplace_visibility, availability);
--> statement-breakpoint

create table creator_profile_niches (
  creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
  taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (creator_profile_id, taxonomy_value_id)
);
--> statement-breakpoint
create unique index creator_profile_primary_niche_unique on creator_profile_niches(creator_profile_id) where is_primary;
--> statement-breakpoint

create table creator_profile_content_styles (
  creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
  taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (creator_profile_id, taxonomy_value_id)
);
--> statement-breakpoint

create table creator_music_genres (
  creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
  taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (creator_profile_id, taxonomy_value_id)
);
--> statement-breakpoint

create table social_profiles (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
  platform social_platform not null,
  external_account_id text,
  handle text not null,
  normalized_handle text not null,
  profile_url text,
  display_name text,
  provenance social_profile_provenance not null default 'DECLARED',
  connection_status social_connection_status not null default 'NOT_CONNECTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_profile_id, platform, normalized_handle)
);
--> statement-breakpoint
create unique index social_profiles_external_account_unique
  on social_profiles(platform, external_account_id)
  where external_account_id is not null;
--> statement-breakpoint

create table social_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  social_profile_id uuid not null references social_profiles(id) on delete cascade,
  captured_at timestamptz not null,
  source social_metrics_source not null,
  followers bigint,
  following bigint,
  total_likes bigint,
  average_views bigint,
  engagement_rate_basis_points integer,
  created_at timestamptz not null default now(),
  check (followers is null or followers >= 0),
  check (following is null or following >= 0),
  check (total_likes is null or total_likes >= 0),
  check (average_views is null or average_views >= 0),
  check (engagement_rate_basis_points is null or (engagement_rate_basis_points >= 0 and engagement_rate_basis_points <= 10000))
);
--> statement-breakpoint
create index social_metrics_snapshots_profile_captured_idx
  on social_metrics_snapshots(social_profile_id, captured_at desc);
