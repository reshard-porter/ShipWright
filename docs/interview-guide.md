# Interview guide

A cheat sheet for presenting Shipwright in an engineering interview.

## The 30-second pitch

> Shipwright is a feedback and roadmap tool, like a small Canny. Customers post and vote on ideas, the team triages them onto a roadmap, and publishing a changelog entry marks requests as shipped and notifies everyone who voted. It's Next.js 16 with Server Components, Server Actions and Cache Components, on Postgres with Drizzle. There are 90 automated tests, including integration tests against a real database and Playwright journeys, and CI runs all of them on every pull request.

## A 5-minute demo

1. **Board, signed out:** search "exporting" (stemming finds "Export"), then filter by status and switch the sort. Point out that the URL changes, so views are shareable.
2. **Sign in as Jordan (customer):** vote. The count changes instantly. Open a post and leave a comment.
3. **Sign in as Marcus (team member):** open the same post. Now there's a triage panel and internal notes. Move it to Planned and show the history entry.
4. **Dashboard → Publish update:** link a request and publish. Show it under Shipped on the roadmap.
5. **Back as Jordan:** the bell shows an unread notification saying the request shipped.
6. **Toggle dark mode.** Mention the contrast test.

## Questions you're likely to get

**"Why is `vote_count` stored on the post instead of counted?"**
So list queries are cheap and sortable with an index. The risk is drift, so every change happens in a transaction that locks the post row, and there's a test that fires concurrent votes and checks the count against the real rows. See ADR 2.

**"How do you make sure users can't do things they shouldn't?"**
Four layers: the proxy for fast redirects, the Data Access Layer for UI decisions, `requireActor` in every Server Action (which re-reads the role from the database), and `can()` inside the services. Hiding a button isn't treated as security.

**"How does caching work, and how do users see their own changes?"**
Reads use `"use cache"` with tags, and writes call `updateTag` with the same tags. That gives read-your-own-writes consistency. Request-specific parts stream in behind Suspense, so public pages still come from a static shell.

**"What happens if two team members merge the same duplicate at once?"**
`mergePosts` locks both rows in id order, which prevents deadlocks, then checks `mergedIntoId`. The second merge gets a clear "already merged" conflict error.

**"How would this scale?"**
- Reads: shared remote cache (`use cache: remote`), and a read replica for the board.
- Search: Postgres full-text search is fine to roughly hundreds of thousands of posts. Beyond that, Meilisearch or Typesense.
- Notifications: move the fan-out to a background queue (Inngest or a jobs table) so publishing stays fast with thousands of voters.

**"What would you do next?"**
Rate limiting on sign-in, email digests, a public API reusing the services, and tracking time-to-ship from `status_events`.

**"Something you'd do differently?"**
Offset pagination is simple, but cursor pagination is more stable when posts are being added during browsing. I'd switch to a `(vote_count, id)` cursor for the "Top" sort.

## Bugs the tests caught while building

These are good stories to tell, because they show the tests doing real work:
- The triage panel used a React `key` tied to status. Changing status remounted it and wiped the success message, and the end-to-end test caught it.
- Rendering "3 days ago" on the server would have baked stale times into cached pages. Next 16 flagged it, and the fix was a small client component.
- Next 16 keeps the previous page mounted in a hidden state for instant back navigation, so two elements labelled "Category" existed at once. The fix was giving the board's filter a distinct accessible name.
