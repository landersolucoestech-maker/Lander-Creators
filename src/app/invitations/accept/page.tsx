import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { AcceptInvitation } from "./accept-invitation";

export default async function AcceptInvitationPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">LANDER CREATORS</p>
        <h1>Convite de workspace</h1>
        <AcceptInvitation
          token={params.token ?? ""}
          authenticated={Boolean(session)}
        />
      </section>
    </main>
  );
}
