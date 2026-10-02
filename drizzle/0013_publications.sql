create type publication_status as enum ('PLANNED','READY','PUBLISHED','VERIFIED','FAILED','CANCELLED');
--> statement-breakpoint
create type publication_mode as enum ('CREATOR_PROFILE','CONTRACTOR_PROFILE','COLLAB');
--> statement-breakpoint
create table publications (
 id uuid primary key default gen_random_uuid(),
 deliverable_id uuid not null references deliverables(id) on delete restrict,
 approved_content_version_id uuid not null references content_versions(id) on delete restrict,
 engagement_id uuid not null references campaign_engagements(id) on delete restrict,
 campaign_id uuid not null references campaigns(id) on delete restrict,
 workspace_id uuid not null references workspaces(id) on delete restrict,
 creator_profile_id uuid not null references creator_profiles(id) on delete restrict,
 platform text not null,
 mode publication_mode not null,
 scheduled_at timestamptz,
 published_at timestamptz,
 proof_url text,
 status publication_status not null default 'PLANNED',
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(deliverable_id)
);
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000039','publication.view','View publications'),
('10000000-0000-0000-0000-000000000040','publication.manage','Plan and verify publications');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code like 'publication.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('MARKETING','SOCIAL_MEDIA','VIEWER') and p.code='publication.view';