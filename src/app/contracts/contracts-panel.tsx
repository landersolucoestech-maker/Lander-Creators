"use client";

import type { CreatorContractRow } from "@/server/engagement/service";
import { formatMinor } from "../format";
import { contractStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";


export function ContractsPanel({ contracts }: { contracts: CreatorContractRow[] }) {
  const { message, busy, run } = useApiAction();

  return (
    <div className="module-surface">
      <header className="page-header">
        <div>
          <p className="eyebrow">Meus Contratos</p>
          <h1>Meus contratos</h1>
          <p>Consulte contratos recebidos, valores, termos e situações de assinatura.</p>
        </div>
      </header>

      {message ? <p className="notice" role="status">{message}</p> : null}

      <section className="card compact-card">
        <h2>Contratos recebidos</h2>
        {contracts.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum contrato recebido</strong>
            <p>Depois que uma proposta for aceita, o contratante poderá enviar o contrato para sua assinatura.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Tabela de contratos">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Versão</th>
                  <th>Valor contratado</th>
                  <th>Termos</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>{contract.campaign_name}</td>
                    <td>{contract.version}</td>
                    <td>{formatMinor(contract.contracted_amount_minor, contract.currency_code)}</td>
                    <td>
                      <details>
                        <summary>Ver termos</summary>
                        <p><strong>Escopo:</strong> {contract.scope_of_work}</p>
                        <p><strong>Direitos de uso:</strong> {contract.rights_terms}</p>
                        <p><strong>Pagamento:</strong> {contract.payment_terms}</p>
                      </details>
                    </td>
                    <td><span className="status-badge">{contractStatusLabels[contract.status] ?? "Indisponível"}</span></td>
                    <td>
                      {contract.status === "SENT" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(`/api/contracts/${contract.id}/sign`, "POST", undefined, "Não foi possível assinar o contrato.")}
                        >
                          Assinar contrato
                        </button>
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
