"use client";

import type { FormEvent } from "react";
import type { CreatorEngagementRow } from "@/server/engagement/service";
import { formatDate, formatMinor } from "../format";
import { disputeStatusLabels, engagementStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";

/** Disputes are offered while the engagement is in force or finished; the server accepts any engagement of the Creator. */
const DISPUTABLE = new Set(["ACTIVE", "COMPLETED"]);
const ACTIVE_DISPUTE = new Set(["OPEN", "UNDER_REVIEW"]);

export function CreatorEngagementsPanel({ engagements }: { engagements: CreatorEngagementRow[] }) {
  const { message, busy, run } = useApiAction();

  async function openDispute(event: FormEvent<HTMLFormElement>, engagement: CreatorEngagementRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const details = String(form.get("details") ?? "").trim();
    await run("/api/disputes", "POST", { engagementId: engagement.id, reason: String(form.get("reason") ?? ""), details: details || null }, "Não foi possível abrir a disputa.");
  }

  return (
    <div className="module-surface">
      <header className="page-header">
        <div>
          <p className="eyebrow">Publicações</p>
          <h1>Publicações</h1>
          <p>Acompanhe as campanhas contratadas relacionadas às suas publicações e eventuais pendências.</p>
        </div>
      </header>

      {message ? <p className="notice" role="status">{message}</p> : null}

      <section className="card compact-card">
        <h2>Campanhas e publicações</h2>
        {engagements.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma publicação em andamento</strong>
            <p>Quando uma campanha contratada entrar em execução, ela aparecerá aqui.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Tabela de contratações">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Contratante</th>
                  <th>Valor</th>
                  <th>Escopo</th>
                  <th>Situação</th>
                  <th>Disputa</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {engagements.map((engagement) => {
                  const hasActiveDispute = engagement.dispute_status ? ACTIVE_DISPUTE.has(engagement.dispute_status) : false;
                  return (
                    <tr key={engagement.id}>
                      <td>{engagement.campaign_name}<br /><small>Desde {formatDate(engagement.created_at)}</small></td>
                      <td>{engagement.contractor_name}</td>
                      <td>{formatMinor(engagement.amount_minor, engagement.currency_code)}</td>
                      <td>{engagement.scope_snapshot}</td>
                      <td><span className="status-badge">{engagementStatusLabels[engagement.status] ?? "Indisponível"}</span></td>
                      <td>
                        {engagement.dispute_status ? (
                          <>
                            <span className="status-badge">{disputeStatusLabels[engagement.dispute_status] ?? "Indisponível"}</span>
                            {engagement.dispute_resolution ? <p className="inline-note">Resolução: {engagement.dispute_resolution}</p> : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {DISPUTABLE.has(engagement.status) && !hasActiveDispute ? (
                          <details>
                            <summary>Abrir disputa</summary>
                            <form className="form compact-form" onSubmit={(event) => void openDispute(event, engagement)}>
                              <label>
                                Motivo
                                <input name="reason" required maxLength={200} />
                              </label>
                              <label>
                                Detalhes (opcional)
                                <input name="details" maxLength={5000} />
                              </label>
                              <button type="submit" disabled={busy}>Abrir disputa</button>
                            </form>
                          </details>
                        ) : (
                          <span className="inline-note">{hasActiveDispute ? "Disputa em andamento" : "Indisponível nesta situação"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
