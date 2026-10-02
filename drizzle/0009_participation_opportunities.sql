create type campaign_participation_status as enum ('INVITED','APPLIED','SHORTLISTED','DECLINED','REJECTED','WITHDRAWN','ACCEPTED');
--> statement-breakpoint
create type campaign_participation_origin as enum ('DIRECT_INVITATION','APPLICATION');
--> statement-breakpoint
create table campaign_participations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
  origin campaign_participation_origin not null,
  status campaign_participation_status not null,
  message text,
  invited_by_user_id text references "user"(id) on delete restrict,
  applied_at timestamptz,
  invited_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id,creator_profile_id)
);
--> statement-breakpoint
create index campaign_participations_campaign_idx on campaign_participations(campaign_id,status,updated_at desc);
--> statement-breakpoint
create index campaign_participations_creator_idx on campaign_participations(creator_profile_id,status,updated_at desc);
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000031','participation.view','View campaign participations'),
('10000000-0000-0000-0000-000000000032','participation.manage','Manage campaign invitations and shortlist');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code like 'participation.%';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('MARKETING','SOCIAL_MEDIA','VIEWER') and p.code='participation.view';