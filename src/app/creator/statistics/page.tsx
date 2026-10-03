import { redirect } from "next/navigation";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { ApplicationShell } from "../../application-shell";
import { creatorNavigation } from "../../application-navigation";

export default async function CreatorStatisticsPage() {
  const actor = await resolveApplicationActor();
  if (!actor) redirect("/");
  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const state = await getApplicationShellState(client,{id:actor.id,name:actor.name,email:actor.email});
    if (!state.creator) redirect("/creator");
    return <ApplicationShell state={state} navigation={creatorNavigation()} context="creator">
      <div className="module-surface">
        <header className="page-header"><div><p className="eyebrow">Estatísticas</p><h1>Seu desempenho</h1><p>Acompanhe os indicadores disponíveis do seu perfil e das suas participações.</p></div></header>
        <section className="stats-grid creator-stats-grid">
          <article className="stat-card"><span className="stat-label">Perfil</span><strong className="stat-value">{state.creator.displayName}</strong><span className="stat-description">Creator ativo no contexto atual</span></article>
          <article className="stat-card"><span className="stat-label">Dados de campanhas</span><strong className="stat-value">—</strong><span className="stat-description">Sem métrica consolidada disponível</span></article>
          <article className="stat-card"><span className="stat-label">Engajamento</span><strong className="stat-value">—</strong><span className="stat-description">Aguardando fonte de métricas verificada</span></article>
          <article className="stat-card"><span className="stat-label">Alcance</span><strong className="stat-value">—</strong><span className="stat-description">Aguardando fonte de métricas verificada</span></article>
        </section>
        <section className="card compact-card"><h2>Visão de desempenho</h2><div className="empty-state"><strong>Ainda não há dados consolidados para exibir.</strong><p>Os indicadores serão apresentados quando existirem métricas reais associadas às suas publicações. Nenhum dado é estimado ou fabricado.</p></div></section>
      </div>
    </ApplicationShell>;
  } finally { await client.end(); }
}
