import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      body="The page you're looking for doesn't exist or has moved."
      action={
        <Link href="/" className={buttonStyles("secondary", "sm")}>
          Go to the board
        </Link>
      }
    />
  );
}
