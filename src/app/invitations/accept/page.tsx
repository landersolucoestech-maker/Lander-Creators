"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitationPage() {
  const { data: session, isPending } = authClient.useSession();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function accept() {
    if (!token) {
      setMessage("Convite inválido.");
      return;
    }
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const payload = await response.json();
    setMessage(
      response.ok
        ? "Convite aceito. O workspace já está disponível na sua conta."
        : payload?.error?.message ?? "Não foi possível aceitar o convite."
    );
  }

  if (isPending) return <main className="shell"><p>Carregando…</p></main>;

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">LANDER CREATORS</p>
        <h1>Convite de workspace</h1>
        {!session ? (
          <p>Entre na sua conta com o mesmo e-mail que recebeu o convite e abra este link novamente.</p>
        ) : (
          <button type="button" onClick={() => void accept()}>Aceitar convite</button>
        )}
        {message ? <p className="notice" role="status">{message}</p> : null}
      </section>
    </main>
  );
}
