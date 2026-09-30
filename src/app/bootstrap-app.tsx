"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Workspace = {
  id: string;
  name: string;
  type: string;
  status: string;
  role_code: string;
  active: boolean;
};

type Member = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: string;
  role_code: string;
};

const roles = [
  "OWNER",
  "ADMIN",
  "CAMPAIGN_MANAGER",
  "MARKETING",
  "SOCIAL_MEDIA",
  "FINANCE",
  "VIEWER"
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível concluir a operação.");
  return payload as T;
}

export function BootstrapApp() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [message, setMessage] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.active) ?? null,
    [workspaces]
  );

  const loadWorkspaces = useCallback(async () => {
    if (!session) return;
    const result = await api<{ workspaces: Workspace[] }>("/api/workspaces");
    setWorkspaces(result.workspaces);
  }, [session]);

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace) {
      setMembers([]);
      return;
    }
    const result = await api<{ members: Member[] }>(
      `/api/workspaces/${activeWorkspace.id}/members`
    );
    setMembers(result.members);
  }, [activeWorkspace]);

  useEffect(() => {
    void loadWorkspaces().catch((error: Error) => setMessage(error.message));
  }, [loadWorkspaces]);

  useEffect(() => {
    void loadMembers().catch((error: Error) => setMessage(error.message));
  }, [loadMembers]);

  if (isPending) {
    return <main className="shell"><p>Carregando…</p></main>;
  }

  if (!session) {
    return <AuthPanel onAuthenticated={() => void refetch()} />;
  }

  async function createWorkspaceAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          type: String(data.get("type") ?? "AGENCY"),
          idempotencyKey: crypto.randomUUID()
        })
      });
      event.currentTarget.reset();
      await loadWorkspaces();
      setMessage("Workspace criado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o workspace.");
    }
  }

  async function switchWorkspace(workspaceId: string) {
    try {
      await api("/api/workspaces/active", {
        method: "POST",
        body: JSON.stringify({ workspaceId })
      });
      await loadWorkspaces();
      setMessage("Workspace ativo atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível trocar o workspace.");
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    const data = new FormData(event.currentTarget);
    try {
      await api(`/api/workspaces/${activeWorkspace.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          recipientEmail: String(data.get("email") ?? ""),
          roleCode: String(data.get("role") ?? "VIEWER")
        })
      });
      event.currentTarget.reset();
      setMessage("Convite criado e encaminhado pelo canal configurado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o convite.");
    }
  }

  async function changeRole(memberId: string, roleCode: string) {
    if (!activeWorkspace) return;
    try {
      await api(
        `/api/workspaces/${activeWorkspace.id}/members/${memberId}/role`,
        { method: "POST", body: JSON.stringify({ roleCode }) }
      );
      await loadMembers();
      setMessage("Função atualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a função.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">LANDER CREATORS</p>
          <h1>Fundação de acesso</h1>
        </div>
        <div className="account">
          <span>{session.user.name}</span>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              await refetch();
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {message ? <p className="notice" role="status">{message}</p> : null}

      <section className="grid">
        <article className="card">
          <h2>Workspaces</h2>
          {workspaces.length === 0 ? <p>Você ainda não possui workspace.</p> : null}
          <div className="stack">
            {workspaces.map((workspace) => (
              <button
                className={workspace.active ? "workspace-row active" : "workspace-row"}
                key={workspace.id}
                type="button"
                onClick={() => void switchWorkspace(workspace.id)}
              >
                <strong>{workspace.name}</strong>
                <span>{workspace.type} · {workspace.role_code}</span>
              </button>
            ))}
          </div>
          <form onSubmit={createWorkspaceAction} className="form">
            <label>
              Nome do workspace
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <label>
              Tipo
              <select name="type" defaultValue="AGENCY">
                <option value="LABEL">Gravadora</option>
                <option value="MANAGEMENT">Gestão</option>
                <option value="COMPANY">Empresa</option>
                <option value="AGENCY">Agência</option>
                <option value="INTERNAL">Interno</option>
              </select>
            </label>
            <button type="submit">Criar workspace</button>
          </form>
        </article>

        <article className="card">
          <h2>Equipe</h2>
          {!activeWorkspace ? <p>Selecione um workspace.</p> : (
            <>
              <p>Workspace ativo: <strong>{activeWorkspace.name}</strong></p>
              <div className="stack">
                {members.map((member) => (
                  <div className="member-row" key={member.id}>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.email}</span>
                    </div>
                    <select
                      aria-label={`Função de ${member.name}`}
                      value={member.role_code}
                      onChange={(event) => void changeRole(member.id, event.target.value)}
                    >
                      {roles.map((role) => <option key={role}>{role}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <form onSubmit={inviteMember} className="form">
                <label>
                  E-mail
                  <input name="email" type="email" required />
                </label>
                <label>
                  Função
                  <select name="role" defaultValue="VIEWER">
                    {roles.map((role) => <option key={role}>{role}</option>)}
                  </select>
                </label>
                <button type="submit">Convidar membro</button>
              </form>
            </>
          )}
        </article>
      </section>
    </main>
  );
}

function AuthPanel({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? "")
    });
    if (result.error) setMessage("E-mail, senha ou verificação inválidos.");
    else {
      setMessage("");
      onAuthenticated();
    }
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
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" minLength={10} required /></label>
          <button type="submit">Entrar</button>
        </form>
        <form onSubmit={signUp} className="card form">
          <h2>Criar conta</h2>
          <label>Nome<input name="name" autoComplete="name" required /></label>
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
          <button type="submit">Cadastrar</button>
        </form>
        <form onSubmit={requestReset} className="card form">
          <h2>Recuperar acesso</h2>
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <button type="submit">Enviar instruções</button>
        </form>
      </section>
    </main>
  );
}
