# Taxonomy Model

Taxonomy is platform-level governed classification, distinct from lifecycle enums, standards-oriented Reference Data, tunable configuration, business policy and intentionally uncontrolled free text.

Etapa 4 implements:
- TaxonomyDefinition;
- TaxonomyValue;
- TaxonomyAlias;
- optional hierarchy with explicit maximum depth;
- ACTIVE / DEPRECATED lifecycle;
- replacement metadata;
- normalized alias resolution.

Initial definitions prove the engine without pretending future vocabularies are complete:
- MUSIC_GENRE — hierarchy enabled, maximum depth 2;
- CREATOR_NICHE — shallow hierarchy, maximum depth 2;
- CONTENT_STYLE — flat.

Canonical codes are stable English machine identifiers. User-facing labels are PT-BR. Display labels are never canonical identifiers.

Taxonomy mutation UI is deferred to future Platform Operations governance. Workspace users consume the current canonical registry read-only.
