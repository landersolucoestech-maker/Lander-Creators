alter table account add column if not exists access_token text;
--> statement-breakpoint
alter table account add column if not exists refresh_token text;
--> statement-breakpoint
alter table account add column if not exists access_token_expires_at timestamptz;
--> statement-breakpoint
alter table account add column if not exists refresh_token_expires_at timestamptz;
--> statement-breakpoint
alter table account add column if not exists scope text;
--> statement-breakpoint
alter table account add column if not exists id_token text;
