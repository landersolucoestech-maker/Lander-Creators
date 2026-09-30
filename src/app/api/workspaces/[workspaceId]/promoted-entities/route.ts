import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse,requireAuthenticatedUser } from "@/server/http/api";
import { listWorkspacePromotedEntities } from "@/server/promoted-entities/service";
export async function GET(request:Request,{params}:{params:Promise<{workspaceId:string}>}){
 const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);
 try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;return Response.json({entities:await listWorkspacePromotedEntities(client,{userId:user.id,workspaceId})});}
 catch(error){return apiErrorResponse(error);}finally{await client.end();}
}