"use client";

import type { CreatorDeliverableRow } from "@/server/deliverable/service";
import type { CreatorPublicationRow } from "@/server/publication/service";
import type { FormEvent } from "react";
import { formatDate } from "../format";
import { contentFormatLabels, deliverableStatusLabels, labelOr, platformLabels, publicationModeLabels, publicationStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";


const SUBMITTABLE = new Set(["PENDING", "IN_PROGRESS", "CHANGES_REQUESTED"]);

export function DeliverablesPanel({ deliverables, publications }: { deliverables: CreatorDeliverableRow[]; publications: CreatorPublicationRow[] }) {
  const { message, busy, run } = useApiAction();

  async function submitContent(event: FormEvent<HTMLFormElement>, deliverable: CreatorDeliverableRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") ?? "").trim();
    await run(
      `/api/deliverables/${deliverable.id}/content`,
      "POST",
      { externalUrl: String(form.get("url") ?? ""), creatorNote: note || null },
      "Não foi possível enviar o conteúdo."
    );
  }

  async function submitProof(event: FormEvent<HTMLFormElement>, publication: CreatorPublicationRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      `/api/publications/${publication.id}/proof`,
      "POST",
      { proofUrl: String(form.get("proof") ?? "") },
      "Não foi possível enviar a comprovação."
    );
  }

  return (
    <div className="module-surface">
      <header className="page-header">
        <div>
          <p className="eyebrow">PRODUÇÃO</p>
          <h1>Entregas</h1>
          <p>Envie o conteúdo para revisão e, depois da aprovação, comprove a publicação. O pagamento só é liberado com as publicações verificadas.</p>
        </div>
      </header>

      {message ? <p className="notice" role="status">{message}</p> : null}

      <section className="card compact-card">
        <h2>Entregas contratadas</h2>
        {deliverables.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma entrega contratada</strong>
            <p>As entregas aparecem aqui quando a contratação estiver ativa.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Tabela de entregas">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Entrega</th>
                  <th>Formato</th>
                  <th>Prazo</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((deliverable) => (
                  <tr key={deliverable.id}>
                    <td>{deliverable.campaign_name}</td>
                    <td>
                      <strong>{deliverable.title}</strong>
                      <small> · {deliverable.requirements_snapshot}</small>
                    </td>
                    <td>{labelOr(platformLabels, deliverable.platform)} · {labelOr(contentFormatLabels, deliverable.format)}</td>
                    <td>{formatDate(deliverable.due_at)}</td>
                    <td><span className="status-badge">{deliverableStatusLabels[deliverable.status] ?? "Indisponível"}</span></td>
                    <td>
                      {SUBMITTABLE.has(deliverable.status) ? (
                        <details>
                          <summary>Enviar conteúdo</summary>
                          <form className="form compact-form" onSubmit={(event) => void submitContent(event, deliverable)}>
                            <label>
                              URL HTTPS do conteúdo
                              <input name="url" type="url" required pattern="https://.*" placeholder="https://" />
                            </label>
                            <label>
                              Observação
                              <input name="note" maxLength={2000} />
                            </label>
                            <button type="submit" disabled={busy}>Enviar para revisão</button>
                          </form>
                        </details>
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

      <section className="card compact-card">
        <h2>Publicações</h2>
        {publications.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma publicação planejada</strong>
            <p>A publicação é planejada pelo contratante depois que o conteúdo for aprovado.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Tabela de publicações">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Entrega</th>
                  <th>Plataforma</th>
                  <th>Modo</th>
                  <th>Comprovação</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {publications.map((publication) => (
                  <tr key={publication.id}>
                    <td>{publication.campaign_name}</td>
                    <td>{publication.title}</td>
                    <td>{labelOr(platformLabels, publication.platform)}</td>
                    <td>{publicationModeLabels[publication.mode] ?? "Indisponível"}</td>
                    <td>
                      {publication.proof_url ? (
                        <a href={publication.proof_url} target="_blank" rel="noreferrer noopener">Abrir comprovação</a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td><span className="status-badge">{publicationStatusLabels[publication.status] ?? "Indisponível"}</span></td>
                    <td>
                      {publication.status === "READY" ? (
                        <details>
                          <summary>Enviar comprovação</summary>
                          <form className="form compact-form" onSubmit={(event) => void submitProof(event, publication)}>
                            <label>
                              URL HTTPS da publicação
                              <input name="proof" type="url" required pattern="https://.*" placeholder="https://" />
                            </label>
                            <button type="submit" disabled={busy}>Enviar comprovação</button>
                          </form>
                        </details>
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
