import { randomUUID } from "node:crypto";
import { afterAll,beforeEach,describe,expect,it } from "vitest";
import { createTestSql,resetSecurityData } from "./test-db";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { createCompany,createBrand,createProduct,createService,createPromotedPlatform,createPromotedEvent,createPromotedProject,createInstitutionalInitiative,evaluateCommercialReadiness } from "@/server/promoted-entities/service";
import { authorizePromotedEntityAccess,setPromotedEntityAccessStatus } from "@/server/promoted-entities/access";
import { getRegisteredPromotedObjectTypes,resolvePromotedObject } from "@/server/promoted-entities/registry";
import { uploadMediaAsset } from "@/server/media/media-service";
import { LocalEphemeralStorageAdapter } from "@/server/media/local-storage-adapter";
import { mkdtemp,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const sql=createTestSql();
async function user(email:string){const id=randomUUID();await sql.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true)',[id,"Commercial Test",email]);await sql.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE')",[id]);return id;}
async function setup(email:string){const userId=await user(email);const workspace=await createWorkspace(sql,{userId,name:"Commercial",type:"AGENCY",idempotencyKey:email});return{userId,workspaceId:String(workspace.id)};}
async function taxonomy(code:string){const rows=await sql.unsafe("select tv.id::text from taxonomy_values tv join taxonomy_definitions td on td.id=tv.taxonomy_definition_id where td.code=$1 order by tv.sort_order limit 1",[code]);return String(rows[0].id);}

describe("Commercial promoted entities foundation",()=>{
 beforeEach(async()=>{await resetSecurityData(sql);});
 afterAll(async()=>{await sql.end();});

 it("creates all canonical commercial types and enforces parent invariants",async()=>{
   const x=await setup("commercial@test");
   const company=await createCompany(sql,{...x,tradeName:"Lander Empresa",website:"https://example.com"});
   const companyId=String(company.id);
   const brand=await createBrand(sql,{...x,name:"Marca",companyId});
   const brandId=String(brand.id);
   const product=await createProduct(sql,{...x,name:"Produto",companyId,brandId,categoryTaxonomyValueId:await taxonomy("PRODUCT_CATEGORY")});
   const service=await createService(sql,{...x,name:"Serviço",companyId,categoryTaxonomyValueId:await taxonomy("SERVICE_CATEGORY")});
   const platform=await createPromotedPlatform(sql,{...x,name:"LANDER CREATORS",companyId,website:"https://example.com/app"});
   const event=await createPromotedEvent(sql,{...x,name:"Evento",companyId,eventMode:"PHYSICAL",startsAt:new Date("2026-10-10T12:00:00Z"),endsAt:new Date("2026-10-10T13:00:00Z"),timezoneCode:"America/Sao_Paulo",locationText:"Governador Valadares"});
   const project=await createPromotedProject(sql,{...x,name:"Projeto",companyId});
   const initiative=await createInstitutionalInitiative(sql,{...x,name:"Programa institucional",companyId});
   expect([company,brand,product,service,platform,event,project,initiative].every(value=>Boolean(value.id))).toBe(true);
   await expect(createProduct(sql,{...x,name:"Inválido",companyId,brandId:randomUUID(),categoryTaxonomyValueId:await taxonomy("PRODUCT_CATEGORY")})).rejects.toBeTruthy();
   expect((await evaluateCommercialReadiness(sql,{workspaceId:x.workspaceId,entityType:"COMPANY",entityId:companyId})).status).toBe("READY_WITH_WARNINGS");
 });

 it("requires Workspace permission plus explicit entity access and revocation fails closed",async()=>{
   const a=await setup("a@commercial.test");const b=await setup("b@commercial.test");
   const company=await createCompany(sql,{...a,tradeName:"Privada"});
   await expect(authorizePromotedEntityAccess(sql,{...b,entityType:"COMPANY",entityId:String(company.id),permission:"promoted_entity.view"})).rejects.toMatchObject({code:"PROMOTED_ENTITY_ACCESS_DENIED"});
   await setPromotedEntityAccessStatus(sql,{...a,entityType:"COMPANY",entityId:String(company.id),status:"REVOKED"});
   await expect(authorizePromotedEntityAccess(sql,{...a,entityType:"COMPANY",entityId:String(company.id),permission:"promoted_entity.view"})).rejects.toMatchObject({code:"PROMOTED_ENTITY_ACCESS_DENIED"});
 });

 it("never auto merges possible duplicates",async()=>{
   const x=await setup("dup@commercial.test");
   await createCompany(sql,{...x,tradeName:"Mesmo Nome"});
   await expect(createCompany(sql,{...x,tradeName:"Mesmo Nome"})).rejects.toMatchObject({code:"POSSIBLE_DUPLICATE_REQUIRES_RESOLUTION"});
   const second=await createCompany(sql,{...x,tradeName:"Mesmo Nome",confirmDuplicate:true});
   expect(second.id).toBeTruthy();
 });

 it("rejects foreign Shared Media and invalid event ordering",async()=>{
   const a=await setup("media-a@test");const b=await setup("media-b@test");
   const root=await mkdtemp(path.join(tmpdir(),"promoted-media-"));
   try{
     const storage=new LocalEphemeralStorageAdapter(root);
     const png=Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082","hex");
     const media=await uploadMediaAsset(sql,storage,{...a,originalFileName:"logo.png",declaredMime:"image/png",bytes:png});
     await expect(createCompany(sql,{...b,tradeName:"Ataque",logoMediaAssetId:media.id})).rejects.toMatchObject({code:"PROMOTED_ENTITY_MEDIA_ACCESS_DENIED"});
     await expect(createPromotedEvent(sql,{...b,name:"Data inválida",eventMode:"ONLINE",startsAt:new Date("2026-10-11T12:00:00Z"),endsAt:new Date("2026-10-10T12:00:00Z"),timezoneCode:"UTC",onlineUrl:"https://example.com"})).rejects.toBeTruthy();
   }finally{await rm(root,{recursive:true,force:true});}
 });

 it("registers every canonical type and resolves a commercial adapter",async()=>{
   const x=await setup("registry@test");const company=await createCompany(sql,{...x,tradeName:"Registry Co"});
   expect(getRegisteredPromotedObjectTypes()).toEqual(["MUSIC_TRACK","MUSIC_RELEASE","ARTIST","COMPANY","BRAND","PRODUCT","SERVICE","PLATFORM","EVENT","PROJECT","INSTITUTIONAL_INITIATIVE"]);
   expect(await resolvePromotedObject(sql,{...x,type:"COMPANY",entityId:String(company.id)})).toMatchObject({type:"COMPANY",displayName:"Registry Co"});
 });
});
