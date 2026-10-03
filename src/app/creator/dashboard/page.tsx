import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { ApplicationShell } from "../../application-shell";
import { creatorNavigation } from "../../application-navigation";

export default async function CreatorDashboardPage() {
  const actor = await resolveApplicationActor();
  if (!actor) redirect("/");
  const { client } = createDatabaseClient(parseEnv(process.env).DATABASE_URL);
  try {
    const state = await getApplicationShellState(client, { id: actor.id, name: actor.name, email: actor.email });
    if (!state.creator) redirect("/creator");
    const name = state.creator.displayName?.split(" ")[0] || "Creator";
    return (
      <ApplicationShell state={state} navigation={creatorNavigation()} context="creator">
        <div className="module-surface creator-reference-dashboard">
          <header className="page-header">
            <div><p className="eyebrow">Dashboard</p><h1>Bem-vinda, {name}!</h1><p>Aqui estão suas oportunidades, campanhas e atividades mais recentes.</p></div>
          </header>
          <div className="dashboard-two-column">
            <section className="card compact-card">
              <div className="section-heading"><div><h2>Oportunidades para você</h2><p>Campanhas disponíveis para candidatura.</p></div><Link href="/opportunities">Ver todas →</Link></div>
              <div className="empty-state"><p>Consulte as oportunidades disponíveis e acompanhe suas candidaturas.</p><Link className="button-link" href="/opportunities">Ver oportunidades</Link></div>
            </section>
            <section className="card compact-card">
              <div className="section-heading"><div><h2>Minhas Campanhas</h2><p>Acompanhe propostas e contratações em andamento.</p></div><Link href="/proposals">Ver todas →</Link></div>
              <div className="empty-state"><p>Veja campanhas em negociação e propostas recebidas.</p><Link className="button-link" href="/proposals">Ver campanhas</Link></div>
            </section>
            <section className="card compact-card">
              <div className="section-heading"><div><h2>Minhas Entregas</h2><p>Conteúdos que precisam ser enviados ou revisados.</p></div><Link href="/deliverables">Ver todas →</Link></div>
              <div className="empty-state"><p>Acompanhe entregas contratadas e comprovações de publicação.</p><Link className="button-link" href="/deliverables">Ver entregas</Link></div>
            </section>
            <section className="card compact-card">
              <div className="section-heading"><div><h2>Pagamentos</h2><p>Acompanhe valores elegíveis, liberados e pagos.</p></div><Link href="/payments">Ver todos →</Link></div>
              <div className="empty-state"><p>Consulte o andamento financeiro das suas contratações.</p><Link className="button-link" href="/payments">Ver pagamentos</Link></div>
            </section>
          </div>
        </div>
      </ApplicationShell>
    );
  } finally {
    await client.end();
  }
}
