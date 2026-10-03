import Link from "next/link";
import { campaignAnalyticsListConfig, listWorkspaceCampaignAnalytics } from "@/server/application/operations/analytics";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { campaignStatusLabelsPt } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";

const sortOptions = [
  { value: "name", label: "Campanha" },
  { value: "status", label: "Situação" },
  { value: "views", label: "Visualizações" },
  { value: "publications", label: "Publicações" }
];

const nf = new Intl.NumberFormat("pt-BR");
const count = (value: string) => (/^\d+$/.test(value) ? nf.format(BigInt(value)) : "—");

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "analytics",
    load: async ({ client, userId, workspaceId }) => {
      const query = parseListQuery(params, campaignAnalyticsListConfig);
      const page = await listWorkspaceCampaignAnalytics(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">RELATÓRIOS</p>
              <h1>Analytics</h1>
              <p>Resultado das publicações por campanha, somando o último registro de métricas de cada publicação.</p>
            </div>
            <Link className="button-link" href="/analytics/publications">Registrar métricas</Link>
          </header>
          <section className="card compact-card">
            <div className="pending-decision" role="note">
              <strong>Origem dos números</strong>
              <p>As métricas das redes sociais ainda não estão conectadas. Os valores abaixo vêm de registros manuais; publicações sem registro aparecem como “sem métricas” e não entram na soma.</p>
            </div>
            <h2>Campanhas</h2>
            <ListToolbar pathname="/analytics" query={query} sorts={sortOptions} searchLabel="Buscar por campanha" />
            {page.rows.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma campanha encontrada</strong>
                <p>Os resultados aparecem quando houver campanhas com publicações.</p>
              </div>
            ) : (
              <div className="table-scroll" tabIndex={0} aria-label="Tabela de analytics por campanha">
                <table>
                  <thead>
                    <tr>
                      <th>Campanha</th>
                      <th>Situação</th>
                      <th>Publicações</th>
                      <th>Com métricas</th>
                      <th>Visualizações</th>
                      <th>Alcance</th>
                      <th>Impressões</th>
                      <th>Curtidas</th>
                      <th>Comentários</th>
                      <th>Compartilhamentos</th>
                      <th>Salvamentos</th>
                      <th>Cliques</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td><span className="status-badge">{campaignStatusLabelsPt[row.status] ?? row.status}</span></td>
                        <td>{row.publications} ({row.verified_publications} verificadas)</td>
                        <td>{row.with_metrics === 0 && row.publications > 0 ? "sem métricas" : `${row.with_metrics}/${row.publications}`}</td>
                        <td>{count(row.views)}</td>
                        <td>{count(row.reach)}</td>
                        <td>{count(row.impressions)}</td>
                        <td>{count(row.likes)}</td>
                        <td>{count(row.comments)}</td>
                        <td>{count(row.shares)}</td>
                        <td>{count(row.saves)}</td>
                        <td>{count(row.clicks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pager pathname="/analytics" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
