"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApplicationWorkspace } from "@/server/application/application-context";

const typeLabels:Record<string,string>={LABEL:"Gravadora",MANAGEMENT:"Gestão",COMPANY:"Empresa",AGENCY:"Agência",INTERNAL:"Interno"};
const roleLabels:Record<string,string>={OWNER:"Proprietário",ADMIN:"Administrador",CAMPAIGN_MANAGER:"Gestor de campanhas",MARKETING:"Marketing",SOCIAL_MEDIA:"Mídias sociais",FINANCE:"Financeiro",VIEWER:"Visualizador"};

async function api(url:string,init?:RequestInit){const response=await fetch(url,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message??"Não foi possível concluir a operação.");return payload;}

export function WorkspacePanel({workspaces}:{workspaces:ApplicationWorkspace[]}){
 const router=useRouter();const[message,setMessage]=useState("");
 async function switchWorkspace(workspaceId:string){try{await api("/api/workspaces/active",{method:"POST",body:JSON.stringify({workspaceId})});setMessage("Workspace ativo atualizado.");router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível trocar o workspace.");}}
 async function createWorkspace(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;const data=new FormData(form);try{await api("/api/workspaces",{method:"POST",body:JSON.stringify({name:String(data.get("name")??""),type:String(data.get("type")??"AGENCY"),idempotencyKey:crypto.randomUUID()})});form.reset();setMessage("Workspace criado.");router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível criar o workspace.");}}
 return <div className="page-stack">
  <header className="page-header"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Workspace</h1><p>Contexto operacional e organizações às quais sua conta tem acesso.</p></div></header>
  {message?<p className="notice" role="status">{message}</p>:null}
  <section className="card"><h2>Seus workspaces</h2>{workspaces.length===0?<div className="empty-state"><strong>Você ainda não possui workspace</strong><p>Crie um workspace para iniciar a operação organizacional.</p></div>:<div className="stack">{workspaces.map(workspace=><button className={workspace.active?"workspace-row active":"workspace-row"} key={workspace.id} type="button" aria-pressed={workspace.active} onClick={()=>void switchWorkspace(workspace.id)}><strong>{workspace.name}</strong><span>{typeLabels[workspace.type]??"Workspace"} · {roleLabels[workspace.role_code]??"Acesso"}{workspace.active?" · Atual":""}</span></button>)}</div>}</section>
  <section className="card compact-card"><p className="eyebrow">NOVO CONTEXTO</p><h2>Criar workspace</h2><form className="form two-column-form" onSubmit={createWorkspace}><label>Nome do workspace<input name="name" required minLength={2} maxLength={120}/></label><label>Tipo<select name="type" defaultValue="AGENCY"><option value="LABEL">Gravadora</option><option value="MANAGEMENT">Gestão</option><option value="COMPANY">Empresa</option><option value="AGENCY">Agência</option><option value="INTERNAL">Interno</option></select></label><button type="submit">Criar workspace</button></form></section>
 </div>;
}
