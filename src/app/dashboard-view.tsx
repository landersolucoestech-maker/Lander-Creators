import Link from "next/link";
import type { DashboardSummary } from "@/server/application/dashboard-service";

function StatCard({ label, value, href, description }: { label: string; value: number | null; href?: string; description: string }) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value === null ? "—" : value.toLocaleString("pt-BR")}</strong>
      <span className="stat-description">{value === null ? "Sem permissão para visualizar" : description}</span>
    </>
  );
  return href && value !== null ? <Link className="stat-card" href={href}>{body}</Link> : <div className="stat-card">{body}</div>;
}

export function DashboardView({
  workspaceName,
  summary
}: {
  workspaceName: string;
  summary: DashboardSummary;
}) {
  const commercial = summary.promotedByType ?? {};
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">VISÃO GERAL</p>
          <h1>Dashboard</h1>
          <p>Operação atual de <strong>{workspaceName}</strong>, usando apenas dados acessíveis neste contexto.</p>
        </div>
      </header>

      <section aria-labelledby="summary-title">
        <div className="section-heading"><div><p className="eyebrow">RESUMO</p><h2 id="summary-title">Sua operação</h2></div></div>
        <div className="stats-grid">
          <StatCard label="Perfil de Creator" value={summary.creatorProfile} href="/creator" description="perfil associado à sua conta" />
          <StatCard label="Artistas" value={summary.artists} href="/music-catalog#artists" description="artistas acessíveis" />
          <StatCard label="Lançamentos" value={summary.releases} href="/music-catalog" description="lançamentos acessíveis" />
          <StatCard label="Músicas" value={summary.tracks} href="/music-catalog" description="músicas acessíveis" />
          <StatCard label="Entidades promovidas" value={summary.promotedEntities} href="/promoted-entities" description="entidades comerciais acessíveis" />
          <StatCard label="Campanhas" value={summary.campaigns} href="/campaigns" description="campanhas do workspace" />
          <StatCard label="Mídias" value={summary.media} href="/media" description="arquivos disponíveis" />
          <StatCard label="Equipe" value={summary.members} href="/team" description="membros do workspace" />
        </div>
      </section>

      {summary.campaigns !== null ? (
        <section className="card compact-card" aria-labelledby="campaign-summary-title">
          <p className="eyebrow">CAMPANHAS</p>
          <h2 id="campaign-summary-title">Situação das campanhas</h2>
          <div className="mini-stats">
            <div><strong>{summary.campaigns}</strong><span>Total</span></div>
            <div><strong>{summary.campaignByStatus?.DRAFT ?? 0}</strong><span>Rascunhos</span></div>
            <div><strong>{summary.campaignByStatus?.SCHEDULED ?? 0}</strong><span>Agendadas</span></div>
            <div><strong>{summary.campaignByStatus?.ACTIVE ?? 0}</strong><span>Ativas</span></div>
          </div>
        </section>
      ) : null}

      {summary.promotedEntities !== null ? (
        <section className="card compact-card" aria-labelledby="commercial-title">
          <p className="eyebrow">ENTIDADES PROMOVIDAS</p>
          <h2 id="commercial-title">Composição comercial</h2>
          {summary.promotedEntities === 0 ? (
            <div className="empty-state">
              <strong>Nenhuma entidade promovida disponível</strong>
              <p>Cadastre uma empresa, marca, produto ou outro objeto comercial quando necessário.</p>
              <Link className="button-link" href="/promoted-entities">Abrir entidades promovidas</Link>
            </div>
          ) : (
            <div className="mini-stats">
              {[
                ["COMPANY","Empresas"],["BRAND","Marcas"],["PRODUCT","Produtos"],["SERVICE","Serviços"],
                ["PLATFORM","Plataformas"],["EVENT","Eventos"],["PROJECT","Projetos"],["INSTITUTIONAL_INITIATIVE","Iniciativas"]
              ].map(([key,label]) => <div key={key}><strong>{commercial[key] ?? 0}</strong><span>{label}</span></div>)}
            </div>
          )}
        </section>
      ) : null}

      <section className="dashboard-two-column">
        <article className="card compact-card">
          <p className="eyebrow">ATALHOS</p>
          <h2>Próximas ações</h2>
          <div className="shortcut-list">
            {summary.campaigns !== null ? <Link href="/campaigns">Criar campanha</Link> : null}
            {summary.artists !== null ? <Link href="/music-catalog">Cadastrar artista ou importar catálogo</Link> : null}
            {summary.promotedEntities !== null ? <Link href="/promoted-entities">Cadastrar entidade promovida</Link> : null}
            {summary.media !== null ? <Link href="/media">Enviar mídia</Link> : null}
            {summary.members !== null ? <Link href="/team">Gerenciar equipe</Link> : null}
            <Link href="/creator">Atualizar perfil de Creator</Link>
          </div>
        </article>
        <article className="card compact-card">
          <p className="eyebrow">ATIVIDADE</p>
          <h2>Atividade recente</h2>
          {summary.recentActivity.length === 0 ? <p>Nenhuma atividade recente disponível.</p> : (
            <div className="activity-list">
              {summary.recentActivity.map((item, index) => (
                <div key={`${item.createdAt}-${index}`}><strong>{item.label}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("pt-BR")}</time></div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
