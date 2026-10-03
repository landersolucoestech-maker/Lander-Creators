import Link from "next/link";
import { listWorkspacePayableCandidates, payableCandidateListConfig } from "@/server/application/operations/payables";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { ListToolbar, Pager } from "../../table-view";
import { renderWorkspacePage } from "../../workspace-page";
import { CandidatesTable } from "./candidates-table";

const sortOptions = [
  { value: "created_at", label: "Criação da contratação" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" }
];

export default async function PayableCandidatesPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "finance",
    permissions: ["finance.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, payableCandidateListConfig);
      const page = await listWorkspacePayableCandidates(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">FINANCEIRO</p>
              <h1>Contratações sem pagamento</h1>
              <p>Contratações ativas ou concluídas que ainda não têm pagamento criado.</p>
            </div>
            <Link className="button-link" href="/finance">Voltar aos pagamentos</Link>
          </header>
          <section className="card compact-card">
            <h2>Aguardando criação do pagamento</h2>
            <ListToolbar pathname="/finance/candidates" query={query} sorts={sortOptions} searchLabel="Buscar por campanha ou Creator" />
            <CandidatesTable workspaceId={workspaceId} rows={page.rows} canManage={Boolean(can["finance.manage"])} />
            <Pager pathname="/finance/candidates" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
