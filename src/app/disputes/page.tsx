import { disputeListConfig, listWorkspaceDisputes } from "@/server/dispute/service";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { disputeStatusLabels, options } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";
import { DisputesTable } from "./disputes-table";

const sortOptions = [
  { value: "updated_at", label: "Última atualização" },
  { value: "created_at", label: "Abertura" },
  { value: "status", label: "Situação" },
  { value: "creator", label: "Creator" },
  { value: "campaign", label: "Campanha" }
];

export default async function DisputesPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "disputes",
    permissions: ["dispute.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, disputeListConfig);
      const page = await listWorkspaceDisputes(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">OPERAÇÃO</p>
              <h1>Disputas</h1>
              <p>Disputas abertas pelos Creators sobre uma contratação. Cada contratação tem no máximo uma disputa ativa.</p>
            </div>
          </header>
          <section className="card compact-card">
            <div className="pending-decision" role="note">
              <strong>Regra aguardando decisão do proprietário</strong>
              <p>Uma disputa aberta ainda <em>não</em> bloqueia a liberação do pagamento da contratação.</p>
            </div>
            <h2>Disputas do workspace</h2>
            <ListToolbar pathname="/disputes" query={query} sorts={sortOptions} statuses={options(disputeStatusLabels, disputeListConfig.statuses)} searchLabel="Buscar por campanha, Creator ou motivo" />
            <DisputesTable workspaceId={workspaceId} rows={page.rows} canManage={Boolean(can["dispute.manage"])} />
            <Pager pathname="/disputes" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
