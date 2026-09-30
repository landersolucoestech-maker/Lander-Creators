create type campaign_status as enum ('DRAFT','SCHEDULED','ACTIVE','PAUSED','CANCELLATION_PENDING','CANCELLED','COMPLETED','ARCHIVED');
--> statement-breakpoint
create type campaign_mode as enum ('FIXED','EVERGREEN');
--> statement-breakpoint
create type campaign_visibility as enum ('OPEN','PRIVATE');
--> statement-breakpoint
create type campaign_recruitment_status as enum ('NOT_OPEN','OPEN','CLOSED');
--> statement-breakpoint
create type campaign_readiness_status as enum ('READY','READY_WITH_WARNINGS','BLOCKED');
--> statement-breakpoint
create type campaign_social_platform as enum ('TIKTOK','INSTAGRAM','YOUTUBE');
--> statement-breakpoint
create type campaign_content_format as enum ('VIDEO','REEL','STORY','FEED_POST','SHORT');
--> statement-breakpoint
create table campaign_goals (
  code text primary key,
  display_name_pt_br text not null,
  active boolean not null default true,
  sort_order integer not null default 0
);
--> statement-breakpoint
create table campaign_goal_object_types (
  goal_code text not null references campaign_goals(code) on delete cascade,
  object_type promoted_object_type not null,
  primary key(goal_code,object_type)
);
--> statement-breakpoint
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  internal_description text,
  objective_context text,
  status campaign_status not null default 'DRAFT',
  mode campaign_mode,
  visibility campaign_visibility not null default 'PRIVATE',
  recruitment_status campaign_recruitment_status not null default 'NOT_OPEN',
  promoted_object_type promoted_object_type,
  promoted_object_id uuid,
  promoted_object_display_name_snapshot text,
  promoted_object_parent_snapshot jsonb,
  promoted_object_asset_ids_snapshot jsonb,
  goal_code text references campaign_goals(code) on delete restrict,
  cta_type text,
  cta_url text,
  brief text,
  brief_do text,
  brief_dont text,
  mandatory_messages text,
  hashtags text,
  mentions text,
  cta_instructions text,
  reference_notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_code text references reference_timezones(code) on delete restrict,
  recruitment_opens_at timestamptz,
  recruitment_closes_at timestamptz,
  budget_minor bigint,
  currency_code text not null default 'BRL' references reference_currencies(code) on delete restrict,
  target_creator_count integer,
  maximum_creator_count integer,
  last_builder_step smallint not null default 1,
  revision integer not null default 1,
  created_by_user_id text not null references "user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(length(trim(name))>0),
  check(last_builder_step between 1 and 10),
  check(budget_minor is null or budget_minor>=0),
  check(target_creator_count is null or target_creator_count>0),
  check(maximum_creator_count is null or maximum_creator_count>0),
  check(target_creator_count is null or maximum_creator_count is null or target_creator_count<=maximum_creator_count),
  check(ends_at is null or starts_at is null or ends_at>starts_at),
  check(recruitment_closes_at is null or recruitment_opens_at is null or recruitment_closes_at>=recruitment_opens_at)
);
--> statement-breakpoint
create index campaigns_workspace_updated_idx on campaigns(workspace_id,updated_at desc);
--> statement-breakpoint
create table campaign_targeting (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  follower_min bigint,
  follower_max bigint,
  updated_at timestamptz not null default now(),
  check(follower_min is null or follower_min>=0),
  check(follower_max is null or follower_max>=0),
  check(follower_min is null or follower_max is null or follower_min<=follower_max)
);
--> statement-breakpoint
create table campaign_targeting_platforms(campaign_id uuid not null references campaigns(id) on delete cascade,platform campaign_social_platform not null,primary key(campaign_id,platform));
--> statement-breakpoint
create table campaign_targeting_niches(campaign_id uuid not null references campaigns(id) on delete cascade,taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,primary key(campaign_id,taxonomy_value_id));
--> statement-breakpoint
create table campaign_targeting_content_styles(campaign_id uuid not null references campaigns(id) on delete cascade,taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,primary key(campaign_id,taxonomy_value_id));
--> statement-breakpoint
create table campaign_targeting_music_genres(campaign_id uuid not null references campaigns(id) on delete cascade,taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,primary key(campaign_id,taxonomy_value_id));
--> statement-breakpoint
create table campaign_targeting_countries(campaign_id uuid not null references campaigns(id) on delete cascade,country_code text not null references reference_countries(code) on delete restrict,primary key(campaign_id,country_code));
--> statement-breakpoint
create table campaign_targeting_languages(campaign_id uuid not null references campaigns(id) on delete cascade,language_code text not null references reference_languages(code) on delete restrict,primary key(campaign_id,language_code));
--> statement-breakpoint
create table campaign_content_requirements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  platform campaign_social_platform not null,
  format campaign_content_format not null,
  quantity integer not null check(quantity>0),
  notes text,
  required_publication boolean not null default true,
  ugc boolean not null default false,
  sort_order integer not null default 0
);
--> statement-breakpoint
create table campaign_assets (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  media_asset_id uuid not null references media_assets(id) on delete restrict,
  purpose text,
  sort_order integer not null default 0,
  primary key(campaign_id,media_asset_id)
);
--> statement-breakpoint
create table campaign_rights_requirements (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  organic_usage_days integer,
  paid_media_allowed boolean not null default false,
  whitelisting_required boolean not null default false,
  exclusivity_required boolean not null default false,
  geography text,
  usage_duration_days integer,
  check(organic_usage_days is null or organic_usage_days>0),
  check(usage_duration_days is null or usage_duration_days>0)
);
--> statement-breakpoint
create table campaign_tracking_config (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  target_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content_pattern text,
  tracking_label text,
  measure_views boolean not null default false,
  measure_reach boolean not null default false,
  measure_engagement boolean not null default false,
  measure_clicks boolean not null default false,
  measure_conversions boolean not null default false
);
--> statement-breakpoint
create table campaign_builder_steps (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  step smallint not null check(step between 1 and 10),
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(campaign_id,step)
);
--> statement-breakpoint
insert into campaign_goals(code,display_name_pt_br,sort_order) values
('CREATOR_RECRUITMENT','Recrutamento de Creators',10),('AWARENESS','Reconhecimento',20),('CONTENT_CREATION','Criação de conteúdo',30),('REACH','Alcance',40),('ENGAGEMENT','Engajamento',50),('TRAFFIC','Tráfego',60),('CONVERSION','Conversão',70),('PRODUCT_LAUNCH','Lançamento de produto',80),('MUSIC_DISCOVERY','Descoberta musical',90),('EVENT_PROMOTION','Promoção de evento',100),('INSTITUTIONAL_AWARENESS','Reconhecimento institucional',110);
--> statement-breakpoint
insert into campaign_goal_object_types(goal_code,object_type)
select g.code,t::promoted_object_type from campaign_goals g cross join unnest(enum_range(null::promoted_object_type)) t
where g.code in ('AWARENESS','CONTENT_CREATION','REACH','ENGAGEMENT','TRAFFIC','CONVERSION');
--> statement-breakpoint
insert into campaign_goal_object_types(goal_code,object_type) values
('CREATOR_RECRUITMENT','PLATFORM'),('PRODUCT_LAUNCH','PRODUCT'),('MUSIC_DISCOVERY','MUSIC_TRACK'),('MUSIC_DISCOVERY','MUSIC_RELEASE'),('MUSIC_DISCOVERY','ARTIST'),('EVENT_PROMOTION','EVENT'),('INSTITUTIONAL_AWARENESS','INSTITUTIONAL_INITIATIVE');
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000025','campaign.view','View Workspace campaigns'),
('10000000-0000-0000-0000-000000000026','campaign.create','Create Workspace campaigns'),
('10000000-0000-0000-0000-000000000027','campaign.manage','Manage Workspace campaign configuration'),
('10000000-0000-0000-0000-000000000028','campaign.activate','Activate and schedule ready campaigns'),
('10000000-0000-0000-0000-000000000029','campaign.pause','Pause and resume active campaigns'),
('10000000-0000-0000-0000-000000000030','campaign.cancel','Request and confirm campaign cancellation');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code like 'campaign.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code='MARKETING' and p.code in ('campaign.view','campaign.create','campaign.manage');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code='SOCIAL_MEDIA' and p.code in ('campaign.view','campaign.manage');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code='VIEWER' and p.code='campaign.view';
