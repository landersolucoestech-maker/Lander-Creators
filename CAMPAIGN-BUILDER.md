# Campaign Builder

The builder is persistence-backed and resumable. Each Campaign owns ten step-progress rows; meaningful updates write typed Campaign tables and increment revision for stale-write protection.

1. **Objeto promovido** — one accessible registry-backed object; changing it invalidates later completion and goal.
2. **Objetivo e contexto** — Campaign name, controlled compatible goal, narrative and optional safe CTA.
3. **Creators e público** — Taxonomy/Reference Data criteria, TikTok/Instagram/YouTube and optional audience range. No ranking or Matching.
4. **Conteúdo e publicações** — planned platform/format/quantity/publication/UGC requirements only. No Deliverable or Publication rows.
5. **Briefing e arquivos** — untrusted plain text plus Workspace Shared Media references. No duplicate storage.
6. **Período** — FIXED/EVERGREEN, dates and Reference Data timezone; recruitment windows are configuration only.
7. **Orçamento e capacidade** — BRL minor units and Creator-count planning. No ledger, payable, reservation or settlement.
8. **Direitos e termos** — structured policy expectations only. No contract or CampaignEngagementTerms.
9. **Analytics e rastreamento** — safe target URL, UTM and measurement intent only. No metrics collection or outbound fetch.
10. **Revisão e ativação** — summary, structured readiness and explicit activation. Builder completion never auto-activates.

Navigation supports previous, next, save and leave, and return later. Step completion is distinct from Campaign status and visiting a step does not mark it complete.
