"use client";

import type { FormEvent } from "react";
import type { PlannableDeliverableRow } from "@/server/application/operations/publications";
import { formatDate } from "../../format";
import { contentFormatLabels, labelOr, platformLabels, publicationModeLabels } from "../../post-campaign-labels";
import { useApiAction } from "../../use-api-action";

export function PlanningTable({ workspaceId, rows, canManage }: { workspaceId: string; rows: PlannableDeliverableRow[]; canManage: boolean }) {
  const { message, busy, run } = useApiAction();

  async function plan(event: FormEvent<HTMLFormElement>, row: PlannableDeliverableRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get("scheduled") ?? "");
    await run(
      `/api/workspaces/${workspaceId}/deliverables/${row.id}/publication`,
      "POST",
      { mode: String(form.get("mode") ?? ""), scheduledAt: scheduled ? new Date(`${scheduled}T12:00:00-03:00`).toISOString() : null },
      "Não foi possível planejar a publicação."
    );
  }

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma entrega aguardando planejamento</strong>
          <p>Todas as entregas aprovadas já têm uma publicação planejada.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de entregas aprovadas sem publicação">
          <table>
            <thead>
              <tr>
                <th>Entrega</th>
                <th>Campanha / Creator</th>
                <th>Formato</th>
                <th>Aprovada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.campaign_name}<br /><small>{row.creator_name}</small></td>
                  <td>{labelOr(platformLabels, row.platform)} · {labelOr(contentFormatLabels, row.format)}</td>
                  <td>{formatDate(row.approved_at)}</td>
                  <td>
                    {canManage ? (
                      <details>
                        <summary>Planejar publicação</summary>
                        <form className="form compact-form" onSubmit={(event) => void plan(event, row)}>
                          <label>
                            Modo de publicação
                            <select name="mode" required defaultValue="CREATOR_PROFILE">
                              {Object.entries(publicationModeLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Data prevista (opcional)
                            <input name="scheduled" type="date" />
                          </label>
                          <button type="submit" disabled={busy}>Planejar publicação</button>
                        </form>
                      </details>
                    ) : (
                      <span className="inline-note">Sem permissão para planejar</span>
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
