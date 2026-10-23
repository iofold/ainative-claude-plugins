---
name: apify-x-research
description: Use for fetching or scraping public X/Twitter posts, X Articles, profile timelines, search-filtered posts, and post replies through Apify Actors.
---

# Apify X Research

Use this skill for public X/Twitter post capture, X Article extraction, profile timeline snapshots, reply-thread extraction, and social-listening datasets.

## Actor Choices

- `xquik/x-tweet-scraper`: default for tweet lookup by ID and keyword/advanced search. Use it first because it is highly rated and cheap pay-per-result.
- `scraper_one/x-post-replies-scraper`: replies/comments for one or more post URLs. Use `postUrls`, `resultsLimit`, and `includeOriginalPost`.
- `fastcrawler/x-twitter-article-to-markdown`: provisional default for long-form X Articles when a tweet links to `x.com/i/article/...`. Use only after confirming the Store metadata is still cheap pay-per-event and recently maintained. It has no review/rating signal, so require a tiny capped smoke test and reject outputs with empty `md` or mock rows.

Prefer `xquik/x-tweet-scraper` for original posts and search. For an X URL, extract the numeric `/status/<id>` value and pass it as `tweetIds`. Add `scraper_one/x-post-replies-scraper` only when the task needs replies or audience reaction. For long-form X Articles, first scrape the linking post with `xquik/x-tweet-scraper`, then pass the linking `/status/<id>` value, not the `/i/article/<id>` value, to `fastcrawler/x-twitter-article-to-markdown`.

## Inputs

Single post or profile:

```json
{
  "tweetIds": ["1234567890"],
  "maxItems": 1
}
```

Search:

```json
{
  "searchTerms": ["from:sama agents"],
  "maxItems": 25,
  "queryType": "Latest"
}
```

Replies:

```json
{
  "postUrls": ["https://x.com/username/status/1234567890"],
  "resultsLimit": 50,
  "includeOriginalPost": true
}
```

X Article:

```json
{
  "tweetIds": ["1234567890"]
}
```

## Run Pattern

1. Write input JSON under `.tmp/apify-runs/`.
2. Run via `apify-actor-ops`:

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-actor-ops/scripts/run_actor.ts \
  --actor xquik/x-tweet-scraper \
  --input .tmp/apify-runs/x-input.json \
  --out .tmp/apify-runs/x-output.json \
  --max-total-charge-usd 0.25 \
  --max-items 25
```

3. For replies, change `--actor` to `scraper_one/x-post-replies-scraper` and cap `resultsLimit`.
4. For X Articles, change `--actor` to `fastcrawler/x-twitter-article-to-markdown`, cap to one linking status ID, and keep `--max-total-charge-usd` low.
5. Preserve raw output. Normalize only the fields needed for the downstream task.

## Normalization

For posts, keep: `id`, `url` or `tweetUrl`, `text` or `fullText`, `createdAt`, engagement counts, `conversationId`, author handle/name, media, hashtags, mentions, and source Actor/run ID.

For replies, keep: `replyId`, `replyUrl`, `replyText`, `postUrl`, `postId`, `timestamp`, `conversationId`, author handle/name, engagement counts, media, and source Actor/run ID.

For articles, keep: linking `tweet_id`, article URL from the tweet entity, `md`, embedded links, source tweet metadata, source Actor/run ID, and the smoke-test outcome. Discard rows where `md` is empty and rows that are clearly mock/test data.

## Guardrails

- Scrape only public content; do not attempt login, cookies, private accounts, or bypass workflows.
- Use only approved high-rating, cheap pay-per-result Actors. Do not add a new X Actor without checking rating, maintenance, pricing, and docs.
- X Article extraction is the only current exception to the high-rating rule because the article-specific Store candidate has no reviews. Treat it as provisional, not broadly approved; re-check the Store before use and prefer a future rated, cheap, article-specific Actor if one appears.
- X guest-token pulls can cap around 100 tweets per profile; schedule recurring small runs for archives.
- Cite post URLs and keep timestamped raw outputs when using posts as evidence.
- If the Apify account is over its monthly usage hard limit, stop and report the blocker instead of retrying.

## Sources

- `xquik/x-tweet-scraper`: https://apify.com/xquik/x-tweet-scraper
- `scraper_one/x-post-replies-scraper`: https://apify.com/scraper_one/x-post-replies-scraper
- `fastcrawler/x-twitter-article-to-markdown`: https://apify.com/fastcrawler/x-twitter-article-to-markdown
