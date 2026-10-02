/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  campaignReadinessReasonLabels,
  campaignStatusLabels,
  promotedObjectLabels,
  readinessLabels,
  recruitmentLabels,
  visibilityLabels
} from "@/server/campaign/labels";

export function CampaignDetail({
  workspaceId,
  data
}: {
  workspaceId: string;
  data: any;
}) {
  const [campaign, setCampaign] = useState(data.campaign);
  const [message, setMessage] = useState("");

  async function transition(to: string) {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/campaigns/${campaign.id}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to })
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error?.message ?? "Não foi possível alterar o status.");
      return;
    }
    setCampaign({ ...campaign, status: payload.status });
    location.reload();
  }

  const promotedObjectDescription = campaign.promoted_object_type
    ? `${(promotedObjectLabels as Record<string, string>)[String(campaign.promoted_object_type)]} · ${campaign.promoted_object_display_name_snapshot}`
    : "Objeto promovido ainda não selecionado";

  return (
    <div className="module-surface">
      <header className="page-header">
        <div>
          <p className="eyebrow">CAMPANHA</p>
          <h1>{campaign.name}</h1>
          <p>{promotedObjectDescription}</p>
        </div>
        <span className="status-badge">
          {(campaignStatusLabels as Record<string, string>)[String(campaign.status)]}
        </span>
      </header>

      {message ? <p className="notice" role="status">{message}</p> : null}

      <div className="campaign-detail-grid">
        <section className="card compact-card">
          <h2>Configuração</h2>
          <dl className="detail-list">
            <div><dt>Objetivo</dt><dd>{campaign.goal_label ?? "Não definido"}</dd></div>
            <div><dt>Visibilidade</dt><dd>{(visibilityLabels as Record<string, string>)[String(campaign.visibility)]}</dd></div>
            <div><dt>Recrutamento</dt><dd>{(recruitmentLabels as Record<string, string>)[String(campaign.recruitment_status)]}</dd></div>
            <div>
              <dt>Período</dt>
              <dd>
                {campaign.starts_at
                  ? new Date(String(campaign.starts_at)).toLocaleString("pt-BR")
                  : "Não definido"}
                {campaign.ends_at
                  ? ` até ${new Date(String(campaign.ends_at)).toLocaleString("pt-BR")}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>CTA</dt>
              <dd>
                {campaign.cta_type === "SIGN_UP"
                  ? "Cadastro"
                  : campaign.cta_type === "LEARN_MORE"
                    ? "Saiba mais"
                    : campaign.cta_type === "VISIT"
                      ? "Visitar"
                      : "Sem CTA"}
                {campaign.cta_url ? ` · ${campaign.cta_url}` : ""}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card compact-card">
          <h2>Prontidão</h2>
          <strong>
            {(readinessLabels as Record<string, string>)[String(data.readiness.status)]}
          </strong>
          {data.readiness.blockers.length ? (
            <>
              <p>Esta campanha ainda não pode ser ativada.</p>
              <ul>
                {data.readiness.blockers.map((reason: string) => (
                  <li key={reason}>
                    {campaignReadinessReasonLabels[reason] ?? "Revise esta configuração."}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>

      <div className="campaign-actions">
        <Link className="button-link" href={`/campaigns/${campaign.id}/builder`}>
          Editar ou continuar builder
        </Link>
        {campaign.status === "DRAFT" ? (
          <button onClick={() => void transition("ACTIVE")}>Ativar campanha</button>
        ) : null}
        {campaign.status === "ACTIVE" ? (
          <>
            <button onClick={() => void transition("PAUSED")}>Pausar</button>
            <button onClick={() => void transition("CANCELLATION_PENDING")}>
              Solicitar cancelamento
            </button>
          </>
        ) : null}
        {campaign.status === "PAUSED" ? (
          <button onClick={() => void transition("ACTIVE")}>Retomar</button>
        ) : null}
      </div>
    </div>
  );
}
