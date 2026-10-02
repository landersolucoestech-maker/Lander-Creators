/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  campaignStatusLabels,
  promotedObjectLabels,
  recruitmentLabels,
  visibilityLabels
} from "@/server/campaign/labels";

type Campaign = {
  id: string;
  name: string;
  status: keyof typeof campaignStatusLabels;
  promoted_object_type: keyof typeof promotedObjectLabels | null;
  promoted_object_display_name_snapshot: string | null;
  goal_label: string | null;
  recruitment_status: keyof typeof recruitmentLabels;
  visibility: keyof typeof visibilityLabels;
};

export function CampaignsPanel({
  workspaceId,
  initialCampaigns
}: {
  workspaceId: string;
  initialCampaigns: Campaign[];
}) {
  const [campaigns] = useState(initialCampaigns);
  const [message, setMessage] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/workspaces/${workspaceId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(form.get("name") ?? "") })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error?.message ?? "Não foi possível criar a campanha.");
      return;
    }
    location.href = `/campaigns/${payload.campaign.id}/builder`;
  }

  return (
    <div className="module-surface">
      <header className="page-header">
        <div>
          <p className="eyebrow">OPERAÇÃO</p>
          <h1>Campanhas</h1>
          <p>Campanhas do workspace com um único objeto promovido e configuração operacional persistente.</p>
        </div>
      </header>

      {message ? <p className="notice" role="status">{message}</p> : null}

      <section className="card compact-card">
        <h2>Nova campanha</h2>
        <form className="form campaign-create" onSubmit={create}>
          <label>
            Nome da campanha
            <input name="name" required maxLength={180} />
          </label>
          <button type="submit">Criar campanha</button>
        </form>
      </section>

      <section className="card compact-card">
        <h2>Campanhas do workspace</h2>
        {campaigns.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma campanha criada</strong>
            <p>Crie uma campanha para iniciar o builder de 10 etapas.</p>
          </div>
        ) : (
          <div className="campaign-list">
            {campaigns.map((campaign) => (
              <Link className="campaign-row" href={`/campaigns/${campaign.id}`} key={campaign.id}>
                <div>
                  <strong>{campaign.name}</strong>
                  <span>
                    {campaign.promoted_object_type
                      ? promotedObjectLabels[campaign.promoted_object_type]
                      : "Objeto não selecionado"}
                    {campaign.promoted_object_display_name_snapshot
                      ? ` · ${campaign.promoted_object_display_name_snapshot}`
                      : ""}
                  </span>
                </div>
                <div>
                  <span className="status-badge">{campaignStatusLabels[campaign.status]}</span>
                  <small>
                    {campaign.goal_label ?? "Objetivo não definido"} · Recrutamento{" "}
                    {recruitmentLabels[campaign.recruitment_status].toLowerCase()} ·{" "}
                    {visibilityLabels[campaign.visibility]}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
