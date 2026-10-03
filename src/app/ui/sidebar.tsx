import Link from "next/link";
import type { ReactNode } from "react";
import type { ApplicationNavItem } from "../application-navigation";
import { isActiveRoute } from "./active-route";
import { BrandSlot } from "./brand-slot";

export function Sidebar({
  navigation,
  pathname,
  contextLabel,
  onNavigate,
  promoCard
}: {
  navigation: ApplicationNavItem[];
  pathname: string;
  contextLabel: string;
  onNavigate?: () => void;
  promoCard?: ReactNode;
}) {
  return (
    <div className="lc-sidebar-inner">
      <div className="lc-sidebar-brand-row">
        <BrandSlot />
        <span className="lc-sidebar-collapse" aria-hidden="true">☰</span>
      </div>
      <nav className="lc-sidebar-nav" aria-label="Navegação principal">
        {navigation.map((item) => {
          const active = isActiveRoute(pathname, item.href, navigation);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={active ? "lc-nav-link lc-nav-link--active" : "lc-nav-link"}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <span className="lc-nav-glyph" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {promoCard ? <div className="lc-sidebar-promo">{promoCard}</div> : null}
      <div className="lc-sidebar-context visually-hidden">
        <span>Contexto</span><strong>{contextLabel}</strong>
      </div>
    </div>
  );
}