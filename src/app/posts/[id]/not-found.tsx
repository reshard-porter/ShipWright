import Link from "next/link";
import { EmptyState } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";

export default function PostNotFound() {
  return (
    <EmptyState
      title="That request doesn't exist"
      body="It may have been removed, or the link is wrong."
      action={
        <Link href="/" className={buttonStyles("secondary", "sm")}>
          Back to the board
        </Link>
      }
    />
  );
}
