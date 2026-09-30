import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(databaseUrl, { max: 1, prepare: false });

await sql.unsafe(
  "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())"
);

const files = (await readdir(path.resolve("drizzle")))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort();

for (const file of files) {
  const applied = await sql.unsafe("select 1 from schema_migrations where name = $1", [file]);
  if (applied[0]) continue;

  const source = await readFile(path.resolve("drizzle", file), "utf8");
  const statements = source
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  await sql.begin(async (transaction) => {
    for (const statement of statements) {
      await transaction.unsafe(statement);
    }
    await transaction.unsafe("insert into schema_migrations (name) values ($1)", [file]);
  });
}

await sql.end();
