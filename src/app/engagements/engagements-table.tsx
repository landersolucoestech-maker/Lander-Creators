"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import type { EngagementRow } from "@/server/application/operations/engagements";
import { formatDate, formatMinor } from "../format";
import { contentFormatLabels, engagementStatusLabels, payableStatusLabels, platformLabels, workspaceContractStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";

type Can = { engagement: boolean; deliverable: boolean };

export function EngagementsTable({ workspaceId, rows, can }: { workspaceId: string; rows: EngagementRow[]; can: Can }) {
  const { message, busy, run } = useApiAction();
  const base = `/api/workspaces/${workspaceId}/engagements`;

  async function createContract(event: FormEvent<HTMLFormElement>, row: EngagementRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      `${base}/${row.id}/contracts`,
      "POST",
      { scopeOfWork: String(form.get("scope") ?? ""), rightsTerms: String(form.get("rights") ?? ""), paymentTerms: String(form.get("payment") ?? "") },
      "Não foi possível criar o contrato."
    );
  }

  async function createDeliverable(event: FormEvent<HTMLFormElement>, row: EngagementRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const due = String(form.get("due") ?? "");
    await run(
      `${base}/${row.id}/deliverables`,
      "POST",
      {
        title: String(form.get("title") ?? ""),
        platform: String(form.get("platform") ?? ""),
        format: String(form.get("format") ?? ""),
        requirementsSnapshot: String(form.get("requirements") ?? ""),
        dueAt: due ? new Date(`${due}T23:59:00-03:00`).toISOString() : null
      },
      "Não foi possível criar a entrega."
    );
  }

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma contratação encontrada</strong>
          <p>Quando uma proposta aceita for transformada em contratação em Negociações, ela aparecerá aqui.</p>
          <Link className="button-link" href="/negotiations">Ir para Negociações</Link>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de contratações">
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Creator</th>
                <th>Valor</th>
                <th>Situação</th>
                <th>Contrato</th>
                <th>Entregas</th>
                <th>Publicações</th>
                <th>Pagamento</th>
                <th>Disputa</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const needsContract = row.status === "DRAFT" && (row.contract_status === null || row.contract_status === "VOID");
                return (
                  <tr key={row.id}>
                    <td>{row.campaign_name}<br /><small>Criada em {formatDate(row.created_at)}</small></td>
                    <td>{row.creator_name}</td>
                    <td>{formatMinor(row.amount_minor, row.currency_code)}</td>
                    <td><span className="status-badge">{engagementStatusLabels[row.status] ?? "Indisponível"}</span></td>
                    <td>{row.contract_status ? <span className="status-badge">{workspaceContractStatusLabels[row.contract_status] ?? "Indisponível"}</span> : "—"}</td>
                    <td>{row.deliverables_approved}/{row.deliverables_total} aprovadas</td>
                    <td>{row.publications_verified} verificadas</td>
                    <td>{row.payable_status ? <span className="status-badge">{payableStatusLabels[row.payable_status] ?? "Indisponível"}</span> : "—"}</td>
                    <td>{row.has_active_dispute ? <span className="status-badge">Em andamento</span> : "—"}</td>
                    <td>
                      <div className="row-actions">
                        {can.engagement && needsContract ? (
                          <details>
                            <summary>Criar contrato</summary>
                            <form className="form compact-form" onSubmit={(event) => void createContract(event, row)}>
                              <label>
                                Escopo do trabalho
                                <input name="scope" required defaultValue={row.scope_snapshot} />
                              </label>
                              <label>
                                Direitos de uso
                                <input name="rights" required />
                              </label>
                              <label>
                                Condições de pagamento
                                <input name="payment" required />
                              </label>
                              <button type="submit" disabled={busy}>Criar contrato</button>
                            </form>
                          </details>
                        ) : null}
                        {can.deliverable && row.status === "ACTIVE" ? (
                          <details>
                            <summary>Criar entrega</summary>
                            <form className="form compact-form" onSubmit={(event) => void createDeliverable(event, row)}>
                              <label>
                                Título
                                <input name="title" required maxLength={180} />
                              </label>
                              <label>
                                Plataforma
                                <select name="platform" required defaultValue="INSTAGRAM">
                                  {Object.entries(platformLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Formato
                                <select name="format" required defaultValue="REEL">
                                  {Object.entries(contentFormatLabels).filter(([value]) => value !== "CAROUSEL").map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Requisitos
                                <input name="requirements" required />
                              </label>
                              <label>
                                Prazo (opcional)
                                <input name="due" type="date" />
                              </label>
                              <button type="submit" disabled={busy}>Criar entrega</button>
                            </form>
                          </details>
                        ) : null}
                        {!needsContract && !(can.deliverable && row.status === "ACTIVE") ? <span className="inline-note">Sem ações disponíveis</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
