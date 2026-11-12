/**
 * Resets the database to a realistic demo state. Deterministic: the same seed
 * always produces the same data, so screenshots and e2e tests are stable.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import {
  categories,
  changelogEntries,
  changelogPosts,
  comments,
  notifications,
  posts,
  statusEvents,
  users,
  votes,
  type PostStatus,
} from "../src/db/schema";
import { hashPassword } from "../src/server/services/users";

export const DEMO_PASSWORD = "shipwright-demo";

/** Mulberry32: tiny seeded PRNG so the demo data is reproducible. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEAM = [
  { name: "Ava Thompson", email: "ava@shipwright.dev", role: "admin" as const },
  { name: "Marcus Reid", email: "marcus@shipwright.dev", role: "member" as const },
  { name: "Priya Natarajan", email: "priya@shipwright.dev", role: "member" as const },
];
const CUSTOMER_NAMES = [
  "Jordan Blake",
  "Sofia Alvarez",
  "Kwame Mensah",
  "Lena Fischer",
  "Diego Ramos",
  "Hana Sato",
  "Noah Campbell",
  "Amara Okafor",
  "Liam O'Connor",
  "Maya Patel",
  "Ethan Brooks",
  "Zara Ahmed",
  "Lucas Moreau",
  "Chloe Bennett",
  "Ravi Kapoor",
  "Isla Murray",
  "Mateo Silva",
  "Grace Chen",
  "Owen Price",
  "Nia Williams",
];
const CATEGORIES = [
  { name: "Feature", slug: "feature" },
  { name: "Integrations", slug: "integrations" },
  { name: "Bug", slug: "bug" },
  { name: "Design", slug: "design" },
  { name: "Performance", slug: "performance" },
];

type SeedPost = {
  title: string;
  body: string;
  category: string;
  status: PostStatus;
  age: number;
  popularity: number;
};
const POSTS: SeedPost[] = [
  {
    title: "Dark mode for the dashboard",
    body: "Working late in the dashboard is rough on the eyes. A dark theme that follows the system setting would be great, with a manual toggle for people who want it.",
    category: "design",
    status: "shipped",
    age: 60,
    popularity: 0.9,
  },
  {
    title: "Slack integration for new feedback",
    body: "Post a message to a Slack channel when new feedback arrives or a request changes status, so the team can react without checking the board.",
    category: "integrations",
    status: "in_progress",
    age: 45,
    popularity: 0.85,
  },
  {
    title: "Export feedback to CSV",
    body: "We report on feedback in our quarterly planning and need to export posts, vote counts, and statuses to a spreadsheet.",
    category: "feature",
    status: "planned",
    age: 38,
    popularity: 0.7,
  },
  {
    title: "Let voters add a note about why they need it",
    body: "A vote alone doesn't tell us how important something is. A short optional note on each vote would help prioritise.",
    category: "feature",
    status: "under_review",
    age: 5,
    popularity: 0.55,
  },
  {
    title: "Keyboard shortcuts for triage",
    body: "When triaging dozens of posts, being able to press keys to change status, assign, and move to the next post would save a lot of time.",
    category: "feature",
    status: "planned",
    age: 30,
    popularity: 0.5,
  },
  {
    title: "Search doesn't match partial words",
    body: "Searching for 'integr' finds nothing even though there are several posts about integrations. Prefix matching would help.",
    category: "bug",
    status: "in_progress",
    age: 12,
    popularity: 0.4,
  },
  {
    title: "Jira two-way sync",
    body: "Link a feedback post to a Jira issue and keep the status in sync both ways, so engineering can stay in Jira.",
    category: "integrations",
    status: "under_review",
    age: 20,
    popularity: 0.75,
  },
  {
    title: "Board loads slowly with 1,000+ posts",
    body: "Our public board takes several seconds to load now that we have over a thousand posts. Pagination or virtualisation would help.",
    category: "performance",
    status: "shipped",
    age: 50,
    popularity: 0.6,
  },
  {
    title: "Custom domain for the public board",
    body: "We'd like to host the board at feedback.ourcompany.com instead of the default URL so it feels like part of our product.",
    category: "feature",
    status: "planned",
    age: 25,
    popularity: 0.65,
  },
  {
    title: "Email digest of top requests",
    body: "A weekly email summarising the most-voted new requests would keep stakeholders in the loop without logging in.",
    category: "feature",
    status: "under_review",
    age: 3,
    popularity: 0.35,
  },
  {
    title: "Mobile layout cuts off the vote button",
    body: "On narrow phones the vote button wraps under the title and is hard to tap. Tested on an iPhone SE.",
    category: "bug",
    status: "shipped",
    age: 40,
    popularity: 0.3,
  },
  {
    title: "Merge duplicate requests",
    body: "We get the same request phrased five different ways. Merging them and combining the votes would give a truer picture of demand.",
    category: "feature",
    status: "shipped",
    age: 70,
    popularity: 0.8,
  },
  {
    title: "Zapier integration",
    body: "A Zapier app would let us connect feedback to the dozens of tools we already use without waiting on native integrations.",
    category: "integrations",
    status: "under_review",
    age: 9,
    popularity: 0.45,
  },
  {
    title: "Roadmap view grouped by quarter",
    body: "Our customers ask when things will ship. Showing planned items grouped by quarter would answer that without committing to exact dates.",
    category: "design",
    status: "under_review",
    age: 15,
    popularity: 0.5,
  },
  {
    title: "Attach screenshots to feedback",
    body: "Bug reports are much easier to understand with a screenshot. Allow attaching one or two images to a post.",
    category: "feature",
    status: "planned",
    age: 22,
    popularity: 0.6,
  },
  {
    title: "Faster first load on the changelog",
    body: "The changelog page downloads a lot of JavaScript for what is mostly text. It should be close to instant.",
    category: "performance",
    status: "in_progress",
    age: 8,
    popularity: 0.25,
  },
  {
    title: "Single sign-on with Google Workspace",
    body: "Let our team sign in with Google so we don't have to manage separate passwords.",
    category: "integrations",
    status: "planned",
    age: 33,
    popularity: 0.55,
  },
  {
    title: "Notification when a request I voted on ships",
    body: "I'd love an email or in-app notification when something I voted for is released.",
    category: "feature",
    status: "shipped",
    age: 55,
    popularity: 0.7,
  },
  {
    title: "Comment threads are hard to follow",
    body: "Long discussions become a wall of text. Replies or at least clearer separation between comments would help.",
    category: "design",
    status: "under_review",
    age: 6,
    popularity: 0.3,
  },
  {
    title: "Embed the board inside our app",
    body: "A widget we can drop into our product so users can leave feedback without leaving.",
    category: "feature",
    status: "under_review",
    age: 2,
    popularity: 0.4,
  },
  {
    title: "Filter the board by multiple categories",
    body: "Being able to select both Integrations and Feature at once would make browsing easier.",
    category: "feature",
    status: "under_review",
    age: 11,
    popularity: 0.2,
  },
  {
    title: "Vote count is wrong after undoing a vote",
    body: "If I vote and unvote quickly the count sometimes goes up by two. Refreshing fixes it.",
    category: "bug",
    status: "shipped",
    age: 35,
    popularity: 0.25,
  },
  {
    title: "Private boards for enterprise customers",
    body: "Some of our customers want a board only their organisation can see.",
    category: "feature",
    status: "under_review",
    age: 18,
    popularity: 0.5,
  },
  {
    title: "Linear integration",
    body: "We moved from Jira to Linear. A Linear integration that links issues to requests would be ideal.",
    category: "integrations",
    status: "planned",
    age: 14,
    popularity: 0.6,
  },
  {
    title: "Higher contrast for status badges",
    body: "The yellow 'in progress' badge is hard to read on white. Accessibility matters for our users.",
    category: "design",
    status: "shipped",
    age: 28,
    popularity: 0.2,
  },
  {
    title: "Bulk change status",
    body: "When we ship a release, we change ten posts to Shipped one by one. Selecting several at once would help.",
    category: "feature",
    status: "under_review",
    age: 4,
    popularity: 0.35,
  },
  {
    title: "API for creating feedback",
    body: "A public REST API so we can create posts from our support tool automatically.",
    category: "integrations",
    status: "under_review",
    age: 26,
    popularity: 0.55,
  },
  {
    title: "Slack alerts for new posts",
    body: "Ping our #product channel whenever someone submits a new idea.",
    category: "integrations",
    status: "under_review",
    age: 1,
    popularity: 0.15,
  },
];

const COMMENTS = [
  "This would make a big difference for our team.",
  "We'd use this every day. Any idea on timing?",
  "Same here. We've been working around it with a spreadsheet.",
  "Would love to see this, especially on mobile.",
  "+1, this is the main thing keeping us on our old tool.",
  "Is there a workaround in the meantime?",
  "Thanks for picking this up!",
  "Could this also cover the admin side?",
];
const TEAM_REPLIES = [
  "Thanks for the detail. This is on our radar and we'll share updates here.",
  "Good news: we've started work on this. Follow along on the roadmap.",
  "We're scoping this now. If you have specific use cases, add them below.",
];
const INTERNAL_NOTES = [
  "Talked to three customers about this on calls last week. Strong signal from mid-market.",
  "Depends on the notifications refactor. Let's sequence after that lands.",
  "Probably 2 sprints. Needs design input on the empty state.",
];

const STATUS_PATH: Record<PostStatus, PostStatus[]> = {
  under_review: [],
  planned: ["planned"],
  in_progress: ["planned", "in_progress"],
  shipped: ["planned", "in_progress", "shipped"],
  closed: ["closed"],
};

export async function seed(url = process.env.DATABASE_URL) {
  const db = createDb(url, { max: 1 });
  const random = rng(42);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000 - random() * 3_600_000 * 8);

  await db.execute(
    sql`truncate ${notifications}, ${changelogPosts}, ${changelogEntries}, ${statusEvents}, ${comments}, ${votes}, ${posts}, ${categories}, ${users} restart identity cascade`,
  );

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const team = await db
    .insert(users)
    .values(TEAM.map((u) => ({ ...u, passwordHash })))
    .returning();
  const customers = await db
    .insert(users)
    .values(
      CUSTOMER_NAMES.map((name) => ({
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
        passwordHash,
      })),
    )
    .returning();
  const everyone = [...team, ...customers];

  const cats = await db.insert(categories).values(CATEGORIES).returning();
  const catId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  for (const p of POSTS) {
    const author = pick(customers);
    const createdAt = daysAgo(p.age);
    const voters = everyone.filter((u) => u.id === author.id || random() < p.popularity);
    const owner = p.status === "under_review" ? null : pick(team);

    const publicComments =
      Math.floor(random() * 4 * p.popularity) + (p.status !== "under_review" ? 1 : 0);
    const [post] = await db
      .insert(posts)
      .values({
        title: p.title,
        body: p.body,
        categoryId: catId(p.category),
        authorId: author.id,
        ownerId: owner?.id,
        status: p.status,
        voteCount: voters.length,
        commentCount: publicComments,
        createdAt,
        updatedAt: createdAt,
        statusChangedAt: createdAt,
      })
      .returning();

    await db.insert(votes).values(
      voters.map((u) => ({
        postId: post.id,
        userId: u.id,
        createdAt: daysAgo(random() * p.age),
      })),
    );

    let previous: PostStatus = "under_review";
    let at = p.age;
    for (const next of STATUS_PATH[p.status]) {
      at = Math.max(0.2, at - (p.age / 4) * (0.5 + random()));
      await db.insert(statusEvents).values({
        postId: post.id,
        actorId: (owner ?? team[0]).id,
        fromStatus: previous,
        toStatus: next,
        createdAt: daysAgo(at),
      });
      previous = next;
    }
    if (STATUS_PATH[p.status].length) {
      await db
        .update(posts)
        .set({ statusChangedAt: daysAgo(at) })
        .where(sql`${posts.id} = ${post.id}`);
    }

    const rows = Array.from({ length: publicComments }, (_, i) => {
      const fromTeam = i === publicComments - 1 && p.status !== "under_review";
      return {
        postId: post.id,
        authorId: fromTeam ? (owner ?? team[0]).id : pick(customers).id,
        body: fromTeam ? pick(TEAM_REPLIES) : pick(COMMENTS),
        createdAt: daysAgo(p.age * (1 - (i + 1) / (publicComments + 1))),
      };
    });
    if (p.popularity > 0.5) {
      rows.push({
        postId: post.id,
        authorId: pick(team).id,
        body: pick(INTERNAL_NOTES),
        createdAt: daysAgo(p.age / 2),
        isInternal: true,
      } as (typeof rows)[number]);
    }
    if (rows.length) await db.insert(comments).values(rows);
  }

  // Merge one duplicate so the demo shows merged requests.
  const [slackDup] = await db
    .select()
    .from(posts)
    .where(sql`${posts.title} = 'Slack alerts for new posts'`);
  const [slack] = await db
    .select()
    .from(posts)
    .where(sql`${posts.title} = 'Slack integration for new feedback'`);
  await db.execute(
    sql`insert into ${votes} (post_id, user_id) select ${slack.id}, user_id from ${votes} where post_id = ${slackDup.id} on conflict do nothing`,
  );
  await db.execute(
    sql`update ${posts} set vote_count = (select count(*) from ${votes} where post_id = ${slack.id}) where id = ${slack.id}`,
  );
  await db
    .update(posts)
    .set({ mergedIntoId: slack.id, status: "closed" })
    .where(sql`${posts.id} = ${slackDup.id}`);
  await db.insert(statusEvents).values({
    postId: slackDup.id,
    actorId: team[1].id,
    fromStatus: "under_review",
    toStatus: "closed",
  });

  const shipped = await db
    .select()
    .from(posts)
    .where(sql`${posts.status} = 'shipped'`)
    .orderBy(posts.statusChangedAt);
  const entries = [
    {
      title: "Merge duplicates and smarter notifications",
      body: "You can now merge duplicate requests. Votes are combined automatically, so nobody's voice gets lost.\n\nAnyone who voted on a request now gets a notification when it ships.",
      posts: shipped.filter((p) => /Merge|Notification/.test(p.title)),
      age: 30,
    },
    {
      title: "A faster board and fixed vote counts",
      body: "The public board now paginates and loads in under a second, even with thousands of posts.\n\nWe also fixed a race condition where rapidly toggling a vote could double count it.",
      posts: shipped.filter((p) => /slowly|Vote count/.test(p.title)),
      age: 18,
    },
    {
      title: "Dark mode and accessibility improvements",
      body: "Shipwright now has a dark theme that follows your system setting, with a toggle in the header.\n\nStatus badges have higher contrast and the vote button no longer wraps on small screens.",
      posts: shipped.filter((p) => /Dark|contrast|Mobile/.test(p.title)),
      age: 6,
    },
  ];
  for (const e of entries) {
    const [entry] = await db
      .insert(changelogEntries)
      .values({
        title: e.title,
        body: e.body,
        slug: e.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-$/, ""),
        authorId: team[0].id,
        publishedAt: daysAgo(e.age),
      })
      .returning();
    if (e.posts.length)
      await db
        .insert(changelogPosts)
        .values(e.posts.map((p) => ({ entryId: entry.id, postId: p.id })));
  }

  await db.$client.end();
  return { users: everyone.length, posts: POSTS.length };
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then((r) =>
      console.log(`Seeded ${r.users} users and ${r.posts} posts. Demo password: ${DEMO_PASSWORD}`),
    )
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
