import type { ReactNode } from "react";

/**
 * Structural page-header primitive (breadcrumb/title/description/actions).
 * Belongs to the shell/layout unit; filling it into domain pages happens in
 * each page's own rebuild unit, not here.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions
}: {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="lc-page-header">
      <div className="lc-page-header-main">
        {breadcrumb ? <div className="lc-page-header-breadcrumb">{breadcrumb}</div> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="lc-page-header-actions">{actions}</div> : null}
    </header>
  );
}
