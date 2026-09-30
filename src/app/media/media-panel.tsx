"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MediaView = {
  id: string;
  originalFileName: string;
  mediaKind: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  visibility: string;
};

const visibilityLabels: Record<string,string> = { PRIVATE:"Privado", WORKSPACE_AVAILABLE:"Disponível no workspace" };
const kindLabels: Record<string,string> = { IMAGE:"Imagem", AUDIO:"Áudio", DOCUMENT:"Documento" };

export function MediaPanel({ workspaceId, media }: { workspaceId:string; media:MediaView[] }) {
  const router = useRouter();
  const [message,setMessage] = useState("");
  const [selectedFileName,setSelectedFileName] = useState("Nenhum arquivo selecionado");

  async function openMedia(mediaAssetId:string){
    const access=await fetch(`/api/workspaces/${workspaceId}/media/${mediaAssetId}/access`,{method:"POST"});
    const accessPayload=await access.json();
    if(!access.ok){setMessage(accessPayload?.error?.message??"Não foi possível abrir o arquivo.");return;}
    const content=await fetch(`/api/workspaces/${workspaceId}/media/${mediaAssetId}/content`,{headers:{"x-media-access":String(accessPayload.accessToken)}});
    if(!content.ok){const payload=await content.json();setMessage(payload?.error?.message??"Não foi possível abrir o arquivo.");return;}
    const objectUrl=URL.createObjectURL(await content.blob());
    window.open(objectUrl,"_blank","noopener,noreferrer");
    setTimeout(()=>URL.revokeObjectURL(objectUrl),60_000);
  }

  async function upload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const response=await fetch(`/api/workspaces/${workspaceId}/media`,{method:"POST",body:new FormData(form)});
    const payload=await response.json();
    setMessage(response.ok?"Arquivo validado e adicionado.":payload?.error?.message??"Não foi possível adicionar o arquivo.");
    if(response.ok){form.reset();setSelectedFileName("Nenhum arquivo selecionado");router.refresh();}
  }

  return <div className="page-stack">
    <header className="page-header"><div><p className="eyebrow">RECURSOS</p><h1>Mídia</h1><p>Arquivos compartilhados do workspace, mantendo o escopo atual de Shared Media.</p></div></header>
    {message?<p className="notice" role="status">{message}</p>:null}
    <section className="card">
      <div className="section-heading"><div><h2>Arquivos</h2><p>{media.length.toLocaleString("pt-BR")} arquivo(s) disponível(is).</p></div></div>
      {media.length===0?<div className="empty-state"><strong>Nenhuma mídia enviada</strong><p>Envie uma imagem, documento ou áudio quando um módulo precisar reutilizar esse arquivo.</p></div>:<div className="stack">{media.map(item=><div className="media-row" key={item.id}><div><strong>{item.originalFileName}</strong><span>{kindLabels[item.mediaKind]??"Arquivo"} · {Math.ceil(item.sizeBytes/1024).toLocaleString("pt-BR")} KB · {visibilityLabels[item.visibility]??"Acesso controlado"}</span></div><button type="button" className="secondary-button" onClick={()=>void openMedia(item.id)}>Abrir</button></div>)}</div>}
    </section>
    <section className="card compact-card">
      <p className="eyebrow">NOVO ARQUIVO</p><h2>Enviar mídia</h2>
      <form className="form" onSubmit={upload}>
        <label>Arquivo<span className="file-picker"><span className="file-picker-action">Selecionar arquivo</span><span className="file-picker-name">{selectedFileName}</span><input className="visually-hidden" name="file" type="file" accept=".png,.jpg,.jpeg,.pdf,.wav,.mp3" required onChange={(event)=>setSelectedFileName(event.target.files?.[0]?.name??"Nenhum arquivo selecionado")}/></span></label>
        <label>Acesso<select name="visibility" defaultValue="PRIVATE"><option value="PRIVATE">Privado</option><option value="WORKSPACE_AVAILABLE">Disponível no workspace</option></select></label>
        <button type="submit">Adicionar arquivo</button>
      </form>
      <p className="helper">Tipos atuais: PNG, JPEG, PDF, WAV e MP3. Limite técnico padrão: 10 MB.</p>
    </section>
  </div>;
}
