"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinkStyles } from "./nav-styles";

export function ActiveNavLink({ href, children }: { href: Route; children: React.ReactNode }) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" || pathname.startsWith("/posts") : pathname.startsWith(href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={navLinkStyles(active)}>
      {children}
    </Link>
  );
}
