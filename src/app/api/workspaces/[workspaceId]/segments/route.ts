import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";

import { createTrackSegment } from "@/server/music-catalog/catalog-service";
const schema=z.object({trackId:z.string().uuid(),startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),label:z.string().trim().max(160).nullable().optional(),recommended:z.boolean().optional(),authorized:z.boolean().optional()});
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;const body=schema.parse(await request.json());return Response.json({segment:await createTrackSegment(client,{userId:user.id,workspaceId,...body})},{status:201});}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
