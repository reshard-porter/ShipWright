# 3. Cache Components with tag-based invalidation

**Status:** accepted

## Context
Most traffic is people reading public pages, while writes are rare but must show up immediately for the person making them.

## Decision
Turn on `cacheComponents`. Wrap every read in `"use cache"` with a tag from a single `tags.ts` module, and call `updateTag` in Server Actions. Anything that depends on the request (session, search params) goes behind `<Suspense>`.

## Consequences
- Public pages are served from a prerendered shell (LCP around 0.8 s in Lighthouse) without giving up freshness.
- Keeping all tags in one module means reads and writes can't drift apart through typos.
- The in-memory cache is per server instance. When the app runs on several instances, the hot queries should move to `use cache: remote`.
