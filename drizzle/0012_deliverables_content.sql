create type deliverable_status as enum ('PENDING','IN_PROGRESS','SUBMITTED','CHANGES_REQUESTED','APPROVED','REJECTED','CANCELLED');
--> statement-breakpoint
create table deliverables (
 id uuid primary key default gen_random_uuid(),
 engagement_id uuid not null references campaign_engagements(id) on delete cascade,
 campaign_id uuid not null references campaigns(id) on delete restrict,
 workspace_id uuid not null references workspaces(id) on delete restrict,
 creator_profile_id uuid not null references creator_profiles(id) on delete restrict,
 title text not null,
 platform text not null,
 format text not null,
 requirements_snapshot text not null,
 due_at timestamptz,
 status deliverable_status not null default 'PENDING',
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
--> statement-breakpoint
create type content_version_status as enum ('SUBMITTED','CHANGES_REQUESTED','APPROVED','REJECTED','SUPERSEDED');
--> statement-breakpoint
create table content_versions (
 id uuid primary key default gen_random_uuid(),
 deliverable_id uuid not null references deliverables(id) on delete cascade,
 version integer not null check(version>0),
 media_asset_id uuid references media_assets(id) on delete restrict,
 external_url text,
 creator_note text,
 review_note text,
 status content_version_status not null default 'SUBMITTED',
 submitted_by_user_id text not null references "user"(id) on delete restrict,
 reviewed_by_user_id text references "user"(id) on delete restrict,
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz,
 unique(deliverable_id,version),
 check(media_asset_id is not null or external_url is not null)
);
--> statement-breakpoint
create unique index content_versions_one_open on content_versions(deliverable_id) where status='SUBMITTED';
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000037','deliverable.view','View engagement deliverables'),
('10000000-0000-0000-0000-000000000038','deliverable.manage','Create and review engagement deliverables');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code like 'deliverable.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('MARKETING','SOCIAL_MEDIA','VIEWER') and p.code='deliverable.view';