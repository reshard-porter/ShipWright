import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPostForm } from "@/components/post/new-post-form";
import { Card, Skeleton } from "@/components/ui/card";
import { requirePageUser } from "@/server/auth";
import { getCategories } from "@/server/queries";

export const metadata: Metadata = { title: "New feedback" };

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Share an idea</h1>
        <p className="text-muted mt-1">
          Search the board first: if someone already asked, a vote counts more than a duplicate.
        </p>
      </div>
      <Card className="p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Form />
        </Suspense>
      </Card>
    </div>
  );
}

async function Form() {
  await requirePageUser("post:create", "/posts/new");
  const categories = await getCategories();
  return <NewPostForm categories={categories} />;
}
