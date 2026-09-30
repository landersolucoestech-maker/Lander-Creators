create type identity_status as enum ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','DISABLED','DELETED');
--> statement-breakpoint
create type workspace_type as enum ('LABEL','MANAGEMENT','COMPANY','AGENCY','INTERNAL');
--> statement-breakpoint
create type workspace_status as enum ('ACTIVE','SUSPENDED','DISABLED');
--> statement-breakpoint
create type membership_status as enum ('ACTIVE','SUSPENDED','REMOVED');
--> statement-breakpoint
create type role_kind as enum ('SYSTEM','CUSTOM');
--> statement-breakpoint
create type audit_actor_type as enum ('USER','SYSTEM','PLATFORM_STAFF','AI_AGENT','INTEGRATION');
--> statement-breakpoint
create type audit_origin as enum ('WEB','API','SYSTEM','INTEGRATION');
--> statement-breakpoint
create type authorization_scope_kind as enum ('WORKSPACE','OWN_RESOURCE','ASSIGNED_ARTIST','ASSIGNED_PROMOTED_ENTITY','ASSIGNED_CAMPAIGN');
--> statement-breakpoint
create table identity_profiles (
  user_id text primary key references "user"(id) on delete cascade,
  phone text,
  preferred_language text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  country text not null default 'BR',
  status identity_status not null default 'PENDING_VERIFICATION',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type workspace_type not null,
  status workspace_status not null default 'ACTIVE',
  created_by_user_id text not null references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create table roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  code text not null,
  name text not null,
  kind role_kind not null,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
create unique index roles_system_code_unique on roles(code) where workspace_id is null;
--> statement-breakpoint
create unique index roles_workspace_code_unique on roles(workspace_id, code) where workspace_id is not null;
--> statement-breakpoint
create table permission_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permission_definitions(id) on delete cascade,
  primary key(role_id, permission_id)
);
--> statement-breakpoint
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role_id uuid not null references roles(id),
  status membership_status not null default 'ACTIVE',
  activated_at timestamptz not null default now(),
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id)
);
--> statement-breakpoint
create index memberships_workspace_idx on memberships(workspace_id);
--> statement-breakpoint
create table user_context_preferences (
  user_id text primary key references "user"(id) on delete cascade,
  active_workspace_id uuid references workspaces(id) on delete set null,
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create table workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  recipient_email text not null,
  intended_role_id uuid not null references roles(id),
  token_hash text not null unique,
  invited_by_user_id text not null references "user"(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
create table membership_grants (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships(id) on delete cascade,
  permission_id uuid not null references permission_definitions(id) on delete cascade,
  scope authorization_scope_kind not null default 'WORKSPACE',
  scope_id text,
  granted_by_user_id text not null references "user"(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
create table workspace_creation_requests (
  user_id text not null references "user"(id),
  idempotency_key text not null,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, idempotency_key)
);
--> statement-breakpoint
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type audit_actor_type not null,
  actor_id text,
  workspace_id uuid references workspaces(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  delta jsonb,
  origin audit_origin not null,
  correlation_id text,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
insert into permission_definitions (id, code, description) values
('10000000-0000-0000-0000-000000000001','workspace.view','View Workspace settings and context'),
('10000000-0000-0000-0000-000000000002','workspace.update','Update Workspace settings'),
('10000000-0000-0000-0000-000000000003','workspace.security.manage','Manage Workspace security configuration'),
('10000000-0000-0000-0000-000000000004','workspace.ownership.transfer','Transfer Workspace ownership authority'),
('10000000-0000-0000-0000-000000000005','team.member.view','View Workspace members'),
('10000000-0000-0000-0000-000000000006','team.member.invite','Invite Workspace members'),
('10000000-0000-0000-0000-000000000007','team.member.update','Update Workspace members'),
('10000000-0000-0000-0000-000000000008','team.member.suspend','Suspend Workspace members'),
('10000000-0000-0000-0000-000000000009','team.member.remove','Remove Workspace members'),
('10000000-0000-0000-0000-000000000010','team.role.view','View role definitions'),
('10000000-0000-0000-0000-000000000011','team.role.assign','Assign member roles');
--> statement-breakpoint
insert into roles (id, workspace_id, code, name, kind) values
('20000000-0000-0000-0000-000000000001',null,'OWNER','Owner','SYSTEM'),
('20000000-0000-0000-0000-000000000002',null,'ADMIN','Admin','SYSTEM'),
('20000000-0000-0000-0000-000000000003',null,'CAMPAIGN_MANAGER','Campaign Manager','SYSTEM'),
('20000000-0000-0000-0000-000000000004',null,'MARKETING','Marketing','SYSTEM'),
('20000000-0000-0000-0000-000000000005',null,'SOCIAL_MEDIA','Social Media','SYSTEM'),
('20000000-0000-0000-0000-000000000006',null,'FINANCE','Finance','SYSTEM'),
('20000000-0000-0000-0000-000000000007',null,'VIEWER','Viewer','SYSTEM');
--> statement-breakpoint
insert into role_permissions (role_id, permission_id)
select '20000000-0000-0000-0000-000000000001'::uuid, id from permission_definitions;
--> statement-breakpoint
insert into role_permissions (role_id, permission_id)
select '20000000-0000-0000-0000-000000000002'::uuid, id
from permission_definitions where code <> 'workspace.ownership.transfer';
--> statement-breakpoint
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r cross join permission_definitions p
where r.code in ('CAMPAIGN_MANAGER','MARKETING','SOCIAL_MEDIA','FINANCE','VIEWER')
  and p.code in ('workspace.view','team.member.view','team.role.view');
