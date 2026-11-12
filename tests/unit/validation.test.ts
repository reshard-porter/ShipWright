import { describe, expect, it } from "vitest";
import { commentSchema, createPostSchema, parseBoardFilters, signUpSchema } from "@/lib/validation";

describe("parseBoardFilters", () => {
  it("applies defaults", () => {
    expect(parseBoardFilters({})).toEqual({ sort: "trending", page: 1 });
  });

  it("ignores invalid values instead of throwing", () => {
    expect(parseBoardFilters({ status: "nope", sort: "random", page: "-3" })).toEqual({
      sort: "trending",
      page: 1,
    });
  });

  it("takes the first value of repeated params and trims search", () => {
    expect(parseBoardFilters({ q: ["  csv  ", "other"], status: "planned", page: "2" })).toEqual({
      q: "csv",
      status: "planned",
      sort: "trending",
      page: 2,
    });
  });
});

describe("form schemas", () => {
  it("normalises email and rejects short passwords", () => {
    const result = signUpSchema.safeParse({
      name: "Ada",
      email: " ADA@Example.com ",
      password: "short",
    });
    expect(result.success).toBe(false);
    expect(
      signUpSchema.parse({ name: "Ada", email: " ADA@Example.com ", password: "long enough" })
        .email,
    ).toBe("ada@example.com");
  });

  it("coerces category ids from form strings", () => {
    expect(
      createPostSchema.parse({
        title: "Export to CSV",
        body: "Please add CSV export.",
        categoryId: "3",
      }).categoryId,
    ).toBe(3);
  });

  it("reads checkbox values for internal comments", () => {
    expect(commentSchema.parse({ postId: "1", body: "hi", isInternal: "on" }).isInternal).toBe(
      true,
    );
    expect(commentSchema.parse({ postId: "1", body: "hi" }).isInternal).toBe(false);
  });
});
