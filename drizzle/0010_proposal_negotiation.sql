create type campaign_proposal_status as enum ('PENDING_CREATOR','PENDING_WORKSPACE','ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED');
--> statement-breakpoint
create table campaign_proposals (
 id uuid primary key default gen_random_uuid(),
 participation_id uuid not null references campaign_participations(id) on delete cascade,
 workspace_id uuid not null references workspaces(id) on delete cascade,
 creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
 round integer not null check(round>0),
 proposed_by text not null check(proposed_by in ('WORKSPACE','CREATOR')),
 amount_minor bigint not null check(amount_minor>=0),
 currency_code varchar(3) not null,
 scope_summary text not null,
 rights_summary text,
 status campaign_proposal_status not null,
 created_by_user_id text not null references "user"(id) on delete restrict,
 responded_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(participation_id,round)
);
--> statement-breakpoint
create unique index campaign_proposals_one_open_round on campaign_proposals(participation_id) where status in ('PENDING_CREATOR','PENDING_WORKSPACE');
--> statement-breakpoint
create index campaign_proposals_workspace_idx on campaign_proposals(workspace_id,status,updated_at desc);
--> statement-breakpoint
create index campaign_proposals_creator_idx on campaign_proposals(creator_profile_id,status,updated_at desc);
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000033','proposal.view','View campaign proposals'),
('10000000-0000-0000-0000-000000000034','proposal.manage','Create and respond to campaign proposals');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code like 'proposal.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('MARKETING','SOCIAL_MEDIA','VIEWER') and p.code='proposal.view';