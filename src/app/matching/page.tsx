import Link from "next/link";
import { listCampaigns } from "@/server/campaign/service";
import { listWorkspaceMatches, matchListConfig } from "@/server/application/operations/matching";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { campaignStatusLabelsPt } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";
import { MatchesTable } from "./matches-table";

const sortOptions = [
  { value: "overall", label: "Fit geral" },
  { value: "music", label: "Music Fit" },
  { value: "audience", label: "Audience Fit" },
  { value: "creator_fit", label: "Creator Fit" },
  { value: "name", label: "Nome do Creator" }
];

export default async function MatchingPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "matching",
    permissions: ["matching.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const campaigns = (await listCampaigns(client, { userId, workspaceId })) as unknown as Array<{ id: string; name: string; status: string }>;
      const requested = Array.isArray(params.campaign) ? params.campaign[0] : params.campaign;
      const selected = campaigns.find((campaign) => campaign.id === requested) ?? campaigns[0] ?? null;
      const query = parseListQuery(params, matchListConfig);
      const page = selected ? await listWorkspaceMatches(client, { userId, workspaceId, campaignId: selected.id, query }) : null;
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">OPERAÇÃO</p>
              <h1>Matching</h1>
              <p>Pontuações determinísticas entre a campanha e os Creators elegíveis. São heurísticas de apoio à decisão, não fatos absolutos.</p>
            </div>
          </header>
          <section className="card compact-card">
            <div className="pending-decision" role="note">
              <strong>Regra aguardando decisão do proprietário</strong>
              <p>Cada recálculo substitui as pontuações atuais da campanha; o histórico de pontuações não é mantido.</p>
            </div>
            {selected ? (
              <>
                <form method="get" action="/matching" className="list-toolbar" aria-label="Escolher campanha">
                  <label>
                    Campanha
                    <select name="campaign" defaultValue={selected.id}>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaignStatusLabelsPt[campaign.status] ?? campaign.status}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Ver campanha</button>
                </form>
                <h2>Creators para “{selected.name}”</h2>
                <ListToolbar pathname="/matching" hidden={{ campaign: selected.id }} query={query} sorts={sortOptions} searchLabel="Buscar por nome do Creator" />
                <MatchesTable workspaceId={workspaceId} campaignId={selected.id} rows={page?.rows ?? []} canManage={Boolean(can["matching.manage"])} />
                {page ? <Pager pathname="/matching" hidden={{ campaign: selected.id }} query={query} total={page.total} pageCount={page.pageCount} /> : null}
              </>
            ) : (
              <div className="empty-state">
                <strong>Nenhuma campanha disponível</strong>
                <p>Crie uma campanha para calcular o matching.</p>
                <Link className="button-link" href="/campaigns">Ir para Campanhas</Link>
              </div>
            )}
          </section>
        </div>
      );
    }
  });
}
