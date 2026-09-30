import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { updateCommercialEntity } from "@/server/promoted-entities/service";
const update=z.object({name:z.string().trim().min(1).max(180),description:z.string().trim().max(2000).nullable().optional(),website:z.string().nullable().optional()});
export async function PATCH(request:Request,{params}:{params:Promise<{workspaceId:string;companyId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId,companyId}=await params;return Response.json({company:await updateCommercialEntity(client,{userId:user.id,workspaceId,entityType:"COMPANY",entityId:companyId,...update.parse(await request.json())})});}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
