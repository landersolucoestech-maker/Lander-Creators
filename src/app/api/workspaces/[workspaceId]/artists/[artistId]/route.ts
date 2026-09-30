import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { updateArtist } from "@/server/music-catalog/artist-service";
const schema=z.object({artisticName:z.string().trim().min(1).max(160),civilName:z.string().trim().max(160).nullable().optional(),bio:z.string().trim().max(1200).nullable().optional(),countryCode:z.string().max(3).nullable().optional(),languageCode:z.string().max(16).nullable().optional(),avatarMediaAssetId:z.string().uuid().nullable().optional(),status:z.enum(["DRAFT","ACTIVE","ARCHIVED"]).optional()});
export async function PUT(request:Request,{params}:{params:Promise<{workspaceId:string;artistId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId,artistId}=await params;const body=schema.parse(await request.json());return Response.json({artist:await updateArtist(client,{userId:user.id,workspaceId,artistId,...body})});}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
