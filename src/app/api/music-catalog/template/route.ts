import { createMusicCatalogTemplateXlsx } from "@/server/music-catalog/xlsx";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
export async function GET(request:Request){try{await requireAuthenticatedUser(request);const bytes=createMusicCatalogTemplateXlsx();return new Response(bytes,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":'attachment; filename="lander-creators-catalogo-musical.xlsx"',"Cache-Control":"private, no-store"}});}catch(error){return apiErrorResponse(error);}}
