import type { Metadata } from "next";
import { ChangelogForm } from "@/components/dashboard/changelog-form";
import { Card } from "@/components/ui/card";
import { getRoadmap } from "@/server/queries";

export const metadata: Metadata = { title: "Publish update" };

export default async function NewChangelogPage() {
  const roadmap = await getRoadmap(["in_progress", "planned"]);
  const candidates = [...roadmap.in_progress, ...roadmap.planned];
  return (
    <Card className="max-w-3xl p-6">
      <ChangelogForm candidates={candidates} />
    </Card>
  );
}
