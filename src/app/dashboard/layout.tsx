import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { Skeleton } from "@/components/ui/card";
import { requirePageUser } from "@/server/auth";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Team dashboard</h1>
        <nav aria-label="Dashboard" className="flex gap-1">
          <NavLink href="/dashboard/triage">Triage</NavLink>
          <NavLink href="/dashboard/changelog/new">Publish update</NavLink>
          <NavLink href="/dashboard/team">Team</NavLink>
        </nav>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Gate>{children}</Gate>
      </Suspense>
    </div>
  );
}

/** Every dashboard page requires a team member. Pages re-check their own permissions too. */
async function Gate({ children }: { children: React.ReactNode }) {
  await requirePageUser("post:triage", "/dashboard");
  return children;
}
