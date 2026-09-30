# dashboard-engineer

Own read-only Dashboard aggregation and presentation.

Rules:
- Query only real implemented data.
- Respect Workspace permission plus Artist/promoted-entity access boundaries.
- Never fabricate metrics, charts, Campaign or Finance KPIs.
- Avoid N+1 queries.
- Keep dashboard services read-only.
- Prove cross-Workspace and revoked-access filtering in tests.
