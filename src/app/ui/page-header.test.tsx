// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title as a heading and an optional description", () => {
    render(<PageHeader title="Campanhas" description="Gerencie campanhas ativas" />);
    expect(screen.getByRole("heading", { name: "Campanhas" })).toBeInTheDocument();
    expect(screen.getByText("Gerencie campanhas ativas")).toBeInTheDocument();
  });

  it("renders optional breadcrumb and actions slots only when supplied", () => {
    const { rerender } = render(<PageHeader title="Campanhas" />);
    expect(screen.queryByText("Voltar")).not.toBeInTheDocument();
    rerender(<PageHeader title="Campanhas" breadcrumb={<span>Voltar</span>} actions={<button type="button">Nova</button>} />);
    expect(screen.getByText("Voltar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova" })).toBeInTheDocument();
  });
});
