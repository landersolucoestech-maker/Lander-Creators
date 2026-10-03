export type RouteLike = { href: string };

function hrefTarget(href: string) {
  return href.split("#")[0];
}

export function matchesRoute(pathname: string, href: string): boolean {
  const target = hrefTarget(href);
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

/** The most specific matching item wins, so /engagements/contracts does not also highlight /engagements. */
export function isActiveRoute(pathname: string, href: string, navigation: RouteLike[]): boolean {
  if (!matchesRoute(pathname, href)) return false;
  const length = hrefTarget(href).length;
  return !navigation.some(
    (item) => item.href !== href && matchesRoute(pathname, item.href) && hrefTarget(item.href).length > length
  );
}
