import { expect, type Page } from "@playwright/test";

export const DEMO = {
  admin: "Ava",
  member: "Marcus",
  customer: "Jordan",
} as const;

export async function signInAs(page: Page, who: string, next = "/") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: new RegExp(who) }).click();
  await expect(page).toHaveURL(next === "/" ? /\/$/ : new RegExp(next.replace(/\//g, "\\/")));
}
