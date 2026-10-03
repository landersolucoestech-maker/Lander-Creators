"use client";

import type { MatchRow } from "@/server/application/operations/matching";
import { formatDate } from "../format";
import { useApiAction } from "../use-api-action";

const ruleLabels: Record<string, string> = { deterministic_targeting_v1: "Segmentação determinística v1" };

export function MatchesTable({ workspaceId, campaignId, rows, canManage }: { workspaceId: string; campaignId: string; rows: MatchRow[]; canManage: boolean }) {
  const { message, busy, run } = useApiAction();
  return (
    <>
      {message ? <p className="notice" role="status">{message}</p> : null}
      {canManage ? (
        <p>
          <button type="button" disabled={busy} onClick={() => void run(`/api/workspaces/${workspaceId}/campaigns/${campaignId}/matches`, "POST", undefined, "Não foi possível recalcular o matching.")}>
            Recalcular matching
          </button>
        </p>
      ) : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma pontuação calculada</strong>
          <p>{canManage ? "Use “Recalcular matching” para avaliar os Creators elegíveis desta campanha." : "O matching desta campanha ainda não foi calculado."}</p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} aria-label="Tabela de matching">
          <table>
            <thead>
              <tr>
                <th>Creator</th>
                <th>Music Fit</th>
                <th>Audience Fit</th>
                <th>Creator Fit</th>
                <th>Fit geral</th>
                <th>Regra</th>
                <th>Calculado em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.creator_profile_id}>
                  <td>{row.display_name} <small>· {row.country_code}</small></td>
                  <td>{row.music_fit}</td>
                  <td>{row.audience_fit}</td>
                  <td>{row.creator_fit}</td>
                  <td><strong>{row.overall_fit}</strong></td>
                  <td>{row.reasons.map((reason) => ruleLabels[reason] ?? reason).join(", ")}</td>
                  <td>{formatDate(row.calculated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
