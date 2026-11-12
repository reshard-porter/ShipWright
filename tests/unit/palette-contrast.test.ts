import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the design tokens in globals.css: every text colour must keep WCAG AA
 * contrast (4.5:1) against the background it's used on, in both themes.
 */
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

function tokens(selector: string) {
  const block = css.slice(css.indexOf(selector)).match(/\{([^}]*)\}/)![1];
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [fg: string, bg: string][] = [
  ["ink", "page"],
  ["ink", "surface"],
  ["muted", "surface"],
  ["muted", "page"],
  ["primary", "surface"],
  ["primary", "primary-soft"],
  ["on-primary", "primary"],
  ["accent", "surface"],
  ["accent", "accent-soft"],
  ["st-review", "st-review-bg"],
  ["st-planned", "st-planned-bg"],
  ["st-progress", "st-progress-bg"],
  ["st-shipped", "st-shipped-bg"],
  ["st-closed", "st-closed-bg"],
];

describe.each([
  ["light", ":root {"],
  ["dark", '[data-theme="dark"] {'],
])("%s theme", (_name, selector) => {
  const t = tokens(selector);
  it.each(PAIRS)("%s on %s meets WCAG AA", (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
