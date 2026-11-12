import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("board lists requests and filters by search and status", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jira two-way sync" })).toBeVisible();

    await page.getByRole("searchbox", { name: "Search feedback" }).fill("csv");
    await expect(page).toHaveURL(/q=csv/);
    await expect(page.getByRole("link", { name: "Export feedback to CSV" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jira two-way sync" })).toHaveCount(0);

    await page.goto("/?status=shipped");
    await expect(page.getByRole("link", { name: "Dark mode for the dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jira two-way sync" })).toHaveCount(0);
  });

  test("signed-out visitors are asked to sign in before voting", async ({ page }) => {
    await page.goto("/posts/1");
    await page.getByRole("link", { name: /sign in to vote/i }).click();
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fposts%2F1|\/sign-in\?next=\/posts\/1/);
  });

  test("private pages redirect to sign in", async ({ page }) => {
    for (const path of ["/dashboard", "/posts/new", "/notifications"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in/);
    }
  });

  test("unknown requests show a helpful not-found page", async ({ page }) => {
    await page.goto("/posts/99999");
    await expect(page.getByText("That request doesn't exist")).toBeVisible();
  });

  for (const path of ["/", "/roadmap", "/changelog", "/posts/1", "/sign-in"]) {
    test(`has no detectable accessibility violations: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
