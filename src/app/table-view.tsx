import Link from "next/link";
import type { ListQuery } from "@/server/shared/list-query";

export type Option = { value: string; label: string };

/** Query string for a list state; pageSize is only emitted when it differs from the default. */
function hrefFor(pathname: string, query: ListQuery, hidden: Record<string, string>, overrides: Partial<Record<"page", number>> = {}) {
  const params = new URLSearchParams(hidden);
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  params.set("sort", query.sort);
  params.set("dir", query.dir);
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  const page = overrides.page ?? query.page;
  if (page > 1) params.set("page", String(page));
  return `${pathname}?${params.toString()}`;
}

/**
 * Server-rendered filter bar for TableView lists. It is a plain GET form, so search, status, sorting and
 * pagination work without client JavaScript and stay shareable/bookmarkable. Options come from the server whitelist.
 */
export function ListToolbar({
  pathname,
  query,
  sorts,
  statuses,
  hidden = {},
  searchLabel = "Buscar"
}: {
  pathname: string;
  query: ListQuery;
  sorts: Option[];
  statuses?: Option[];
  /** Fixed parameters (for example the selected campaign) that a GET form would otherwise drop. */
  hidden?: Record<string, string>;
  searchLabel?: string;
}) {
  return (
    <form method="get" action={pathname} className="list-toolbar" role="search" aria-label="Filtros da lista">
      <label>
        {searchLabel}
        <input name="q" type="search" defaultValue={query.q ?? ""} maxLength={100} />
      </label>
      {statuses ? (
        <label>
          Situação
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">Todas</option>
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Ordenar por
        <select name="sort" defaultValue={query.sort}>
          {sorts.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        Ordem
        <select name="dir" defaultValue={query.dir}>
          <option value="desc">Mais recentes / maiores primeiro</option>
          <option value="asc">Mais antigos / menores primeiro</option>
        </select>
      </label>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {query.pageSize !== 20 ? <input type="hidden" name="pageSize" value={query.pageSize} /> : null}
      <button type="submit">Aplicar filtros</button>
      <Link className="button-link" href={`${pathname}${Object.keys(hidden).length ? `?${new URLSearchParams(hidden).toString()}` : ""}`}>Limpar</Link>
    </form>
  );
}

export function Pager({ pathname, query, total, pageCount, hidden = {} }: { pathname: string; query: ListQuery; total: number; pageCount: number; hidden?: Record<string, string> }) {
  const hasPrevious = query.page > 1;
  const hasNext = query.page < pageCount;
  return (
    <nav className="pager" aria-label="Paginação">
      <span>
        {total === 0 ? "Nenhum registro" : `${total} ${total === 1 ? "registro" : "registros"}`} · página {Math.min(query.page, pageCount)} de {pageCount}
      </span>
      <span className="pager-links">
        {hasPrevious ? <Link className="button-link" href={hrefFor(pathname, query, hidden, { page: query.page - 1 })}>Anterior</Link> : <span className="button-link disabled" aria-disabled="true">Anterior</span>}
        {hasNext ? <Link className="button-link" href={hrefFor(pathname, query, hidden, { page: query.page + 1 })}>Próxima</Link> : <span className="button-link disabled" aria-disabled="true">Próxima</span>}
      </span>
    </nav>
  );
}
