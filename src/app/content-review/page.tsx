import { contentReviewListConfig, listWorkspaceContentVersions } from "@/server/application/operations/content-review";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { contentVersionStatusLabels, options } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";
import { ContentReviewTable } from "./content-review-table";

const sortOptions = [
  { value: "submitted_at", label: "Envio" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "deliverable", label: "Entrega" },
  { value: "status", label: "Situação" }
];

export default async function ContentReviewPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const raw = await searchParams;
  // First visit lands on the review queue; choosing "Todas" shows the whole history.
  const params = Object.keys(raw).length === 0 ? { ...raw, status: "SUBMITTED" } : raw;
  return renderWorkspacePage({
    capability: "contentReview",
    permissions: ["deliverable.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, contentReviewListConfig);
      const page = await listWorkspaceContentVersions(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">PRODUÇÃO</p>
              <h1>Revisão de conteúdo</h1>
              <p>Versões enviadas pelos Creators. A aprovação libera o planejamento da publicação; cada versão e decisão fica no histórico.</p>
            </div>
          </header>
          <section className="card compact-card">
            <h2>Versões de conteúdo</h2>
            <ListToolbar pathname="/content-review" query={query} sorts={sortOptions} statuses={options(contentVersionStatusLabels, contentReviewListConfig.statuses)} searchLabel="Buscar por campanha, Creator ou entrega" />
            <ContentReviewTable workspaceId={workspaceId} rows={page.rows} canReview={Boolean(can["deliverable.manage"])} />
            <Pager pathname="/content-review" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
