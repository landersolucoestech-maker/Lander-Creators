import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_BASE_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_DELIVERY_MODE: z.enum(["disabled", "safe-log"]).default("disabled"),
  MEDIA_STORAGE_MODE: z.enum(["disabled", "ephemeral"]).default("disabled"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Dev-only authentication bypass (see src/server/auth/dev-auth-bypass.ts). Never allowed in production.
  LANDER_DEV_AUTH_BYPASS: z.enum(["true", "false"]).optional()
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && env.LANDER_DEV_AUTH_BYPASS === "true") {
    ctx.addIssue({ code: "custom", path: ["LANDER_DEV_AUTH_BYPASS"], message: "LANDER_DEV_AUTH_BYPASS must not be enabled in production" });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  return envSchema.parse(input);
}
