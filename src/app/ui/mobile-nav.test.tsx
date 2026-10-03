// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileNav } from "./mobile-nav";

afterEach(cleanup);

function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button">Abrir navegação</button>
      <MobileNav open={open} onClose={onClose} label="Navegação" triggerRef={triggerRef}>
        <button type="button">Campanhas</button>
      </MobileNav>
    </>
  );
}

describe("MobileNav", () => {
  it("renders nothing when closed", () => {
    render(<Harness open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders an accessible modal dialog when open", () => {
    render(<Harness open={true} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Navegação" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<Harness open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<Harness open={true} onClose={onClose} />);
    fireEvent.click(container.querySelector(".lc-mobile-nav-backdrop")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<Harness open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Fechar navegação" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("returns focus to the trigger once closed", () => {
    const { rerender } = render(<Harness open={true} onClose={() => {}} />);
    rerender(<Harness open={false} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Abrir navegação" })).toHaveFocus();
  });

  it("keeps focus and scroll lock stable when the parent re-renders with a new onClose", () => {
    const { rerender } = render(<Harness open={true} onClose={() => {}} />);
    const close = screen.getByRole("button", { name: "Fechar navegação" });
    screen.getByRole("button", { name: "Campanhas" }).focus();
    rerender(<Harness open={true} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Campanhas" })).toHaveFocus();
    expect(close).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
  });
});
