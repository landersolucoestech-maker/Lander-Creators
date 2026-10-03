import { engagementListConfig, listWorkspaceEngagements } from "@/server/application/operations/engagements";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { engagementStatusLabels, options } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";
import { EngagementsTable } from "./engagements-table";

const sortOptions = [
  { value: "created_at", label: "Criação" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "status", label: "Situação" },
  { value: "amount", label: "Valor contratado" }
];

export default async function EngagementsPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "engagements",
    permissions: ["engagement.manage", "deliverable.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, engagementListConfig);
      const page = await listWorkspaceEngagements(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">OPERAÇÃO</p>
              <h1>Contratações</h1>
              <p>Contratações originadas de propostas aceitas, com o andamento de contrato, entregas, publicações e pagamento.</p>
            </div>
          </header>
          <section className="card compact-card">
            <h2>Contratações do workspace</h2>
            <ListToolbar pathname="/engagements" query={query} sorts={sortOptions} statuses={options(engagementStatusLabels, engagementListConfig.statuses)} searchLabel="Buscar por campanha, Creator ou escopo" />
            <EngagementsTable workspaceId={workspaceId} rows={page.rows} can={{ engagement: Boolean(can["engagement.manage"]), deliverable: Boolean(can["deliverable.manage"]) }} />
            <Pager pathname="/engagements" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
