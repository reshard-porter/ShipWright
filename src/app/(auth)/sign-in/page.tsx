import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Card, Skeleton } from "@/components/ui/card";
import { signIn } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function Page({ searchParams }: PageProps<"/sign-in">) {
  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <h1 className="text-ink text-center text-2xl font-semibold tracking-tight">Sign in</h1>
      <Card className="p-6">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </Card>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const { next } = await searchParams;
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <AuthForm
      mode="sign-in"
      action={signIn}
      next={safeNext}
      showDemo={process.env.DEMO_MODE !== "false"}
    />
  );
}
