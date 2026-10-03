import Link from "next/link";
import { listWorkspaceMetricTargets, metricTargetListConfig } from "@/server/application/operations/analytics";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { ListToolbar, Pager } from "../../table-view";
import { renderWorkspacePage } from "../../workspace-page";
import { MetricsTable } from "./metrics-table";

const sortOptions = [
  { value: "updated_at", label: "Última atualização" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "views", label: "Visualizações registradas" }
];

export default async function MetricTargetsPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "analytics",
    permissions: ["analytics.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, metricTargetListConfig);
      const page = await listWorkspaceMetricTargets(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">RELATÓRIOS</p>
              <h1>Registro de métricas</h1>
              <p>Cada registro é um instantâneo imutável da publicação; o relatório usa sempre o mais recente.</p>
            </div>
            <Link className="button-link" href="/analytics">Voltar ao Analytics</Link>
          </header>
          <section className="card compact-card">
            <h2>Publicações publicadas ou verificadas</h2>
            <ListToolbar pathname="/analytics/publications" query={query} sorts={sortOptions} searchLabel="Buscar por campanha, Creator ou entrega" />
            <MetricsTable workspaceId={workspaceId} rows={page.rows} canManage={Boolean(can["analytics.manage"])} />
            <Pager pathname="/analytics/publications" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
