import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestSql, resetSecurityData } from "./test-db";
import { createWorkspace } from "@/server/workspace/workspace-service";
import {
  assertTaxonomyValueSelectable,
  deprecateTaxonomyValue,
  resolveTaxonomyAlias,
  setTaxonomyParent
} from "@/server/taxonomy/taxonomy-service";
import { getReferenceData } from "@/server/reference-data/reference-data-service";
import { LocalEphemeralStorageAdapter } from "@/server/media/local-storage-adapter";
import {
  archiveMediaAsset,
  listMediaAssets,
  readMediaAsset,
  uploadMediaAsset
} from "@/server/media/media-service";
import {
  issueMediaAccessToken,
  verifyMediaAccessToken
} from "@/server/media/media-access";
import {
  DEFAULT_MEDIA_MAX_BYTES,
  validateMedia
} from "@/server/media/media-validation";

const sql = createTestSql();
let root = "";

async function user(email: string) {
  const id = randomUUID();
  await sql.unsafe(
    'insert into "user"(id,name,email,email_verified) values($1,\'Test\',$2,true)',
    [id, email]
  );
  await sql.unsafe(
    "insert into identity_profiles(user_id,status) values($1,'ACTIVE')",
    [id]
  );
  return id;
}

const png = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex"
);

describe("Etapa 4 foundation", () => {
  beforeEach(async () => {
    await resetSecurityData(sql);
    if (root) await rm(root, { recursive: true, force: true });
    root = await mkdtemp(path.join(tmpdir(), "lc-media-"));
  });

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    await sql.end();
  });

  it("loads deterministic reference data and seeded taxonomy definitions", async () => {
    const refs = await getReferenceData(sql);
    expect(refs.countries.some((row) => (row as Record<string, unknown>).code === "BR")).toBe(true);
    expect(refs.languages.some((row) => (row as Record<string, unknown>).code === "pt-BR")).toBe(true);
    expect(refs.currencies.some((row) => (row as Record<string, unknown>).code === "BRL")).toBe(true);
    expect(refs.timezones.some((row) => (row as Record<string, unknown>).code === "America/Sao_Paulo")).toBe(true);

    const definitions = await sql.unsafe(
      "select code from taxonomy_definitions order by code"
    );
    expect(definitions.map((row) => (row as Record<string, unknown>).code)).toEqual(
      ["CONTENT_STYLE", "CREATOR_NICHE", "MUSIC_GENRE"]
    );
  });

  it("resolves aliases to one canonical taxonomy value", async () => {
    const hiphop = await resolveTaxonomyAlias(sql, "MUSIC_GENRE", "hip-hop");
    expect((hiphop as Record<string, unknown>).code).toBe("HIP_HOP");
  });

  it("enforces taxonomy value and alias uniqueness", async () => {
    const definition = await sql.unsafe(
      "select id::text from taxonomy_definitions where code='MUSIC_GENRE'"
    );
    const definitionId = String((definition[0] as Record<string, unknown>).id);

    await expect(
      sql.unsafe(
        "insert into taxonomy_values(taxonomy_definition_id,code,display_label_pt_br) values($1::uuid,'HIP_HOP','Duplicado')",
        [definitionId]
      )
    ).rejects.toBeDefined();

    const trap = await sql.unsafe(
      "select id::text from taxonomy_values where taxonomy_definition_id=$1::uuid and code='TRAP'",
      [definitionId]
    );
    await expect(
      sql.unsafe(
        "insert into taxonomy_aliases(taxonomy_definition_id,taxonomy_value_id,normalized_alias) values($1::uuid,$2::uuid,'hip-hop')",
        [definitionId, String((trap[0] as Record<string, unknown>).id)]
      )
    ).rejects.toBeDefined();
  });

  it("prevents cycles, cross-taxonomy parents and excessive hierarchy depth", async () => {
    const rows = await sql.unsafe(
      "select id::text,code from taxonomy_values where code in ('HIP_HOP','TRAP','TUTORIAL')"
    );
    const hip = rows.find((row) => (row as Record<string, unknown>).code === "HIP_HOP") as Record<string, unknown>;
    const trap = rows.find((row) => (row as Record<string, unknown>).code === "TRAP") as Record<string, unknown>;
    const tutorial = rows.find((row) => (row as Record<string, unknown>).code === "TUTORIAL") as Record<string, unknown>;

    await expect(
      setTaxonomyParent(sql, {
        valueId: String(hip.id),
        parentId: String(trap.id)
      })
    ).rejects.toMatchObject({ code: "INVALID_TAXONOMY_HIERARCHY" });

    await expect(
      setTaxonomyParent(sql, {
        valueId: String(trap.id),
        parentId: String(tutorial.id)
      })
    ).rejects.toMatchObject({ code: "INVALID_TAXONOMY_HIERARCHY" });
  });

  it("deprecates without deleting historical taxonomy rows and blocks new selection", async () => {
    const rows = await sql.unsafe(
      "select id::text from taxonomy_values where code='TRAP'"
    );
    const trapId = String((rows[0] as Record<string, unknown>).id);

    await deprecateTaxonomyValue(sql, { valueId: trapId });
    await expect(
      assertTaxonomyValueSelectable(sql, trapId)
    ).rejects.toMatchObject({ code: "TAXONOMY_VALUE_DEPRECATED" });

    const preserved = await resolveTaxonomyAlias(sql, "MUSIC_GENRE", "trap music");
    expect(preserved).toMatchObject({ code: "TRAP", status: "DEPRECATED" });

    await sql.unsafe(
      "update taxonomy_values set status='ACTIVE' where id=$1::uuid",
      [trapId]
    );
  });

  it("uploads, checksums, lists, reads and archives without exposing storage details", async () => {
    const owner = await user("media@example.com");
    const workspace = await createWorkspace(sql, {
      userId: owner,
      name: "Media",
      type: "AGENCY",
      idempotencyKey: "m"
    });
    const storage = new LocalEphemeralStorageAdapter(root);

    const created = await uploadMediaAsset(sql, storage, {
      userId: owner,
      workspaceId: String(workspace.id),
      originalFileName: "../photo.png",
      declaredMime: "image/png",
      bytes: png
    });

    expect(created.mediaKind).toBe("IMAGE");
    expect(created.originalFileName).toBe("photo.png");
    expect(await listMediaAssets(sql, {
      userId: owner,
      workspaceId: String(workspace.id)
    })).toHaveLength(1);
    expect(
      (
        await readMediaAsset(sql, storage, {
          userId: owner,
          workspaceId: String(workspace.id),
          mediaAssetId: created.id
        })
      ).bytes.equals(png)
    ).toBe(true);

    const persisted = await sql.unsafe(
      "select checksum_sha256,storage_key from media_assets where id=$1::uuid",
      [created.id]
    );
    expect((persisted[0] as Record<string, unknown>).checksum_sha256).toBe(
      createHash("sha256").update(png).digest("hex")
    );
    expect(JSON.stringify(created)).not.toContain("storageKey");
    expect(JSON.stringify(created)).not.toContain(root);

    await archiveMediaAsset(sql, storage, {
      userId: owner,
      workspaceId: String(workspace.id),
      mediaAssetId: created.id
    });
    await expect(
      readMediaAsset(sql, storage, {
        userId: owner,
        workspaceId: String(workspace.id),
        mediaAssetId: created.id
      })
    ).rejects.toMatchObject({ code: "MEDIA_NOT_FOUND" });
  });

  it("rejects MIME mismatch, extension mismatch and oversized content", () => {
    expect(() =>
      validateMedia({
        bytes: png,
        declaredMime: "image/jpeg",
        originalFileName: "fake.jpg"
      })
    ).toThrowError("MIME mismatch");

    expect(() =>
      validateMedia({
        bytes: png,
        declaredMime: "image/png",
        originalFileName: "fake.jpg"
      })
    ).toThrowError("Extension mismatch");

    expect(() =>
      validateMedia({
        bytes: Buffer.alloc(DEFAULT_MEDIA_MAX_BYTES + 1, 1),
        declaredMime: "image/png",
        originalFileName: "huge.png"
      })
    ).toThrowError("Media size outside allowed range");
  });

  it("prevents path traversal and isolates local storage roots", async () => {
    const first = new LocalEphemeralStorageAdapter(root);
    const otherRoot = await mkdtemp(path.join(tmpdir(), "lc-media-other-"));
    const second = new LocalEphemeralStorageAdapter(otherRoot);
    try {
      const stored = await first.put({ bytes: png });
      expect(await first.exists(stored.storageKey)).toBe(true);
      expect(await second.exists(stored.storageKey)).toBe(false);
      await expect(first.read("../outside")).rejects.toThrowError("INVALID_STORAGE_KEY");
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });

  it("denies foreign workspaces and suspended Memberships", async () => {
    const a = await user("a-media@example.com");
    const b = await user("b-media@example.com");
    const workspaceA = await createWorkspace(sql, {
      userId: a,
      name: "A",
      type: "AGENCY",
      idempotencyKey: "a"
    });
    const workspaceB = await createWorkspace(sql, {
      userId: b,
      name: "B",
      type: "AGENCY",
      idempotencyKey: "b"
    });
    const storage = new LocalEphemeralStorageAdapter(root);
    const media = await uploadMediaAsset(sql, storage, {
      userId: a,
      workspaceId: String(workspaceA.id),
      originalFileName: "safe.png",
      declaredMime: "image/png",
      bytes: png
    });

    await expect(
      readMediaAsset(sql, storage, {
        userId: b,
        workspaceId: String(workspaceA.id),
        mediaAssetId: media.id
      })
    ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });

    await expect(
      readMediaAsset(sql, storage, {
        userId: b,
        workspaceId: String(workspaceB.id),
        mediaAssetId: media.id
      })
    ).rejects.toMatchObject({ code: "MEDIA_NOT_FOUND" });

    await sql.unsafe(
      "update memberships set status='SUSPENDED' where user_id=$1 and workspace_id=$2::uuid",
      [a, String(workspaceA.id)]
    );
    await expect(
      readMediaAsset(sql, storage, {
        userId: a,
        workspaceId: String(workspaceA.id),
        mediaAssetId: media.id
      })
    ).rejects.toMatchObject({ code: "MEMBERSHIP_INACTIVE" });
  });

  it("issues expiring media access tokens bound to user, Workspace and asset", async () => {
    const owner = await user("token@example.com");
    const workspace = await createWorkspace(sql, {
      userId: owner,
      name: "Token",
      type: "AGENCY",
      idempotencyKey: "token"
    });
    const storage = new LocalEphemeralStorageAdapter(root);
    const media = await uploadMediaAsset(sql, storage, {
      userId: owner,
      workspaceId: String(workspace.id),
      originalFileName: "safe.png",
      declaredMime: "image/png",
      bytes: png
    });
    const secret = "test-secret-0123456789abcdef0123456789";

    const token = await issueMediaAccessToken(sql, {
      userId: owner,
      workspaceId: String(workspace.id),
      mediaAssetId: media.id,
      secret,
      expiresInSeconds: 60
    });
    expect(
      verifyMediaAccessToken(token, {
        userId: owner,
        workspaceId: String(workspace.id),
        mediaAssetId: media.id,
        secret
      })
    ).toMatchObject({ mediaAssetId: media.id });

    await expect(
      Promise.resolve().then(() =>
        verifyMediaAccessToken(`${token}tampered`, {
          userId: owner,
          workspaceId: String(workspace.id),
          mediaAssetId: media.id,
          secret
        })
      )
    ).rejects.toMatchObject({ code: "MEDIA_ACCESS_DENIED" });

    const expired = await issueMediaAccessToken(sql, {
      userId: owner,
      workspaceId: String(workspace.id),
      mediaAssetId: media.id,
      secret,
      expiresInSeconds: -1
    });
    expect(() =>
      verifyMediaAccessToken(expired, {
        userId: owner,
        workspaceId: String(workspace.id),
        mediaAssetId: media.id,
        secret
      })
    ).toThrowError("Expired or mismatched media access token");
  });
});
