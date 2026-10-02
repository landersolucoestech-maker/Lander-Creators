import type { Sql } from "postgres";
import { likePattern, pageOf, type ListQuery, type Page } from "@/server/shared/list-query";

type Param = string | number;

/**
 * Builds a WHERE clause incrementally with numbered placeholders. Only the caller's constants are ever
 * concatenated into SQL; every user-provided value travels as a bound parameter.
 */
export class Conditions {
  readonly params: Param[] = [];
  private readonly parts: string[] = [];

  add(sqlWithPlaceholder: string, value?: Param) {
    if (value === undefined) {
      this.parts.push(sqlWithPlaceholder);
    } else {
      this.params.push(value);
      this.parts.push(sqlWithPlaceholder.replace("?", `$${this.params.length}`));
    }
    return this;
  }

  /** Case-insensitive contains-search across the given column expressions. */
  search(columns: string[], q: string | null) {
    if (!q) return this;
    this.params.push(likePattern(q));
    const placeholder = `$${this.params.length}`;
    this.parts.push(`(${columns.map((column) => `${column} ilike ${placeholder}`).join(" or ")})`);
    return this;
  }

  get where() {
    return this.parts.length ? `where ${this.parts.join(" and ")}` : "";
  }
}

export async function runPagedList<Row>(
  sql: Sql,
  spec: {
    select: string;
    from: string;
    conditions: Conditions;
    /** Whitelisted column expression resolved from the validated sort key. */
    orderBy: string;
    /** Stable tiebreaker so pages never overlap. */
    tiebreaker: string;
    query: Pick<ListQuery, "page" | "pageSize" | "dir">;
  }
): Promise<Page<Row>> {
  const { conditions, query } = spec;
  const total = await sql.unsafe<{ n: number }[]>(`select count(*)::int n ${spec.from} ${conditions.where}`, conditions.params);
  const offset = (query.page - 1) * query.pageSize;
  const direction = query.dir === "asc" ? "asc" : "desc";
  const limit = conditions.params.length + 1;
  const rows = await sql.unsafe<Row[]>(
    `select ${spec.select} ${spec.from} ${conditions.where} order by ${spec.orderBy} ${direction} nulls last, ${spec.tiebreaker} limit $${limit}::int offset $${limit + 1}::int`,
    [...conditions.params, query.pageSize, offset]
  );
  return pageOf(rows, total[0].n, query);
}
