"use client";

import type { PayableCandidateRow } from "@/server/application/operations/payables";
import { formatMinor } from "../../format";
import { useApiAction } from "../../use-api-action";

export function CandidatesTable({ workspaceId, rows, canManage }: { workspaceId: string; rows: PayableCandidateRow[]; canManage: boolean }) {
  const { message, busy, run } = useApiAction();
  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma contratação aguardando pagamento</strong>
          <p>Todas as contratações ativas já têm um pagamento criado.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de contratações sem pagamento">
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Creator</th>
                <th>Valor contratado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.engagement_id}>
                  <td>{row.campaign_name}</td>
                  <td>{row.creator_name}</td>
                  <td>{formatMinor(row.amount_minor, row.currency_code)}</td>
                  <td>
                    {canManage ? (
                      <button type="button" disabled={busy} onClick={() => void run(`/api/workspaces/${workspaceId}/engagements/${row.engagement_id}/payable`, "POST", undefined, "Não foi possível criar o pagamento.")}>
                        Criar pagamento
                      </button>
                    ) : (
                      <span className="inline-note">Sem permissão para criar</span>
                    )}
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
