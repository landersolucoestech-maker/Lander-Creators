import { z } from "zod";
const envSchema=z.object({NODE_ENV:z.enum(["development","test","production"]).default("development"),DATABASE_URL:z.string().url(),AUTH_SECRET:z.string().min(32),LOG_LEVEL:z.enum(["debug","info","warn","error"]).default("info")});
export type AppEnv=z.infer<typeof envSchema>;
export function parseEnv(input:NodeJS.ProcessEnv):AppEnv{return envSchema.parse(input);}
