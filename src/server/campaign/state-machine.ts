import{DomainError}from"@/server/shared/domain-error";import type{CampaignStatus}from"./types";
const transitions:Record<CampaignStatus,CampaignStatus[]>={DRAFT:["SCHEDULED","ACTIVE"],SCHEDULED:["ACTIVE"],ACTIVE:["PAUSED","CANCELLATION_PENDING","COMPLETED"],PAUSED:["ACTIVE","CANCELLATION_PENDING","COMPLETED"],CANCELLATION_PENDING:["CANCELLED"],CANCELLED:["ARCHIVED"],COMPLETED:["ARCHIVED"],ARCHIVED:[]};
export function assertCampaignTransition(from:CampaignStatus,to:CampaignStatus){if(from===to)return;if(!transitions[from].includes(to))throw new DomainError("CAMPAIGN_INVALID_STATUS_TRANSITION",`Invalid Campaign transition ${from} -> ${to}`,409);}
export const campaignTransitions=transitions;
