"use client";
import { useState,type FormEvent } from "react";

type Entity={id:string;name:string;status:string;access_level:string;access_status:string;verification_status?:string|null};
type Props={
  workspaceId:string;
  initialEntities:Record<string,Entity[]>;
  taxonomies:Array<{code:string;values:Array<{id:string;label:string}>}>;
  referenceData:{countries:Array<{code:string;label:string}>;languages:Array<{code:string;label:string}>;timezones:Array<{code:string;label:string}>};
  media:Array<{id:string;originalFileName:string;mediaKind:string}>;
};
const labels:Record<string,string>={COMPANY:"Empresas",BRAND:"Marcas",PRODUCT:"Produtos",SERVICE:"Serviços",PLATFORM:"Plataformas",EVENT:"Eventos",PROJECT:"Projetos",INSTITUTIONAL_INITIATIVE:"Iniciativas institucionais"};const accessLabels:Record<string,string>={OWNER:"Proprietário",MANAGE_CAMPAIGNS:"Gerenciar uso em campanhas",VIEW:"Visualizar",CAMPAIGN_ONLY:"Uso em campanha"};

class ApiError extends Error{constructor(public readonly code:string,message:string,public readonly details?:{candidateIds?:string[]}){super(message);this.name="ApiError";}}

async function api(url:string,init?:RequestInit){
  const r=await fetch(url,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
  const p=await r.json();
  if(!r.ok)throw new ApiError(String(p?.error?.code??"INTERNAL_ERROR"),p?.error?.message??"Não foi possível concluir a operação.",p?.error?.details);
  return p;
}

export function PromotedEntitiesPanel({workspaceId,initialEntities,taxonomies,referenceData,media}:Props){
  const[entities,setEntities]=useState(initialEntities);
  const[message,setMessage]=useState("");
  const images=media.filter(x=>x.mediaKind==="IMAGE");
  const industries=taxonomies.find(x=>x.code==="INDUSTRY")?.values??[];
  const productCategories=taxonomies.find(x=>x.code==="PRODUCT_CATEGORY")?.values??[];
  const serviceCategories=taxonomies.find(x=>x.code==="SERVICE_CATEGORY")?.values??[];
  const companies=entities.COMPANY??[];
  const brands=entities.BRAND??[];
  const duplicateResolution=(type:string)=><><label>Usar registro existente<select name="existingEntityId" defaultValue=""><option value="">Não usar existente</option>{(entities[type]??[]).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="checkbox-field"><input type="checkbox" name="confirmDuplicate"/> Confirmar novo registro se houver possível duplicado</label></>;

  async function refresh(){
    const p=await api(`/api/workspaces/${workspaceId}/promoted-entities`);
    setEntities(p.entities);
  }

  async function edit(type:string,entity:Entity,event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
    try{await api(`/api/workspaces/${workspaceId}/promoted-entities/${type}/${entity.id}`,{method:"PATCH",body:JSON.stringify({name:String(data.get("name")??""),description:String(data.get("description")??"")||null,website:String(data.get("website")??"")||null})});await refresh();setMessage("Objeto promovido atualizado.");}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível atualizar.");}
  }

  async function submit(path:string,event:FormEvent<HTMLFormElement>,payload:Record<string,unknown>){
    event.preventDefault();
    const form=event.currentTarget;
    try{
      const result=await api(`/api/workspaces/${workspaceId}/${path}`,{method:"POST",body:JSON.stringify(payload)});
      form.reset();
      await refresh();
      setMessage(result.entity?.duplicateClassification==="EXISTING"?"Registro existente selecionado.":"Objeto promovido criado.");
    }catch(error){
      if(error instanceof ApiError&&error.code==="POSSIBLE_DUPLICATE_REQUIRES_RESOLUTION"){
        const typeByPath:Record<string,string>={companies:"COMPANY",brands:"BRAND",products:"PRODUCT",services:"SERVICE",platforms:"PLATFORM",events:"EVENT",projects:"PROJECT",initiatives:"INSTITUTIONAL_INITIATIVE"};
        const ids=error.details?.candidateIds??[];
        const names=(entities[typeByPath[path]]??[]).filter(item=>ids.includes(item.id)).map(item=>item.name);
        setMessage(names.length?`Possível duplicado: ${names.join(", ")}. Escolha o registro existente ou confirme um novo.`:error.message);
      }else setMessage(error instanceof Error?error.message:"Não foi possível criar o objeto promovido.");
    }
  }

  return <div className="module-surface">\n    <header className="page-header">\n      <div><p className="eyebrow">OPERAÇÃO</p><h1>Entidades promovidas</h1><p>Empresas, marcas, produtos, serviços e demais contextos comerciais acessíveis neste workspace.</p></div>\n    </header>
    {message?<p className="notice" role="status">{message}</p>:null}
    <section className="catalog-grid">
      {Object.entries(labels).map(([type,label])=><article className="card" key={type}>
        <p className="eyebrow">{label.toUpperCase()}</p><h2>{label}</h2>
        {(entities[type]??[]).length===0?<p>Nenhum registro acessível neste workspace.</p>:<div className="stack">{(entities[type]??[]).map(entity=><div className="catalog-row" key={entity.id}><strong>{entity.name}</strong><span>{entity.status==="ACTIVE"?"Ativo":entity.status==="DRAFT"?"Rascunho":entity.status==="ARCHIVED"?"Arquivado":"Suspenso"} · {accessLabels[entity.access_level]??"Acesso controlado"}{type==="COMPANY"&&entity.verification_status?` · Verificação: ${entity.verification_status==="VERIFIED"?"Verificada":entity.verification_status==="PENDING"?"Pendente":entity.verification_status==="REJECTED"?"Rejeitada":entity.verification_status==="REVIEW_REQUIRED"?"Revisão necessária":"Não verificada"}`:""}</span>{entity.access_level==="OWNER"?<details><summary>Editar</summary><form className="form compact-form" onSubmit={event=>void edit(type,entity,event)}><label>Nome<input name="name" defaultValue={entity.name} required/></label><label>Descrição<textarea name="description"/></label><label>URL HTTPS<input name="website" type="url"/></label><button type="submit">Salvar alterações</button></form></details>:null}</div>)}</div>}
      </article>)}
    </section>
    <section className="catalog-grid">
      <article className="card"><h2>Nova empresa</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("companies",event,{tradeName:String(data.get("tradeName")??""),legalName:String(data.get("legalName")??"")||null,description:String(data.get("description")??"")||null,website:String(data.get("website")??"")||null,countryCode:String(data.get("countryCode")??"")||null,languageCode:String(data.get("languageCode")??"")||null,industryTaxonomyValueId:String(data.get("industryTaxonomyValueId")??"")||null,logoMediaAssetId:String(data.get("mediaId")??"")||null,existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}>
        <label>Nome comercial<input name="tradeName" required/></label><label>Razão social<input name="legalName"/></label><label>Site HTTPS<input name="website" type="url"/></label>
        <label>País<select name="countryCode" defaultValue=""><option value="">Não informado</option>{referenceData.countries.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label>Idioma<select name="languageCode" defaultValue=""><option value="">Não informado</option>{referenceData.languages.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label>Setor<select name="industryTaxonomyValueId" defaultValue=""><option value="">Não informado</option>{industries.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Logo<select name="mediaId" defaultValue=""><option value="">Sem logo</option>{images.map(item=><option key={item.id} value={item.id}>{item.originalFileName}</option>)}</select></label>
        <label>Descrição<textarea name="description"/></label>{duplicateResolution("COMPANY")}<button type="submit">Criar empresa</button>
      </form></article>

      <article className="card"><h2>Nova marca</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("brands",event,{name:String(data.get("name")??""),companyId:String(data.get("companyId")??"")||null,description:String(data.get("description")??"")||null,website:String(data.get("website")??"")||null,logoMediaAssetId:String(data.get("mediaId")??"")||null,existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}>
        <label>Nome<input name="name" required/></label><label>Empresa<select name="companyId" defaultValue=""><option value="">Sem empresa</option>{companies.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Site HTTPS<input name="website" type="url"/></label><label>Logo<select name="mediaId" defaultValue=""><option value="">Sem logo</option>{images.map(item=><option key={item.id} value={item.id}>{item.originalFileName}</option>)}</select></label><label>Descrição<textarea name="description"/></label>{duplicateResolution("BRAND")}<button type="submit">Criar marca</button>
      </form></article>

      <article className="card"><h2>Novo produto</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("products",event,{name:String(data.get("name")??""),companyId:String(data.get("companyId")??"")||null,brandId:String(data.get("brandId")??"")||null,categoryTaxonomyValueId:String(data.get("category")??""),primaryMediaAssetId:String(data.get("mediaId")??"")||null,existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}>
        <label>Nome<input name="name" required/></label><label>Empresa<select name="companyId" defaultValue=""><option value="">Sem empresa</option>{companies.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Marca<select name="brandId" defaultValue=""><option value="">Sem marca</option>{brands.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Categoria<select name="category" required defaultValue=""><option value="" disabled>Selecione</option>{productCategories.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Imagem<select name="mediaId" defaultValue=""><option value="">Sem imagem</option>{images.map(item=><option key={item.id} value={item.id}>{item.originalFileName}</option>)}</select></label>{duplicateResolution("PRODUCT")}<button type="submit">Criar produto</button>
      </form></article>

      <article className="card"><h2>Novo serviço</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("services",event,{companyId:String(data.get("companyId")??""),name:String(data.get("name")??""),categoryTaxonomyValueId:String(data.get("category")??""),existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}>
        <label>Empresa<select name="companyId" required defaultValue=""><option value="" disabled>Selecione</option>{companies.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Nome<input name="name" required/></label><label>Categoria<select name="category" required defaultValue=""><option value="" disabled>Selecione</option>{serviceCategories.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{duplicateResolution("SERVICE")}<button type="submit">Criar serviço</button>
      </form></article>

      <article className="card"><h2>Nova plataforma</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("platforms",event,{name:String(data.get("name")??""),companyId:String(data.get("companyId")??"")||null,website:String(data.get("website")??"")||null,existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}><label>Nome<input name="name" required/></label><label>Empresa<select name="companyId" defaultValue=""><option value="">Sem empresa</option>{companies.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Site HTTPS<input name="website" type="url"/></label>{duplicateResolution("PLATFORM")}<button type="submit">Criar plataforma</button></form></article>

      <article className="card"><h2>Novo evento</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("events",event,{name:String(data.get("name")??""),eventMode:String(data.get("eventMode")??"PHYSICAL"),startsAt:String(data.get("startsAt")??""),endsAt:String(data.get("endsAt")??"")||null,timezoneCode:String(data.get("timezoneCode")??""),locationText:String(data.get("locationText")??"")||null,onlineUrl:String(data.get("onlineUrl")??"")||null,existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}>
        <label>Nome<input name="name" required/></label><label>Modo<select name="eventMode"><option value="PHYSICAL">Presencial</option><option value="ONLINE">Online</option><option value="HYBRID">Híbrido</option></select></label><label>Início<input name="startsAt" type="datetime-local" required/></label><label>Fim<input name="endsAt" type="datetime-local"/></label><label>Fuso horário<select name="timezoneCode" defaultValue="America/Sao_Paulo">{referenceData.timezones.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label>Local<input name="locationText"/></label><label>URL online<input name="onlineUrl" type="url"/></label>{duplicateResolution("EVENT")}<button type="submit">Criar evento</button>
      </form></article>

      <article className="card"><h2>Novo projeto</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("projects",event,{name:String(data.get("name")??""),companyId:String(data.get("companyId")??"")||null,website:String(data.get("website")??"")||null,existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}><label>Nome<input name="name" required/></label><label>Empresa<select name="companyId" defaultValue=""><option value="">Sem empresa</option>{companies.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>URL de referência<input name="website" type="url"/></label>{duplicateResolution("PROJECT")}<button type="submit">Criar projeto</button></form></article>

      <article className="card"><h2>Nova iniciativa institucional</h2><form className="form" onSubmit={event=>{const data=new FormData(event.currentTarget);void submit("initiatives",event,{name:String(data.get("name")??""),companyId:String(data.get("companyId")??"")||null,website:String(data.get("website")??"")||null,existingEntityId:String(data.get("existingEntityId")??"")||null,confirmDuplicate:data.get("confirmDuplicate")==="on"});}}><label>Nome<input name="name" required/></label><label>Empresa<select name="companyId" defaultValue=""><option value="">Sem empresa</option>{companies.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>URL de referência<input name="website" type="url"/></label>{duplicateResolution("INSTITUTIONAL_INITIATIVE")}<button type="submit">Criar iniciativa institucional</button></form></article>
    </section>
  </div>;
}
