import Link from "next/link";
import { listWorkspacePlannableDeliverables, plannableListConfig } from "@/server/application/operations/publications";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { ListToolbar, Pager } from "../../table-view";
import { renderWorkspacePage } from "../../workspace-page";
import { PlanningTable } from "./planning-table";

const sortOptions = [
  { value: "approved_at", label: "Aprovação" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "deliverable", label: "Entrega" }
];

export default async function PublicationPlanningPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "publications",
    permissions: ["publication.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, plannableListConfig);
      const page = await listWorkspacePlannableDeliverables(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">PRODUÇÃO</p>
              <h1>Planejamento de publicações</h1>
              <p>Entregas com conteúdo aprovado que ainda não têm publicação planejada.</p>
            </div>
            <Link className="button-link" href="/publications">Voltar às publicações</Link>
          </header>
          <section className="card compact-card">
            <h2>Entregas aprovadas sem publicação</h2>
            <ListToolbar pathname="/publications/planning" query={query} sorts={sortOptions} searchLabel="Buscar por campanha, Creator ou entrega" />
            <PlanningTable workspaceId={workspaceId} rows={page.rows} canManage={Boolean(can["publication.manage"])} />
            <Pager pathname="/publications/planning" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
