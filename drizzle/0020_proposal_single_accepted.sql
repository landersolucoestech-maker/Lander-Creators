-- At most one ACCEPTED proposal per participation (additive; no data is modified).
-- Skipped with a notice if legacy duplicates exist; the services also serialize on the participation row.
do $$
begin
  if exists (
    select 1 from campaign_proposals
    where status = 'ACCEPTED'
    group by participation_id
    having count(*) > 1
  ) then
    raise notice 'campaign_proposals_single_accepted_idx skipped: duplicate accepted proposals exist';
  else
    create unique index if not exists campaign_proposals_single_accepted_idx
      on campaign_proposals(participation_id) where status = 'ACCEPTED';
  end if;
end
$$;
