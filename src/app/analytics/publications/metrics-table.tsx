"use client";

import type { FormEvent } from "react";
import type { MetricTargetRow } from "@/server/application/operations/analytics";
import { formatDate } from "../../format";
import { labelOr, platformLabels, publicationStatusLabels } from "../../post-campaign-labels";
import { useApiAction } from "../../use-api-action";

const fields = [
  ["views", "Visualizações"],
  ["reach", "Alcance"],
  ["impressions", "Impressões"],
  ["likes", "Curtidas"],
  ["comments", "Comentários"],
  ["shares", "Compartilhamentos"],
  ["saves", "Salvamentos"],
  ["clicks", "Cliques"]
] as const;

export function MetricsTable({ workspaceId, rows, canManage }: { workspaceId: string; rows: MetricTargetRow[]; canManage: boolean }) {
  const { message, busy, run, fail } = useApiAction();

  async function record(event: FormEvent<HTMLFormElement>, row: MetricTargetRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, number | string> = { source: String(form.get("source") ?? "") };
    for (const [name] of fields) {
      const raw = String(form.get(name) ?? "0").trim() || "0";
      if (!/^\d{1,15}$/.test(raw)) {
        fail("Use apenas números inteiros não negativos nas métricas.");
        return;
      }
      body[name] = Number(raw);
    }
    await run(`/api/workspaces/${workspaceId}/publications/${row.id}/metrics`, "POST", body, "Não foi possível registrar as métricas.");
  }

  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma publicação para registrar</strong>
          <p>Somente publicações já publicadas ou verificadas recebem métricas.</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de publicações para registro de métricas">
          <table>
            <thead>
              <tr>
                <th>Entrega</th>
                <th>Campanha / Creator</th>
                <th>Situação</th>
                <th>Último registro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}<br /><small>{labelOr(platformLabels, row.platform)}</small></td>
                  <td>{row.campaign_name}<br /><small>{row.creator_name}</small></td>
                  <td><span className="status-badge">{publicationStatusLabels[row.status] ?? "Indisponível"}</span></td>
                  <td>{row.last_captured_at ? <>{formatDate(row.last_captured_at)} · {row.last_source} · {row.views} visualizações</> : "sem métricas"}</td>
                  <td>
                    {canManage ? (
                      <details>
                        <summary>Registrar métricas</summary>
                        <form className="form compact-form" onSubmit={(event) => void record(event, row)}>
                          <label>
                            Origem do registro
                            <input name="source" required maxLength={120} placeholder="Ex.: painel da rede social" />
                          </label>
                          {fields.map(([name, label]) => (
                            <label key={name}>
                              {label}
                              <input name={name} inputMode="numeric" pattern="\d{1,15}" defaultValue="0" />
                            </label>
                          ))}
                          <button type="submit" disabled={busy}>Registrar métricas</button>
                        </form>
                      </details>
                    ) : (
                      <span className="inline-note">Sem permissão para registrar</span>
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
