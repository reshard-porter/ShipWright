import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoteButton } from "@/components/board/vote-button";
import type { ActionResult } from "@/lib/errors";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

type VoteResult = ActionResult<{ voted: boolean; voteCount: number }>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("VoteButton", () => {
  it("updates the count instantly, before the server responds", async () => {
    const server = deferred<VoteResult>();
    const onToggle = vi.fn(() => server.promise);
    render(<VoteButton postId={1} voted={false} voteCount={4} signedIn onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button", { name: /upvote, 4 votes/i }));
    expect(screen.getByRole("button", { pressed: true })).toHaveAccessibleName(
      /remove vote, 5 votes/i,
    );
    expect(onToggle).toHaveBeenCalledWith(1);

    await act(async () => server.resolve({ ok: true, data: { voted: true, voteCount: 5 } }));
    expect(screen.getByRole("button")).toHaveAccessibleName(/remove vote, 5 votes/i);
  });

  it("rolls back and explains when the server rejects the vote", async () => {
    const onToggle = vi.fn(async (): Promise<VoteResult> => ({
      ok: false,
      code: "CONFLICT",
      error: "This request was merged.",
    }));
    render(<VoteButton postId={1} voted={false} voteCount={4} signedIn onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("This request was merged.")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAccessibleName(/upvote, 4 votes/i);
  });

  it("sends signed-out visitors to sign in", () => {
    render(
      <VoteButton postId={7} voted={false} voteCount={2} signedIn={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole("link", { name: /sign in to vote/i })).toHaveAttribute(
      "href",
      "/sign-in?next=/posts/7",
    );
  });
});
