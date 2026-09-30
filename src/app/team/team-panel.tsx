"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MemberView={id:string;user_id:string;name:string;email:string;status:string;role_code:string};
const roles=[
  {value:"OWNER",label:"Proprietário"},{value:"ADMIN",label:"Administrador"},
  {value:"CAMPAIGN_MANAGER",label:"Gestor de campanhas"},{value:"MARKETING",label:"Marketing"},
  {value:"SOCIAL_MEDIA",label:"Mídias sociais"},{value:"FINANCE",label:"Financeiro"},{value:"VIEWER",label:"Visualizador"}
];
const statusLabels:Record<string,string>={ACTIVE:"Ativo",SUSPENDED:"Suspenso",REMOVED:"Removido"};

async function api(url:string,init?:RequestInit){
 const response=await fetch(url,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
 const payload=await response.json();
 if(!response.ok)throw new Error(payload?.error?.message??"Não foi possível concluir a operação.");
 return payload;
}

export function TeamPanel({workspaceId,workspaceName,members}:{workspaceId:string;workspaceName:string;members:MemberView[]}){
 const router=useRouter();const[message,setMessage]=useState("");
 async function invite(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
  try{await api(`/api/workspaces/${workspaceId}/invitations`,{method:"POST",body:JSON.stringify({recipientEmail:String(data.get("email")??""),roleCode:String(data.get("role")??"VIEWER")})});form.reset();setMessage("Convite criado e encaminhado pelo canal configurado.");}
  catch(error){setMessage(error instanceof Error?error.message:"Não foi possível criar o convite.");}
 }
 async function changeRole(memberId:string,roleCode:string){
  try{await api(`/api/workspaces/${workspaceId}/members/${memberId}/role`,{method:"POST",body:JSON.stringify({roleCode})});setMessage("Função atualizada.");router.refresh();}
  catch(error){setMessage(error instanceof Error?error.message:"Não foi possível atualizar a função.");}
 }
 return <div className="page-stack">
  <header className="page-header"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Equipe</h1><p>Membros e funções de <strong>{workspaceName}</strong>.</p></div></header>
  {message?<p className="notice" role="status">{message}</p>:null}
  <section className="card">
   <h2>Membros</h2>
   {members.length===0?<div className="empty-state"><strong>Nenhum membro disponível</strong></div>:<div className="table-scroll" tabIndex={0} aria-label="Tabela de membros"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Situação</th><th>Função</th></tr></thead><tbody>{members.map(member=><tr key={member.id}><td>{member.name}</td><td>{member.email}</td><td><span className="status-badge">{statusLabels[member.status]??"Indisponível"}</span></td><td><select aria-label={`Função de ${member.name}`} value={member.role_code} onChange={(event)=>void changeRole(member.id,event.target.value)}>{roles.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select></td></tr>)}</tbody></table></div>}
  </section>
  <section className="card compact-card"><p className="eyebrow">CONVITE</p><h2>Convidar membro</h2><form className="form two-column-form" onSubmit={invite}><label>E-mail<input name="email" type="email" required/></label><label>Função<select name="role" defaultValue="VIEWER">{roles.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select></label><button type="submit">Convidar membro</button></form></section>
 </div>;
}
