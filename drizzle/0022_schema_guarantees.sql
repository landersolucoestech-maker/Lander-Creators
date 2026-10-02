-- Visibility for integrity guarantees that migrations 0018-0020 may have skipped because legacy data
-- already violated them. Additive: it never modifies business rows.
--
--   select * from refresh_schema_guarantees();      -- diagnose and record the current state (migration 0022 runs it with apply = true)
--   select * from refresh_schema_guarantees(true);  -- additionally create/validate guarantees that now have 0 conflicts
--
-- Statuses: APPLIED / VALIDATED (enforced), SKIPPED_LEGACY_CONFLICTS (index missing, conflicting rows exist),
-- MISSING (index missing, no conflicts: safe to create with apply = true) and NOT_VALIDATED
-- (NOT VALID constraint: new rows are checked, legacy rows violate it).
create table if not exists schema_guarantees (
  name text primary key,
  kind text not null check (kind in ('UNIQUE_INDEX', 'CHECK_CONSTRAINT')),
  table_name text not null,
  status text not null check (status in ('APPLIED', 'VALIDATED', 'SKIPPED_LEGACY_CONFLICTS', 'MISSING', 'NOT_VALIDATED')),
  conflict_count integer not null default 0 check (conflict_count >= 0),
  reason text,
  remediation text,
  checked_at timestamptz not null default now()
);
--> statement-breakpoint
create or replace function refresh_schema_guarantees(apply boolean default false)
returns setof schema_guarantees as $fn$
declare
  g record;
  conflicts integer;
  present boolean;
  new_status text;
  new_reason text;
begin
  for g in
    select * from (values
      (
        'disputes_single_active_idx', 'disputes',
        'create unique index disputes_single_active_idx on disputes(engagement_id) where status in (''OPEN'',''UNDER_REVIEW'')',
        'select coalesce(sum(n - 1), 0)::int from (select count(*) n from disputes where status in (''OPEN'',''UNDER_REVIEW'') group by engagement_id having count(*) > 1) x',
        'Close or resolve the extra active disputes of each affected engagement through the dispute workflow, then run: select * from refresh_schema_guarantees(true);'
      ),
      (
        'campaign_payables_external_ref_uidx', 'campaign_payables',
        'create unique index campaign_payables_external_ref_uidx on campaign_payables(workspace_id, external_payment_reference) where external_payment_reference is not null',
        'select coalesce(sum(n - 1), 0)::int from (select count(*) n from campaign_payables where external_payment_reference is not null group by workspace_id, external_payment_reference having count(*) > 1) x',
        'Review payables sharing a payment reference inside the same workspace and correct the wrong references through finance operations, then run: select * from refresh_schema_guarantees(true);'
      ),
      (
        'campaign_proposals_single_accepted_idx', 'campaign_proposals',
        'create unique index campaign_proposals_single_accepted_idx on campaign_proposals(participation_id) where status = ''ACCEPTED''',
        'select coalesce(sum(n - 1), 0)::int from (select count(*) n from campaign_proposals where status = ''ACCEPTED'' group by participation_id having count(*) > 1) x',
        'Review participations with more than one ACCEPTED proposal and decide which round is the accepted one, then run: select * from refresh_schema_guarantees(true);'
      )
    ) as t(name, table_name, create_sql, conflict_sql, remediation)
  loop
    execute g.conflict_sql into conflicts;
    present := exists (select 1 from pg_indexes where schemaname = current_schema() and indexname = g.name);
    new_reason := null;
    if present then
      new_status := 'APPLIED';
    elsif conflicts > 0 then
      new_status := 'SKIPPED_LEGACY_CONFLICTS';
      new_reason := format('Index not applied: %s conflicting row(s) in %s violate it. No data was changed.', conflicts, g.table_name);
    elsif apply then
      execute g.create_sql;
      new_status := 'APPLIED';
      new_reason := 'Created by refresh_schema_guarantees(true) after conflicts were resolved.';
    else
      new_status := 'MISSING';
      new_reason := 'Index not applied but no conflicting rows remain; run refresh_schema_guarantees(true) to create it.';
    end if;
    insert into schema_guarantees(name, kind, table_name, status, conflict_count, reason, remediation, checked_at)
    values (g.name, 'UNIQUE_INDEX', g.table_name, new_status, conflicts, new_reason,
            case when new_status = 'APPLIED' then null else g.remediation end, now())
    on conflict (name) do update set
      kind = excluded.kind, table_name = excluded.table_name, status = excluded.status,
      conflict_count = excluded.conflict_count, reason = excluded.reason,
      remediation = excluded.remediation, checked_at = excluded.checked_at;
  end loop;

  for g in
    select * from (values
      (
        'campaign_payables_paid_evidence_ck', 'campaign_payables',
        'select count(*)::int from campaign_payables where status = ''PAID'' and (paid_at is null or external_payment_reference is null)',
        'Legacy PAID payables without paid_at or payment reference: fill the missing evidence through finance operations, then run: select * from refresh_schema_guarantees(true);'
      ),
      (
        'campaign_payables_currency_ck', 'campaign_payables',
        'select count(*)::int from campaign_payables where currency_code !~ ''^[A-Z]{3}$''',
        'Legacy payables with a malformed currency code: correct them to ISO 4217 codes, then run: select * from refresh_schema_guarantees(true);'
      )
    ) as t(name, table_name, conflict_sql, remediation)
  loop
    execute g.conflict_sql into conflicts;
    select c.convalidated into present
      from pg_constraint c join pg_class r on r.oid = c.conrelid
      where c.conname = g.name and r.relname = g.table_name;
    new_reason := null;
    if present is null then
      new_status := 'NOT_VALIDATED';
      new_reason := 'Constraint does not exist.';
    elsif present then
      new_status := 'VALIDATED';
    elsif conflicts = 0 and apply then
      execute format('alter table %I validate constraint %I', g.table_name, g.name);
      new_status := 'VALIDATED';
      new_reason := 'Validated by refresh_schema_guarantees(true) after legacy rows were corrected.';
    else
      new_status := 'NOT_VALIDATED';
      new_reason := format('Constraint enforced for new rows only: %s legacy row(s) violate it. No data was changed.', conflicts);
    end if;
    insert into schema_guarantees(name, kind, table_name, status, conflict_count, reason, remediation, checked_at)
    values (g.name, 'CHECK_CONSTRAINT', g.table_name, new_status, conflicts, new_reason,
            case when new_status = 'VALIDATED' then null else g.remediation end, now())
    on conflict (name) do update set
      kind = excluded.kind, table_name = excluded.table_name, status = excluded.status,
      conflict_count = excluded.conflict_count, reason = excluded.reason,
      remediation = excluded.remediation, checked_at = excluded.checked_at;
  end loop;

  return query select * from schema_guarantees order by name;
end;
$fn$ language plpgsql;
--> statement-breakpoint
select * from refresh_schema_guarantees(true);
