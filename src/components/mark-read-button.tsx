"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/server/actions/notifications";

export function MarkReadButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => startTransition(async () => void (await markNotificationsReadAction()))}
    >
      Mark all as read
    </Button>
  );
}
