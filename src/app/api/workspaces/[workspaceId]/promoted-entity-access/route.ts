import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { grantWorkspacePromotedEntityAccess,setPromotedEntityAccessStatus } from "@/server/promoted-entities/access";
const type=z.enum(["COMPANY","BRAND","PRODUCT","SERVICE","PLATFORM","EVENT","PROJECT","INSTITUTIONAL_INITIATIVE"]);
const grant=z.object({entityType:type,entityId:z.string().uuid(),accessLevel:z.enum(["OWNER","MANAGE_CAMPAIGNS","VIEW","CAMPAIGN_ONLY"]),expiresAt:z.coerce.date().nullable().optional()});
const status=z.object({entityType:type,entityId:z.string().uuid(),status:z.enum(["SUSPENDED","REVOKED"])});
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;return Response.json(await grantWorkspacePromotedEntityAccess(client,{userId:user.id,workspaceId,...grant.parse(await request.json())}));}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
export async function PATCH(request:Request,{params}:{params:Promise<{workspaceId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;return Response.json(await setPromotedEntityAccessStatus(client,{userId:user.id,workspaceId,...status.parse(await request.json())}));}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
