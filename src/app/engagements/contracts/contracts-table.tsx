"use client";

import type { WorkspaceContractRow } from "@/server/application/operations/engagements";
import { formatDate, formatMinor } from "../../format";
import { workspaceContractStatusLabels } from "../../post-campaign-labels";
import { useApiAction } from "../../use-api-action";

export function ContractsTable({ workspaceId, rows, canManage }: { workspaceId: string; rows: WorkspaceContractRow[]; canManage: boolean }) {
  const { message, busy, run } = useApiAction();
  const base = `/api/workspaces/${workspaceId}/contracts`;

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhum contrato encontrado</strong>
          <p>Crie o contrato a partir de uma contratação em rascunho.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de contratos">
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Creator</th>
                <th>Versão</th>
                <th>Valor</th>
                <th>Termos</th>
                <th>Situação</th>
                <th>Assinaturas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.campaign_name}</td>
                  <td>{row.creator_name}</td>
                  <td>{row.version}</td>
                  <td>{formatMinor(row.amount_minor, row.currency_code)}</td>
                  <td>
                    <details>
                      <summary>Ver termos</summary>
                      <p><strong>Escopo:</strong> {row.scope_of_work}</p>
                      <p><strong>Direitos de uso:</strong> {row.rights_terms}</p>
                      <p><strong>Pagamento:</strong> {row.payment_terms}</p>
                    </details>
                  </td>
                  <td><span className="status-badge">{workspaceContractStatusLabels[row.status] ?? "Indisponível"}</span></td>
                  <td>
                    Creator: {formatDate(row.creator_signed_at)}
                    <br />
                    Contratante: {formatDate(row.workspace_signed_at)}
                  </td>
                  <td>
                    <div className="row-actions">
                      {canManage && row.status === "DRAFT" ? (
                        <button type="button" disabled={busy} onClick={() => void run(`${base}/${row.id}/send`, "POST", undefined, "Não foi possível enviar o contrato.")}>
                          Enviar ao Creator
                        </button>
                      ) : null}
                      {canManage && row.status === "SIGNED_CREATOR" ? (
                        <button type="button" disabled={busy} onClick={() => void run(`${base}/${row.id}/sign`, "POST", undefined, "Não foi possível assinar o contrato.")}>
                          Assinar como contratante
                        </button>
                      ) : null}
                      {!(canManage && ["DRAFT", "SIGNED_CREATOR"].includes(row.status)) ? <span className="inline-note">Sem ações disponíveis</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
