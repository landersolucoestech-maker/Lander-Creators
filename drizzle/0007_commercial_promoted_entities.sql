create type commercial_entity_status as enum ('DRAFT','ACTIVE','ARCHIVED','SUSPENDED');
--> statement-breakpoint
create type company_verification_status as enum ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED');
--> statement-breakpoint
create type promoted_object_type as enum ('MUSIC_TRACK','MUSIC_RELEASE','ARTIST','COMPANY','BRAND','PRODUCT','SERVICE','PLATFORM','EVENT','PROJECT','INSTITUTIONAL_INITIATIVE');
--> statement-breakpoint
create type promoted_entity_access_level as enum ('OWNER','MANAGE_CAMPAIGNS','VIEW','CAMPAIGN_ONLY');
--> statement-breakpoint
create type promoted_entity_access_status as enum ('PENDING','ACTIVE','SUSPENDED','REVOKED','EXPIRED');
--> statement-breakpoint
create type promoted_event_mode as enum ('PHYSICAL','ONLINE','HYBRID');
--> statement-breakpoint

create table companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trade_name text not null,
  normalized_trade_name text not null,
  description text,
  website text,
  industry_taxonomy_value_id uuid references taxonomy_values(id) on delete restrict,
  country_code text references reference_countries(code) on delete restrict,
  language_code text references reference_languages(code) on delete restrict,
  logo_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  verification_status company_verification_status not null default 'UNVERIFIED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(trade_name)) > 0)
);
--> statement-breakpoint
create index companies_trade_name_idx on companies(normalized_trade_name);
--> statement-breakpoint
create table brands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  description text,
  website text,
  logo_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);
--> statement-breakpoint
create index brands_name_idx on brands(normalized_name);
--> statement-breakpoint
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete restrict,
  company_id uuid references companies(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  description text,
  category_taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,
  website text,
  primary_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (brand_id is not null or company_id is not null),
  check (length(trim(name)) > 0)
);
--> statement-breakpoint
create table services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  description text,
  category_taxonomy_value_id uuid not null references taxonomy_values(id) on delete restrict,
  website text,
  primary_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);
--> statement-breakpoint
create table promoted_platforms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete restrict,
  brand_id uuid references brands(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  description text,
  website text,
  ios_url text,
  android_url text,
  primary_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create table promoted_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete restrict,
  brand_id uuid references brands(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  description text,
  event_mode promoted_event_mode not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone_code text not null references reference_timezones(code) on delete restrict,
  location_text text,
  online_url text,
  primary_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
--> statement-breakpoint
create table promoted_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete restrict,
  brand_id uuid references brands(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  description text,
  website text,
  primary_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create table institutional_initiatives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete restrict,
  brand_id uuid references brands(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  description text,
  website text,
  primary_media_asset_id uuid references media_assets(id) on delete set null,
  status commercial_entity_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create table workspace_promoted_entity_access (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  entity_type promoted_object_type not null,
  entity_id uuid not null,
  access_level promoted_entity_access_level not null,
  status promoted_entity_access_status not null default 'ACTIVE',
  expires_at timestamptz,
  granted_by_user_id text not null references "user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(workspace_id,entity_type,entity_id)
);
--> statement-breakpoint
create index workspace_promoted_entity_access_entity_idx on workspace_promoted_entity_access(entity_type,entity_id);
--> statement-breakpoint

insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000021','promoted_entity.view','View assigned commercial promoted entities'),
('10000000-0000-0000-0000-000000000022','promoted_entity.create','Create commercial promoted entities'),
('10000000-0000-0000-0000-000000000023','promoted_entity.manage','Manage assigned commercial promoted entities'),
('10000000-0000-0000-0000-000000000024','promoted_entity.access.manage','Manage Workspace access to promoted entities');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select '20000000-0000-0000-0000-000000000001'::uuid,id from permission_definitions where code like 'promoted_entity.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select '20000000-0000-0000-0000-000000000002'::uuid,id from permission_definitions where code like 'promoted_entity.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permission_definitions p
where r.code in ('CAMPAIGN_MANAGER','MARKETING','SOCIAL_MEDIA') and p.code='promoted_entity.view';
--> statement-breakpoint

insert into taxonomy_definitions(id,code,display_name_pt_br,description,hierarchy_enabled,max_depth) values
('30000000-0000-0000-0000-000000000004','INDUSTRY','Setores','Controlled proving set for industries',false,null),
('30000000-0000-0000-0000-000000000005','PRODUCT_CATEGORY','Categorias de produtos','Controlled proving set for promoted products',false,null),
('30000000-0000-0000-0000-000000000006','SERVICE_CATEGORY','Categorias de serviços','Controlled proving set for promoted services',false,null);
--> statement-breakpoint
insert into taxonomy_values(id,taxonomy_definition_id,code,display_label_pt_br,parent_id,sort_order) values
('31000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000004','TECHNOLOGY','Tecnologia',null,10),
('31000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000004','ENTERTAINMENT','Entretenimento',null,20),
('31000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000005','DIGITAL_PRODUCT','Produto digital',null,10),
('31000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000005','CONSUMER_PRODUCT','Produto de consumo',null,20),
('31000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000006','CONSULTING','Consultoria',null,10),
('31000000-0000-0000-0000-000000000013','30000000-0000-0000-0000-000000000006','CREATIVE_SERVICE','Serviço criativo',null,20);
