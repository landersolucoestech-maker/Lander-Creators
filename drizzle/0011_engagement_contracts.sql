create type campaign_engagement_status as enum ('DRAFT','PENDING_CREATOR_SIGNATURE','PENDING_WORKSPACE_SIGNATURE','ACTIVE','CANCELLED','COMPLETED');
--> statement-breakpoint
create table campaign_engagements (
 id uuid primary key default gen_random_uuid(),
 participation_id uuid not null unique references campaign_participations(id) on delete restrict,
 accepted_proposal_id uuid not null unique references campaign_proposals(id) on delete restrict,
 campaign_id uuid not null references campaigns(id) on delete restrict,
 workspace_id uuid not null references workspaces(id) on delete restrict,
 creator_profile_id uuid not null references creator_profiles(id) on delete restrict,
 status campaign_engagement_status not null default 'DRAFT',
 contracted_amount_minor bigint not null check(contracted_amount_minor>=0),
 currency_code varchar(3) not null,
 scope_snapshot text not null,
 rights_snapshot text,
 created_by_user_id text not null references "user"(id) on delete restrict,
 activated_at timestamptz,
 cancelled_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
--> statement-breakpoint
create type engagement_contract_status as enum ('DRAFT','SENT','SIGNED_CREATOR','SIGNED_WORKSPACE','EXECUTED','VOID');
--> statement-breakpoint
create table engagement_contracts (
 id uuid primary key default gen_random_uuid(),
 engagement_id uuid not null references campaign_engagements(id) on delete cascade,
 version integer not null check(version>0),
 status engagement_contract_status not null default 'DRAFT',
 scope_of_work text not null,
 rights_terms text not null,
 payment_terms text not null,
 creator_signed_at timestamptz,
 workspace_signed_at timestamptz,
 executed_at timestamptz,
 voided_at timestamptz,
 created_by_user_id text not null references "user"(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(engagement_id,version)
);
--> statement-breakpoint
create unique index engagement_contracts_one_live on engagement_contracts(engagement_id) where status in ('DRAFT','SENT','SIGNED_CREATOR','SIGNED_WORKSPACE');
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000035','engagement.view','View campaign engagements'),
('10000000-0000-0000-0000-000000000036','engagement.manage','Create and manage campaign engagements and contracts');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code like 'engagement.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('MARKETING','SOCIAL_MEDIA','FINANCE','VIEWER') and p.code='engagement.view';