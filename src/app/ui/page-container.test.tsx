// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageContainer } from "./page-container";

describe("PageContainer", () => {
  it("wraps its children in the canonical content container", () => {
    render(<PageContainer><p>Conteúdo</p></PageContainer>);
    expect(screen.getByText("Conteúdo").parentElement).toHaveClass("lc-page-container");
  });
});
