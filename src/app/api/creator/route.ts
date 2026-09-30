import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import { createCreatorProfile, getCreatorProfileByUser, updateCreatorProfile } from "@/server/creator/creator-service";

const profileSchema=z.object({
  displayName:z.string().trim().min(2).max(120),
  bio:z.string().trim().max(1200).nullable().optional(),
  countryCode:z.string().min(2).max(3),
  languageCode:z.string().min(2).max(16),
  timezoneCode:z.string().min(1).max(100),
  region:z.string().trim().max(120).nullable().optional(),
  city:z.string().trim().max(120).nullable().optional()
});

export async function GET(request:Request){
  const env=parseEnv(process.env);const{client}=createDatabaseClient(env.DATABASE_URL);
  try{const user=await requireAuthenticatedUser(request);return Response.json({creator:await getCreatorProfileByUser(client,user.id)});}
  catch(error){return apiErrorResponse(error);}finally{await client.end();}
}

export async function POST(request:Request){
  const env=parseEnv(process.env);const{client}=createDatabaseClient(env.DATABASE_URL);
  try{const user=await requireAuthenticatedUser(request);const body=profileSchema.parse(await request.json());const creator=await createCreatorProfile(client,{userId:user.id,...body});return Response.json({creator},{status:201});}
  catch(error){return apiErrorResponse(error);}finally{await client.end();}
}

export async function PUT(request:Request){
  const env=parseEnv(process.env);const{client}=createDatabaseClient(env.DATABASE_URL);
  try{const user=await requireAuthenticatedUser(request);const body=profileSchema.extend({creatorProfileId:z.string().uuid()}).parse(await request.json());const creator=await updateCreatorProfile(client,{userId:user.id,...body});return Response.json({creator});}
  catch(error){return apiErrorResponse(error);}finally{await client.end();}
}
