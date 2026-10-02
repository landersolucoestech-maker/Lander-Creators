import postgres from "postgres";

// Reports integrity guarantees that migrations skipped because legacy data violates them.
//   node scripts/schema-guarantees.mjs            report, exit 0
//   node scripts/schema-guarantees.mjs --strict   exit 1 when any guarantee is not enforced
//   node scripts/schema-guarantees.mjs --apply    also create/validate guarantees that now have no conflicts
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const args = new Set(process.argv.slice(2));
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const rows = await sql.unsafe("select * from refresh_schema_guarantees($1::boolean)", [args.has("--apply")]);
  const enforced = new Set(["APPLIED", "VALIDATED"]);
  let failing = 0;
  for (const row of rows) {
    const ok = enforced.has(row.status);
    if (!ok) failing += 1;
    console.log(`${ok ? "OK  " : "WARN"} ${row.name} [${row.table_name}] ${row.status} conflicts=${row.conflict_count}`);
    if (!ok) {
      console.log(`     reason: ${row.reason}`);
      console.log(`     fix:    ${row.remediation}`);
    }
  }
  console.log(`${rows.length - failing}/${rows.length} schema guarantees enforced.`);
  if (failing > 0 && args.has("--strict")) process.exitCode = 1;
} finally {
  await sql.end();
}
