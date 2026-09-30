create extension if not exists pgcrypto;
--> statement-breakpoint
create table "user" (
  id text primary key,
  name text not null,
  email text not null,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create unique index user_email_unique on "user" (lower(email));
--> statement-breakpoint
create table session (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create index session_user_idx on session(user_id);
--> statement-breakpoint
create table account (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  account_id text not null,
  provider_id text not null,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, account_id)
);
--> statement-breakpoint
create table verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
