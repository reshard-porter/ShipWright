import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Card, Skeleton } from "@/components/ui/card";
import { signUp } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Create your account" };

export default function Page({ searchParams }: PageProps<"/sign-up">) {
  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <h1 className="text-ink text-center text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <Card className="p-6">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </Card>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/sign-up">["searchParams"] }) {
  const { next } = await searchParams;
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <AuthForm
      mode="sign-up"
      action={signUp}
      next={safeNext}
      showDemo={process.env.DEMO_MODE !== "false"}
    />
  );
}
