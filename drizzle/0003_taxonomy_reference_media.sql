create type taxonomy_status as enum ('ACTIVE','DEPRECATED');
--> statement-breakpoint
create type media_kind as enum ('IMAGE','AUDIO','DOCUMENT');
--> statement-breakpoint
create type media_status as enum ('READY','ARCHIVED');
--> statement-breakpoint
create type media_visibility as enum ('PRIVATE','WORKSPACE_AVAILABLE');
--> statement-breakpoint
create table taxonomy_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name_pt_br text not null,
  description text not null,
  hierarchy_enabled boolean not null default false,
  max_depth integer,
  status taxonomy_status not null default 'ACTIVE',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_depth is null or max_depth >= 1)
);
--> statement-breakpoint
create table taxonomy_values (
  id uuid primary key default gen_random_uuid(),
  taxonomy_definition_id uuid not null references taxonomy_definitions(id) on delete restrict,
  code text not null,
  display_label_pt_br text not null,
  parent_id uuid references taxonomy_values(id) on delete restrict,
  sort_order integer not null default 0,
  status taxonomy_status not null default 'ACTIVE',
  superseded_by_id uuid references taxonomy_values(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(taxonomy_definition_id, code),
  check (parent_id is null or parent_id <> id),
  check (superseded_by_id is null or superseded_by_id <> id)
);
--> statement-breakpoint
create index taxonomy_values_parent_idx on taxonomy_values(parent_id);
--> statement-breakpoint
create table taxonomy_aliases (
  id uuid primary key default gen_random_uuid(),
  taxonomy_value_id uuid not null references taxonomy_values(id) on delete cascade,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique(taxonomy_value_id, normalized_alias)
);
--> statement-breakpoint
create table reference_languages (code text primary key, display_name_pt_br text not null, active boolean not null default true);
--> statement-breakpoint
create table reference_countries (code text primary key, display_name_pt_br text not null, active boolean not null default true);
--> statement-breakpoint
create table reference_currencies (code text primary key, display_name_pt_br text not null, active boolean not null default true);
--> statement-breakpoint
create table reference_timezones (code text primary key, display_name_pt_br text not null, active boolean not null default true);
--> statement-breakpoint
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  created_by_user_id text not null references "user"(id) on delete restrict,
  file_name text not null,
  original_file_name text not null,
  media_kind media_kind not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text not null,
  storage_key text not null unique,
  status media_status not null default 'READY',
  visibility media_visibility not null default 'PRIVATE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (size_bytes > 0)
);
--> statement-breakpoint
create index media_assets_workspace_idx on media_assets(workspace_id, created_at desc);
--> statement-breakpoint
create index media_assets_checksum_idx on media_assets(checksum_sha256);
--> statement-breakpoint
insert into permission_definitions (id,code,description) values
('10000000-0000-0000-0000-000000000012','taxonomy.view','View governed taxonomy and reference data'),
('10000000-0000-0000-0000-000000000013','media.view','View Workspace media metadata and authorized content'),
('10000000-0000-0000-0000-000000000014','media.upload','Upload validated Workspace media'),
('10000000-0000-0000-0000-000000000015','media.archive','Archive Workspace media');
--> statement-breakpoint
insert into role_permissions (role_id,permission_id)
select '20000000-0000-0000-0000-000000000001'::uuid,id from permission_definitions where code in ('taxonomy.view','media.view','media.upload','media.archive');
--> statement-breakpoint
insert into role_permissions (role_id,permission_id)
select '20000000-0000-0000-0000-000000000002'::uuid,id from permission_definitions where code in ('taxonomy.view','media.view','media.upload','media.archive');
--> statement-breakpoint
insert into role_permissions (role_id,permission_id)
select r.id,p.id from roles r cross join permission_definitions p where r.code in ('CAMPAIGN_MANAGER','MARKETING','SOCIAL_MEDIA','FINANCE','VIEWER') and p.code in ('taxonomy.view','media.view');
--> statement-breakpoint
insert into taxonomy_definitions (id,code,display_name_pt_br,description,hierarchy_enabled,max_depth) values
('30000000-0000-0000-0000-000000000001','MUSIC_GENRE','Gêneros musicais','Governed music genre hierarchy',true,2),
('30000000-0000-0000-0000-000000000002','CREATOR_NICHE','Nichos de creators','Generic creator marketing niches',true,2),
('30000000-0000-0000-0000-000000000003','CONTENT_STYLE','Estilos de conteúdo','Reusable creator content styles',false,null);
--> statement-breakpoint
insert into taxonomy_values (id,taxonomy_definition_id,code,display_label_pt_br,parent_id,sort_order) values
('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','POP','Pop',null,10),
('31000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','HIP_HOP','Hip hop',null,20),
('31000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','TRAP','Trap','31000000-0000-0000-0000-000000000002',21),
('31000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000002','MUSIC','Música',null,10),
('31000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002','LIFESTYLE','Estilo de vida',null,20),
('31000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000003','TUTORIAL','Tutorial',null,10),
('31000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000003','REVIEW','Avaliação',null,20);
--> statement-breakpoint
insert into taxonomy_aliases (taxonomy_value_id,normalized_alias) values
('31000000-0000-0000-0000-000000000002','hip-hop'),
('31000000-0000-0000-0000-000000000002','hiphop'),
('31000000-0000-0000-0000-000000000003','trap music');
--> statement-breakpoint
insert into reference_languages (code,display_name_pt_br) values ('pt-BR','Português (Brasil)'),('en','Inglês'),('es','Espanhol');
--> statement-breakpoint
insert into reference_countries (code,display_name_pt_br) values ('BR','Brasil'),('US','Estados Unidos'),('AR','Argentina');
--> statement-breakpoint
insert into reference_currencies (code,display_name_pt_br) values ('BRL','Real brasileiro'),('USD','Dólar americano'),('EUR','Euro');
--> statement-breakpoint
insert into reference_timezones (code,display_name_pt_br) values ('America/Sao_Paulo','Brasília / São Paulo'),('America/New_York','Nova York'),('UTC','UTC');
