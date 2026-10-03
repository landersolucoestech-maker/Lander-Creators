import Link from "next/link";

/**
 * BLOCKED_ASSET_LOGO: no logo asset exists anywhere in the repository
 * (public/ contains only .gitkeep). This renders a discreet technical
 * placeholder and accepts the official asset later without requiring any
 * Sidebar/Topbar structural change.
 */
export function BrandSlot() {
  return (
    <Link href="/" className="lc-brand-slot" aria-label="LANDER CREATORS">
      <span className="lc-brand-mark" aria-hidden="true">LC</span>
      <span className="lc-brand-wordmark">
        <strong>LANDER</strong>
        <small>CREATORS</small>
      </span>
    </Link>
  );
}
