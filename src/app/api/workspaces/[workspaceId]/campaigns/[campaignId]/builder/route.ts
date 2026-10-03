import{z}from"zod";import type{Sql}from"postgres";import{parseEnv}from"@/server/config/env";import{createDatabaseClient}from"@/server/db/client";import{apiErrorResponse,requireAuthenticatedUser}from"@/server/http/api";import{setCampaignPromotedObject,updateCampaignGoalContext,updateCampaignTargeting,updateCampaignContentRequirements,updateCampaignBriefAssets,updateCampaignSchedule,updateCampaignBudgetCapacity,updateCampaignRightsRequirements,updateCampaignTracking,setBuilderStepCompletion}from"@/server/campaign/service";import{promotedObjectTypes}from"@/server/promoted-entities/types";
const base=z.object({revision:z.number().int().positive()});
const schemas={
1:base.extend({type:z.enum(promotedObjectTypes),entityId:z.string().uuid()}),
2:base.extend({name:z.string().trim().min(1).max(180),goalCode:z.string().min(1).max(80),internalDescription:z.string().max(4000).nullable().optional(),objectiveContext:z.string().max(4000).nullable().optional(),ctaType:z.string().max(80).nullable().optional(),ctaUrl:z.string().max(2048).nullable().optional()}),
3:base.extend({followerMin:z.number().int().nonnegative().nullable().optional(),followerMax:z.number().int().nonnegative().nullable().optional(),platforms:z.array(z.enum(["TIKTOK","INSTAGRAM","YOUTUBE"])),nicheIds:z.array(z.string().uuid()),contentStyleIds:z.array(z.string().uuid()),musicGenreIds:z.array(z.string().uuid()),countryCodes:z.array(z.string().max(8)),languageCodes:z.array(z.string().max(16))}),
4:base.extend({requirements:z.array(z.object({platform:z.enum(["TIKTOK","INSTAGRAM","YOUTUBE"]),format:z.enum(["VIDEO","REEL","STORY","FEED_POST","SHORT"]),quantity:z.number().int().positive(),notes:z.string().max(2000).nullable().optional(),requiredPublication:z.boolean(),ugc:z.boolean()})).min(1)}),
5:base.extend({brief:z.string().trim().min(1).max(12000),assetIds:z.array(z.string().uuid())}),
6:base.extend({mode:z.enum(["FIXED","EVERGREEN"]),startsAt:z.string().datetime().nullable(),endsAt:z.string().datetime().nullable(),timezoneCode:z.string().min(1).max(80),recruitmentOpensAt:z.string().datetime().nullable().optional(),recruitmentClosesAt:z.string().datetime().nullable().optional()}),
7:base.extend({budgetMinor:z.number().int().nonnegative().nullable(),targetCreatorCount:z.number().int().positive().nullable(),maximumCreatorCount:z.number().int().positive().nullable()}),
8:base.extend({organicUsageDays:z.number().int().positive().nullable(),paidMediaAllowed:z.boolean(),whitelistingRequired:z.boolean(),exclusivityRequired:z.boolean(),geography:z.string().max(1000).nullable().optional(),usageDurationDays:z.number().int().positive().nullable()}),
9:base.extend({targetUrl:z.string().max(2048).nullable().optional(),utmSource:z.string().max(255).nullable().optional(),utmMedium:z.string().max(255).nullable().optional(),utmCampaign:z.string().max(255).nullable().optional(),utmContentPattern:z.string().max(255).nullable().optional(),trackingLabel:z.string().max(255).nullable().optional(),objectives:z.array(z.enum(["VIEWS","REACH","ENGAGEMENT","CLICKS","CONVERSIONS"]))})
}as const;
type Ctx={userId:string;workspaceId:string;campaignId:string};
const handlers:Record<number,(client:Sql,ctx:Ctx,raw:unknown)=>Promise<unknown>>={
1:(client,ctx,raw)=>setCampaignPromotedObject(client,{...ctx,...schemas[1].parse(raw)}),
2:(client,ctx,raw)=>updateCampaignGoalContext(client,{...ctx,...schemas[2].parse(raw)}),
3:(client,ctx,raw)=>updateCampaignTargeting(client,{...ctx,...schemas[3].parse(raw)}),
4:(client,ctx,raw)=>updateCampaignContentRequirements(client,{...ctx,...schemas[4].parse(raw)}),
5:(client,ctx,raw)=>updateCampaignBriefAssets(client,{...ctx,...schemas[5].parse(raw)}),
6:(client,ctx,raw)=>updateCampaignSchedule(client,{...ctx,...schemas[6].parse(raw)}),
7:(client,ctx,raw)=>updateCampaignBudgetCapacity(client,{...ctx,...schemas[7].parse(raw)}),
8:(client,ctx,raw)=>updateCampaignRightsRequirements(client,{...ctx,...schemas[8].parse(raw)}),
9:(client,ctx,raw)=>updateCampaignTracking(client,{...ctx,...schemas[9].parse(raw)})
};
export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string;campaignId:string}>}){const{client}=createDatabaseClient(parseEnv(process.env).DATABASE_URL);try{const user=await requireAuthenticatedUser(request),{workspaceId,campaignId}=await params,raw=await request.json(),step=Number(raw.step);if(step<1||step>9||!Number.isInteger(step))throw new Error("Invalid builder step");const handler=handlers[step]!;await handler(client,{userId:user.id,workspaceId,campaignId},raw);await setBuilderStepCompletion(client,{userId:user.id,workspaceId,campaignId,step,completed:true});return Response.json({ok:true});}catch(e){return apiErrorResponse(e)}finally{await client.end()}}
