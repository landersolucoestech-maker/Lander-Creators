import type { Sql, TransactionSql } from "postgres";
import { DomainError } from "@/server/shared/domain-error";

type QueryExecutor = Sql | TransactionSql;

export function normalizeCatalogText(value: string) {
  return value.trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
}

export function normalizeIsrc(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normalized)) {
    throw new DomainError("ISRC_INVALID", "ISRC format is invalid", 400);
  }
  return normalized;
}

export function validateHttpsUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("protocol");
    return url.toString();
  } catch {
    throw new DomainError("URL_INVALID", "Catalog URL must be a valid HTTPS URL", 400);
  }
}

export function parseDurationText(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!match) throw new DomainError("DURATION_INVALID", "Duration must use Min:Seg", 400);
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) throw new DomainError("DURATION_INVALID", "Duration seconds are invalid", 400);
  return (minutes * 60 + seconds) * 1000;
}

export async function assertReferenceCode(
  sql: QueryExecutor,
  table: "reference_languages" | "reference_countries",
  code: string | null | undefined
) {
  if (!code) return null;
  const rows = await sql.unsafe(`select code from ${table} where code=$1 and active=true`, [code]);
  if (!rows[0]) throw new DomainError("INVALID_REFERENCE_DATA", "Reference code is invalid", 400);
  return code;
}

export async function assertMusicGenre(
  sql: QueryExecutor,
  taxonomyValueId: string | null | undefined,
  parentId?: string | null
) {
  if (!taxonomyValueId) return null;
  const rows = await sql.unsafe(
    "select tv.id::text,tv.parent_id::text,tv.status::text from taxonomy_values tv join taxonomy_definitions td on td.id=tv.taxonomy_definition_id where tv.id=$1::uuid and td.code='MUSIC_GENRE'",
    [taxonomyValueId]
  );
  const row = rows[0];
  if (!row || row.status !== "ACTIVE") throw new DomainError("GENRE_INVALID", "Music genre is invalid", 400);
  if (parentId && String(row.parent_id ?? "") !== parentId) {
    throw new DomainError("GENRE_INVALID", "Subgenre is not a child of selected genre", 400);
  }
  return String(row.id);
}

export async function assertCatalogMedia(
  sql: QueryExecutor,
  input: { workspaceId: string; mediaAssetId: string | null | undefined; kind: "IMAGE" | "AUDIO" }
) {
  if (!input.mediaAssetId) return null;
  const rows = await sql.unsafe(
    "select id::text,media_kind::text,status::text from media_assets where id=$1::uuid and workspace_id=$2::uuid",
    [input.mediaAssetId, input.workspaceId]
  );
  const row = rows[0];
  if (!row || row.status !== "READY" || row.media_kind !== input.kind) {
    throw new DomainError("MEDIA_ACCESS_DENIED", "Catalog media is not attachable", 403);
  }
  return String(row.id);
}
