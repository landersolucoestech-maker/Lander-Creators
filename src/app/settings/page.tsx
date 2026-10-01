import { redirect } from "next/navigation";
import { resolveApplicationActor } from "@/server/auth/application-actor";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { getApplicationShellState } from "@/server/application/application-context";
import { ApplicationShell } from "../application-shell";
import { workspaceNavigation } from "../application-navigation";

export default async function SettingsPage(){
 const actor=await resolveApplicationActor();if(!actor)redirect("/");
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{
  const state=await getApplicationShellState(client,{id:actor.id,name:actor.name,email:actor.email});
  return <ApplicationShell state={state} navigation={workspaceNavigation(state)} context="workspace">
   <div className="page-stack">
    <header className="page-header"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Configurações</h1><p>Informações existentes da sua conta e do contexto ativo.</p></div></header>
    <section className="settings-grid">
     <article className="card compact-card"><p className="eyebrow">CONTA</p><h2>Sua conta</h2><dl className="detail-list"><div><dt>Nome</dt><dd>{state.user.name}</dd></div><div><dt>E-mail</dt><dd>{state.user.email}</dd></div></dl></article>
     <article className="card compact-card"><p className="eyebrow">WORKSPACE</p><h2>Contexto atual</h2>{state.activeWorkspace?<dl className="detail-list"><div><dt>Workspace</dt><dd>{state.activeWorkspace.name}</dd></div><div><dt>Situação</dt><dd>Ativo</dd></div></dl>:<p>Nenhum workspace ativo.</p>}</article>
    </section>
   </div>
  </ApplicationShell>;
 }finally{await client.end();}
}
