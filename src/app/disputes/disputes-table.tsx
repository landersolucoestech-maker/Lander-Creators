"use client";

import type { FormEvent } from "react";
import type { WorkspaceDisputeRow } from "@/server/dispute/service";
import { formatDate } from "../format";
import { disputeStatusLabels } from "../post-campaign-labels";
import { useApiAction } from "../use-api-action";

export function DisputesTable({ workspaceId, rows, canManage }: { workspaceId: string; rows: WorkspaceDisputeRow[]; canManage: boolean }) {
  const { message, busy, run } = useApiAction();
  const base = `/api/workspaces/${workspaceId}/disputes`;

  async function resolve(event: FormEvent<HTMLFormElement>, row: WorkspaceDisputeRow) {
    event.preventDefault();
    const resolution = String(new FormData(event.currentTarget).get("resolution") ?? "");
    await run(`${base}/${row.id}/resolve`, "POST", { resolution }, "Não foi possível resolver a disputa.");
  }

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma disputa encontrada</strong>
          <p>As disputas abertas pelos Creators sobre as contratações deste workspace aparecem aqui.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de disputas">
          <table>
            <thead>
              <tr>
                <th>Campanha / Creator</th>
                <th>Motivo</th>
                <th>Situação</th>
                <th>Datas</th>
                <th>Resolução</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.campaign_name}<br /><small>{row.creator_name}</small></td>
                  <td><strong>{row.reason}</strong>{row.details ? <p>{row.details}</p> : null}</td>
                  <td><span className="status-badge">{disputeStatusLabels[row.status] ?? "Indisponível"}</span></td>
                  <td>Aberta: {formatDate(row.created_at)}<br />Resolvida: {formatDate(row.resolved_at)}</td>
                  <td>{row.resolution ?? "—"}</td>
                  <td>
                    <div className="row-actions">
                      {canManage && row.status === "OPEN" ? (
                        <button type="button" disabled={busy} onClick={() => void run(`${base}/${row.id}/review`, "POST", undefined, "Não foi possível iniciar a análise.")}>
                          Iniciar análise
                        </button>
                      ) : null}
                      {canManage && ["OPEN", "UNDER_REVIEW"].includes(row.status) ? (
                        <details>
                          <summary>Resolver disputa</summary>
                          <form className="form compact-form" onSubmit={(event) => void resolve(event, row)}>
                            <label>
                              Resolução
                              <input name="resolution" required maxLength={5000} />
                            </label>
                            <button type="submit" disabled={busy}>Registrar resolução</button>
                          </form>
                        </details>
                      ) : null}
                      {!canManage || !["OPEN", "UNDER_REVIEW"].includes(row.status) ? <span className="inline-note">Sem ações disponíveis</span> : null}
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
