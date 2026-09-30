import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "@/server/auth/schema";
import * as appSchema from "./schema";

export function createDatabaseClient(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10, prepare: false });
  const schema = { ...authSchema, ...appSchema };
  const db = drizzle(client, { schema });
  return { client, db, schema };
}
