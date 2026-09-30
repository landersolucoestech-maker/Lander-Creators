import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";

import { updateTrack } from "@/server/music-catalog/catalog-service";
const schema=z.object({title:z.string().trim().min(1).max(200),trackNumber:z.number().int().positive(),explicitContent:z.boolean().nullable().optional(),version:z.enum(["ORIGINAL","REMIX","ACOUSTIC","LIVE","SPED_UP","SLOWED","CLEAN","EXTENDED","RADIO_EDIT","OTHER"]).optional(),versionLabel:z.string().trim().max(120).nullable().optional(),durationMs:z.number().int().nonnegative().nullable().optional(),isrc:z.string().trim().max(20).nullable().optional(),preSaveUrl:z.string().nullable().optional(),spotifyUrl:z.string().nullable().optional(),appleMusicUrl:z.string().nullable().optional(),deezerUrl:z.string().nullable().optional(),youtubeUrl:z.string().nullable().optional(),notes:z.string().trim().max(2000).nullable().optional(),audioMediaAssetId:z.string().uuid().nullable().optional()});
export async function PUT(request:Request,{params}:{params:Promise<{workspaceId:string;trackId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId,trackId}=await params;const body=schema.parse(await request.json());return Response.json({track:await updateTrack(client,{userId:user.id,workspaceId,trackId,...body})});}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
