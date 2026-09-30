import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";

import { getMusicCatalogImport } from "@/server/music-catalog/import-service";
export async function GET(request:Request,{params}:{params:Promise<{workspaceId:string;sessionId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId,sessionId}=await params;return Response.json(await getMusicCatalogImport(client,{userId:user.id,workspaceId,sessionId}));}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
