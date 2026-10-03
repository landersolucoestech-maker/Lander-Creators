import Link from "next/link";
import type { ReactNode } from "react";
import type { ApplicationNavItem } from "../application-navigation";
import { isActiveRoute } from "./active-route";
import { BrandSlot } from "./brand-slot";

const GROUP_ORDER = ["Visão geral", "Operação", "Recursos", "Organização"] as const;

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
      <BrandSlot />
      <nav className="lc-sidebar-nav" aria-label="Navegação principal">
        {GROUP_ORDER.map((group) => {
          const items = navigation.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <div className="lc-nav-group" key={group}>
              <p className="lc-nav-group-label">{group}</p>
              {items.map((item) => {
                const active = isActiveRoute(pathname, item.href, navigation);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={active ? "lc-nav-link lc-nav-link--active" : "lc-nav-link"}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="lc-sidebar-footer">
        <span className="lc-muted-label">Contexto</span>
        <strong>{contextLabel}</strong>
      </div>
      {promoCard ? <div className="lc-sidebar-promo">{promoCard}</div> : null}
    </div>
  );
}
