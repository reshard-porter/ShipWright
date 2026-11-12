import Link from "next/link";
import { Suspense } from "react";
import { Bell } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Avatar, Skeleton } from "@/components/ui/card";
import { isTeam } from "@/lib/permissions";
import { signOut } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth";
import { getMyNotifications } from "@/server/queries";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-border bg-surface/90 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          aria-label="Shipwright home"
          className="text-ink flex items-center gap-2 font-semibold tracking-tight"
        >
          <Logo className="size-7" />
          <span className="hidden sm:inline">Shipwright</span>
        </Link>
        <nav
          aria-label="Main"
          className="-mx-1 flex min-w-0 [scrollbar-width:none] items-center gap-0.5 overflow-x-auto px-1 sm:gap-1"
        >
          <NavLink href="/">Board</NavLink>
          <NavLink href="/roadmap">Roadmap</NavLink>
          <NavLink href="/changelog">Changelog</NavLink>
          <Suspense>
            <TeamNav />
          </Suspense>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Suspense fallback={<Skeleton className="h-9 w-24" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function TeamNav() {
  const user = await getCurrentUser();
  return isTeam(user) ? <NavLink href="/dashboard">Dashboard</NavLink> : null;
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/sign-in" className={buttonStyles("primary", "sm")}>
        Sign in
      </Link>
    );
  }
  const { unread } = await getMyNotifications();
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/notifications"
        className="text-muted hover:bg-surface-muted hover:text-ink relative inline-flex size-9 items-center justify-center rounded-lg"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="bg-accent absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
      <details className="group relative">
        <summary
          className="hover:bg-surface-muted flex cursor-pointer list-none items-center rounded-full p-0.5"
          aria-label="Account menu"
        >
          <Avatar name={user.name} />
        </summary>
        <div className="border-border bg-surface absolute right-0 mt-2 w-56 rounded-xl border p-2 shadow-lg">
          <div className="px-2 py-1.5">
            <p className="text-ink truncate text-sm font-medium">{user.name}</p>
            <p className="text-muted truncate text-xs">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-ink hover:bg-surface-muted mt-1 w-full rounded-lg px-2 py-1.5 text-left text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
