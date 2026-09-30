import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";

import { previewMusicCatalogImport } from "@/server/music-catalog/import-service";
import { MUSIC_IMPORT_MAX_BYTES } from "@/server/music-catalog/xlsx";
import { DomainError } from "@/server/shared/domain-error";
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request);const{workspaceId}=await params;const form=await request.formData();const file=form.get("file");if(!(file instanceof File))throw new DomainError("MUSIC_IMPORT_INVALID","Workbook file is required",400);if(!file.size||file.size>MUSIC_IMPORT_MAX_BYTES)throw new DomainError("MUSIC_IMPORT_INVALID","Workbook size is invalid",413);const bytes=Buffer.from(await file.arrayBuffer());return Response.json(await previewMusicCatalogImport(client,{userId:user.id,workspaceId,sourceFilename:file.name,bytes}));}catch(error){return apiErrorResponse(error);}finally{await client.end();}}
