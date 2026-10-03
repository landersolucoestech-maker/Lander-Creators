"use client";

import type { WorkspacePublicationRow } from "@/server/application/operations/publications";
import { formatDate } from "../format";
import { labelOr, platformLabels, publicationModeLabels, publicationStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";

export function PublicationsTable({ workspaceId, rows, canManage }: { workspaceId: string; rows: WorkspacePublicationRow[]; canManage: boolean }) {
  const { message, busy, run } = useApiAction();

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma publicação planejada</strong>
          <p>Planeje a publicação de uma entrega aprovada para o Creator poder enviar a comprovação.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de publicações">
          <table>
            <thead>
              <tr>
                <th>Entrega</th>
                <th>Campanha / Creator</th>
                <th>Plataforma</th>
                <th>Modo</th>
                <th>Datas</th>
                <th>Comprovação</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.deliverable_title}</td>
                  <td>{row.campaign_name}<br /><small>{row.creator_name}</small></td>
                  <td>{labelOr(platformLabels, row.platform)}</td>
                  <td>{publicationModeLabels[row.mode] ?? row.mode}</td>
                  <td>
                    Agendada: {formatDate(row.scheduled_at)}
                    <br />
                    Publicada: {formatDate(row.published_at)}
                    <br />
                    Verificada: {formatDate(row.verified_at)}
                  </td>
                  <td>{row.proof_url ? <a href={row.proof_url} target="_blank" rel="noreferrer noopener">Abrir comprovação</a> : "—"}</td>
                  <td><span className="status-badge">{publicationStatusLabels[row.status] ?? "Indisponível"}</span></td>
                  <td>
                    <div className="row-actions">
                      {canManage && row.status === "PUBLISHED" ? (
                        <button type="button" disabled={busy} onClick={() => void run(`/api/workspaces/${workspaceId}/publications/${row.id}/verify`, "POST", undefined, "Não foi possível verificar a publicação.")}>
                          Verificar publicação
                        </button>
                      ) : (
                        <span className="inline-note">{row.status === "READY" ? "Aguardando comprovação do Creator" : "Sem ações disponíveis"}</span>
                      )}
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
