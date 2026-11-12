import { describe, expect, it } from "vitest";
import { pluralize, slugify, timeAgo } from "@/lib/utils";

describe("slugify", () => {
  it.each([
    ["Dark mode & themes!", "dark-mode-themes"],
    ["  Café   déjà vu ", "cafe-deja-vu"],
    ["---", ""],
    ["CSV export (v2)", "csv-export-v2"],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("truncates without leaving a trailing dash", () => {
    expect(slugify("a".repeat(10) + " " + "b".repeat(10), 11)).toBe("aaaaaaaaaa");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  it.each([
    ["2026-06-15T11:59:30Z", "just now"],
    ["2026-06-15T11:55:00Z", "5 minutes ago"],
    ["2026-06-14T12:00:00Z", "yesterday"],
    ["2026-06-01T12:00:00Z", "2 weeks ago"],
    ["2025-06-15T12:00:00Z", "last year"],
  ])("%s -> %s", (date, expected) => {
    expect(timeAgo(date, now)).toBe(expected);
  });
});

describe("pluralize", () => {
  it("handles one, many and thousands", () => {
    expect(pluralize(1, "vote")).toBe("1 vote");
    expect(pluralize(0, "vote")).toBe("0 votes");
    expect(pluralize(1200, "reply", "replies")).toBe("1,200 replies");
  });
});
