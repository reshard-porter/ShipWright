"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="border-border bg-surface mx-auto max-w-md rounded-xl border p-8 text-center"
    >
      <h1 className="text-ink text-lg font-semibold">Something went wrong</h1>
      <p className="text-muted mt-2 text-sm">
        This page couldn&apos;t load. Try again, and if it keeps happening, let us know.
        {error.digest && (
          <span className="mt-2 block font-mono text-xs">Reference: {error.digest}</span>
        )}
      </p>
      <Button variant="primary" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
