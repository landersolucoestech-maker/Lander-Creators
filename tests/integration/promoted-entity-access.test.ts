import { randomUUID } from "node:crypto";
import { afterAll,beforeEach,describe,expect,it } from "vitest";
import { createTestSql,resetSecurityData } from "./test-db";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { createCompany,createBrand,createProduct,createService,createPromotedPlatform,createPromotedEvent,createPromotedProject,createInstitutionalInitiative } from "@/server/promoted-entities/service";
import { authorizePromotedEntityAccess,grantWorkspacePromotedEntityAccess,setPromotedEntityAccessStatus } from "@/server/promoted-entities/access";
import { resolvePromotedObject } from "@/server/promoted-entities/registry";
import { createArtist } from "@/server/music-catalog/artist-service";
import { createRelease,createTrack } from "@/server/music-catalog/catalog-service";

const sql=createTestSql();
async function newUser(email:string){const id=randomUUID();await sql.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true)',[id,"Access Test",email]);await sql.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE')",[id]);return id;}
async function setup(email:string){const userId=await newUser(email);const w=await createWorkspace(sql,{userId,name:email,type:"AGENCY",idempotencyKey:email});return{userId,workspaceId:String(w.id)};}
async function taxonomy(code:string){const rows=await sql.unsafe("select tv.id::text from taxonomy_values tv join taxonomy_definitions td on td.id=tv.taxonomy_definition_id where td.code=$1 order by tv.sort_order limit 1",[code]);return String(rows[0].id);}

describe("Promoted entity access and adapters",()=>{
 beforeEach(async()=>{await resetSecurityData(sql);});
 afterAll(async()=>{await sql.end();});

 it("prevents arbitrary claims and supports explicit owner-granted multi-Workspace access",async()=>{
   const owner=await setup("owner-promoted@test");
   const target=await setup("target-promoted@test");
   const entity=await createCompany(sql,{...owner,tradeName:"Shared Company"});
   await expect(grantWorkspacePromotedEntityAccess(sql,{...target,entityType:"COMPANY",entityId:String(entity.id),accessLevel:"VIEW"})).rejects.toMatchObject({code:"PROMOTED_ENTITY_ACCESS_DENIED"});
   await grantWorkspacePromotedEntityAccess(sql,{...owner,targetWorkspaceId:target.workspaceId,entityType:"COMPANY",entityId:String(entity.id),accessLevel:"VIEW"});
   await expect(authorizePromotedEntityAccess(sql,{...target,entityType:"COMPANY",entityId:String(entity.id),permission:"promoted_entity.view"})).resolves.toMatchObject({accessLevel:"VIEW"});
 });

 it("fails closed for suspended, expired, revoked and permission-less access",async()=>{
   const owner=await setup("access-owner@test");const target=await setup("access-target@test");
   const entity=await createCompany(sql,{...owner,tradeName:"Access Company"});
   const id=String(entity.id);
   await grantWorkspacePromotedEntityAccess(sql,{...owner,targetWorkspaceId:target.workspaceId,entityType:"COMPANY",entityId:id,accessLevel:"VIEW"});
   await sql.unsafe("update workspace_promoted_entity_access set status='SUSPENDED' where workspace_id=$1::uuid and entity_id=$2::uuid",[target.workspaceId,id]);
   await expect(authorizePromotedEntityAccess(sql,{...target,entityType:"COMPANY",entityId:id,permission:"promoted_entity.view"})).rejects.toMatchObject({code:"PROMOTED_ENTITY_ACCESS_DENIED"});
   await sql.unsafe("update workspace_promoted_entity_access set status='ACTIVE',expires_at=now()-interval '1 minute' where workspace_id=$1::uuid and entity_id=$2::uuid",[target.workspaceId,id]);
   await expect(authorizePromotedEntityAccess(sql,{...target,entityType:"COMPANY",entityId:id,permission:"promoted_entity.view"})).rejects.toMatchObject({code:"PROMOTED_ENTITY_ACCESS_DENIED"});
   await sql.unsafe("update workspace_promoted_entity_access set status='ACTIVE',expires_at=null where workspace_id=$1::uuid and entity_id=$2::uuid",[target.workspaceId,id]);
   const viewer=await sql.unsafe("select id::text from roles where code='VIEWER' and workspace_id is null");
   await sql.unsafe("update memberships set role_id=$2::uuid where workspace_id=$1::uuid",[target.workspaceId,String(viewer[0].id)]);
   await expect(authorizePromotedEntityAccess(sql,{...target,entityType:"COMPANY",entityId:id,permission:"promoted_entity.view"})).rejects.toMatchObject({code:"MISSING_PERMISSION"});
   await sql.unsafe("update memberships set role_id=(select id from roles where code='OWNER' and workspace_id is null) where workspace_id=$1::uuid",[target.workspaceId]);
   await setPromotedEntityAccessStatus(sql,{...target,entityType:"COMPANY",entityId:id,status:"REVOKED"});
   await expect(authorizePromotedEntityAccess(sql,{...target,entityType:"COMPANY",entityId:id,permission:"promoted_entity.view"})).rejects.toMatchObject({code:"PROMOTED_ENTITY_ACCESS_DENIED"});
 });

 it("resolves every commercial adapter from real entities",async()=>{
   const x=await setup("adapter-commercial@test");
   const company=await createCompany(sql,{...x,tradeName:"Adapter Company"});const companyId=String(company.id);
   const brand=await createBrand(sql,{...x,name:"Adapter Brand",companyId});const brandId=String(brand.id);
   const product=await createProduct(sql,{...x,name:"Adapter Product",companyId,brandId,categoryTaxonomyValueId:await taxonomy("PRODUCT_CATEGORY")});
   const service=await createService(sql,{...x,name:"Adapter Service",companyId,categoryTaxonomyValueId:await taxonomy("SERVICE_CATEGORY")});
   const platform=await createPromotedPlatform(sql,{...x,name:"Adapter Platform",companyId,website:"https://example.com/platform"});
   const event=await createPromotedEvent(sql,{...x,name:"Adapter Event",companyId,eventMode:"ONLINE",startsAt:new Date("2026-10-10T12:00:00Z"),timezoneCode:"UTC",onlineUrl:"https://example.com/event"});
   const project=await createPromotedProject(sql,{...x,name:"Adapter Project",companyId});
   const initiative=await createInstitutionalInitiative(sql,{...x,name:"Adapter Initiative",companyId});
   const values:Array<[unknown,string]>=[[company,"COMPANY"],[brand,"BRAND"],[product,"PRODUCT"],[service,"SERVICE"],[platform,"PLATFORM"],[event,"EVENT"],[project,"PROJECT"],[initiative,"INSTITUTIONAL_INITIATIVE"]];
   for(const[value,type]of values){const resolved=await resolvePromotedObject(sql,{...x,type:type as never,entityId:String((value as {id:unknown}).id)});expect(resolved.type).toBe(type);expect(resolved.displayName.length).toBeGreaterThan(0);}
 });

 it("resolves Artist, Music Release and Music Track without changing Music Catalog authorization",async()=>{
   const x=await setup("adapter-music@test");
   const artist=await createArtist(sql,{...x,artisticName:"Adapter Artist"});
   const release=await createRelease(sql,{...x,primaryArtistId:String(artist.id),title:"Adapter Release",type:"SINGLE"});
   const track=await createTrack(sql,{...x,releaseId:String(release.id),title:"Adapter Track",trackNumber:1,primaryArtistIds:[String(artist.id)]});
   expect((await resolvePromotedObject(sql,{...x,type:"ARTIST",entityId:String(artist.id)})).displayName).toBe("Adapter Artist");
   expect((await resolvePromotedObject(sql,{...x,type:"MUSIC_RELEASE",entityId:String(release.id)})).parentChain[0].type).toBe("ARTIST");
   expect((await resolvePromotedObject(sql,{...x,type:"MUSIC_TRACK",entityId:String(track.id)})).parentChain.map(v=>v.type)).toEqual(["MUSIC_RELEASE","ARTIST"]);
 });

 it("keeps Campaign schema absent and promoted type closed",async()=>{
   const campaign=await sql.unsafe("select to_regclass('public.campaigns') as table_name");
   expect(campaign[0].table_name).toBeNull();
   const enumValues=await sql.unsafe("select enumlabel from pg_enum join pg_type on pg_type.oid=pg_enum.enumtypid where typname='promoted_object_type' order by enumsortorder");
   expect(enumValues.map(v=>v.enumlabel)).not.toContain("OTHER");
 });
});
