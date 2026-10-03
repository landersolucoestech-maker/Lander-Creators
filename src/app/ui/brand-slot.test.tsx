// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandSlot } from "./brand-slot";

describe("BrandSlot", () => {
  it("links home with an accessible LANDER CREATORS label", () => {
    render(<BrandSlot />);
    expect(screen.getByRole("link", { name: "LANDER CREATORS" })).toHaveAttribute("href", "/");
  });
});
