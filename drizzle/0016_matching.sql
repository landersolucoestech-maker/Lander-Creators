create table campaign_creator_match_snapshots (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references campaigns(id) on delete cascade,
 creator_profile_id uuid not null references creator_profiles(id) on delete cascade,
 music_fit smallint not null check(music_fit between 0 and 100),
 audience_fit smallint not null check(audience_fit between 0 and 100),
 creator_fit smallint not null check(creator_fit between 0 and 100),
 overall_fit smallint not null check(overall_fit between 0 and 100),
 reasons jsonb not null default '[]'::jsonb,
 calculated_at timestamptz not null default now(),
 unique(campaign_id,creator_profile_id)
);
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000045','matching.view','View campaign creator matching'),
('10000000-0000-0000-0000-000000000046','matching.manage','Recalculate campaign creator matching');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER','MARKETING','SOCIAL_MEDIA','VIEWER') and p.code='matching.view';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code='matching.manage';