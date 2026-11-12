# 2. Denormalised vote counts, protected by row locks

**Status:** accepted

## Context
The board sorts by votes on every request. Counting votes with `COUNT(*) … GROUP BY` on each list query gets slower as votes grow, and complicates the trending formula.

## Decision
Store `vote_count` on `posts`. Change it only inside a transaction that first runs `SELECT … FOR UPDATE` on the post row. `votes` keeps a composite primary key so the same user can't vote twice.

## Consequences
- List queries use a plain index (`status, vote_count desc`).
- Concurrent toggles queue up on the row lock, so the counter can't drift. An integration test fires 11 concurrent votes and checks that the count equals the real number of rows.
- A merge recalculates the target's count from `votes` instead of adding numbers, which keeps it correct when the same users voted on both posts.
