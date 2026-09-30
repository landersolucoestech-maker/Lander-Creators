# Reference Data

Reference Data is separate from business taxonomy and is not user-created.

Etapa 4 implements deterministic registries for:
- languages;
- countries;
- currencies;
- IANA timezone identifiers.

Bootstrap is idempotent and safe to rerun.

The currency registry includes BRL, USD and EUR as standard reference codes. This does not implement product-level multicurrency. V1 financial business semantics remain BRL until a later explicit product decision changes them.
