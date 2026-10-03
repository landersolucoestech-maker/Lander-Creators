import { contractListConfig, listWorkspaceContracts } from "@/server/application/operations/engagements";
import { parseListQuery, type ListQueryInput } from "@/server/shared/list-query";
import { options, workspaceContractStatusLabels } from "../../post-campaign-labels";
import { ListToolbar, Pager } from "../../table-view";
import { renderWorkspacePage } from "../../workspace-page";
import { ContractsTable } from "./contracts-table";

const sortOptions = [
  { value: "updated_at", label: "Última atualização" },
  { value: "campaign", label: "Campanha" },
  { value: "creator", label: "Creator" },
  { value: "status", label: "Situação" },
  { value: "version", label: "Versão" }
];

export default async function WorkspaceContractsPage({ searchParams }: { searchParams: Promise<ListQueryInput> }) {
  const params = await searchParams;
  return renderWorkspacePage({
    capability: "engagements",
    permissions: ["engagement.manage"],
    load: async ({ client, userId, workspaceId, can }) => {
      const query = parseListQuery(params, contractListConfig);
      const page = await listWorkspaceContracts(client, { userId, workspaceId, query });
      return (
        <div className="module-surface">
          <header className="page-header">
            <div>
              <p className="eyebrow">OPERAÇÃO</p>
              <h1>Contratos</h1>
              <p>Contratos versionados das contratações. O Creator só vê um contrato depois que ele é enviado.</p>
            </div>
          </header>
          <section className="card compact-card">
            <h2>Contratos do workspace</h2>
            <ListToolbar pathname="/engagements/contracts" query={query} sorts={sortOptions} statuses={options(workspaceContractStatusLabels, contractListConfig.statuses)} searchLabel="Buscar por campanha ou Creator" />
            <ContractsTable workspaceId={workspaceId} rows={page.rows} canManage={Boolean(can["engagement.manage"])} />
            <Pager pathname="/engagements/contracts" query={query} total={page.total} pageCount={page.pageCount} />
          </section>
        </div>
      );
    }
  });
}
