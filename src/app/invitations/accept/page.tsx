import { resolveApplicationActor } from "@/server/auth/application-actor";
import { AcceptInvitation } from "./accept-invitation";

export default async function AcceptInvitationPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const actor = await resolveApplicationActor();
  const params = await searchParams;

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">LANDER CREATORS</p>
        <h1>Convite de workspace</h1>
        <AcceptInvitation
          token={params.token ?? ""}
          authenticated={Boolean(actor)}
        />
      </section>
    </main>
  );
}
