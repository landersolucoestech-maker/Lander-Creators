import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/server/auth/schema.ts", "./src/server/db/schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/lander_creators"
  },
  strict: true,
  verbose: true
});
