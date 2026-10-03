// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Icon, ICON_NAMES } from "./icons";

describe("Icon", () => {
  it("is aria-hidden and decorative when no label is given", () => {
    const { container } = render(<Icon name="close" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("exposes an accessible name when a label is given", () => {
    const { container } = render(<Icon name="warning" label="Atenção" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Atenção");
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("uses currentColor so it inherits text color", () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector("svg")).toHaveAttribute("stroke", "currentColor");
  });

  it("covers the full foundation icon inventory without duplicates", () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
    for (const required of [
      "chevron-down", "close", "check", "add", "edit", "delete", "download",
      "upload", "external-link", "search", "filter", "menu", "notification",
      "warning", "info", "success", "error"
    ]) {
      expect(ICON_NAMES).toContain(required);
    }
  });
});
