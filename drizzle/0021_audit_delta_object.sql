-- Several writers serialized `delta` twice (JSON.stringify + driver jsonb serialization), storing a JSON
-- *string* instead of an object. Normalize on insert so every new audit row is a queryable object.
-- Additive: no existing audit row is rewritten (audit evidence stays immutable).
create or replace function audit_logs_normalize_delta() returns trigger as $$
begin
  if new.delta is not null and jsonb_typeof(new.delta) = 'string' then
    begin
      new.delta := (new.delta #>> '{}')::jsonb;
    exception when others then
      -- not valid JSON text: keep the original value untouched
      null;
    end;
  end if;
  return new;
end;
$$ language plpgsql;
--> statement-breakpoint
drop trigger if exists audit_logs_normalize_delta_trg on audit_logs;
--> statement-breakpoint
create trigger audit_logs_normalize_delta_trg
  before insert on audit_logs
  for each row execute function audit_logs_normalize_delta();
