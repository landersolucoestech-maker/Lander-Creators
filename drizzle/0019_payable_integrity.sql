-- Payable integrity (additive; existing rows are never modified).
-- 1) A payment reference identifies one payment: unique per workspace when present.
--    Skipped with a notice if legacy duplicates exist, so the migration cannot fail or force data deletion.
do $$
begin
  if exists (
    select 1 from campaign_payables
    where external_payment_reference is not null
    group by workspace_id, external_payment_reference
    having count(*) > 1
  ) then
    raise notice 'campaign_payables_external_ref_uidx skipped: duplicate references exist';
  else
    create unique index if not exists campaign_payables_external_ref_uidx
      on campaign_payables(workspace_id, external_payment_reference)
      where external_payment_reference is not null;
  end if;
end
$$;
--> statement-breakpoint
-- 2) New PAID rows must carry a paid_at and a reference; NOT VALID leaves legacy rows untouched.
alter table campaign_payables
  add constraint campaign_payables_paid_evidence_ck
  check (status <> 'PAID' or (paid_at is not null and external_payment_reference is not null)) not valid;
--> statement-breakpoint
alter table campaign_payables
  add constraint campaign_payables_currency_ck
  check (currency_code ~ '^[A-Z]{3}$') not valid;
