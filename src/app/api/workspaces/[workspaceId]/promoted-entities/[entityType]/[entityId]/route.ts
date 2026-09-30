import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { updateCommercialEntity } from "@/server/promoted-entities/service";
const type=z.enum(["COMPANY","BRAND","PRODUCT","SERVICE","PLATFORM","EVENT","PROJECT","INSTITUTIONAL_INITIATIVE"]);
const schema=z.object({name:z.string().trim().min(1).max(180),description:z.string().trim().max(2000).nullable().optional(),website:z.string().nullable().optional()});
export async function PATCH(request:Request,{params}:{params:Promise<{workspaceId:string;entityType:string;entityId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{const user=await requireAuthenticatedUser(request);const{workspaceId,entityType,entityId}=await params;const parsedType=type.parse(entityType);return Response.json({entity:await updateCommercialEntity(client,{userId:user.id,workspaceId,entityType:parsedType,entityId,...schema.parse(await request.json())})});}
 catch(error){return apiErrorResponse(error);}finally{await client.end();}
}