// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "./sidebar";
import type { ApplicationNavItem } from "../application-navigation";

afterEach(cleanup);

const navigation: ApplicationNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", group: "Visão geral" },
  { id: "campaigns", label: "Campanhas", href: "/campaigns", group: "Operação" },
  { id: "settings", label: "Configurações", href: "/settings", group: "Organização" }
];

describe("Sidebar", () => {
  it("groups items under their labeled sections", () => {
    render(<Sidebar navigation={navigation} pathname="/campaigns" contextLabel="Workspace Teste" />);
    expect(screen.getByText("Visão geral")).toBeInTheDocument();
    expect(screen.getByText("Operação")).toBeInTheDocument();
    expect(screen.getByText("Organização")).toBeInTheDocument();
  });

  it("marks the current route active via aria-current and not its siblings", () => {
    render(<Sidebar navigation={navigation} pathname="/campaigns" contextLabel="Workspace Teste" />);
    expect(screen.getByRole("link", { name: "Campanhas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("exposes the navigation landmark with an accessible label", () => {
    render(<Sidebar navigation={navigation} pathname="/" contextLabel="Workspace Teste" />);
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });

  it("renders the active context label in the footer", () => {
    render(<Sidebar navigation={navigation} pathname="/" contextLabel="Workspace Teste" />);
    expect(screen.getByText("Workspace Teste")).toBeInTheDocument();
  });

  it("calls onNavigate when a link is clicked", () => {
    const onNavigate = vi.fn();
    render(<Sidebar navigation={navigation} pathname="/" contextLabel="Workspace Teste" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("link", { name: "Campanhas" }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("only renders the promo slot when content is supplied", () => {
    const { rerender } = render(<Sidebar navigation={navigation} pathname="/" contextLabel="Workspace Teste" />);
    expect(screen.queryByText("Promo")).not.toBeInTheDocument();
    rerender(
      <Sidebar navigation={navigation} pathname="/" contextLabel="Workspace Teste" promoCard={<span>Promo</span>} />
    );
    expect(screen.getByText("Promo")).toBeInTheDocument();
  });
});
