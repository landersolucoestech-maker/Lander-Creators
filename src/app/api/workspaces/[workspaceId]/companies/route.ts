import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { createCompany } from "@/server/promoted-entities/service";
const schema=z.object({tradeName:z.string().trim().min(1).max(180),legalName:z.string().trim().max(220).nullable().optional(),description:z.string().trim().max(2000).nullable().optional(),website:z.string().nullable().optional(),countryCode:z.string().max(3).nullable().optional(),languageCode:z.string().max(16).nullable().optional(),industryTaxonomyValueId:z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),logoMediaAssetId:z.string().uuid().nullable().optional(),confirmDuplicate:z.boolean().optional()});
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;return Response.json({entity:await createCompany(client,{userId:user.id,workspaceId,...schema.parse(await request.json())})},{status:201});}
 catch(error){return apiErrorResponse(error);}finally{await client.end();}
}