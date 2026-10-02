import { formatDate, formatMinor } from "../format";
import { payableStatusLabels } from "../post-campaign-labels";

type Payment = {
  id: string;
  amount_minor: string;
  currency_code: string;
  status: string;
  eligible_at: string | Date | null;
  released_at: string | Date | null;
  paid_at: string | Date | null;
  campaign_name: string;
};

export function PaymentsPanel({ payments }: { payments: Payment[] }) {
  return (
    <div className="module-surface">
      <header className="page-header">
        <div>
          <p className="eyebrow">FINANCEIRO</p>
          <h1>Pagamentos</h1>
          <p>Acompanhe o andamento dos seus pagamentos. A liberação depende da verificação das publicações contratadas.</p>
        </div>
      </header>

      <section className="card compact-card">
        <h2>Seus pagamentos</h2>
        {payments.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum pagamento registrado</strong>
            <p>O pagamento é criado pelo contratante quando a contratação estiver ativa.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Tabela de pagamentos">
            <table>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Elegível em</th>
                  <th>Liberado em</th>
                  <th>Pago em</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.campaign_name}</td>
                    <td>{formatMinor(payment.amount_minor, payment.currency_code)}</td>
                    <td><span className="status-badge">{payableStatusLabels[payment.status] ?? "Indisponível"}</span></td>
                    <td>{formatDate(payment.eligible_at)}</td>
                    <td>{formatDate(payment.released_at)}</td>
                    <td>{formatDate(payment.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
