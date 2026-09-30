# Reference Data

Reference Data is separate from business taxonomy and is not user-created.

Etapa 4 implements deterministic registries for:
- languages;
- countries;
- currencies;
- IANA timezone identifiers.

The current seed is intentionally a minimal deterministic bootstrap proving the registry and lookup model; it is not represented as a complete worldwide standards catalogue.

Current bootstrap includes:
- languages: pt-BR, en, es;
- countries: BR, US, AR;
- currencies: BRL, USD, EUR;
- timezones: America/Sao_Paulo, America/New_York, UTC.

Bootstrap is idempotent and safe to rerun. CI executes it twice.

The currency registry supporting multiple standard codes does not implement product-level multicurrency. V1 financial business semantics remain BRL until a later explicit product decision changes them.

Reference mutation remains system/governed and is not exposed through ordinary Workspace UI in Etapa 4.
