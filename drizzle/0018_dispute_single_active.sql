-- At most one active (OPEN / UNDER_REVIEW) dispute per engagement.
-- Additive and non-destructive: existing rows are never modified. If legacy data already
-- holds duplicate active disputes the index is skipped (service-level locking still enforces
-- the invariant) so the migration cannot fail or require data deletion.
do $$
begin
  if exists (
    select 1 from disputes
    where status in ('OPEN','UNDER_REVIEW')
    group by engagement_id
    having count(*) > 1
  ) then
    raise notice 'disputes_single_active_idx skipped: duplicate active disputes exist';
  else
    create unique index if not exists disputes_single_active_idx
      on disputes(engagement_id) where status in ('OPEN','UNDER_REVIEW');
  end if;
end
$$;
