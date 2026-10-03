import type { ReactNode } from "react";

/** Canonical content gutters/width for every page rendered inside the shell's <main>. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="lc-page-container">{children}</div>;
}
