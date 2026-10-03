// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Topbar } from "./topbar";

afterEach(cleanup);

describe("Topbar", () => {
  it("renders the mobile nav trigger, search field, notification trigger and account menu slots", () => {
    render(
      <Topbar
        mobileNavTrigger={<button type="button">Abrir navegação</button>}
        contextSwitcher={<div>Contexto</div>}
        accountMenu={<div>Conta</div>}
      />
    );
    expect(screen.getByRole("button", { name: "Abrir navegação" })).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notificações" })).toBeInTheDocument();
    expect(screen.getByText("Contexto")).toBeInTheDocument();
    expect(screen.getByText("Conta")).toBeInTheDocument();
  });

  it("accepts a custom search placeholder/label", () => {
    render(
      <Topbar
        mobileNavTrigger={null}
        contextSwitcher={null}
        accountMenu={null}
        searchPlaceholder="Buscar creators"
      />
    );
    expect(screen.getByRole("searchbox", { name: "Buscar creators" })).toBeInTheDocument();
  });
});
