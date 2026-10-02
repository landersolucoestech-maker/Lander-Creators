create table publication_metrics_snapshots (
 id uuid primary key default gen_random_uuid(),
 publication_id uuid not null references publications(id) on delete cascade,
 captured_at timestamptz not null default now(),
 views bigint not null default 0 check(views>=0),
 reach bigint not null default 0 check(reach>=0),
 impressions bigint not null default 0 check(impressions>=0),
 likes bigint not null default 0 check(likes>=0),
 comments bigint not null default 0 check(comments>=0),
 shares bigint not null default 0 check(shares>=0),
 saves bigint not null default 0 check(saves>=0),
 clicks bigint not null default 0 check(clicks>=0),
 source text not null,
 unique(publication_id,captured_at)
);
--> statement-breakpoint
create index publication_metrics_latest_idx on publication_metrics_snapshots(publication_id,captured_at desc);
--> statement-breakpoint
insert into permission_definitions(id,code,description) values
('10000000-0000-0000-0000-000000000043','analytics.view','View campaign analytics'),
('10000000-0000-0000-0000-000000000044','analytics.manage','Record campaign metric snapshots');
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER','MARKETING','SOCIAL_MEDIA','FINANCE','VIEWER') and p.code='analytics.view';
--> statement-breakpoint
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permission_definitions p where r.code in ('OWNER','ADMIN','CAMPAIGN_MANAGER') and p.code='analytics.manage';