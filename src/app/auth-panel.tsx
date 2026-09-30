"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthPanel() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? "")
    });
    if (result.error) {
      setMessage("E-mail, senha ou verificação inválidos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await authClient.signUp.email({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? "")
    });
    setMessage(
      result.error
        ? "Não foi possível concluir o cadastro."
        : "Cadastro recebido. Verifique seu e-mail para ativar a conta."
    );
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(data.get("email") ?? ""),
      redirectTo: `${window.location.origin}/reset-password`
    });
    setMessage("Se a conta existir, as instruções de recuperação serão enviadas.");
  }

  return (
    <main className="app-shell auth-shell">
      <div>
        <p className="eyebrow">LANDER CREATORS</p>
        <h1>Acesse sua conta</h1>
        <p>Identidade e workspace com isolamento por organização.</p>
      </div>
      {message ? <p className="notice" role="status">{message}</p> : null}
      <section className="grid">
        <form onSubmit={signIn} className="card form">
          <h2>Entrar</h2>
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={10}
              required
            />
          </label>
          <button type="submit">Entrar</button>
        </form>

        <form onSubmit={signUp} className="card form">
          <h2>Criar conta</h2>
          <label>
            Nome
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>
          <button type="submit">Cadastrar</button>
        </form>

        <form onSubmit={requestReset} className="card form">
          <h2>Recuperar acesso</h2>
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button type="submit">Enviar instruções</button>
        </form>
      </section>
    </main>
  );
}
