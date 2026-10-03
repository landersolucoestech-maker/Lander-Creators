import { describe, expect, it } from "vitest";
import { isActiveRoute, matchesRoute } from "./active-route";

describe("matchesRoute", () => {
  it("matches the root route only on an exact /", () => {
    expect(matchesRoute("/", "/")).toBe(true);
    expect(matchesRoute("/campaigns", "/")).toBe(false);
  });

  it("matches exact and nested child routes", () => {
    expect(matchesRoute("/engagements", "/engagements")).toBe(true);
    expect(matchesRoute("/engagements/123", "/engagements")).toBe(true);
    expect(matchesRoute("/engagements-archive", "/engagements")).toBe(false);
  });

  it("ignores the hash fragment of the href", () => {
    expect(matchesRoute("/music-catalog", "/music-catalog#artists")).toBe(true);
  });
});

describe("isActiveRoute", () => {
  const navigation = [
    { href: "/engagements" },
    { href: "/engagements/contracts" }
  ];

  it("activates the most specific matching item", () => {
    expect(isActiveRoute("/engagements/contracts", "/engagements/contracts", navigation)).toBe(true);
    expect(isActiveRoute("/engagements/contracts", "/engagements", navigation)).toBe(false);
  });

  it("activates a parent item for its own nested dynamic routes", () => {
    expect(isActiveRoute("/engagements/123", "/engagements", navigation)).toBe(true);
  });

  it("does not activate on an unrelated route", () => {
    expect(isActiveRoute("/finance", "/engagements", navigation)).toBe(false);
  });

  it("never marks fragment hrefs current, so a same-path sibling is the only active item", () => {
    const nav = [{ href: "/music-catalog#artists" }, { href: "/music-catalog" }];
    expect(isActiveRoute("/music-catalog", "/music-catalog#artists", nav)).toBe(false);
    expect(isActiveRoute("/music-catalog", "/music-catalog", nav)).toBe(true);
  });
});
