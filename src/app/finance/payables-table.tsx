"use client";

import type { FormEvent } from "react";
import type { WorkspacePayableRow } from "@/server/application/operations/payables";
import { formatDate, formatMinor } from "../format";
import { payableStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";

export function PayablesTable({ workspaceId, rows, canManage }: { workspaceId: string; rows: WorkspacePayableRow[]; canManage: boolean }) {
  const { message, busy, run } = useApiAction();
  const endpoint = (id: string) => `/api/workspaces/${workspaceId}/payables/${id}`;

  async function markPaid(event: FormEvent<HTMLFormElement>, row: WorkspacePayableRow) {
    event.preventDefault();
    const reference = String(new FormData(event.currentTarget).get("reference") ?? "");
    await run(endpoint(row.id), "PATCH", { action: "MARK_PAID", externalPaymentReference: reference }, "Não foi possível registrar o pagamento.");
  }

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhum pagamento encontrado</strong>
          <p>Crie o pagamento de uma contratação ativa em “Contratações sem pagamento”.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de pagamentos">
          <table>
            <thead>
              <tr>
                <th>Campanha / Creator</th>
                <th>Valor</th>
                <th>Publicações</th>
                <th>Situação</th>
                <th>Datas</th>
                <th>Referência</th>
                <th>Disputa</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.campaign_name}<br /><small>{row.creator_name}</small></td>
                  <td>{formatMinor(row.amount_minor, row.currency_code)}</td>
                  <td>{row.publications_verified}/{row.deliverables_required} verificadas</td>
                  <td><span className="status-badge">{payableStatusLabels[row.status] ?? "Indisponível"}</span></td>
                  <td>
                    Elegível: {formatDate(row.eligible_at)}
                    <br />
                    Liberado: {formatDate(row.released_at)}
                    <br />
                    Pago: {formatDate(row.paid_at)}
                  </td>
                  <td>{row.external_payment_reference ?? "—"}</td>
                  <td>{row.has_active_dispute ? <span className="status-badge">Em andamento</span> : "—"}</td>
                  <td>
                    <div className="row-actions">
                      {canManage && row.status === "PENDING" ? (
                        <button type="button" disabled={busy} onClick={() => void run(endpoint(row.id), "PATCH", { action: "REFRESH_ELIGIBILITY" }, "Não foi possível atualizar a elegibilidade.")}>
                          Verificar elegibilidade
                        </button>
                      ) : null}
                      {canManage && row.status === "ELIGIBLE" ? (
                        <button type="button" disabled={busy} onClick={() => void run(endpoint(row.id), "PATCH", { action: "RELEASE" }, "Não foi possível liberar o pagamento.")}>
                          Liberar pagamento
                        </button>
                      ) : null}
                      {canManage && row.status === "RELEASED" ? (
                        <details>
                          <summary>Registrar pagamento</summary>
                          <form className="form compact-form" onSubmit={(event) => void markPaid(event, row)}>
                            <label>
                              Referência do pagamento
                              <input name="reference" required maxLength={255} />
                            </label>
                            <button type="submit" disabled={busy}>Registrar pagamento</button>
                          </form>
                          <p className="inline-note">Nenhum pagamento real é executado aqui: o registro apenas guarda a referência informada.</p>
                        </details>
                      ) : null}
                      {!canManage || ["PAID", "CANCELLED"].includes(row.status) ? <span className="inline-note">Sem ações disponíveis</span> : null}
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
