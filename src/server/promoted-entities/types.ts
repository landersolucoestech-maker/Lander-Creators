export const promotedObjectTypes=["MUSIC_TRACK","MUSIC_RELEASE","ARTIST","COMPANY","BRAND","PRODUCT","SERVICE","PLATFORM","EVENT","PROJECT","INSTITUTIONAL_INITIATIVE"] as const;
export type PromotedObjectType=(typeof promotedObjectTypes)[number];
export const commercialPromotedObjectTypes=["COMPANY","BRAND","PRODUCT","SERVICE","PLATFORM","EVENT","PROJECT","INSTITUTIONAL_INITIATIVE"] as const;
export type CommercialPromotedObjectType=(typeof commercialPromotedObjectTypes)[number];
