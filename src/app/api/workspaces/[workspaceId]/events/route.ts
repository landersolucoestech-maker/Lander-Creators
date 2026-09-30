import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { createPromotedEvent } from "@/server/promoted-entities/service";
const schema=z.object({name:z.string().trim().min(1).max(180),companyId:z.string().uuid().nullable().optional(),brandId:z.string().uuid().nullable().optional(),description:z.string().trim().max(2000).nullable().optional(),eventMode:z.enum(["PHYSICAL","ONLINE","HYBRID"]),startsAt:z.coerce.date(),endsAt:z.coerce.date().nullable().optional(),timezoneCode:z.string().min(1),locationText:z.string().trim().max(300).nullable().optional(),onlineUrl:z.string().nullable().optional(),primaryMediaAssetId:z.string().uuid().nullable().optional(),confirmDuplicate:z.boolean().optional()});
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;return Response.json({entity:await createPromotedEvent(client,{userId:user.id,workspaceId,...schema.parse(await request.json())})},{status:201});}
 catch(error){return apiErrorResponse(error);}finally{await client.end();}
}