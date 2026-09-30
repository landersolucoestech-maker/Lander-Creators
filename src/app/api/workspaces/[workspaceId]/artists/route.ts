import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";

import { createArtist, listWorkspaceArtists } from "@/server/music-catalog/artist-service";
const schema=z.object({artisticName:z.string().trim().min(1).max(160),civilName:z.string().trim().max(160).nullable().optional(),bio:z.string().trim().max(1200).nullable().optional(),countryCode:z.string().max(3).nullable().optional(),languageCode:z.string().max(16).nullable().optional(),avatarMediaAssetId:z.string().uuid().nullable().optional()});
export async function GET(request:Request,{params}:{params:Promise<{workspaceId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;return Response.json({artists:await listWorkspaceArtists(client,{userId:user.id,workspaceId})});}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;const body=schema.parse(await request.json());return Response.json({artist:await createArtist(client,{userId:user.id,workspaceId,...body})},{status:201});}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
