"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({
  token,
  invalid
}: {
  token: string;
  invalid: boolean;
}) {
  const [message, setMessage] = useState(
    invalid ? "O link de recuperação é inválido ou expirou." : ""
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage("O link de recuperação é inválido ou expirou.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const result = await authClient.resetPassword({
      token,
      newPassword: String(data.get("password") ?? "")
    });
    setMessage(
      result.error
        ? "Não foi possível alterar a senha."
        : "Senha atualizada. Você já pode entrar com a nova senha."
    );
  }

  return (
    <form onSubmit={submit} className="card form">
      <p className="eyebrow">LANDER CREATORS</p>
      <h1>Definir nova senha</h1>
      {message ? <p className="notice" role="status">{message}</p> : null}
      <label>
        Nova senha
        <input name="password" type="password" minLength={10} required />
      </label>
      <button type="submit">Atualizar senha</button>
    </form>
  );
}
