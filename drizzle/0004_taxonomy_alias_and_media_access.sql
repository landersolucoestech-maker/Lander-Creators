alter table taxonomy_aliases add column taxonomy_definition_id uuid;
--> statement-breakpoint
update taxonomy_aliases ta
set taxonomy_definition_id = tv.taxonomy_definition_id
from taxonomy_values tv
where tv.id = ta.taxonomy_value_id;
--> statement-breakpoint
alter table taxonomy_aliases alter column taxonomy_definition_id set not null;
--> statement-breakpoint
alter table taxonomy_aliases add constraint taxonomy_aliases_definition_fk foreign key (taxonomy_definition_id) references taxonomy_definitions(id) on delete cascade;
--> statement-breakpoint
drop index if exists taxonomy_aliases_value_unique;
--> statement-breakpoint
alter table taxonomy_aliases drop constraint if exists taxonomy_aliases_taxonomy_value_id_normalized_alias_key;
--> statement-breakpoint
create unique index taxonomy_aliases_definition_alias_unique on taxonomy_aliases(taxonomy_definition_id, normalized_alias);
