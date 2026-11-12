import { expect, test } from "@playwright/test";
import { DEMO, signInAs } from "./helpers";

test.describe("customer and team journeys", () => {
  test("a new customer signs up, posts an idea, and it's on the board with their vote", async ({
    page,
  }) => {
    const email = `new-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Robin Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("a-strong-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("link", { name: "New feedback", exact: true }).click();
    await page.getByLabel("Title").fill("Calendar view for the roadmap");
    await page.getByLabel("Category", { exact: true }).selectOption({ label: "Feature" });
    await page
      .getByLabel("Details")
      .fill("A calendar layout would make it easier to see what's coming up.");
    await page.getByRole("button", { name: "Post feedback" }).click();

    await expect(
      page.getByRole("heading", { name: "Calendar view for the roadmap" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /remove vote, 1 vote/i })).toBeVisible();

    await page.goto("/?sort=new");
    await expect(page.getByRole("link", { name: "Calendar view for the roadmap" })).toBeVisible();
  });

  test("forms show validation errors next to the field", async ({ page }) => {
    await signInAs(page, DEMO.customer, "/posts/new");
    await page.getByLabel("Title").fill("Hi");
    await page.getByRole("button", { name: "Post feedback" }).click();
    await expect(page.getByText("Title needs at least 6 characters.")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveAttribute("aria-invalid", "true");
  });

  test("voting is optimistic and survives a reload", async ({ page }) => {
    await signInAs(page, DEMO.customer, "/posts/13");
    const button = page.getByRole("button", { name: /upvote|remove vote/i });
    const before = Number((await button.getAttribute("aria-label"))!.match(/(\d+) vote/)![1]);
    const wasVoted = (await button.getAttribute("aria-pressed")) === "true";

    await button.click();
    const expected = before + (wasVoted ? -1 : 1);
    await expect(button).toHaveAccessibleName(new RegExp(`${expected} vote`));
    await page.reload();
    await expect(page.getByRole("button", { name: new RegExp(`${expected} vote`) })).toBeVisible();
  });

  test("customers can't reach the team dashboard", async ({ page }) => {
    await signInAs(page, DEMO.customer);
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await page.goto("/dashboard/triage");
    await expect(page).toHaveURL(/\/$/);
  });

  test("the team ships a request through a changelog post, and voters are notified", async ({
    browser,
  }) => {
    // A customer makes sure they're following the request.
    const customer = await browser.newPage();
    await signInAs(customer, DEMO.customer, "/roadmap");
    await customer.getByRole("link", { name: "Linear integration" }).click();
    const vote = customer.getByRole("button", { name: /upvote|remove vote/i });
    if ((await vote.getAttribute("aria-pressed")) !== "true") {
      await vote.click();
      await expect(vote).toHaveAttribute("aria-pressed", "true");
    }

    const team = await browser.newPage();
    await signInAs(team, DEMO.member, "/dashboard/changelog/new");
    await team.getByLabel("Title").fill("Linear integration is here");
    await team
      .getByLabel("What changed")
      .fill("Link Linear issues to feedback and keep statuses in sync.");
    await team.getByRole("checkbox", { name: /Linear integration/ }).check();
    await team.getByRole("button", { name: "Publish update" }).click();

    await expect(team).toHaveURL(/\/changelog\/linear-integration-is-here/);
    await expect(team.getByRole("link", { name: "Linear integration" })).toBeVisible();

    await team.goto("/roadmap");
    const shipped = team.getByRole("region", { name: /Shipped/ });
    await expect(shipped.getByRole("link", { name: "Linear integration" })).toBeVisible();

    await customer.goto("/notifications");
    await expect(
      customer.getByRole("link", { name: '"Linear integration" just shipped' }),
    ).toBeVisible();
    await expect(customer.getByRole("link", { name: /Notifications, \d+ unread/ })).toBeVisible();
  });

  test("the team triages a request and the history records it", async ({ page }) => {
    await signInAs(page, DEMO.member, "/posts/10");
    await page.getByLabel("Status").selectOption({ label: "Planned" });
    await expect(page.getByRole("status").filter({ hasText: "Moved to Planned" })).toBeVisible();
    await expect(page.getByText(/Under review → Planned/)).toBeVisible();
  });
});
