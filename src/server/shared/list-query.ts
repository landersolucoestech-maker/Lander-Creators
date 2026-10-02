/**
 * Shared contract for paginated, filterable, sortable lists (HTTP query string and server pages).
 * Clients only ever choose among values the server whitelisted: sort keys and statuses are enumerated in the
 * caller's config, never interpolated from user input.
 */
export type ListQueryInput = Record<string, string | string[] | undefined>;

export type ListQuery<S extends string = string> = {
  page: number;
  pageSize: number;
  q: string | null;
  status: string | null;
  sort: S;
  dir: "asc" | "desc";
};

export type ListQueryConfig<S extends string> = {
  sorts: readonly S[];
  defaultSort: S;
  statuses?: readonly string[];
  defaultDir?: "asc" | "desc";
  defaultPageSize?: number;
};

export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number; pageCount: number; offset: number };

const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE = 100_000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined): number | null {
  if (value === undefined || !/^\d{1,9}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1 ? parsed : null;
}

export function parseListQuery<S extends string>(input: ListQueryInput, config: ListQueryConfig<S>): ListQuery<S> {
  const page = Math.min(positiveInteger(first(input.page)) ?? 1, MAX_PAGE);
  const pageSize = Math.min(positiveInteger(first(input.pageSize)) ?? config.defaultPageSize ?? 20, MAX_PAGE_SIZE);
  const q = first(input.q)?.trim().slice(0, MAX_SEARCH_LENGTH) || null;
  const requestedStatus = first(input.status);
  const status = requestedStatus && config.statuses?.includes(requestedStatus) ? requestedStatus : null;
  const requestedSort = first(input.sort);
  const sort = config.sorts.find((candidate) => candidate === requestedSort) ?? config.defaultSort;
  const requestedDir = first(input.dir);
  const dir = requestedDir === "asc" || requestedDir === "desc" ? requestedDir : (config.defaultDir ?? "desc");
  return { page, pageSize, q, status, sort, dir };
}

/** `%text%` with LIKE wildcards escaped; pair it with `escape '\'` is implicit in PostgreSQL's default. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

export function pageOf<T>(rows: T[], total: number, query: Pick<ListQuery, "page" | "pageSize">): Page<T> {
  return {
    rows,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
    offset: (query.page - 1) * query.pageSize
  };
}
