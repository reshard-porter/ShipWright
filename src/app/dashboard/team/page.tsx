import type { Metadata } from "next";
import { RoleSelect } from "@/components/dashboard/role-select";
import { Avatar, Card } from "@/components/ui/card";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/server/auth";
import { getTeam } from "@/server/queries";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const [team, me] = await Promise.all([getTeam(), getCurrentUser()]);
  const isAdmin = can(me, "team:manage");
  return (
    <Card className="max-w-3xl">
      <div className="border-border border-b p-4">
        <h2 className="text-ink font-semibold">Team members</h2>
        <p className="text-muted text-sm">
          {isAdmin
            ? "Admins can change roles. Members can triage and publish updates."
            : "Only admins can change roles."}
        </p>
      </div>
      <ul>
        {team.map((m) => (
          <li
            key={m.id}
            className="border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <Avatar name={m.name} />
            <div className="min-w-0 flex-1">
              <p className="text-ink text-sm font-medium">
                {m.name} {m.id === me?.id && <span className="text-muted">(you)</span>}
              </p>
              <p className="text-muted truncate text-xs">{m.email}</p>
            </div>
            {isAdmin ? (
              <RoleSelect key={m.role} userId={m.id} role={m.role} disabled={m.id === me?.id} />
            ) : (
              <span className="text-muted text-sm capitalize">{m.role}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
