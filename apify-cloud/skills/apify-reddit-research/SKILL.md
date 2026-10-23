---
name: apify-reddit-research
description: Use for fetching or scraping Reddit posts, comments, users, subreddits, and query-driven Reddit discussion datasets through approved high-rating cheap pay-per-use Apify Actors.
---

# Apify Reddit Research

Use this skill for Reddit discovery, subreddit monitoring, post/comment extraction, and discussion evidence gathering through Apify.

## Actor

Use `peakydev/reddit-scraper-post-comments-users` as the default Reddit Actor.

Selection evidence as of 2026-04-30:

- Rating: `4.9` from 12 reviews.
- Pricing: from about `$1.80 / 1,000` results.
- Maintenance: last modified about 14 days ago.
- Fit: posts, comment threads, users, listings, communities, and search terms without Reddit login.

Do not use `good-apis/reddit-scraper`; it had low usage signal and was marked under maintenance when reviewed. Do not use unrated, deprecated, subscription-first, or meta/generator Actors unless the user explicitly approves the exception.

## Inputs

The Actor accepts either `url` or `searchTerm`; do not use both in the same input.

Known post URL:

```json
{
  "url": [
    "https://www.reddit.com/r/learnprogramming/comments/lp1hi4/is_webscraping_a_good_skill_to_learn_as_a_beginner/"
  ],
  "scrapeType": "post",
  "maxPosts": 10,
  "maxComments": 25
}
```

Subreddit listing:

```json
{
  "url": ["https://www.reddit.com/r/LocalLLaMA/"],
  "scrapeType": "listing",
  "maxListingPosts": 25
}
```

Search:

```json
{
  "searchTerm": "python web framework",
  "searchSort": "relevance",
  "searchTime": "month",
  "searchSubreddit": "python",
  "scrapeType": "post",
  "maxPosts": 25,
  "maxComments": 25
}
```

## Run Pattern

1. Write the input under `.tmp/apify-runs/`.
2. Run with a low cap:

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-actor-ops/scripts/run_actor.ts \
  --actor peakydev/reddit-scraper-post-comments-users \
  --input .tmp/apify-runs/reddit-input.json \
  --out .tmp/apify-runs/reddit-output.json \
  --max-total-charge-usd 0.25 \
  --max-items 100
```

3. Inspect the first output before increasing limits.
4. Keep `maxComments`, `maxPosts`, `maxListingPosts`, `maxCommunities`, and `maxUsers` deliberately low unless the user asks for breadth.

## Normalization

Keep source URL or Reddit IDs, `contentType` or `dataType`, title/body/comment text, community/subreddit, author, created timestamp, upvote/comment fields, permalink or URL, parent IDs for comments, and Apify actor/run ID.

## Guardrails

- Treat Reddit data as public web evidence, not private user research.
- Avoid collecting unnecessary user histories; prefer thread, listing, community, or query scope unless the task explicitly requires user-level analysis.
- Use only approved high-rating, cheap pay-per-use Actors. Re-check rating, maintenance, and pricing before adding or switching Actors.
- When a run returns an error item, keep it with the run metadata and do not silently retry with broader settings.

## Sources

- `peakydev/reddit-scraper-post-comments-users`: https://apify.com/peakydev/reddit-scraper-post-comments-users
