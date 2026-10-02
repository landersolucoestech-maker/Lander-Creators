import { describe, expect, it } from "vitest";
import { likePattern, pageOf, parseListQuery } from "@/server/shared/list-query";

const config = { sorts: ["created_at", "amount"] as const, defaultSort: "created_at" as const, statuses: ["OPEN", "CLOSED"] as const };

describe("list query parsing", () => {
  it("uses safe defaults for empty input", () => {
    expect(parseListQuery({}, config)).toEqual({ page: 1, pageSize: 20, q: null, status: null, sort: "created_at", dir: "desc" });
  });

  it("accepts valid values and trims the search text", () => {
    expect(parseListQuery({ page: "3", pageSize: "50", q: "  ana  ", status: "OPEN", sort: "amount", dir: "asc" }, config)).toEqual({
      page: 3, pageSize: 50, q: "ana", status: "OPEN", sort: "amount", dir: "asc"
    });
  });

  it("never lets a client pick an unknown sort column, status or direction", () => {
    const parsed = parseListQuery({ sort: "amount; drop table users", status: "HACKED", dir: "sideways" }, config);
    expect(parsed).toMatchObject({ sort: "created_at", status: null, dir: "desc" });
  });

  it("clamps page and page size and ignores malformed numbers", () => {
    expect(parseListQuery({ page: "-4", pageSize: "100000" }, config)).toMatchObject({ page: 1, pageSize: 100 });
    expect(parseListQuery({ page: "abc", pageSize: "0" }, config)).toMatchObject({ page: 1, pageSize: 20 });
    expect(parseListQuery({ page: "1e9" }, config).page).toBe(1);
  });

  it("takes the first value of repeated parameters and bounds the search length", () => {
    expect(parseListQuery({ q: ["first", "second"] }, config).q).toBe("first");
    expect(parseListQuery({ q: "x".repeat(500) }, config).q).toHaveLength(100);
    expect(parseListQuery({ q: "   " }, config).q).toBeNull();
  });
});

describe("pagination and search helpers", () => {
  it("escapes LIKE wildcards in user text", () => {
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });

  it("builds a page envelope with offsets", () => {
    const query = parseListQuery({ page: "2", pageSize: "10" }, config);
    expect(pageOf(["a"], 25, query)).toEqual({ rows: ["a"], total: 25, page: 2, pageSize: 10, pageCount: 3, offset: 10 });
    expect(pageOf([], 0, query).pageCount).toBe(1);
  });
});
