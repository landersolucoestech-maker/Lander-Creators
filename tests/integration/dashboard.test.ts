import { randomUUID } from "node:crypto";
import { afterAll,beforeEach,describe,expect,it } from "vitest";
import { createTestSql,resetSecurityData } from "./test-db";
import { createWorkspace } from "@/server/workspace/workspace-service";
import { createArtist,revokeWorkspaceArtistAccess } from "@/server/music-catalog/artist-service";
import { createRelease,createTrack } from "@/server/music-catalog/catalog-service";
import { createCompany } from "@/server/promoted-entities/service";
import { setPromotedEntityAccessStatus } from "@/server/promoted-entities/access";
import { getDashboardSummary } from "@/server/application/dashboard-service";

const sql=createTestSql();
async function user(email:string){const id=randomUUID();await sql.unsafe('insert into "user"(id,name,email,email_verified) values($1,$2,$3,true)',[id,"Dashboard Test",email]);await sql.unsafe("insert into identity_profiles(user_id,status) values($1,'ACTIVE')",[id]);return id;}
async function setup(email:string){const userId=await user(email);const workspace=await createWorkspace(sql,{userId,name:email,type:"AGENCY",idempotencyKey:email});return{userId,workspaceId:String(workspace.id)};}

describe("Dashboard service",()=>{
 beforeEach(async()=>{await resetSecurityData(sql);});
 afterAll(async()=>{await sql.end();});

 it("returns only real accessible Workspace counts",async()=>{
  const x=await setup("dashboard@test");
  const artist=await createArtist(sql,{...x,artisticName:"Dashboard Artist"});
  const release=await createRelease(sql,{...x,primaryArtistId:String(artist.id),title:"Dashboard Release",type:"SINGLE"});
  await createTrack(sql,{...x,releaseId:String(release.id),title:"Dashboard Track",trackNumber:1,primaryArtistIds:[String(artist.id)]});
  await createCompany(sql,{...x,tradeName:"Dashboard Company"});
  const summary=await getDashboardSummary(sql,x);
  expect(summary).toMatchObject({artists:1,releases:1,tracks:1,promotedEntities:1,members:1});
  expect(summary.promotedByType?.COMPANY).toBe(1);
 });

 it("excludes foreign Workspace records and revoked access",async()=>{
  const a=await setup("dashboard-a@test");const b=await setup("dashboard-b@test");
  const own=await createArtist(sql,{...a,artisticName:"Own Artist"});
  const ownRelease=await createRelease(sql,{...a,primaryArtistId:String(own.id),title:"Own Release",type:"SINGLE"});
  await createTrack(sql,{...a,releaseId:String(ownRelease.id),title:"Own Track",trackNumber:1,primaryArtistIds:[String(own.id)]});
  const foreign=await createArtist(sql,{...b,artisticName:"Foreign Artist"});
  const company=await createCompany(sql,{...a,tradeName:"Revoked Company"});
  await revokeWorkspaceArtistAccess(sql,{...a,artistId:String(own.id)});
  await setPromotedEntityAccessStatus(sql,{...a,entityType:"COMPANY",entityId:String(company.id),status:"REVOKED"});
  const summary=await getDashboardSummary(sql,a);
  expect(summary.artists).toBe(0);
  expect(summary.releases).toBe(0);
  expect(summary.tracks).toBe(0);
  expect(summary.promotedEntities).toBe(0);
  expect(String(foreign.id)).not.toBe("");
 });
});
