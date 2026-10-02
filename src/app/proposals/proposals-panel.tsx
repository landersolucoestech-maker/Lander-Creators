"use client";

import type { CreatorProposalRow } from "@/server/proposal/service";
import type { FormEvent } from "react";
import { formatMinor, moneyInputPlaceholder, parseMoneyToMinor } from "../format";
import { proposalStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";


export function ProposalsPanel({ proposals }: { proposals: CreatorProposalRow[] }) {
  const { message, busy, run, fail } = useApiAction();

  function respond(id: string, action: "ACCEPT" | "REJECT") {
    return run(`/api/proposals/${id}`, "PATCH", { action }, "Não foi possível responder à proposta.");
  }

  async function counter(event: FormEvent<HTMLFormElement>, proposal: CreatorProposalRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountMinor = parseMoneyToMinor(String(form.get("amount") ?? ""), proposal.currency_code);
    if (amountMinor === null) {
      fail("Informe um valor válido, com as casas decimais da moeda.");
      return;
    }
    await run(
      `/api/proposals/${proposal.id}`,
      "PATCH",
      { action: "COUNTER", amountMinor, scopeSummary: String(form.get("scope") ?? "") },
      "Não foi possível enviar a contraproposta."
    );
  }

  return (
    <div className="module-surface">
      <header className="page-header">
        <div>
          <p className="eyebrow">NEGOCIAÇÃO</p>
          <h1>Propostas</h1>
          <p>Propostas dos contratantes para suas candidaturas e convites. Cada rodada fica registrada no histórico.</p>
        </div>
      </header>

      {message ? <p className="notice" role="status">{message}</p> : null}

      <section className="card compact-card">
        <h2>Rodadas de proposta</h2>
        {proposals.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma proposta recebida</strong>
            <p>Quando um contratante enviar uma proposta para sua participação, ela aparecerá aqui.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Tabela de propostas">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Rodada</th>
                  <th>Origem</th>
                  <th>Valor</th>
                  <th>Escopo</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr key={proposal.id}>
                    <td>{proposal.campaign_name}</td>
                    <td>{proposal.round}</td>
                    <td>{proposal.proposed_by === "WORKSPACE" ? "Contratante" : "Você"}</td>
                    <td>{formatMinor(proposal.amount_minor, proposal.currency_code)}</td>
                    <td>
                      {proposal.scope_summary}
                      {proposal.rights_summary ? <small> · Direitos: {proposal.rights_summary}</small> : null}
                    </td>
                    <td><span className="status-badge">{proposalStatusLabels[proposal.status] ?? "Indisponível"}</span></td>
                    <td>
                      {proposal.status === "PENDING_CREATOR" ? (
                        <div className="stack">
                          <button type="button" disabled={busy} onClick={() => void respond(proposal.id, "ACCEPT")}>
                            Aceitar proposta
                          </button>
                          <button type="button" disabled={busy} onClick={() => void respond(proposal.id, "REJECT")}>
                            Recusar proposta
                          </button>
                          <details>
                            <summary>Fazer contraproposta</summary>
                            <form className="form compact-form" onSubmit={(event) => void counter(event, proposal)}>
                              <label>
                                Valor ({proposal.currency_code})
                                <input name="amount" required inputMode="decimal" pattern="\d{1,12}([.,]\d+)?" placeholder={moneyInputPlaceholder(proposal.currency_code)} />
                              </label>
                              <label>
                                Escopo
                                <input name="scope" required maxLength={2000} defaultValue={proposal.scope_summary} />
                              </label>
                              <button type="submit" disabled={busy}>Enviar contraproposta</button>
                            </form>
                          </details>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
