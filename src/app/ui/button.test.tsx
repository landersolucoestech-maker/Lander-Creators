// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders as a native button with the primary variant by default", () => {
    render(<Button>Salvar</Button>);
    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toHaveClass("lc-button--primary", "lc-button--md");
  });

  it("applies the requested variant and size classes", () => {
    render(
      <Button variant="danger" size="lg">
        Excluir
      </Button>
    );
    expect(screen.getByRole("button", { name: "Excluir" })).toHaveClass("lc-button--danger", "lc-button--lg");
  });

  it("disables the button and marks it busy while loading", () => {
    render(<Button loading>Enviando</Button>);
    const button = screen.getByRole("button", { name: "Enviando" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Indisponível
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Indisponível" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("supports an accessible icon-only button", () => {
    render(<Button variant="icon" icon="close" aria-label="Fechar" />);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });
});
