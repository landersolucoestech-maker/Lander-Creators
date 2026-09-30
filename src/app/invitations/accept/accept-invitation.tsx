"use client";

import { useState } from "react";

export function AcceptInvitation({
  token,
  authenticated
}: {
  token: string;
  authenticated: boolean;
}) {
  const [message, setMessage] = useState("");

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

  if (!authenticated) {
    return (
      <p>
        Entre na sua conta com o mesmo e-mail que recebeu o convite e abra este
        link novamente.
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={() => void accept()}>
        Aceitar convite
      </button>
      {message ? <p className="notice" role="status">{message}</p> : null}
    </>
  );
}
