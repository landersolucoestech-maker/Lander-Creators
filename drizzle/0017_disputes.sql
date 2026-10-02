create type dispute_status as enum ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED');
--> statement-breakpoint
create table disputes(id uuid primary key default gen_random_uuid(),engagement_id uuid not null references campaign_engagements(id) on delete restrict,workspace_id uuid not null references workspaces(id) on delete restrict,creator_profile_id uuid not null references creator_profiles(id) on delete restrict,opened_by_user_id text not null references "user"(id) on delete restrict,reason text not null,details text,status dispute_status not null default 'OPEN',resolution text,resolved_by_user_id text references "user"(id) on delete restrict,resolved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
--> statement-breakpoint
create index disputes_workspace_status_idx on disputes(workspace_id,status,updated_at desc);
--> statement-breakpoint
insert into permission_definitions(id,code,description) values('10000000-0000-0000-0000-000000000047','dispute.view','View workspace disputes'),('10000000-0000-0000-0000-000000000048','dispute.manage','Review and resolve workspace disputes');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER','FINANCE','VIEWER') and p.code='dispute.view';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN') and p.code='dispute.manage';