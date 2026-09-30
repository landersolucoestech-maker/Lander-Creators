import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";

import { resolveMusicImportRow } from "@/server/music-catalog/import-service";
const schema=z.object({rowId:z.string().uuid(),artistResolutions:z.record(z.string(),z.string().min(1))});
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string;sessionId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId,sessionId}=await params;const body=schema.parse(await request.json());return Response.json(await resolveMusicImportRow(client,{userId:user.id,workspaceId,sessionId,...body}));}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
