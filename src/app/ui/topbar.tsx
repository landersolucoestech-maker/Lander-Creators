import type { ReactNode } from "react";
import { Button } from "./button";
import { Icon } from "./icons";

/**
 * Shared Topbar shell. Global search is structural/accessible only — no
 * backend exists to wire it to yet (per brief, not invented here). The
 * notification trigger has no fabricated unread count; a real count is
 * added only once a real notifications source exists.
 */
export function Topbar({
  mobileNavTrigger,
  contextSwitcher,
  accountMenu,
  searchPlaceholder = "Buscar"
}: {
  mobileNavTrigger: ReactNode;
  contextSwitcher: ReactNode;
  accountMenu: ReactNode;
  searchPlaceholder?: string;
}) {
  return (
    <header className="lc-topbar">
      {mobileNavTrigger}
      <div className="lc-topbar-search" role="search">
        <Icon name="search" />
        <label className="visually-hidden" htmlFor="lc-global-search">{searchPlaceholder}</label>
        <input id="lc-global-search" type="search" placeholder={searchPlaceholder} />
      </div>
      <div className="lc-topbar-end">
        {contextSwitcher}
        <Button variant="icon" aria-label="Notificações" icon="notification" />
        {accountMenu}
      </div>
    </header>
  );
}
