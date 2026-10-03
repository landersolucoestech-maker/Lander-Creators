import Link from "next/link";
import { listWorkspacePlannableDeliverables, listWorkspacePublications, plannableListConfig, publicationListConfig } from "@/server/application/operations/publications";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { options, publicationStatusLabels } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";
import { PublicationsTable } from "./publications-table";

const sortOptions = [
  { value: "updated_at", label: "Última atualização" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "deliverable", label: "Entrega" },
  { value: "status", label: "Situação" }
];

export default async function PublicationsPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "publications",
    permissions: ["publication.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, publicationListConfig);
      const page = await listWorkspacePublications(client, { userId, workspaceId, query });
      const waiting = await listWorkspacePlannableDeliverables(client, { userId, workspaceId, query: parseListQuery({ pageSize: "1" }, plannableListConfig) });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">PRODUÇÃO</p>
              <h1>Publicações</h1>
              <p>A publicação é obrigatória para entregas aprovadas. O Creator envia a comprovação e o contratante verifica.</p>
            </div>
            <Link className="button-link" href="/publications/planning">
              Entregas aprovadas sem publicação ({waiting.total})
            </Link>
          </header>
          <section className="card compact-card">
            <h2>Publicações planejadas</h2>
            <ListToolbar pathname="/publications" query={query} sorts={sortOptions} statuses={options(publicationStatusLabels, publicationListConfig.statuses)} searchLabel="Buscar por campanha, Creator ou entrega" />
            <PublicationsTable workspaceId={workspaceId} rows={page.rows} canManage={Boolean(can["publication.manage"])} />
            <Pager pathname="/publications" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
