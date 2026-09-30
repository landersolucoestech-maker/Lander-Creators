import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { activatePromotedEntity } from "@/server/promoted-entities/service";
const schema=z.object({entityType:z.enum(["COMPANY","BRAND","PRODUCT","SERVICE","PLATFORM","EVENT","PROJECT","INSTITUTIONAL_INITIATIVE"]),entityId:z.string().uuid()});
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;return Response.json(await activatePromotedEntity(client,{userId:user.id,workspaceId,...schema.parse(await request.json())}));}
 catch(error){return apiErrorResponse(error);}finally{await client.end();}
}