import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { createPromotedPlatform } from "@/server/promoted-entities/service";
const schema=z.object({name:z.string().trim().min(1).max(180),companyId:z.string().uuid().nullable().optional(),brandId:z.string().uuid().nullable().optional(),description:z.string().trim().max(2000).nullable().optional(),website:z.string().nullable().optional(),iosUrl:z.string().nullable().optional(),androidUrl:z.string().nullable().optional(),primaryMediaAssetId:z.string().uuid().nullable().optional(),confirmDuplicate:z.boolean().optional(),existingEntityId:z.string().uuid().nullable().optional()});
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;const body=schema.parse(await request.json());return Response.json({entity:await createPromotedPlatform(client,{userId:user.id,workspaceId,...body} as never)},{status:201});}
 catch(error){return apiErrorResponse(error);}finally{await client.end();}
}