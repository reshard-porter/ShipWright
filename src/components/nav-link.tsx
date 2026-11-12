import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActiveNavLink } from "./active-nav-link";
import { navLinkStyles } from "./nav-styles";

/**
 * The highlighted state depends on the URL, which isn't known while the
 * static shell is prerendered. The plain link ships in the shell and the
 * active version streams in, so the nav never blocks the page.
 */
export function NavLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <Link href={href} className={navLinkStyles(false)}>
          {children}
        </Link>
      }
    >
      <ActiveNavLink href={href}>{children}</ActiveNavLink>
    </Suspense>
  );
}
