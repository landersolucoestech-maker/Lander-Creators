"use client";

import { useState } from "react";
import type { ContentReviewRow } from "@/server/application/operations/content-review";
import { formatDate } from "../format";
import { openMediaAsset } from "../open-media";
import { contentFormatLabels, contentVersionStatusLabels, deliverableStatusLabels, labelOr, platformLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";

type Decision = "APPROVE" | "REQUEST_CHANGES" | "REJECT";

export function ContentReviewTable({ workspaceId, rows, canReview }: { workspaceId: string; rows: ContentReviewRow[]; canReview: boolean }) {
  const { message, busy, run } = useApiAction();
  const [mediaMessage, setMediaMessage] = useState("");

  async function review(form: HTMLFormElement | null, row: ContentReviewRow, decision: Decision) {
    const note = form ? String(new FormData(form).get("note") ?? "").trim() : "";
    await run(`/api/workspaces/${workspaceId}/content/${row.id}/review`, "POST", { decision, reviewNote: note || null }, "Não foi possível registrar a revisão.");
  }

  return (
    <>
      {message || mediaMessage ? <p className="notice" role="status">{message || mediaMessage}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma versão de conteúdo encontrada</strong>
          <p>As versões enviadas pelos Creators aparecem aqui para revisão.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de versões de conteúdo">
          <table>
            <thead>
              <tr>
                <th>Entrega</th>
                <th>Campanha / Creator</th>
                <th>Versão</th>
                <th>Conteúdo</th>
                <th>Notas</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.deliverable_title}</strong>
                    <br />
                    <small>{labelOr(platformLabels, row.platform)} · {labelOr(contentFormatLabels, row.format)} · {row.requirements_snapshot}</small>
                    <br />
                    <span className="status-badge">{deliverableStatusLabels[row.deliverable_status] ?? "Indisponível"}</span>
                  </td>
                  <td>{row.campaign_name}<br /><small>{row.creator_name}</small></td>
                  <td>v{row.version}<br /><small>{formatDate(row.submitted_at)}</small></td>
                  <td>
                    {row.external_url ? <a href={row.external_url} target="_blank" rel="noreferrer noopener">Abrir link do conteúdo</a> : null}
                    {row.media_asset_id ? (
                      <button type="button" onClick={() => void openMediaAsset(workspaceId, row.media_asset_id as string).then((error) => setMediaMessage(error ?? ""))}>
                        Abrir arquivo{row.media_file_name ? ` (${row.media_file_name})` : ""}
                      </button>
                    ) : null}
                  </td>
                  <td>
                    {row.creator_note ? <p><strong>Creator:</strong> {row.creator_note}</p> : null}
                    {row.review_note ? <p><strong>Revisão:</strong> {row.review_note}</p> : null}
                    {!row.creator_note && !row.review_note ? "—" : null}
                  </td>
                  <td><span className="status-badge">{contentVersionStatusLabels[row.status] ?? "Indisponível"}</span></td>
                  <td>
                    {canReview && row.status === "SUBMITTED" ? (
                      <form className="form compact-form" onSubmit={(event) => event.preventDefault()}>
                        <label>
                          Observação da revisão
                          <input name="note" maxLength={2000} />
                        </label>
                        <div className="row-actions">
                          <button type="button" disabled={busy} onClick={(event) => void review(event.currentTarget.form, row, "APPROVE")}>Aprovar conteúdo</button>
                          <button type="button" disabled={busy} onClick={(event) => void review(event.currentTarget.form, row, "REQUEST_CHANGES")}>Solicitar ajustes</button>
                          <button type="button" disabled={busy} onClick={(event) => void review(event.currentTarget.form, row, "REJECT")}>Reprovar conteúdo</button>
                        </div>
                      </form>
                    ) : (
                      <span className="inline-note">{row.status === "SUBMITTED" ? "Sem permissão para revisar" : "Revisão encerrada"}</span>
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
