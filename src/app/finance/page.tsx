import Link from "next/link";
import { listWorkspacePayableCandidates, listWorkspacePayables, payableCandidateListConfig, payableListConfig } from "@/server/application/operations/payables";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { options, payableStatusLabels } from "../post-campaign-labels";
import { ListToolbar, Pager } from "../table-view";
import { renderWorkspacePage } from "../workspace-page";
import { PayablesTable } from "./payables-table";

const sortOptions = [
  { value: "updated_at", label: "Última atualização" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "status", label: "Situação" },
  { value: "amount", label: "Valor" }
];

export default async function FinancePage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "finance",
    permissions: ["finance.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, payableListConfig);
      const page = await listWorkspacePayables(client, { userId, workspaceId, query });
      const candidates = await listWorkspacePayableCandidates(client, { userId, workspaceId, query: parseListQuery({ pageSize: "1" }, payableCandidateListConfig) });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">FINANCEIRO</p>
              <h1>Pagamentos</h1>
              <p>Execução financeira das contratações. O pagamento só é liberado quando todas as publicações exigidas estão verificadas.</p>
            </div>
            <Link className="button-link" href="/finance/candidates">
              Contratações sem pagamento ({candidates.total})
            </Link>
          </header>
          <section className="card compact-card">
            <div className="pending-decision" role="note">
              <strong>Regras aguardando decisão do proprietário</strong>
              <p>Hoje uma disputa aberta <em>não</em> bloqueia a liberação do pagamento, e a mesma pessoa pode liberar e registrar o pagamento. A coluna Disputa mostra quando há disputa em andamento.</p>
            </div>
            <h2>Pagamentos do workspace</h2>
            <ListToolbar pathname="/finance" query={query} sorts={sortOptions} statuses={options(payableStatusLabels, payableListConfig.statuses)} searchLabel="Buscar por campanha, Creator ou referência" />
            <PayablesTable workspaceId={workspaceId} rows={page.rows} canManage={Boolean(can["finance.manage"])} />
            <Pager pathname="/finance" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
