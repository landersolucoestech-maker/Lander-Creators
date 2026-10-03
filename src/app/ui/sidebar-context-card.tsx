import type { ReactNode } from "react";

/**
 * Reusable contextual promo slot for the Sidebar footer. Renders nothing
 * unless a title is supplied — definitive copy/CTA is owner content decided
 * when each module is rebuilt, not invented here.
 */
export function SidebarContextCard({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="lc-context-card">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ?? null}
    </div>
  );
}
