"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export type WorkspaceView = {
  id: string;
  name: string;
  type: string;
  status: string;
  role_code: string;
  active: boolean;
};

export type MemberView = {
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

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? "Não foi possível concluir a operação."
    );
  }
  return payload;
}

export function WorkspaceDashboard({
  userName,
  workspaces,
  members
}: {
  userName: string;
  workspaces: WorkspaceView[];
  members: MemberView[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const activeWorkspace = workspaces.find((workspace) => workspace.active) ?? null;

  async function refreshWithMessage(text: string) {
    setMessage(text);
    router.refresh();
  }

  async function createWorkspaceAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          type: String(data.get("type") ?? "AGENCY"),
          idempotencyKey: crypto.randomUUID()
        })
      });
      form.reset();
      await refreshWithMessage("Workspace criado.");
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
      await refreshWithMessage("Workspace ativo atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível trocar o workspace.");
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(`/api/workspaces/${activeWorkspace.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          recipientEmail: String(data.get("email") ?? ""),
          roleCode: String(data.get("role") ?? "VIEWER")
        })
      });
      form.reset();
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
      await refreshWithMessage("Função atualizada.");
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
          <span>{userName}</span>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/");
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
          {!activeWorkspace ? (
            <p>Selecione um workspace.</p>
          ) : (
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
                      onChange={(event) =>
                        void changeRole(member.id, event.target.value)
                      }
                    >
                      {roles.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
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
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
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
