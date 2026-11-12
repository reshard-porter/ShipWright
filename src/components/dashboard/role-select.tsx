"use client";

import { useState, useTransition } from "react";
import { setRoleAction } from "@/server/actions/team";
import { cn } from "@/lib/utils";
import { controlStyles } from "@/components/ui/field";

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: string;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Role"
        defaultValue={role}
        disabled={disabled || isPending}
        className={cn(controlStyles, "h-9 w-32")}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            const result = await setRoleAction(userId, next);
            setError(result.ok ? null : result.error);
          });
        }}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
        <option value="user">Remove from team</option>
      </select>
      {error && (
        <span role="alert" className="text-xs text-[var(--st-closed)]">
          {error}
        </span>
      )}
    </div>
  );
}
