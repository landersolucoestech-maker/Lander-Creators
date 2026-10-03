"use client";

import type { FormEvent } from "react";
import type { NegotiationRow } from "@/server/application/operations/negotiations";
import { formatDate, formatMinor, moneyInputPlaceholder, parseMoneyToMinor } from "../format";
import { participationOriginLabels, participationStatusLabels, proposalStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";

type Can = { participation: boolean; proposal: boolean; engagement: boolean };

const NEGOTIABLE = new Set(["APPLIED", "INVITED", "SHORTLISTED"]);
const OPEN_ROUND = new Set(["PENDING_CREATOR", "PENDING_WORKSPACE"]);

export function NegotiationsTable({ workspaceId, rows, can }: { workspaceId: string; rows: NegotiationRow[]; can: Can }) {
  const { message, busy, run, fail } = useApiAction();
  const base = `/api/workspaces/${workspaceId}`;

  async function sendProposal(event: FormEvent<HTMLFormElement>, row: NegotiationRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currencyCode = String(form.get("currency") ?? "").trim().toUpperCase();
    const amountMinor = parseMoneyToMinor(String(form.get("amount") ?? ""), currencyCode);
    if (amountMinor === null) {
      fail("Informe um valor válido, com as casas decimais da moeda.");
      return;
    }
    const rights = String(form.get("rights") ?? "").trim();
    await run(
      `${base}/participations/${row.participation_id}/proposals`,
      "POST",
      { amountMinor, currencyCode, scopeSummary: String(form.get("scope") ?? ""), rightsSummary: rights || null },
      "Não foi possível enviar a proposta."
    );
  }

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma negociação encontrada</strong>
          <p>Candidaturas, convites e propostas das campanhas deste workspace aparecem aqui.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de negociações">
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Creator</th>
                <th>Origem</th>
                <th>Participação</th>
                <th>Última proposta</th>
                <th>Atualizada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const roundOpen = row.proposal_status ? OPEN_ROUND.has(row.proposal_status) : false;
                const negotiable = NEGOTIABLE.has(row.participation_status);
                return (
                  <tr key={row.participation_id}>
                    <td>{row.campaign_name}</td>
                    <td>{row.creator_name} <small>· {row.creator_country}</small></td>
                    <td>{participationOriginLabels[row.origin] ?? row.origin}</td>
                    <td><span className="status-badge">{participationStatusLabels[row.participation_status] ?? "Indisponível"}</span></td>
                    <td>
                      {row.proposal_id && row.proposal_amount_minor && row.proposal_currency ? (
                        <>
                          Rodada {row.proposal_round} · {row.proposed_by === "WORKSPACE" ? "você" : "Creator"} ·{" "}
                          <strong>{formatMinor(row.proposal_amount_minor, row.proposal_currency)}</strong>
                          <br />
                          <span className="status-badge">{proposalStatusLabels[row.proposal_status ?? ""] ?? "Indisponível"}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{formatDate(row.updated_at)}</td>
                    <td>
                      <div className="row-actions">
                        {can.participation && ["APPLIED", "INVITED"].includes(row.participation_status) ? (
                          <button type="button" disabled={busy} onClick={() => void run(`${base}/campaigns/${row.campaign_id}/participations/${row.participation_id}`, "PATCH", { status: "SHORTLISTED" }, "Não foi possível pré-selecionar.")}>
                            Pré-selecionar
                          </button>
                        ) : null}
                        {can.participation && negotiable ? (
                          <button type="button" disabled={busy} onClick={() => void run(`${base}/campaigns/${row.campaign_id}/participations/${row.participation_id}`, "PATCH", { status: "REJECTED" }, "Não foi possível recusar a participação.")}>
                            Recusar participação
                          </button>
                        ) : null}
                        {can.proposal && negotiable && !roundOpen ? (
                          <details>
                            <summary>Enviar proposta</summary>
                            <form className="form compact-form" onSubmit={(event) => void sendProposal(event, row)}>
                              <label>
                                Moeda
                                <input name="currency" required minLength={3} maxLength={3} defaultValue={row.proposal_currency ?? "BRL"} pattern="[A-Za-z]{3}" />
                              </label>
                              <label>
                                Valor
                                <input name="amount" required inputMode="decimal" pattern="\d{1,12}([.,]\d+)?" placeholder={moneyInputPlaceholder(row.proposal_currency ?? "BRL")} />
                              </label>
                              <label>
                                Escopo
                                <input name="scope" required maxLength={4000} defaultValue={row.proposal_scope ?? ""} />
                              </label>
                              <label>
                                Direitos de uso (opcional)
                                <input name="rights" maxLength={4000} />
                              </label>
                              <button type="submit" disabled={busy}>Enviar proposta</button>
                            </form>
                          </details>
                        ) : null}
                        {can.proposal && row.proposal_id && row.proposal_status === "PENDING_WORKSPACE" ? (
                          <>
                            <button type="button" disabled={busy} onClick={() => void run(`${base}/proposals/${row.proposal_id}`, "PATCH", { action: "ACCEPT" }, "Não foi possível aceitar a contraproposta.")}>
                              Aceitar contraproposta
                            </button>
                            <button type="button" disabled={busy} onClick={() => void run(`${base}/proposals/${row.proposal_id}`, "PATCH", { action: "REJECT" }, "Não foi possível recusar a contraproposta.")}>
                              Recusar contraproposta
                            </button>
                          </>
                        ) : null}
                        {can.engagement && row.proposal_id && row.proposal_status === "ACCEPTED" && !row.engagement_id ? (
                          <button type="button" disabled={busy} onClick={() => void run(`${base}/engagements`, "POST", { proposalId: row.proposal_id }, "Não foi possível criar a contratação.")}>
                            Criar contratação
                          </button>
                        ) : null}
                        {row.engagement_id ? <span className="inline-note">Contratação criada</span> : null}
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
