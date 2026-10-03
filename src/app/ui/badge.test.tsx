// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders with the neutral variant by default", () => {
    render(<Badge>Rascunho</Badge>);
    expect(screen.getByText("Rascunho")).toHaveClass("lc-badge--neutral");
  });

  it("applies the requested semantic variant", () => {
    render(<Badge variant="success">Ativa</Badge>);
    expect(screen.getByText("Ativa")).toHaveClass("lc-badge--success");
  });

  it("does not encode domain-specific props", () => {
    render(<Badge variant="danger">Cancelada</Badge>);
    const badge = screen.getByText("Cancelada");
    expect(badge).not.toHaveAttribute("campaignstatus");
  });
});
