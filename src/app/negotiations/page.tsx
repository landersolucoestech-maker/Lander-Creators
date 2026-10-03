import { listWorkspaceNegotiations, negotiationListConfig } from "@/server/application/operations/negotiations";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { options, participationStatusLabels } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";
import { NegotiationsTable } from "./negotiations-table";

const sortOptions = [
  { value: "updated_at", label: "Última atualização" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "status", label: "Situação" },
  { value: "amount", label: "Valor da proposta" }
];

export default async function NegotiationsPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "negotiations",
    permissions: ["participation.manage", "proposal.manage", "engagement.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, negotiationListConfig);
      const page = await listWorkspaceNegotiations(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">OPERAÇÃO</p>
              <h1>Negociações</h1>
              <p>Candidaturas e convites com a última rodada de proposta. Cada rodada permanece registrada no histórico.</p>
            </div>
          </header>
          <section className="card compact-card">
            <h2>Participações das campanhas</h2>
            <ListToolbar pathname="/negotiations" query={query} sorts={sortOptions} statuses={options(participationStatusLabels, negotiationListConfig.statuses)} searchLabel="Buscar por campanha ou Creator" />
            <NegotiationsTable
              workspaceId={workspaceId}
              rows={page.rows}
              can={{ participation: Boolean(can["participation.manage"]), proposal: Boolean(can["proposal.manage"]), engagement: Boolean(can["engagement.manage"]) }}
            />
            <Pager pathname="/negotiations" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
