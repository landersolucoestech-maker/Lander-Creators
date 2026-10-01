import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";

export type ApplicationActor={id:string;name:string;email:string};
export const PREVIEW_OWNER_ID="lander-live-preview-owner";
export const PREVIEW_OWNER_EMAIL="preview-owner@lander.invalid";
export const PREVIEW_OWNER_NAME="LANDER CREATORS Preview Owner";

export function isLivePreviewOwnerMode(){return process.env.LANDER_LIVE_PREVIEW==="true";}

export async function resolveApplicationActor(request?:Request):Promise<ApplicationActor|null>{
 if(isLivePreviewOwnerMode()) return {id:PREVIEW_OWNER_ID,name:PREVIEW_OWNER_NAME,email:PREVIEW_OWNER_EMAIL};
 const requestHeaders=request?.headers??await headers();
 const session=await auth.api.getSession({headers:requestHeaders});
 return session?.user?.id?{id:session.user.id,name:session.user.name,email:session.user.email}:null;
}
