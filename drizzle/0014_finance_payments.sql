create type payable_status as enum ('PENDING','ELIGIBLE','RELEASED','PAID','CANCELLED');
--> statement-breakpoint
create table campaign_payables (
 id uuid primary key default gen_random_uuid(),
 engagement_id uuid not null unique references campaign_engagements(id) on delete restrict,
 campaign_id uuid not null references campaigns(id) on delete restrict,
 workspace_id uuid not null references workspaces(id) on delete restrict,
 creator_profile_id uuid not null references creator_profiles(id) on delete restrict,
 amount_minor bigint not null check(amount_minor>=0),
 currency_code varchar(3) not null,
 status payable_status not null default 'PENDING',
 eligible_at timestamptz,
 released_at timestamptz,
 paid_at timestamptz,
 external_payment_reference text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000041','finance.view','View campaign payables'),
('10000000-0000-0000-0000-000000000042','finance.manage','Release and record campaign payments');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','FINANCE') and p.code like 'finance.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('CAMPAIGN_MANAGER','VIEWER') and p.code='finance.view';